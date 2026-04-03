import type { FastifyPluginAsync } from 'fastify';
import { v4 as uuid } from 'uuid';
import * as testRunner from '../services/test-runner.service.js';
import * as runService from '../services/run.service.js';
import * as sessionService from '../services/session.service.js';
import { getSkill } from '../services/skill.service.js';
import { runTestSuite } from '../services/prompt-lab/runner.service.js';
import { optimizePrompt } from '../services/prompt-lab/optimizer.service.js';
import * as resultsService from '../services/prompt-lab/results.service.js';
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
            (toolName, toolInput) => {
              socket.send(JSON.stringify({
                type: 'playground:chat:tool_use',
                payload: { runId, toolName, toolInput },
              }));
              // Persist tool_use message to session
              if (activeInternalSessionId) {
                sessionSetup.then(() => {
                  return sessionService.addMessage(activeInternalSessionId!, {
                    role: 'tool_use',
                    content: toolInput,
                    toolName,
                    timestamp: new Date().toISOString(),
                  });
                }).catch((err) => {
                  console.error(`[session] Failed to persist tool_use message:`, err);
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
        if (msg.action === 'prompt-lab:run') {
          const { projectId, promptId, concurrency, repeatCount, promptOverride } = msg.payload as {
            projectId: string;
            promptId: string;
            concurrency?: number;
            repeatCount?: number;
            promptOverride?: string;
          };
          const runId = uuid();

          runTestSuite(
            { projectId, promptId, concurrency, repeatCount, promptOverride },
            {
              onProgress: (progress) => {
                socket.send(JSON.stringify({
                  type: 'prompt-lab:run:progress',
                  payload: { runId, completed: progress.completed, total: progress.total, currentCase: progress.currentCase, latestResult: progress.latestResult },
                }));
              },
            }
          ).then(async (run) => {
            await resultsService.saveTestRun(run);
            socket.send(JSON.stringify({
              type: 'prompt-lab:run:complete',
              payload: { runId, run },
            }));
          }).catch((err) => {
            socket.send(JSON.stringify({ type: 'error', payload: String(err) }));
          });
        }

        if (msg.action === 'prompt-lab:optimize') {
          const { projectId, promptId, targetAccuracy, maxIterations, guidance } = msg.payload as {
            projectId: string;
            promptId: string;
            targetAccuracy?: number;
            maxIterations?: number;
            guidance?: string;
          };
          const runId = uuid();
          let lastIterCount = 0;

          // Create a shared job object for live updates
          const optJob: import('@skill-ide/shared').PromptOptimizationJob = {
            id: runId,
            projectId,
            promptId,
            status: 'running',
            targetAccuracy: targetAccuracy ?? 0.95,
            maxIterations: maxIterations ?? 10,
            guidance: guidance ?? '',
            liveGuidance: [],
            iterations: [],
            bestIteration: 0,
            startedAt: new Date().toISOString(),
          };

          // Poll for new iterations and send via WS
          const pollInterval = setInterval(() => {
            if (optJob.iterations.length > lastIterCount) {
              for (let idx = lastIterCount; idx < optJob.iterations.length; idx++) {
                socket.send(JSON.stringify({
                  type: 'prompt-lab:opt:iteration',
                  payload: { runId, iteration: optJob.iterations[idx] },
                }));
              }
              lastIterCount = optJob.iterations.length;
            }
          }, 1000);

          optimizePrompt({
            projectId,
            promptId,
            targetAccuracy,
            maxIterations,
            guidance,
            job: optJob,
          }).then((job) => {
            clearInterval(pollInterval);
            socket.send(JSON.stringify({
              type: 'prompt-lab:opt:complete',
              payload: { runId, job },
            }));
          }).catch((err) => {
            clearInterval(pollInterval);
            socket.send(JSON.stringify({ type: 'error', payload: String(err) }));
          });
        }
      } catch {
        socket.send(JSON.stringify({ type: 'error', payload: 'Invalid message' }));
      }
    });
  });
};
