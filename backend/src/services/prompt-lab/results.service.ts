import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  PromptTestRun,
  PromptTestCaseResult,
  PromptMetrics,
  PromptRunComparison,
  PromptRunSummary,
  PromptCaseComparison,
} from '@skill-ide/shared';
import { config } from '../../config.js';

function resultsDir(projectId: string, promptId: string): string {
  return path.join(config.promptLabDir, projectId, 'prompts', promptId, 'results');
}

// ── Persistence ──

export async function saveTestRun(run: PromptTestRun): Promise<void> {
  const dir = resultsDir(run.projectId, run.promptId);
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${run.id}.json`;
  await fs.writeFile(path.join(dir, fileName), JSON.stringify(run, null, 2), 'utf-8');
}

export async function loadAllRuns(projectId: string, promptId: string): Promise<PromptTestRun[]> {
  const dir = resultsDir(projectId, promptId);
  try {
    const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json'));
    const runs: PromptTestRun[] = [];
    for (const file of files) {
      const raw = await fs.readFile(path.join(dir, file), 'utf-8');
      runs.push(JSON.parse(raw));
    }
    return runs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    return [];
  }
}

export async function loadRunById(projectId: string, promptId: string, runId: string): Promise<PromptTestRun | undefined> {
  try {
    const raw = await fs.readFile(path.join(resultsDir(projectId, promptId), `${runId}.json`), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// ── Metrics ──

export function computeMetrics(results: PromptTestCaseResult[]): PromptMetrics {
  const total = results.length;
  if (total === 0) {
    return { accuracy: 0, precision: 0, recall: 0, f1: 0, totalCases: 0, passExpected: 0, failExpected: 0, avgLatencyMs: 0, totalLatencyMs: 0, totalTokens: 0 };
  }

  let tp = 0, fp = 0, fn = 0, tn = 0;
  let totalLatency = 0;
  let totalTokens = 0;

  for (const r of results) {
    totalLatency += r.latencyMs;
    totalTokens += r.tokenUsage?.total ?? 0;
    if (r.expectedPass && r.actualPass) tp++;
    else if (!r.expectedPass && r.actualPass) fp++;
    else if (r.expectedPass && !r.actualPass) fn++;
    else tn++;
  }

  const accuracy = (tp + tn) / total;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    accuracy,
    precision,
    recall,
    f1,
    totalCases: total,
    passExpected: tp + fn,
    failExpected: fp + tn,
    avgLatencyMs: totalLatency / total,
    totalLatencyMs: totalLatency,
    totalTokens,
  };
}

export function computeConsistency(runs: PromptTestCaseResult[][]): number {
  if (runs.length <= 1) return 1;

  const caseIds = runs[0].map(r => r.caseId);
  let totalAgreement = 0;

  for (const caseId of caseIds) {
    const verdicts = runs.map(run => run.find(r => r.caseId === caseId)?.actualPass);
    const passCount = verdicts.filter(v => v === true).length;
    const failCount = verdicts.filter(v => v === false).length;
    totalAgreement += Math.max(passCount, failCount) / runs.length;
  }

  return totalAgreement / caseIds.length;
}

// ── Comparison ──

export function compareMultipleRuns(runs: PromptTestRun[]): PromptRunComparison {
  if (runs.length < 2) throw new Error('Need at least 2 runs to compare');

  const promptId = runs[0].promptId;

  const runSummaries: PromptRunSummary[] = runs.map(r => ({
    runId: r.id,
    timestamp: r.timestamp,
    suiteHash: r.suiteHash,
    promptVersion: r.promptVersion,
    metrics: r.metrics,
    prompt: r.promptSnapshot,
    results: r.results,
  }));

  const allCaseIds = new Set<string>();
  for (const run of runs) {
    for (const result of run.results) {
      allCaseIds.add(result.caseId);
    }
  }

  const caseDetails: PromptCaseComparison[] = [];
  for (const caseId of allCaseIds) {
    const firstResult = runs.map(r => r.results.find(res => res.caseId === caseId)).find(Boolean);
    const input = firstResult?.input ?? '';

    const perRun = runs.map(run => {
      const result = run.results.find(r => r.caseId === caseId);
      return {
        runId: run.id,
        expectedPass: result?.expectedPass ?? false,
        actualPass: result?.actualPass ?? false,
        correct: result?.correct ?? false,
        issues: result?.issues ?? [],
        suggestions: result?.suggestions ?? [],
        rawOutput: result?.rawOutput,
      };
    });

    caseDetails.push({ caseId, input, perRun });
  }

  return { promptId, runs: runSummaries, caseDetails };
}
