import crypto from 'node:crypto';
import pLimit from 'p-limit';
import type { PromptTestRun, PromptTestCaseResult, PromptTestSuite, PromptRunOptions, PromptRunProgress } from '@skill-ide/shared';
import { loadSuite } from './suite.service.js';
import { getPrompt } from './prompt.service.js';
import { evaluatePrompt, getLLMModel } from './llm.service.js';
import { computeMetrics, computeConsistency } from './results.service.js';

export interface RunnerCallbacks {
  onProgress?: (progress: PromptRunProgress) => void;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 1000): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('429') || err.message.includes('rate_limit'));
      if (!isRateLimit || attempt === maxRetries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable');
}

export async function runTestSuite(
  options: PromptRunOptions,
  callbacks?: RunnerCallbacks
): Promise<PromptTestRun> {
  const { projectId, promptId, concurrency = 3, repeatCount = 1, promptOverride } = options;

  const promptRecord = await getPrompt(projectId, promptId);
  if (!promptRecord) throw new Error(`Prompt not found: ${projectId}/${promptId}`);

  const suite = await loadSuite(projectId, promptId);
  if (suite.cases.length === 0) throw new Error(`No test cases for ${promptId}`);

  const promptText = promptOverride ?? promptRecord.prompt;
  const model = promptRecord.model || getLLMModel();
  const allRepeatResults: PromptTestCaseResult[][] = [];

  for (let rep = 0; rep < repeatCount; rep++) {
    const results = await runSingleSuite(suite, promptText, model, concurrency, callbacks?.onProgress);
    allRepeatResults.push(results);
  }

  const primaryResults = allRepeatResults[0];
  const metrics = computeMetrics(primaryResults);
  if (repeatCount > 1) {
    metrics.consistency = computeConsistency(allRepeatResults);
  }

  const promptHash = crypto.createHash('sha256').update(promptText).digest('hex').slice(0, 16);
  const suiteContent = JSON.stringify(suite.cases.map(c => ({ id: c.id, input: c.input, expected: c.expected })));
  const suiteHash = crypto.createHash('sha256').update(suiteContent).digest('hex').slice(0, 16);

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    projectId,
    promptId,
    promptSnapshot: promptText,
    promptHash,
    suiteHash,
    model,
    results: primaryResults,
    metrics,
  };
}

async function runSingleSuite(
  suite: PromptTestSuite,
  prompt: string,
  model: string,
  concurrency: number,
  onProgress?: (progress: PromptRunProgress) => void
): Promise<PromptTestCaseResult[]> {
  const limit = pLimit(concurrency);
  let completed = 0;
  const total = suite.cases.length;

  const tasks = suite.cases.map(testCase =>
    limit(async (): Promise<PromptTestCaseResult> => {
      onProgress?.({ completed, total, currentCase: testCase.id });

      const result = await withRetry(() => evaluatePrompt(testCase.input, prompt, model));

      const outputContainCheck = testCase.expected.outputMustContain?.map(keyword => ({
        keyword,
        found: result.issues.some(issue => issue.toLowerCase().includes(keyword.toLowerCase())),
      }));

      const caseResult: PromptTestCaseResult = {
        caseId: testCase.id,
        input: testCase.input,
        expectedPass: testCase.expected.pass,
        actualPass: result.pass,
        correct: testCase.expected.pass === result.pass,
        issues: result.issues,
        suggestions: result.suggestions,
        rawOutput: result.rawOutput,
        outputContainCheck,
        latencyMs: result.latencyMs,
        tokenUsage: result.tokenUsage,
      };

      completed++;
      onProgress?.({ completed, total, currentCase: testCase.id, latestResult: caseResult });

      return caseResult;
    })
  );

  return Promise.all(tasks);
}
