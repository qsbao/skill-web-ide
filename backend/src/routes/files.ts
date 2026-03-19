import type { FastifyPluginAsync } from 'fastify';
import * as fileService from '../services/file.service.js';

export const fileRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/skills/:author/:name/files - file tree
  app.get<{ Params: { author: string; name: string } }>(
    '/:author/:name/files',
    async (req, reply) => {
      const slug = `${req.params.author}/${req.params.name}`;
      try {
        const tree = await fileService.getFileTree(slug);
        return tree;
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          reply.code(404);
          return { error: 'Skill directory not found' };
        }
        throw err;
      }
    },
  );

  // GET /api/skills/:author/:name/files/* - read file
  app.get<{ Params: { author: string; name: string; '*': string } }>(
    '/:author/:name/files/*',
    async (req, reply) => {
      const slug = `${req.params.author}/${req.params.name}`;
      try {
        const content = await fileService.readFile(slug, req.params['*']);
        return { path: req.params['*'], content };
      } catch (err: any) {
        if (err.message === 'Path traversal detected') {
          reply.code(403);
          return { error: 'Forbidden' };
        }
        if (err.code === 'ENOENT') {
          reply.code(404);
          return { error: 'File not found' };
        }
        throw err;
      }
    },
  );

  // PUT /api/skills/:author/:name/files/* - write file
  app.put<{ Params: { author: string; name: string; '*': string }; Body: { content: string } }>(
    '/:author/:name/files/*',
    async (req, reply) => {
      const slug = `${req.params.author}/${req.params.name}`;
      try {
        await fileService.writeFile(slug, req.params['*'], req.body.content);
        return { ok: true };
      } catch (err: any) {
        if (err.message === 'Path traversal detected') {
          reply.code(403);
          return { error: 'Forbidden' };
        }
        throw err;
      }
    },
  );

  // POST /api/skills/:author/:name/files/* - create file or dir
  app.post<{ Params: { author: string; name: string; '*': string }; Body: { isDir?: boolean } }>(
    '/:author/:name/files/*',
    async (req, reply) => {
      const slug = `${req.params.author}/${req.params.name}`;
      try {
        await fileService.createFile(slug, req.params['*'], req.body?.isDir);
        reply.code(201);
        return { ok: true };
      } catch (err: any) {
        if (err.message === 'Path traversal detected') {
          reply.code(403);
          return { error: 'Forbidden' };
        }
        throw err;
      }
    },
  );

  // DELETE /api/skills/:author/:name/files/* - delete file or dir
  app.delete<{ Params: { author: string; name: string; '*': string } }>(
    '/:author/:name/files/*',
    async (req, reply) => {
      const slug = `${req.params.author}/${req.params.name}`;
      try {
        await fileService.deleteFile(slug, req.params['*']);
        reply.code(204);
      } catch (err: any) {
        if (err.message === 'Path traversal detected') {
          reply.code(403);
          return { error: 'Forbidden' };
        }
        if (err.code === 'ENOENT') {
          reply.code(404);
          return { error: 'File not found' };
        }
        throw err;
      }
    },
  );
};
