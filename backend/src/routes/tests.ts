import type { FastifyPluginAsync } from 'fastify';
import * as testRunner from '../services/test-runner.service.js';
import type { TestType } from '@skill-ide/shared';

export const testRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/skills/:id/tests/run
  app.post<{ Params: { id: string }; Body: { type: TestType } }>(
    '/:id/tests/run',
    async (req) => {
      const run = testRunner.runTest(
        req.params.id,
        req.body.type,
        () => {}, // streaming handled via WS
        () => {},
      );
      return run;
    },
  );

  // GET /api/skills/:id/tests/runs
  app.get<{ Params: { id: string } }>('/:id/tests/runs', async (req) => {
    return testRunner.getTestRuns(req.params.id);
  });
};
