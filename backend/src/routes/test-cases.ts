import type { FastifyPluginAsync } from 'fastify';
import * as testCaseService from '../services/test-case.service.js';

export const testCaseRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/skills/:id/tests/cases
  app.get<{ Params: { id: string } }>('/:id/tests/cases', async (req) => {
    return testCaseService.listCases(req.params.id);
  });

  // POST /api/skills/:id/tests/cases
  app.post<{ Params: { id: string }; Body: { name: string; type: string; input: string; expectedOutput?: string } }>(
    '/:id/tests/cases',
    async (req, reply) => {
      const testCase = await testCaseService.createCase(req.params.id, req.body as any);
      reply.code(201);
      return testCase;
    },
  );

  // PUT /api/skills/:id/tests/cases/:caseId
  app.put<{ Params: { id: string; caseId: string }; Body: Record<string, unknown> }>(
    '/:id/tests/cases/:caseId',
    async (req, reply) => {
      const updated = await testCaseService.updateCase(req.params.id, req.params.caseId, req.body as any);
      if (!updated) {
        reply.code(404);
        return { error: 'Test case not found' };
      }
      return updated;
    },
  );

  // DELETE /api/skills/:id/tests/cases/:caseId
  app.delete<{ Params: { id: string; caseId: string } }>(
    '/:id/tests/cases/:caseId',
    async (req, reply) => {
      const ok = await testCaseService.deleteCase(req.params.id, req.params.caseId);
      if (!ok) {
        reply.code(404);
        return { error: 'Test case not found' };
      }
      reply.code(204);
    },
  );

  // POST /api/skills/:id/tests/cases/import
  app.post<{ Params: { id: string }; Body: { cases: any[] } }>(
    '/:id/tests/cases/import',
    async (req, reply) => {
      const imported = await testCaseService.importCases(req.params.id, req.body.cases);
      reply.code(201);
      return imported;
    },
  );

  // GET /api/skills/:id/tests/cases/export
  app.get<{ Params: { id: string } }>('/:id/tests/cases/export', async (req) => {
    return testCaseService.exportCases(req.params.id);
  });
};
