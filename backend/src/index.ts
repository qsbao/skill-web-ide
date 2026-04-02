import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { skillRoutes } from './routes/skills.js';
import { fileRoutes } from './routes/files.js';
import { testRoutes } from './routes/tests.js';
import { testCaseRoutes } from './routes/test-cases.js';
import { runRoutes } from './routes/runs.js';
import { sessionRoutes } from './routes/sessions.js';
import { promptLabRoutes } from './routes/prompt-lab.js';
import { wsHandler } from './ws/handler.js';
import { initRepo } from './services/skill.service.js';
import fs from 'node:fs/promises';

const app = Fastify({ logger: true });

async function start() {
  // Ensure directories exist
  await fs.mkdir(config.skillsDir, { recursive: true });
  await fs.mkdir(config.runsDir, { recursive: true });
  await fs.mkdir(config.sessionsDir, { recursive: true });
  await fs.mkdir(config.promptLabDir, { recursive: true });

  // Init git repo in skills-workspace
  await initRepo();

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
  await app.register(websocket);

  // Routes
  await app.register(skillRoutes, { prefix: '/api/skills' });
  await app.register(fileRoutes, { prefix: '/api/skills' });
  await app.register(testRoutes, { prefix: '/api/skills' });
  await app.register(testCaseRoutes, { prefix: '/api/skills' });
  await app.register(runRoutes, { prefix: '/api/skills' });
  await app.register(sessionRoutes, { prefix: '/api' });
  await app.register(promptLabRoutes, { prefix: '/api/prompt-lab' });
  await app.register(wsHandler);

  await app.listen({ port: config.port, host: config.host });
  console.log(`Server listening on http://${config.host}:${config.port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
