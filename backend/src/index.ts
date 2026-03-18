import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { skillRoutes } from './routes/skills.js';
import { fileRoutes } from './routes/files.js';
import { testRoutes } from './routes/tests.js';
import { testCaseRoutes } from './routes/test-cases.js';
import { wsHandler } from './ws/handler.js';
import fs from 'node:fs/promises';

const app = Fastify({ logger: true });

async function start() {
  // Ensure skills-workspace exists
  await fs.mkdir(config.skillsDir, { recursive: true });

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(websocket);

  // Routes
  await app.register(skillRoutes, { prefix: '/api/skills' });
  await app.register(fileRoutes, { prefix: '/api/skills' });
  await app.register(testRoutes, { prefix: '/api/skills' });
  await app.register(testCaseRoutes, { prefix: '/api/skills' });
  await app.register(wsHandler);

  await app.listen({ port: config.port, host: config.host });
  console.log(`Server listening on http://${config.host}:${config.port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
