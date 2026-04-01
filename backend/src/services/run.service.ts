import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { v4 as uuid } from 'uuid';
import { config } from '../config.js';
import type { SkillRun, RunStatus, SkillFile } from '@skill-ide/shared';

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const activeProcesses = new Map<string, ChildProcess>();
const runs = new Map<string, SkillRun>();
// Map Claude session ID → work directory for proper resume
const sessionWorkDirs = new Map<string, string>();

export type OutputCallback = (stream: 'stdout' | 'stderr', data: string) => void;
export type StatusCallback = (status: RunStatus) => void;
export type ChatOutputCallback = (text: string) => void;
export type ChatSessionCallback = (sessionId: string) => void;

export function getSkillRuns(skillId: string): SkillRun[] {
  return Array.from(runs.values())
    .filter((r) => r.skillId === skillId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function getSkillDir(skillId: string): string {
  return path.join(config.skillsDir, skillId);
}

function getRunDir(runId: string): string {
  return path.join(config.runsDir, runId);
}

// --- Shared helpers ---

function createRun(id: string, skillId: string, prompt: string): SkillRun {
  const run: SkillRun = {
    id,
    skillId,
    prompt,
    status: 'running',
    startedAt: new Date().toISOString(),
  };
  runs.set(id, run);
  return run;
}

async function setupWorkDir(
  skillId: string,
  runId: string,
  reuseDir?: string,
): Promise<{ workDir: string; symlinkTarget: string }> {
  const skillDir = getSkillDir(skillId);
  const workDir = reuseDir || getRunDir(runId);
  await fs.mkdir(workDir, { recursive: true });

  const skillsLinkDir = path.join(workDir, '.claude', 'skills');
  await fs.mkdir(skillsLinkDir, { recursive: true });
  const skillName = skillId.replace(/^@[^/]+\//, '');
  const symlinkTarget = path.join(skillsLinkDir, skillName);
  try {
    await fs.symlink(skillDir, symlinkTarget, 'junction');
  } catch (err: any) {
    if (err.code !== 'EEXIST') throw err;
  }

  return { workDir, symlinkTarget };
}

interface SpawnOptions {
  cmd: string;
  workDir: string;
  run: SkillRun;
  onText: (text: string) => void;
  onError: (text: string) => void;
  onStatus: StatusCallback;
  onStdoutEvent?: (event: any) => void;
}

function spawnClaude(opts: SpawnOptions): ChildProcess {
  const { cmd, workDir, run, onText, onError, onStatus, onStdoutEvent } = opts;

  const child = spawn(cmd, [], {
    cwd: workDir,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      // Clear proxy settings so claude CLI connects directly to custom model endpoints
      HTTP_PROXY: '',
      HTTPS_PROXY: '',
      http_proxy: '',
      https_proxy: '',
    },
  });

  activeProcesses.set(run.id, child);

  let buffer = '';
  let hasStreamedText = false;
  child.stdout?.on('data', (data: Buffer) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        // Let caller handle custom event logic (e.g. session ID extraction)
        onStdoutEvent?.(event);
        // Stream text deltas
        if (event.type === 'stream_event' && event.event?.type === 'content_block_delta') {
          const delta = event.event.delta;
          if (delta?.type === 'text_delta' && delta.text) {
            hasStreamedText = true;
            onText(delta.text);
          }
        }
        // Handle result type — only emit if we didn't already stream the text via deltas
        if (event.type === 'result' && event.result && !hasStreamedText) {
          const text = typeof event.result === 'string' ? event.result : event.result.text;
          if (text) onText(text);
        }
      } catch {
        // Not valid stream-json — output as raw text (e.g. custom models)
        onText(line + '\n');
      }
    }
  });

  child.stderr?.on('data', (data: Buffer) => {
    onError(data.toString());
  });

  const timeout = setTimeout(() => {
    child.kill('SIGTERM');
    run.status = 'error';
    run.finishedAt = new Date().toISOString();
    onError(`\nRun timed out after ${TIMEOUT_MS / 1000}s\n`);
    onStatus('error');
    activeProcesses.delete(run.id);
  }, TIMEOUT_MS);

  child.on('error', (err) => {
    clearTimeout(timeout);
    activeProcesses.delete(run.id);
    run.status = 'error';
    run.finishedAt = new Date().toISOString();
    runs.set(run.id, run);
    onError(`\nFailed to start process: ${err.message}\n`);
    onStatus('error');
  });

  child.on('close', (code) => {
    clearTimeout(timeout);
    activeProcesses.delete(run.id);
    if (run.status === 'error') return; // already handled by timeout or spawn error

    run.status = code === 0 ? 'completed' : 'failed';
    run.finishedAt = new Date().toISOString();
    runs.set(run.id, run);
    onStatus(run.status);
  });

  return child;
}

function buildCmd(prompt: string, extraArgs: string[] = []): string {
  const escapedPrompt = prompt.replace(/"/g, '\\"');
  const base = `claude -p "${escapedPrompt}" --verbose --output-format stream-json --include-partial-messages --allowedTools "Write,Edit,Bash,Read,Glob,Grep"`;
  return extraArgs.length ? `${base} ${extraArgs.join(' ')}` : base;
}

// --- Public API ---

export async function runSkill(
  skillId: string,
  prompt: string,
  onOutput: OutputCallback,
  onStatus: StatusCallback,
  runId?: string,
): Promise<SkillRun> {
  const id = runId || uuid();
  const run = createRun(id, skillId, prompt);
  onStatus('running');

  const { workDir, symlinkTarget } = await setupWorkDir(skillId, id);
  const cmd = buildCmd(prompt);

  onOutput('stderr', `[skill-run] Working directory: ${workDir}\n`);
  onOutput('stderr', `[skill-run] Command: ${cmd}\n`);
  onOutput('stderr', `[skill-run] Skill: ${skillId} → ${symlinkTarget}\n\n`);

  spawnClaude({
    cmd,
    workDir,
    run,
    onText: (text) => onOutput('stdout', text),
    onError: (text) => onOutput('stderr', text),
    onStatus,
  });

  return run;
}

/**
 * Run a playground chat turn. Uses --output-format stream-json to parse session ID.
 * If resumeSessionId is provided, uses --resume to continue the conversation.
 */
export async function runPlaygroundChat(
  skillId: string,
  prompt: string,
  onText: ChatOutputCallback,
  onStatus: StatusCallback,
  onSessionId: ChatSessionCallback,
  resumeSessionId?: string,
  runId?: string,
): Promise<SkillRun> {
  const id = runId || uuid();
  const run = createRun(id, skillId, prompt);
  onStatus('running');

  const reuseDir = resumeSessionId ? sessionWorkDirs.get(resumeSessionId) : undefined;
  const { workDir } = await setupWorkDir(skillId, id, reuseDir);

  const extraArgs = resumeSessionId ? [`--resume "${resumeSessionId}"`] : [];
  const cmd = buildCmd(prompt, extraArgs);

  let sessionFound = false;

  spawnClaude({
    cmd,
    workDir,
    run,
    onText,
    onError: (text) => onText(`[stderr] ${text}`),
    onStatus,
    onStdoutEvent: (event) => {
      // Extract session ID from init or result events
      if (!sessionFound && event.session_id && (event.type === 'system' || event.type === 'result')) {
        sessionFound = true;
        sessionWorkDirs.set(event.session_id, workDir);
        onSessionId(event.session_id);
      }
    },
  });

  return run;
}

// --- File access ---

export async function getRunFiles(runId: string, dirPath = '.'): Promise<SkillFile[]> {
  const runDir = getRunDir(runId);
  const absDir = path.resolve(runDir, dirPath);

  if (!absDir.startsWith(runDir)) throw new Error('Path traversal detected');

  let entries;
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const result: SkillFile[] = [];
  for (const entry of entries) {
    // Skip .claude directory (contains symlinked skill, not output)
    if (entry.name === '.claude') continue;
    const relativePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const children = await getRunFiles(runId, relativePath);
      result.push({ path: relativePath, name: entry.name, type: 'dir', children });
    } else {
      result.push({ path: relativePath, name: entry.name, type: 'file' });
    }
  }

  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function readRunFile(runId: string, filePath: string): Promise<string> {
  const runDir = getRunDir(runId);
  const absPath = path.resolve(runDir, filePath);
  if (!absPath.startsWith(runDir)) throw new Error('Path traversal detected');
  return fs.readFile(absPath, 'utf-8');
}

export function getRunFilePath(runId: string, filePath: string): string {
  const runDir = getRunDir(runId);
  const absPath = path.resolve(runDir, filePath);
  if (!absPath.startsWith(runDir)) throw new Error('Path traversal detected');
  return absPath;
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
