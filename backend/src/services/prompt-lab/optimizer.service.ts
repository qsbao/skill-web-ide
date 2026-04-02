import crypto from 'node:crypto';
import type { PromptOptimizationJob, PromptOptimizationIteration, PromptTestCaseResult } from '@skill-ide/shared';
import { runTestSuite } from './runner.service.js';
import { loadSuite } from './suite.service.js';
import { getPrompt } from './prompt.service.js';
import { getLLMClient, getLLMModel } from './llm.service.js';

// ── Meta-Prompt ──

interface FailureCase {
  caseId: string;
  input: string;
  expectedPass: boolean;
  actualPass: boolean;
  issues: string[];
}

function buildMetaPrompt(
  currentPrompt: string,
  promptDescription: string,
  failures: FailureCase[],
  guidance: string
): string {
  const failureBlocks = failures
    .map(
      f => `### Case: ${f.caseId}
Input:
\`\`\`
${f.input}
\`\`\`
Expected: ${f.expectedPass ? 'PASS' : 'FAIL'}
Actual: ${f.actualPass ? 'PASS' : 'FAIL'}
Issues returned: ${JSON.stringify(f.issues)}`
    )
    .join('\n\n---\n\n');

  let prompt = `You are an expert at writing and improving LLM prompts.

## Context
A prompt evaluation system tests whether a prompt produces correct results for various inputs. The LLM receives the prompt + input and returns { pass: boolean, issues: string[], suggestions: string[] }.

## Current Prompt
${currentPrompt}

## Prompt Description
${promptDescription}

## Test Failures
The following test cases produced INCORRECT results with the current prompt:

${failureBlocks}

## Task
Analyze why the current prompt leads to these incorrect evaluations, then write an improved version.

Requirements:
1. The prompt must work for BOTH passing and failing inputs
2. Be specific about what constitutes a pass vs fail
3. Include concrete criteria, not vague instructions
4. Keep the prompt concise (under 500 words)
5. Respond in the same language style as the original prompt`;

  if (guidance) {
    prompt += `

## User Guidance
${guidance}`;
  }

  prompt += `

Return your response in this exact format:

ANALYSIS:
<brief analysis of why the current prompt fails>

IMPROVED PROMPT:
<the improved prompt text, nothing else>`;

  return prompt;
}

function parseMetaPromptResponse(response: string): { analysis: string; improvedPrompt: string } {
  const analysisMatch = response.match(/ANALYSIS:\s*([\s\S]*?)(?=IMPROVED PROMPT:)/i);
  const promptMatch = response.match(/IMPROVED PROMPT:\s*([\s\S]*?)$/i);

  return {
    analysis: analysisMatch?.[1]?.trim() ?? '',
    improvedPrompt: promptMatch?.[1]?.trim() ?? response.trim(),
  };
}

// ── Optimizer ──

export interface OptimizeOptions {
  projectId: string;
  promptId: string;
  targetAccuracy?: number;
  maxIterations?: number;
  guidance?: string;
  onIteration?: (iteration: PromptOptimizationIteration) => void;
  shouldStop?: () => boolean;
  getGuidance?: () => string;
}

export async function optimizePrompt(options: OptimizeOptions): Promise<PromptOptimizationJob> {
  const {
    projectId,
    promptId,
    targetAccuracy = 0.95,
    maxIterations = 10,
    guidance = '',
    onIteration,
    shouldStop,
    getGuidance,
  } = options;

  const promptRecord = await getPrompt(projectId, promptId);
  if (!promptRecord) throw new Error(`Prompt not found: ${projectId}/${promptId}`);

  const suite = await loadSuite(projectId, promptId);
  if (suite.cases.length === 0) throw new Error(`No test cases for ${promptId}`);

  const job: PromptOptimizationJob = {
    id: crypto.randomUUID(),
    projectId,
    promptId,
    status: 'running',
    targetAccuracy,
    maxIterations,
    guidance,
    liveGuidance: [],
    iterations: [],
    bestIteration: 0,
    startedAt: new Date().toISOString(),
  };

  let currentPrompt = promptRecord.prompt;
  let noImprovementCount = 0;

  try {
    for (let i = 0; i < maxIterations; i++) {
      if (shouldStop?.()) {
        job.status = 'stopped';
        break;
      }

      const liveGuide = getGuidance?.();
      if (liveGuide && !job.liveGuidance.includes(liveGuide)) {
        job.liveGuidance.push(liveGuide);
      }

      const run = await runTestSuite({
        projectId,
        promptId,
        promptOverride: currentPrompt,
        concurrency: 3,
      });

      const metrics = run.metrics;
      const allGuidance = [guidance, ...job.liveGuidance].filter(Boolean).join('\n');

      const iteration: PromptOptimizationIteration = {
        iteration: i,
        prompt: currentPrompt,
        metrics,
        failureAnalysis: '',
        improvementRationale: '',
        guidanceUsed: allGuidance,
      };

      if (metrics.accuracy >= targetAccuracy) {
        iteration.failureAnalysis = 'Target accuracy reached.';
        job.iterations.push(iteration);
        onIteration?.(iteration);
        job.status = 'completed';
        break;
      }

      const failures: FailureCase[] = run.results
        .filter(r => !r.correct)
        .map(r => {
          const testCase = suite.cases.find(c => c.id === r.caseId);
          return {
            caseId: r.caseId,
            input: testCase?.input ?? '',
            expectedPass: r.expectedPass,
            actualPass: r.actualPass,
            issues: r.issues,
          };
        });

      const metaPrompt = buildMetaPrompt(currentPrompt, promptRecord.description, failures, allGuidance);
      const llm = getLLMClient();
      const metaResponse = await llm.chat.completions.create({
        model: getLLMModel(),
        messages: [{ role: 'user', content: metaPrompt }],
        temperature: 0.3,
      });

      const responseText = metaResponse.choices[0]?.message?.content ?? '';
      const parsed = parseMetaPromptResponse(responseText);

      iteration.failureAnalysis = parsed.analysis;
      iteration.improvementRationale = `Adjusted prompt based on ${failures.length} failure(s).`;
      iteration.tokenUsage = metaResponse.usage
        ? {
            prompt: metaResponse.usage.prompt_tokens,
            completion: metaResponse.usage.completion_tokens,
            total: metaResponse.usage.total_tokens,
          }
        : undefined;

      job.iterations.push(iteration);
      onIteration?.(iteration);

      const bestMetrics = job.iterations[job.bestIteration].metrics;
      if (metrics.accuracy > bestMetrics.accuracy) {
        job.bestIteration = i;
        noImprovementCount = 0;
      } else {
        noImprovementCount++;
      }

      if (noImprovementCount >= 3) {
        job.status = 'completed';
        break;
      }

      currentPrompt = parsed.improvedPrompt;

      if (i === maxIterations - 1) {
        job.status = 'completed';
      }
    }
  } catch {
    job.status = 'failed';
  }

  job.finishedAt = new Date().toISOString();
  return job;
}
