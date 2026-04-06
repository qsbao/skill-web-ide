import * as sessionService from '../services/session.service.js';
import { getSkill } from '../services/skill.service.js';

export interface SessionHandle {
  readonly ready: Promise<void>;
  get id(): string | null;
  addMessage(msg: { role: string; content: string; toolName?: string }): Promise<void>;
  setClaudeSessionId(id: string): Promise<void>;
  setRunId(runId: string): Promise<void>;
  updateStatus(status: string): Promise<void>;
  updateOutput(text: string): Promise<void>;
}

export function createSessionHandle(opts: {
  skillId: string;
  existingSessionId?: string;
  mode: 'chat' | 'single-run';
  prompt: string;
}): SessionHandle {
  let sessionId: string | null = opts.existingSessionId || null;

  const ready = (async () => {
    if (sessionId) {
      await sessionService.addMessage(sessionId, {
        role: 'user',
        content: opts.prompt,
        timestamp: new Date().toISOString(),
      });
    } else {
      const skill = await getSkill(opts.skillId);
      const skillName = skill?.name || opts.skillId;
      const session = await sessionService.createSession(opts.skillId, skillName, opts.mode, opts.prompt);
      sessionId = session.id;
      await sessionService.addMessage(session.id, {
        role: 'user',
        content: opts.prompt,
        timestamp: new Date().toISOString(),
      });
    }
  })();

  async function afterReady<T>(fn: () => Promise<T>): Promise<void> {
    try {
      await ready;
      await fn();
    } catch (err) {
      console.error('[session]', err);
    }
  }

  return {
    ready,
    get id() {
      return sessionId;
    },
    addMessage(msg) {
      return afterReady(() =>
        sessionService.addMessage(sessionId!, {
          role: msg.role,
          content: msg.content,
          toolName: msg.toolName,
          timestamp: new Date().toISOString(),
        } as any),
      );
    },
    setClaudeSessionId(id) {
      return afterReady(() => sessionService.setClaudeSessionId(sessionId!, id));
    },
    setRunId(runId) {
      return afterReady(() => sessionService.setRunId(sessionId!, runId));
    },
    updateStatus(status) {
      return afterReady(() => sessionService.updateStatus(sessionId!, status as any));
    },
    updateOutput(text) {
      return afterReady(() => sessionService.updateOutput(sessionId!, text));
    },
  };
}
