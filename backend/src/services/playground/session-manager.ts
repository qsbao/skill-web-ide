import { v4 as uuid } from 'uuid';
import type {
  PlaygroundEvent,
  PlaygroundRunHandle,
  PlaygroundSessionManager,
  SessionStore,
  SessionMutation,
  ClaudeCliPort,
} from './types.js';
import type { SessionType } from '@skill-ide/shared';

interface ManagerDeps {
  cli: ClaudeCliPort;
  store: SessionStore;
  skillsDir: string;
  runsDir: string;
}

export function createPlaygroundSessionManager(deps: ManagerDeps): PlaygroundSessionManager {
  const { cli, store } = deps;
  // Per-session turn lock: ensures concurrent turns on the same session are serialized
  const sessionLocks = new Map<string, Promise<void>>();

  function acquireSessionLock(sessionId: string): { acquired: Promise<void>; release: () => void } {
    const prev = sessionLocks.get(sessionId) ?? Promise.resolve();
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    sessionLocks.set(sessionId, next);
    return {
      acquired: prev,
      release: () => {
        release();
        if (sessionLocks.get(sessionId) === next) sessionLocks.delete(sessionId);
      },
    };
  }

  function execute(
    skillId: string,
    prompt: string,
    sessionType: SessionType,
    existingSessionId?: string,
    claudeSessionId?: string,
  ): PlaygroundRunHandle {
    const runId = uuid();
    const abortController = new AbortController();

    async function* generate(): AsyncIterable<PlaygroundEvent> {
      // Determine session ID (create new or use existing)
      let sessionId: string;
      let lock: { acquired: Promise<void>; release: () => void } | undefined;
      try {
        if (existingSessionId) {
          sessionId = existingSessionId;
          // Acquire lock BEFORE adding user message for existing sessions
          lock = acquireSessionLock(sessionId);
          await lock.acquired;
        } else {
          const session = await store.create({
            skillId,
            skillName: skillId,
            type: sessionType,
            prompt,
          });
          sessionId = session.id;
          // New sessions don't need locking yet (no concurrent access possible)
          lock = acquireSessionLock(sessionId);
          await lock.acquired;
        }

        // Add user message
        await store.update(sessionId, [
          { op: 'add_message', message: { role: 'user', content: prompt, timestamp: new Date().toISOString() } },
          { op: 'set_run_id', runId },
        ]);
      } catch (err) {
        lock?.release();
        yield { type: 'error', runId, message: String(err) };
        return;
      }

      try {
        yield { type: 'started', runId, sessionId };
        yield { type: 'status', runId, status: 'running' };

        // Spawn CLI
        const cliHandle = cli.spawn({
          prompt,
          workDir: deps.runsDir,
          resumeSessionId: claudeSessionId,
        });

        // Wire abort to kill CLI
        abortController.signal.addEventListener('abort', () => cliHandle.kill(), { once: true });

        let assistantText = '';
        let terminated = false;

        for await (const event of cliHandle.events) {
          if (abortController.signal.aborted) break;

          switch (event.type) {
            case 'text_delta':
              assistantText += event.text;
              yield { type: 'text', runId, text: event.text };
              break;
            case 'tool_use':
              yield { type: 'tool_use', runId, toolName: event.toolName, toolInput: event.toolInput };
              break;
            case 'session_id':
              await store.update(sessionId, [{ op: 'set_claude_session_id', claudeSessionId: event.sessionId }]);
              yield { type: 'claude_session', runId, claudeSessionId: event.sessionId };
              break;
            case 'error':
              yield { type: 'error', runId, message: event.message };
              break;
            case 'status': {
              terminated = true;
              const mutations: SessionMutation[] = [];
              if (assistantText.trim()) {
                mutations.push({
                  op: 'add_message',
                  message: { role: 'assistant', content: assistantText, timestamp: new Date().toISOString() },
                });
                if (sessionType === 'single-run') {
                  mutations.push({ op: 'set_output', output: assistantText });
                }
              }
              const sessionStatus = event.status === 'completed' ? 'completed' : 'failed';
              mutations.push({ op: 'set_status', status: sessionStatus });
              await store.update(sessionId, mutations);
              yield { type: 'status', runId, status: event.status };
              break;
            }
          }
        }

        // If aborted or CLI ended without a status event, persist failed
        if (!terminated) {
          await store.update(sessionId, [{ op: 'set_status', status: 'failed' }]);
          yield { type: 'status', runId, status: 'error' };
        }
      } finally {
        lock.release();
      }
    }

    return {
      runId,
      events: generate(),
      abort() {
        abortController.abort();
      },
    };
  }

  return {
    chat(opts) {
      return execute(opts.skillId, opts.prompt, 'chat', opts.sessionId, opts.claudeSessionId);
    },
    run(opts) {
      return execute(opts.skillId, opts.prompt, 'single-run');
    },
  };
}
