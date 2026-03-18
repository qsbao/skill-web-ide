import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { v4 as uuid } from 'uuid';
import { config } from '../config.js';
import type { TestRun, TestType, TestStatus } from '@skill-ide/shared';

const TIMEOUT_MS = 60_000;
const activeProcesses = new Map<string, ChildProcess>();
const runs = new Map<string, TestRun>();

export type OutputCallback = (stream: 'stdout' | 'stderr', data: string) => void;
export type StatusCallback = (status: TestStatus) => void;

export function getTestRuns(skillId: string): TestRun[] {
  return Array.from(runs.values())
    .filter((r) => r.skillId === skillId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function runTest(
  skillId: string,
  type: TestType,
  onOutput: OutputCallback,
  onStatus: StatusCallback,
): TestRun {
  const id = uuid();
  const run: TestRun = {
    id,
    skillId,
    type,
    status: 'running',
    results: [],
    startedAt: new Date().toISOString(),
  };
  runs.set(id, run);
  onStatus('running');

  const skillDir = path.join(config.skillsDir, skillId);
  let cmd: string;
  let args: string[];

  switch (type) {
    case 'lint':
      cmd = 'npx';
      args = ['eslint', '.'];
      break;
    case 'unit':
      cmd = 'npx';
      args = ['vitest', 'run'];
      break;
    case 'benchmark':
      cmd = 'npx';
      args = ['vitest', 'bench'];
      break;
  }

  const child = spawn(cmd, args, {
    cwd: skillDir,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  activeProcesses.set(id, child);

  child.stdout?.on('data', (data: Buffer) => {
    onOutput('stdout', data.toString());
  });

  child.stderr?.on('data', (data: Buffer) => {
    onOutput('stderr', data.toString());
  });

  const timeout = setTimeout(() => {
    child.kill('SIGTERM');
    run.status = 'error';
    run.results.push({ name: 'timeout', status: 'error', error: `Test timed out after ${TIMEOUT_MS}ms` });
    run.finishedAt = new Date().toISOString();
    onStatus('error');
    activeProcesses.delete(id);
  }, TIMEOUT_MS);

  child.on('close', (code) => {
    clearTimeout(timeout);
    activeProcesses.delete(id);
    if (run.status === 'error') return; // already handled by timeout

    run.status = code === 0 ? 'passed' : 'failed';
    run.finishedAt = new Date().toISOString();
    runs.set(id, run);
    onStatus(run.status);
  });

  return run;
}

export function cancelRun(runId: string): boolean {
  const child = activeProcesses.get(runId);
  if (child) {
    child.kill('SIGTERM');
    activeProcesses.delete(runId);
    const run = runs.get(runId);
    if (run) {
      run.status = 'error';
      run.finishedAt = new Date().toISOString();
    }
    return true;
  }
  return false;
}
