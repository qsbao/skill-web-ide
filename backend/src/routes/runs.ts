import type { FastifyPluginAsync } from 'fastify';
import * as runService from '../services/run.service.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runRoutes: FastifyPluginAsync = async (app) => {
  // List runs for a skill
  app.get('/:author/:name/runs', async (req) => {
    const { author, name } = req.params as { author: string; name: string };
    const skillId = `@${author}/${name}`;
    return runService.getSkillRuns(skillId);
  });

  // Get output file tree for a run
  app.get('/:author/:name/runs/:runId/files', async (req) => {
    const { runId } = req.params as { runId: string };
    return runService.getRunFiles(runId);
  });

  // Read an output file
  app.get('/:author/:name/runs/:runId/files/*', async (req, reply) => {
    const { runId } = req.params as { runId: string };
    const filePath = (req.params as any)['*'];
    try {
      const content = await runService.readRunFile(runId, filePath);
      return { path: filePath, content };
    } catch {
      return reply.status(404).send({ error: 'File not found' });
    }
  });

  // Download an output file
  app.get('/:author/:name/runs/:runId/download/*', async (req, reply) => {
    const { runId } = req.params as { runId: string };
    const filePath = (req.params as any)['*'];
    try {
      const absPath = runService.getRunFilePath(runId, filePath);
      const stat = await fs.stat(absPath);
      const stream = await fs.readFile(absPath);
      const fileName = path.basename(filePath);
      return reply
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .header('Content-Length', stat.size)
        .type('application/octet-stream')
        .send(stream);
    } catch {
      return reply.status(404).send({ error: 'File not found' });
    }
  });

  // Cancel a run
  app.post('/:author/:name/runs/:runId/cancel', async (req, reply) => {
    const { runId } = req.params as { runId: string };
    const cancelled = runService.cancelRun(runId);
    if (!cancelled) return reply.status(404).send({ error: 'Run not found or already finished' });
    return { ok: true };
  });
};
