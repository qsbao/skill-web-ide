import type { FastifyPluginAsync } from 'fastify';
import * as fileService from '../services/file.service.js';

export const fileRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/skills/:id/files - file tree
  app.get<{ Params: { id: string } }>('/:id/files', async (req, reply) => {
    try {
      const tree = await fileService.getFileTree(req.params.id);
      return tree;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        reply.code(404);
        return { error: 'Skill directory not found' };
      }
      throw err;
    }
  });

  // GET /api/skills/:id/files/* - read file
  app.get<{ Params: { id: string; '*': string } }>('/:id/files/*', async (req, reply) => {
    try {
      const content = await fileService.readFile(req.params.id, req.params['*']);
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
  });

  // PUT /api/skills/:id/files/* - write file
  app.put<{ Params: { id: string; '*': string }; Body: { content: string } }>(
    '/:id/files/*',
    async (req, reply) => {
      try {
        await fileService.writeFile(req.params.id, req.params['*'], req.body.content);
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

  // POST /api/skills/:id/files/* - create file or dir
  app.post<{ Params: { id: string; '*': string }; Body: { isDir?: boolean } }>(
    '/:id/files/*',
    async (req, reply) => {
      try {
        await fileService.createFile(req.params.id, req.params['*'], req.body?.isDir);
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

  // DELETE /api/skills/:id/files/* - delete file or dir
  app.delete<{ Params: { id: string; '*': string } }>('/:id/files/*', async (req, reply) => {
    try {
      await fileService.deleteFile(req.params.id, req.params['*']);
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
  });
};
