// ── Project ──

export interface PromptLabProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// ── Prompt ──

export interface PromptLabPrompt {
  id: string;
  projectId: string;
  name: string;
  description: string;
  prompt: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Test Suite ──

export interface PromptTestSuite {
  promptId: string;
  projectId: string;
  description: string;
  cases: PromptTestCase[];
}

export interface PromptTestCase {
  id: string;
  description: string;
  input: string;
  expected: PromptExpectedResult;
}

export interface PromptExpectedResult {
  pass: boolean;
  outputMustContain?: string[];
}

// ── Test Run ──

export interface PromptTestRun {
  id: string;
  timestamp: string;
  projectId: string;
  promptId: string;
  promptSnapshot: string;
  promptHash: string;
  suiteHash: string;
  model: string;
  results: PromptTestCaseResult[];
  metrics: PromptMetrics;
}

export interface PromptTestCaseResult {
  caseId: string;
  input: string;
  expectedPass: boolean;
  actualPass: boolean;
  correct: boolean;
  issues: string[];
  suggestions: string[];
  rawOutput?: string;
  outputContainCheck?: { keyword: string; found: boolean }[];
  latencyMs: number;
  tokenUsage?: { prompt: number; completion: number; total: number };
}

// ── Metrics ──

export interface PromptMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  totalCases: number;
  passExpected: number;
  failExpected: number;
  consistency?: number;
  avgLatencyMs: number;
}

// ── Comparison ──

export interface PromptRunComparison {
  promptId: string;
  runs: PromptRunSummary[];
  caseDetails: PromptCaseComparison[];
}

export interface PromptRunSummary {
  runId: string;
  timestamp: string;
  suiteHash: string;
  metrics: PromptMetrics;
  prompt: string;
  results: PromptTestCaseResult[];
}

export interface PromptCaseComparison {
  caseId: string;
  input: string;
  perRun: PromptCaseRunDetail[];
}

export interface PromptCaseRunDetail {
  runId: string;
  expectedPass: boolean;
  actualPass: boolean;
  correct: boolean;
  issues: string[];
  suggestions: string[];
  rawOutput?: string;
}

// ── Optimization ──

export interface PromptOptimizationJob {
  id: string;
  projectId: string;
  promptId: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  targetAccuracy: number;
  maxIterations: number;
  guidance: string;
  liveGuidance: string[];
  iterations: PromptOptimizationIteration[];
  bestIteration: number;
  startedAt: string;
  finishedAt?: string;
}

export interface PromptOptimizationIteration {
  iteration: number;
  prompt: string;
  metrics: PromptMetrics;
  failureAnalysis: string;
  improvementRationale: string;
  guidanceUsed: string;
  tokenUsage?: { prompt: number; completion: number; total: number };
}

// ── Runner Options ──

export interface PromptRunOptions {
  projectId: string;
  promptId: string;
  concurrency?: number;
  repeatCount?: number;
  promptOverride?: string;
}

export interface PromptRunProgress {
  completed: number;
  total: number;
  currentCase: string;
}

// ── Async Job Tracking ──

export interface PromptLabJob<T = unknown> {
  id: string;
  type: 'prompt-run' | 'prompt-optimize';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  progress?: PromptRunProgress;
  result?: T;
  error?: string;
  createdAt: string;
}
