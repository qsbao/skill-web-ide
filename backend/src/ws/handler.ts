import type { FastifyPluginAsync } from 'fastify';
import { v4 as uuid } from 'uuid';
import * as testRunner from '../services/test-runner.service.js';
import * as runService from '../services/run.service.js';
import * as sessionService from '../services/session.service.js';
import { getSkill } from '../services/skill.service.js';
import type { TestType, WsMessage } from '@skill-ide/shared';

export const wsHandler: FastifyPluginAsync = async (app) => {
  app.get('/ws', { websocket: true }, (socket) => {
    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.action === 'test:run') {
          const { skillId, type } = msg.payload as { skillId: string; type: TestType };

          const run = testRunner.runTest(
            skillId,
            type,
            (stream, data) => {
              const out: WsMessage = {
                type: 'test:output',
                payload: { runId: run.id, stream, data },
              };
              socket.send(JSON.stringify(out));
            },
            (status) => {
              const statusMsg: WsMessage = {
                type: 'test:status',
                payload: { runId: run.id, status },
              };
              socket.send(JSON.stringify(statusMsg));
            },
          );

          // Send initial run info
          socket.send(JSON.stringify({ type: 'test:started', payload: run }));
        }

        if (msg.action === 'run:run') {
          const { skillId, prompt } = msg.payload as { skillId: string; prompt: string };
          const runId = uuid();

          runService.runSkill(
            skillId,
            prompt,
            (stream, data) => {
              const out: WsMessage = {
                type: 'run:output',
                payload: { runId, stream, data },
              };
              socket.send(JSON.stringify(out));
            },
            (status) => {
              const statusMsg: WsMessage = {
                type: 'run:status',
                payload: { runId, status },
              };
              socket.send(JSON.stringify(statusMsg));
            },
            runId,
          ).then((run) => {
            socket.send(JSON.stringify({ type: 'run:started', payload: run }));
          }).catch((err) => {
            socket.send(JSON.stringify({ type: 'error', payload: String(err) }));
          });
        }

        if (msg.action === 'playground:chat') {
          const { skillId, prompt, sessionId, internalSessionId } = msg.payload as {
            skillId: string;
            prompt: string;
            sessionId?: string;
            internalSessionId?: string;
          };
          const runId = uuid();
          let assistantText = '';
          let activeInternalSessionId = internalSessionId || null;

          // Create or reuse session
          const sessionSetup = (async () => {
            if (activeInternalSessionId) {
              // Existing session — add user message
              await sessionService.addMessage(activeInternalSessionId, {
                role: 'user',
                content: prompt,
                timestamp: new Date().toISOString(),
              });
            } else {
              // New session
              const skill = await getSkill(skillId);
              const skillName = skill?.name || skillId;
              const session = await sessionService.createSession(skillId, skillName, 'chat', prompt);
              activeInternalSessionId = session.id;
              await sessionService.addMessage(session.id, {
                role: 'user',
                content: prompt,
                timestamp: new Date().toISOString(),
              });
              // Notify frontend of the internal session ID
              socket.send(JSON.stringify({
                type: 'playground:chat:internal-session',
                payload: { runId, internalSessionId: session.id },
              }));
            }
          })();

          // Persist the runId so files can be loaded when restoring the session
          sessionSetup.then(() => {
            if (activeInternalSessionId) {
              return sessionService.setRunId(activeInternalSessionId, runId);
            }
          }).catch((err) => {
            console.error(`[session] Failed to set runId:`, err);
          });

          runService.runPlaygroundChat(
            skillId,
            prompt,
            (text) => {
              assistantText += text;
              socket.send(JSON.stringify({
                type: 'playground:chat:text',
                payload: { runId, text },
              }));
            },
            (status) => {
              socket.send(JSON.stringify({
                type: 'playground:chat:status',
                payload: { runId, status },
              }));
              // Persist assistant message on completion
              if (status !== 'running' && activeInternalSessionId) {
                sessionSetup.then(async () => {
                  if (assistantText.trim()) {
                    await sessionService.addMessage(activeInternalSessionId!, {
                      role: 'assistant',
                      content: assistantText,
                      timestamp: new Date().toISOString(),
                    });
                  }
                  const sessionStatus = status === 'completed' ? 'completed' : 'failed';
                  await sessionService.updateStatus(activeInternalSessionId!, sessionStatus);
                }).catch((err) => {
                  console.error(`[session] Failed to persist chat completion:`, err);
                });
              }
            },
            (newSessionId) => {
              socket.send(JSON.stringify({
                type: 'playground:chat:session',
                payload: { runId, sessionId: newSessionId },
              }));
              // Persist Claude session ID
              if (activeInternalSessionId) {
                sessionSetup.then(() => {
                  return sessionService.setClaudeSessionId(activeInternalSessionId!, newSessionId);
                }).catch((err) => {
                  console.error(`[session] Failed to set claudeSessionId:`, err);
                });
              }
            },
            sessionId,
            runId,
          ).then((run) => {
            socket.send(JSON.stringify({
              type: 'playground:chat:started',
              payload: run,
            }));
          }).catch((err) => {
            socket.send(JSON.stringify({ type: 'error', payload: String(err) }));
          });
        }

        if (msg.action === 'playground:single') {
          const { skillId, prompt } = msg.payload as { skillId: string; prompt: string };
          const runId = uuid();
          let outputText = '';
          let internalSessionId: string | null = null;

          // Create session for single-run
          const sessionSetup = (async () => {
            const skill = await getSkill(skillId);
            const skillName = skill?.name || skillId;
            const session = await sessionService.createSession(skillId, skillName, 'single-run', prompt);
            internalSessionId = session.id;
            await sessionService.addMessage(session.id, {
              role: 'user',
              content: prompt,
              timestamp: new Date().toISOString(),
            });
          })();

          runService.runSkill(
            skillId,
            prompt,
            (stream, data) => {
              outputText += data;
              socket.send(JSON.stringify({
                type: 'playground:single:output',
                payload: { runId, stream, data },
              }));
            },
            (status) => {
              socket.send(JSON.stringify({
                type: 'playground:single:status',
                payload: { runId, status },
              }));
              // Persist output on completion
              if (status !== 'running' && internalSessionId) {
                sessionSetup.then(async () => {
                  if (outputText.trim()) {
                    await sessionService.addMessage(internalSessionId!, {
                      role: 'assistant',
                      content: outputText,
                      timestamp: new Date().toISOString(),
                    });
                  }
                  await sessionService.updateOutput(internalSessionId!, outputText);
                  const sessionStatus = status === 'completed' ? 'completed' : 'failed';
                  await sessionService.updateStatus(internalSessionId!, sessionStatus);
                }).catch((err) => {
                  console.error(`[session] Failed to persist single-run completion:`, err);
                });
              }
            },
            runId,
          ).then((run) => {
            socket.send(JSON.stringify({
              type: 'playground:single:started',
              payload: run,
            }));
          }).catch((err) => {
            socket.send(JSON.stringify({ type: 'error', payload: String(err) }));
          });
        }
      } catch {
        socket.send(JSON.stringify({ type: 'error', payload: 'Invalid message' }));
      }
    });
  });
};
