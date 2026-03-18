import type { FastifyPluginAsync } from 'fastify';
import * as skillService from '../services/skill.service.js';
import { getReadme } from '../services/readme.service.js';
import { importSkillFromZip } from '../services/import.service.js';

export const skillRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/skills?search=&tags=&author=
  app.get<{ Querystring: { search?: string; tags?: string; author?: string } }>(
    '/',
    async (req) => {
      const { search, tags, author } = req.query;
      if (search || tags || author) {
        return skillService.searchSkills({
          search,
          tags: tags ? tags.split(',') : undefined,
          author,
        });
      }
      return skillService.listSkills();
    },
  );

  // POST /api/skills
  app.post<{ Body: { name: string; description?: string; author?: string; tags?: string[] } }>(
    '/',
    async (req, reply) => {
      const skill = await skillService.createSkill(req.body);
      reply.code(201);
      return skill;
    },
  );

  // GET /api/skills/:author/:name
  app.get<{ Params: { author: string; name: string } }>(
    '/:author/:name',
    async (req, reply) => {
      const slug = `${req.params.author}/${req.params.name}`;
      const skill = await skillService.getSkill(slug);
      if (!skill) {
        reply.code(404);
        return { error: 'Skill not found' };
      }
      return skill;
    },
  );

  // PUT /api/skills/:author/:name
  app.put<{ Params: { author: string; name: string }; Body: Record<string, unknown> }>(
    '/:author/:name',
    async (req, reply) => {
      const slug = `${req.params.author}/${req.params.name}`;
      const skill = await skillService.updateSkill(slug, req.body as any);
      if (!skill) {
        reply.code(404);
        return { error: 'Skill not found' };
      }
      return skill;
    },
  );

  // DELETE /api/skills/:author/:name
  app.delete<{ Params: { author: string; name: string } }>(
    '/:author/:name',
    async (req, reply) => {
      const slug = `${req.params.author}/${req.params.name}`;
      const ok = await skillService.deleteSkill(slug);
      if (!ok) {
        reply.code(404);
        return { error: 'Skill not found' };
      }
      reply.code(204);
    },
  );

  // GET /api/skills/:author/:name/readme
  app.get<{ Params: { author: string; name: string } }>(
    '/:author/:name/readme',
    async (req) => {
      const slug = `${req.params.author}/${req.params.name}`;
      return getReadme(slug);
    },
  );

  // POST /api/skills/upload
  app.post('/upload', async (req, reply) => {
    const data = await req.file();
    if (!data) {
      reply.code(400);
      return { error: 'No file uploaded' };
    }
    const buffer = await data.toBuffer();
    const skill = await importSkillFromZip(buffer, data.filename);
    reply.code(201);
    return skill;
  });

  // POST /api/skills/:author/:name/copy
  app.post<{ Params: { author: string; name: string }; Body: { targetAuthor?: string } }>(
    '/:author/:name/copy',
    async (req, reply) => {
      const slug = `${req.params.author}/${req.params.name}`;
      const copied = await skillService.copySkill(slug, req.body?.targetAuthor);
      if (!copied) {
        reply.code(404);
        return { error: 'Skill not found' };
      }
      reply.code(201);
      return copied;
    },
  );
};
