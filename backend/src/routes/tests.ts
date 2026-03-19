import type { FastifyPluginAsync } from 'fastify';
import * as testRunner from '../services/test-runner.service.js';
import type { TestType } from '@skill-ide/shared';

export const testRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/skills/:author/:name/tests/run
  app.post<{ Params: { author: string; name: string }; Body: { type: TestType } }>(
    '/:author/:name/tests/run',
    async (req) => {
      const slug = `${req.params.author}/${req.params.name}`;
      const run = testRunner.runTest(
        slug,
        req.body.type,
        () => {}, // streaming handled via WS
        () => {},
      );
      return run;
    },
  );

  // GET /api/skills/:author/:name/tests/runs
  app.get<{ Params: { author: string; name: string } }>(
    '/:author/:name/tests/runs',
    async (req) => {
      const slug = `${req.params.author}/${req.params.name}`;
      return testRunner.getTestRuns(slug);
    },
  );
};
