import { v4 as uuid } from 'uuid';
import * as runService from '../../services/run.service.js';
import { createSessionHandle } from '../session-handle.js';
import type { DomainHandler, WsSender } from '../types.js';

export const playgroundHandler: DomainHandler = {
  prefix: 'playground',

  handle(action, payload, sender) {
    if (action === 'playground:chat') {
      handleChat(payload as any, sender);
    } else if (action === 'playground:single') {
      handleSingle(payload as any, sender);
    }
  },
};

function handleChat(
  payload: { skillId: string; prompt: string; sessionId?: string; internalSessionId?: string },
  sender: WsSender,
): void {
  const { skillId, prompt, sessionId, internalSessionId } = payload;
  const runId = uuid();
  let assistantText = '';

  const session = createSessionHandle({
    skillId,
    existingSessionId: internalSessionId,
    mode: 'chat',
    prompt,
  });

  // Notify frontend of new internal session
  if (!internalSessionId) {
    session.ready.then(() => {
      if (session.id) {
        sender.send('playground:chat:internal-session', { runId, internalSessionId: session.id });
      }
    });
  }

  session.setRunId(runId);

  runService
    .runPlaygroundChat(
      skillId,
      prompt,
      (text) => {
        assistantText += text;
        sender.send('playground:chat:text', { runId, text });
      },
      (status) => {
        sender.send('playground:chat:status', { runId, status });
        if (status !== 'running') {
          session.ready.then(async () => {
            if (assistantText.trim()) {
              await session.addMessage({ role: 'assistant', content: assistantText });
            }
            const sessionStatus = status === 'completed' ? 'completed' : 'failed';
            await session.updateStatus(sessionStatus);
          }).catch((err) => {
            console.error('[session] Failed to persist chat completion:', err);
          });
        }
      },
      (newSessionId) => {
        sender.send('playground:chat:session', { runId, sessionId: newSessionId });
        session.setClaudeSessionId(newSessionId);
      },
      (toolName, toolInput) => {
        sender.send('playground:chat:tool_use', { runId, toolName, toolInput });
        session.addMessage({ role: 'tool_use', content: toolInput, toolName });
      },
      sessionId,
      runId,
    )
    .then((run) => {
      sender.send('playground:chat:started', run);
    })
    .catch((err) => {
      sender.send('error', String(err));
    });
}

function handleSingle(
  payload: { skillId: string; prompt: string },
  sender: WsSender,
): void {
  const { skillId, prompt } = payload;
  const runId = uuid();
  let outputText = '';

  const session = createSessionHandle({
    skillId,
    mode: 'single-run',
    prompt,
  });

  runService
    .runSkill(
      skillId,
      prompt,
      (stream, data) => {
        outputText += data;
        sender.send('playground:single:output', { runId, stream, data });
      },
      (status) => {
        sender.send('playground:single:status', { runId, status });
        if (status !== 'running') {
          session.ready.then(async () => {
            if (outputText.trim()) {
              await session.addMessage({ role: 'assistant', content: outputText });
            }
            await session.updateOutput(outputText);
            const sessionStatus = status === 'completed' ? 'completed' : 'failed';
            await session.updateStatus(sessionStatus);
          }).catch((err) => {
            console.error('[session] Failed to persist single-run completion:', err);
          });
        }
      },
      runId,
    )
    .then((run) => {
      sender.send('playground:single:started', run);
    })
    .catch((err) => {
      sender.send('error', String(err));
    });
}
