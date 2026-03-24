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

export async function runSkill(
  skillId: string,
  prompt: string,
  onOutput: OutputCallback,
  onStatus: StatusCallback,
  runId?: string,
): Promise<SkillRun> {
  const id = runId || uuid();
  const run: SkillRun = {
    id,
    skillId,
    prompt,
    status: 'running',
    startedAt: new Date().toISOString(),
  };
  runs.set(id, run);
  onStatus('running');

  const skillDir = getSkillDir(skillId);

  const workDir = getRunDir(id);
  await fs.mkdir(workDir, { recursive: true });

  // Symlink the entire skill directory into workdir/.claude/skills/
  const skillsLinkDir = path.join(workDir, '.claude', 'skills');
  await fs.mkdir(skillsLinkDir, { recursive: true });
  const skillName = skillId.replace(/^@[^/]+\//, ''); // extract name from @author/name
  const symlinkTarget = path.join(skillsLinkDir, skillName);
  try {
    await fs.symlink(skillDir, symlinkTarget, 'dir');
  } catch (err: any) {
    if (err.code !== 'EEXIST') throw err;
  }

  // Find SKILL.md to inject as system prompt
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  const args = [
    '-p', prompt,
    '--verbose',
    '--append-system-prompt-file', skillMdPath,
    '--allowedTools', 'Write,Edit,Bash,Read,Glob,Grep',
  ];
  const cmd = `claude ${args.map((a) => JSON.stringify(a)).join(' ')}`;
  onOutput('stdout', `[skill-run] Working directory: ${workDir}\n`);
  onOutput('stdout', `[skill-run] Command: ${cmd}\n`);
  onOutput('stdout', `[skill-run] Skill: ${skillId} → ${symlinkTarget}\n\n`);

  const child = spawn('claude', args, {
    cwd: workDir,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
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
    run.finishedAt = new Date().toISOString();
    onOutput('stderr', `\nRun timed out after ${TIMEOUT_MS / 1000}s\n`);
    onStatus('error');
    activeProcesses.delete(id);
  }, TIMEOUT_MS);

  child.on('close', (code) => {
    clearTimeout(timeout);
    activeProcesses.delete(id);
    if (run.status === 'error') return; // already handled by timeout

    run.status = code === 0 ? 'completed' : 'failed';
    run.finishedAt = new Date().toISOString();
    runs.set(id, run);
    onStatus(run.status);
  });

  return run;
}

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

export type ChatOutputCallback = (text: string) => void;
export type ChatSessionCallback = (sessionId: string) => void;

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
  const run: SkillRun = {
    id,
    skillId,
    prompt,
    status: 'running',
    startedAt: new Date().toISOString(),
  };
  runs.set(id, run);
  onStatus('running');

  const skillDir = getSkillDir(skillId);

  // Reuse the original workdir for resumed sessions
  const workDir = (resumeSessionId && sessionWorkDirs.get(resumeSessionId)) || getRunDir(id);
  await fs.mkdir(workDir, { recursive: true });

  // Symlink skill if not already present
  const skillsLinkDir = path.join(workDir, '.claude', 'skills');
  await fs.mkdir(skillsLinkDir, { recursive: true });
  const skillName = skillId.replace(/^@[^/]+\//, '');
  const symlinkTarget = path.join(skillsLinkDir, skillName);
  try {
    await fs.symlink(skillDir, symlinkTarget, 'dir');
  } catch (err: any) {
    if (err.code !== 'EEXIST') throw err;
  }

  const skillMdPath = path.join(skillDir, 'SKILL.md');
  const args = [
    '-p', prompt,
    '--verbose',
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--append-system-prompt-file', skillMdPath,
    '--allowedTools', 'Write,Edit,Bash,Read,Glob,Grep',
  ];

  if (resumeSessionId) {
    args.push('--resume', resumeSessionId);
  }

  const child = spawn('claude', args, {
    cwd: workDir,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  activeProcesses.set(id, child);

  let buffer = '';
  let sessionFound = false;

  child.stdout?.on('data', (data: Buffer) => {
    buffer += data.toString();
    // Process complete JSON lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        // Extract session ID from init event
        if (!sessionFound && event.type === 'system' && event.session_id) {
          sessionFound = true;
          sessionWorkDirs.set(event.session_id, workDir);
          onSessionId(event.session_id);
        }
        // Stream text deltas from partial messages
        if (event.type === 'stream_event' && event.event?.type === 'content_block_delta') {
          const delta = event.event.delta;
          if (delta?.type === 'text_delta' && delta.text) {
            onText(delta.text);
          }
        }
        // Capture session_id from result if missed
        if (event.type === 'result' && !sessionFound && event.session_id) {
          sessionFound = true;
          sessionWorkDirs.set(event.session_id, workDir);
          onSessionId(event.session_id);
        }
      } catch {
        // Not valid JSON, skip
      }
    }
  });

  let stderrBuffer = '';
  child.stderr?.on('data', (data: Buffer) => {
    stderrBuffer += data.toString();
  });

  const timeout = setTimeout(() => {
    child.kill('SIGTERM');
    run.status = 'error';
    run.finishedAt = new Date().toISOString();
    onStatus('error');
    activeProcesses.delete(id);
  }, TIMEOUT_MS);

  child.on('close', (code) => {
    clearTimeout(timeout);
    activeProcesses.delete(id);
    if (run.status === 'error') return;

    run.status = code === 0 ? 'completed' : 'failed';
    run.finishedAt = new Date().toISOString();
    runs.set(id, run);
    if (run.status === 'failed' && stderrBuffer.trim()) {
      onText(`\n[stderr]: ${stderrBuffer.trim()}`);
    }
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
