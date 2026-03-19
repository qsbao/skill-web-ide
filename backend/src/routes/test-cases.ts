import type { FastifyPluginAsync } from 'fastify';
import * as testCaseService from '../services/test-case.service.js';

export const testCaseRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/skills/:author/:name/tests/cases
  app.get<{ Params: { author: string; name: string } }>(
    '/:author/:name/tests/cases',
    async (req) => {
      const slug = `${req.params.author}/${req.params.name}`;
      return testCaseService.listCases(slug);
    },
  );

  // POST /api/skills/:author/:name/tests/cases
  app.post<{
    Params: { author: string; name: string };
    Body: { name: string; type: string; input: string; expectedOutput?: string };
  }>('/:author/:name/tests/cases', async (req, reply) => {
    const slug = `${req.params.author}/${req.params.name}`;
    const testCase = await testCaseService.createCase(slug, req.body as any);
    reply.code(201);
    return testCase;
  });

  // PUT /api/skills/:author/:name/tests/cases/:caseId
  app.put<{
    Params: { author: string; name: string; caseId: string };
    Body: Record<string, unknown>;
  }>('/:author/:name/tests/cases/:caseId', async (req, reply) => {
    const slug = `${req.params.author}/${req.params.name}`;
    const updated = await testCaseService.updateCase(slug, req.params.caseId, req.body as any);
    if (!updated) {
      reply.code(404);
      return { error: 'Test case not found' };
    }
    return updated;
  });

  // DELETE /api/skills/:author/:name/tests/cases/:caseId
  app.delete<{ Params: { author: string; name: string; caseId: string } }>(
    '/:author/:name/tests/cases/:caseId',
    async (req, reply) => {
      const slug = `${req.params.author}/${req.params.name}`;
      const ok = await testCaseService.deleteCase(slug, req.params.caseId);
      if (!ok) {
        reply.code(404);
        return { error: 'Test case not found' };
      }
      reply.code(204);
    },
  );

  // POST /api/skills/:author/:name/tests/cases/import
  app.post<{ Params: { author: string; name: string }; Body: { cases: any[] } }>(
    '/:author/:name/tests/cases/import',
    async (req, reply) => {
      const slug = `${req.params.author}/${req.params.name}`;
      const imported = await testCaseService.importCases(slug, req.body.cases);
      reply.code(201);
      return imported;
    },
  );

  // GET /api/skills/:author/:name/tests/cases/export
  app.get<{ Params: { author: string; name: string } }>(
    '/:author/:name/tests/cases/export',
    async (req) => {
      const slug = `${req.params.author}/${req.params.name}`;
      return testCaseService.exportCases(slug);
    },
  );
};
