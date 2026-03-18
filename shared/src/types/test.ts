export type TestType = 'lint' | 'unit' | 'benchmark';
export type TestStatus = 'queued' | 'running' | 'passed' | 'failed' | 'error';

export interface TestCase {
  id: string;
  skillId: string;
  name: string;
  type: TestType;
  input: string;
  expectedOutput?: string;
}

export interface TestResult {
  testCaseId?: string;
  name: string;
  status: TestStatus;
  duration?: number;
  output?: string;
  error?: string;
}

export interface TestRun {
  id: string;
  skillId: string;
  type: TestType;
  status: TestStatus;
  results: TestResult[];
  startedAt: string;
  finishedAt?: string;
}
