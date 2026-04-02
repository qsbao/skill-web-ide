import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import * as projectService from '../services/prompt-lab/project.service.js';
import * as promptService from '../services/prompt-lab/prompt.service.js';
import * as suiteService from '../services/prompt-lab/suite.service.js';
import * as resultsService from '../services/prompt-lab/results.service.js';
import { runTestSuite } from '../services/prompt-lab/runner.service.js';
import { optimizePrompt } from '../services/prompt-lab/optimizer.service.js';
import { updatePrompt } from '../services/prompt-lab/prompt.service.js';
import { createJob, updateJob, getJob, listJobs } from '../services/prompt-lab/jobs.service.js';
import type { PromptOptimizationJob } from '@skill-ide/shared';

const optimizationJobs = new Map<string, PromptOptimizationJob>();
const stopSignals = new Map<string, boolean>();
const liveGuidance = new Map<string, string>();

export async function promptLabRoutes(app: FastifyInstance) {
  // ── Projects ──

  app.get('/projects', async () => {
    return projectService.listProjects();
  });

  app.post<{ Body: { name: string; description?: string } }>('/projects', async (req, reply) => {
    const project = await projectService.createProject(req.body);
    return reply.status(201).send(project);
  });

  app.get<{ Params: { projectId: string } }>('/projects/:projectId', async (req, reply) => {
    const project = await projectService.getProject(req.params.projectId);
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    return project;
  });

  app.put<{ Params: { projectId: string }; Body: { name?: string; description?: string } }>(
    '/projects/:projectId',
    async (req, reply) => {
      const project = await projectService.updateProject(req.params.projectId, req.body);
      if (!project) return reply.status(404).send({ error: 'Project not found' });
      return project;
    }
  );

  app.delete<{ Params: { projectId: string } }>('/projects/:projectId', async (req, reply) => {
    await projectService.deleteProject(req.params.projectId);
    return reply.status(204).send();
  });

  // ── Prompts ──

  app.get<{ Params: { projectId: string } }>('/projects/:projectId/prompts', async (req) => {
    return promptService.listPrompts(req.params.projectId);
  });

  app.post<{ Params: { projectId: string }; Body: { name: string; description?: string; prompt?: string; model?: string } }>(
    '/projects/:projectId/prompts',
    async (req, reply) => {
      const prompt = await promptService.createPrompt(req.params.projectId, req.body);
      return reply.status(201).send(prompt);
    }
  );

  app.get<{ Params: { projectId: string; promptId: string } }>(
    '/projects/:projectId/prompts/:promptId',
    async (req, reply) => {
      const prompt = await promptService.getPrompt(req.params.projectId, req.params.promptId);
      if (!prompt) return reply.status(404).send({ error: 'Prompt not found' });
      return prompt;
    }
  );

  app.put<{ Params: { projectId: string; promptId: string }; Body: { name?: string; description?: string; prompt?: string; model?: string } }>(
    '/projects/:projectId/prompts/:promptId',
    async (req, reply) => {
      const prompt = await promptService.updatePrompt(req.params.projectId, req.params.promptId, req.body);
      if (!prompt) return reply.status(404).send({ error: 'Prompt not found' });
      return prompt;
    }
  );

  app.delete<{ Params: { projectId: string; promptId: string } }>(
    '/projects/:projectId/prompts/:promptId',
    async (req, reply) => {
      await promptService.deletePrompt(req.params.projectId, req.params.promptId);
      return reply.status(204).send();
    }
  );

  // ── Test Suites ──

  app.get<{ Params: { projectId: string; promptId: string } }>(
    '/projects/:projectId/prompts/:promptId/suite',
    async (req) => {
      return suiteService.loadSuite(req.params.projectId, req.params.promptId);
    }
  );

  app.put<{ Params: { projectId: string; promptId: string }; Body: { description?: string; cases?: any[] } }>(
    '/projects/:projectId/prompts/:promptId/suite',
    async (req) => {
      const suite = await suiteService.loadSuite(req.params.projectId, req.params.promptId);
      if (req.body.description !== undefined) suite.description = req.body.description;
      if (req.body.cases !== undefined) suite.cases = req.body.cases;
      await suiteService.saveSuite(req.params.projectId, req.params.promptId, suite);
      return suite;
    }
  );

  app.post<{ Params: { projectId: string; promptId: string }; Body: { description: string; input: string; expected: { pass: boolean; outputMustContain?: string[] } } }>(
    '/projects/:projectId/prompts/:promptId/suite/cases',
    async (req, reply) => {
      const testCase = await suiteService.addCase(req.params.projectId, req.params.promptId, req.body);
      return reply.status(201).send(testCase);
    }
  );

  app.put<{ Params: { projectId: string; promptId: string; caseId: string }; Body: { description?: string; input?: string; expected?: { pass: boolean; outputMustContain?: string[] } } }>(
    '/projects/:projectId/prompts/:promptId/suite/cases/:caseId',
    async (req, reply) => {
      const testCase = await suiteService.updateCase(req.params.projectId, req.params.promptId, req.params.caseId, req.body);
      if (!testCase) return reply.status(404).send({ error: 'Case not found' });
      return testCase;
    }
  );

  app.delete<{ Params: { projectId: string; promptId: string; caseId: string } }>(
    '/projects/:projectId/prompts/:promptId/suite/cases/:caseId',
    async (req, reply) => {
      const ok = await suiteService.deleteCase(req.params.projectId, req.params.promptId, req.params.caseId);
      if (!ok) return reply.status(404).send({ error: 'Case not found' });
      return reply.status(204).send();
    }
  );

  // ── Runs ──

  app.post<{ Params: { projectId: string; promptId: string }; Body: { concurrency?: number; repeatCount?: number } }>(
    '/projects/:projectId/prompts/:promptId/runs',
    async (req) => {
      const jobId = crypto.randomUUID();
      createJob(jobId, 'prompt-run');
      updateJob(jobId, { status: 'running' });

      (async () => {
        try {
          const run = await runTestSuite(
            { projectId: req.params.projectId, promptId: req.params.promptId, ...req.body },
            { onProgress: p => updateJob(jobId, { progress: p }) }
          );
          await resultsService.saveTestRun(run);
          updateJob(jobId, { status: 'completed', result: run });
        } catch (err: any) {
          updateJob(jobId, { status: 'failed', error: err.message });
        }
      })();

      return { jobId };
    }
  );

  app.get<{ Params: { projectId: string; promptId: string } }>(
    '/projects/:projectId/prompts/:promptId/runs',
    async (req) => {
      const jobs = listJobs('prompt-run');
      const stored = await resultsService.loadAllRuns(req.params.projectId, req.params.promptId);
      return { activeJobs: jobs.filter(j => j.status === 'running'), recentRuns: stored.slice(0, 50) };
    }
  );

  app.get<{ Params: { projectId: string; promptId: string; runId: string } }>(
    '/projects/:projectId/prompts/:promptId/runs/:runId',
    async (req, reply) => {
      const job = getJob(req.params.runId);
      if (job) return job;

      const run = await resultsService.loadRunById(req.params.projectId, req.params.promptId, req.params.runId);
      if (run) return run;

      return reply.status(404).send({ error: 'Run not found' });
    }
  );

  // ── Comparison ──

  app.get<{ Params: { projectId: string; promptId: string }; Querystring: { ids: string } }>(
    '/projects/:projectId/prompts/:promptId/compare',
    async (req, reply) => {
      const runIds = (req.query.ids || '').split(',').filter(Boolean);
      if (runIds.length < 2) return reply.status(400).send({ error: 'Provide at least 2 run IDs' });

      const runs = (await Promise.all(
        runIds.map(id => resultsService.loadRunById(req.params.projectId, req.params.promptId, id))
      )).filter(Boolean);

      if (runs.length < 2) return reply.status(404).send({ error: 'Some runs not found' });
      return resultsService.compareMultipleRuns(runs as any);
    }
  );

  // ── Optimization ──

  app.post<{ Params: { projectId: string; promptId: string }; Body: { targetAccuracy?: number; maxIterations?: number; guidance?: string } }>(
    '/projects/:projectId/prompts/:promptId/optimize',
    async (req) => {
      const { projectId, promptId } = req.params;
      const jobId = crypto.randomUUID();
      createJob(jobId, 'prompt-optimize');
      updateJob(jobId, { status: 'running' });
      stopSignals.set(jobId, false);

      optimizationJobs.set(jobId, {
        id: jobId,
        projectId,
        promptId,
        status: 'running',
        targetAccuracy: req.body.targetAccuracy ?? 0.95,
        maxIterations: req.body.maxIterations ?? 10,
        guidance: req.body.guidance ?? '',
        liveGuidance: [],
        iterations: [],
        bestIteration: 0,
        startedAt: new Date().toISOString(),
      });

      (async () => {
        try {
          const result = await optimizePrompt({
            projectId,
            promptId,
            ...req.body,
            onIteration: iter => {
              const current = optimizationJobs.get(jobId);
              if (current) current.iterations.push(iter);
            },
            shouldStop: () => stopSignals.get(jobId) === true,
            getGuidance: () => liveGuidance.get(jobId) ?? '',
          });
          optimizationJobs.set(jobId, result);
          updateJob(jobId, { status: result.status, result });
        } catch (err: any) {
          updateJob(jobId, { status: 'failed', error: err.message });
        }
      })();

      return { jobId };
    }
  );

  app.get<{ Params: { projectId: string; promptId: string; jobId: string } }>(
    '/projects/:projectId/prompts/:promptId/optimize/:jobId',
    async (req, reply) => {
      const optJob = optimizationJobs.get(req.params.jobId);
      if (optJob) return optJob;

      const job = getJob(req.params.jobId);
      if (job) return job;

      return reply.status(404).send({ error: 'Job not found' });
    }
  );

  app.post<{ Params: { projectId: string; promptId: string; jobId: string } }>(
    '/projects/:projectId/prompts/:promptId/optimize/:jobId/stop',
    async (req, reply) => {
      if (!optimizationJobs.has(req.params.jobId)) {
        return reply.status(404).send({ error: 'Job not found' });
      }
      stopSignals.set(req.params.jobId, true);
      return { ok: true };
    }
  );

  app.post<{ Params: { projectId: string; promptId: string; jobId: string }; Body: { guidance: string } }>(
    '/projects/:projectId/prompts/:promptId/optimize/:jobId/guide',
    async (req, reply) => {
      const optJob = optimizationJobs.get(req.params.jobId);
      if (!optJob) return reply.status(404).send({ error: 'Job not found' });
      liveGuidance.set(req.params.jobId, req.body.guidance);
      optJob.liveGuidance.push(req.body.guidance);
      return { ok: true };
    }
  );

  app.post<{ Params: { projectId: string; promptId: string; jobId: string } }>(
    '/projects/:projectId/prompts/:promptId/optimize/:jobId/apply',
    async (req, reply) => {
      const optJob = optimizationJobs.get(req.params.jobId);
      if (!optJob) return reply.status(404).send({ error: 'Job not found' });

      const best = optJob.iterations[optJob.bestIteration];
      if (!best) return reply.status(400).send({ error: 'No iterations completed' });

      await updatePrompt(req.params.projectId, req.params.promptId, { prompt: best.prompt });
      return { ok: true, prompt: best.prompt };
    }
  );

  app.get<{ Params: { projectId: string; promptId: string } }>(
    '/projects/:projectId/prompts/:promptId/optimize',
    async () => {
      return Array.from(optimizationJobs.values());
    }
  );
}
