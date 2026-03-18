import type { FastifyPluginAsync } from 'fastify';
import * as skillService from '../services/skill.service.js';

export const skillRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/skills
  app.get('/', async () => {
    return skillService.listSkills();
  });

  // POST /api/skills
  app.post<{ Body: { name: string; description?: string; author?: string; tags?: string[] } }>(
    '/',
    async (req, reply) => {
      const skill = await skillService.createSkill(req.body);
      reply.code(201);
      return skill;
    },
  );

  // GET /api/skills/:id
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const skill = await skillService.getSkill(req.params.id);
    if (!skill) {
      reply.code(404);
      return { error: 'Skill not found' };
    }
    return skill;
  });

  // PUT /api/skills/:id
  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/:id',
    async (req, reply) => {
      const skill = await skillService.updateSkill(req.params.id, req.body as any);
      if (!skill) {
        reply.code(404);
        return { error: 'Skill not found' };
      }
      return skill;
    },
  );

  // DELETE /api/skills/:id
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const ok = await skillService.deleteSkill(req.params.id);
    if (!ok) {
      reply.code(404);
      return { error: 'Skill not found' };
    }
    reply.code(204);
  });
};
