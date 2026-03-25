import type { FastifyPluginAsync } from 'fastify';
import * as sessionService from '../services/session.service.js';

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  // List sessions
  app.get('/sessions', async (req) => {
    const { skillId } = req.query as { skillId?: string };
    return sessionService.listSessions(skillId);
  });

  // Get session detail
  app.get<{ Params: { sessionId: string } }>('/sessions/:sessionId', async (req, reply) => {
    const session = await sessionService.getSession(req.params.sessionId);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    return session;
  });

  // Delete session
  app.delete<{ Params: { sessionId: string } }>('/sessions/:sessionId', async (req, reply) => {
    const deleted = await sessionService.deleteSession(req.params.sessionId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    return reply.status(204).send();
  });
};
