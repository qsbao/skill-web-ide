import type { FastifyPluginAsync } from 'fastify';
import { createRouter } from './router.js';
import { createSender } from './sender.js';
import { testHandler } from './handlers/test.handler.js';
import { runHandler } from './handlers/run.handler.js';
import { makePlaygroundHandler } from './handlers/playground.handler.js';
import { promptLabHandler } from './handlers/prompt-lab.handler.js';
import { createPlaygroundSessionManager, FsSessionStore, RealClaudeCli } from '../services/playground/index.js';
import { config } from '../config.js';

const store = new FsSessionStore();
const cli = new RealClaudeCli(config.skillsDir, config.runsDir);
const playgroundManager = createPlaygroundSessionManager({
  cli,
  store,
  skillsDir: config.skillsDir,
  runsDir: config.runsDir,
});
const playgroundHandler = makePlaygroundHandler(playgroundManager);

const router = createRouter([testHandler, runHandler, playgroundHandler, promptLabHandler]);

export const wsHandler: FastifyPluginAsync = async (app) => {
  app.get('/ws', { websocket: true }, (socket) => {
    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        const sender = createSender(socket);
        router.dispatch(msg.action, msg.payload, sender);
      } catch {
        socket.send(JSON.stringify({ type: 'error', payload: 'Invalid message' }));
      }
    });
  });
};
