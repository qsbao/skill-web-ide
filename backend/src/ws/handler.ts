import type { FastifyPluginAsync } from 'fastify';
import * as testRunner from '../services/test-runner.service.js';
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
      } catch {
        socket.send(JSON.stringify({ type: 'error', payload: 'Invalid message' }));
      }
    });
  });
};
