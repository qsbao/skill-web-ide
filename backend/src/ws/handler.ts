import type { FastifyPluginAsync } from 'fastify';
import { v4 as uuid } from 'uuid';
import * as testRunner from '../services/test-runner.service.js';
import * as runService from '../services/run.service.js';
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
          const { skillId, prompt, sessionId } = msg.payload as {
            skillId: string;
            prompt: string;
            sessionId?: string;
          };
          const runId = uuid();

          runService.runPlaygroundChat(
            skillId,
            prompt,
            (text) => {
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
            },
            (newSessionId) => {
              socket.send(JSON.stringify({
                type: 'playground:chat:session',
                payload: { runId, sessionId: newSessionId },
              }));
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

          runService.runSkill(
            skillId,
            prompt,
            (stream, data) => {
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
