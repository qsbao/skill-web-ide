import { v4 as uuid } from 'uuid';
import { runTestSuite } from '../../services/prompt-lab/runner.service.js';
import { optimizePrompt } from '../../services/prompt-lab/optimizer.service.js';
import * as resultsService from '../../services/prompt-lab/results.service.js';
import type { DomainHandler, WsSender } from '../types.js';
import type { PromptOptimizationJob } from '@skill-ide/shared';

export const promptLabHandler: DomainHandler = {
  prefix: 'prompt-lab',

  handle(action, payload, sender) {
    if (action === 'prompt-lab:run') {
      handleRun(payload as any, sender);
    } else if (action === 'prompt-lab:optimize') {
      handleOptimize(payload as any, sender);
    }
  },
};

function handleRun(
  payload: { projectId: string; promptId: string; concurrency?: number; repeatCount?: number; promptOverride?: string },
  sender: WsSender,
): void {
  const { projectId, promptId, concurrency, repeatCount, promptOverride } = payload;
  const runId = uuid();

  runTestSuite(
    { projectId, promptId, concurrency, repeatCount, promptOverride },
    {
      onProgress: (progress) => {
        sender.send('prompt-lab:run:progress', {
          runId,
          completed: progress.completed,
          total: progress.total,
          currentCase: progress.currentCase,
          latestResult: progress.latestResult,
        });
      },
    },
  )
    .then(async (run) => {
      await resultsService.saveTestRun(run);
      sender.send('prompt-lab:run:complete', { runId, run });
    })
    .catch((err) => {
      sender.send('error', String(err));
    });
}

function handleOptimize(
  payload: { projectId: string; promptId: string; targetAccuracy?: number; maxIterations?: number; guidance?: string },
  sender: WsSender,
): void {
  const { projectId, promptId, targetAccuracy, maxIterations, guidance } = payload;
  const runId = uuid();
  let lastIterCount = 0;

  const optJob: PromptOptimizationJob = {
    id: runId,
    projectId,
    promptId,
    status: 'running',
    targetAccuracy: targetAccuracy ?? 0.95,
    maxIterations: maxIterations ?? 10,
    guidance: guidance ?? '',
    liveGuidance: [],
    iterations: [],
    bestIteration: 0,
    startedAt: new Date().toISOString(),
  };

  const pollInterval = setInterval(() => {
    if (optJob.iterations.length > lastIterCount) {
      for (let idx = lastIterCount; idx < optJob.iterations.length; idx++) {
        sender.send('prompt-lab:opt:iteration', { runId, iteration: optJob.iterations[idx] });
      }
      lastIterCount = optJob.iterations.length;
    }
  }, 1000);

  optimizePrompt({
    projectId,
    promptId,
    targetAccuracy,
    maxIterations,
    guidance,
    job: optJob,
  })
    .then((job) => {
      clearInterval(pollInterval);
      sender.send('prompt-lab:opt:complete', { runId, job });
    })
    .catch((err) => {
      clearInterval(pollInterval);
      sender.send('error', String(err));
    });
}
