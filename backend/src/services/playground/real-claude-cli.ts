import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { ClaudeCliPort, ClaudeCliHandle, ClaudeEvent } from './types.js';

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export class RealClaudeCli implements ClaudeCliPort {
  constructor(
    private skillsDir: string,
    private runsDir: string,
  ) {}

  // Map Claude session ID → work directory for proper resume
  private sessionWorkDirs = new Map<string, string>();

  spawn(opts: {
    prompt: string;
    workDir: string;
    resumeSessionId?: string;
    allowedTools?: string[];
    timeoutMs?: number;
  }): ClaudeCliHandle {
    const reuseDir = opts.resumeSessionId ? this.sessionWorkDirs.get(opts.resumeSessionId) : undefined;
    const workDir = reuseDir || opts.workDir;

    const escapedPrompt = opts.prompt.replace(/"/g, '\\"');
    const extraArgs = opts.resumeSessionId ? [`--resume "${opts.resumeSessionId}"`] : [];
    const cmd = [
      `claude -p "${escapedPrompt}" --verbose --output-format stream-json --include-partial-messages --allowedTools "Write,Edit,Bash,Read,Glob,Grep"`,
      ...extraArgs,
    ].join(' ');

    const child = spawn(cmd, [], {
      cwd: workDir,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        HTTP_PROXY: '',
        HTTPS_PROXY: '',
        http_proxy: '',
        https_proxy: '',
      },
    });

    const sessionWorkDirs = this.sessionWorkDirs;
    const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
    let killed = false;

    async function* generate(): AsyncIterable<ClaudeEvent> {
      // Buffer stdout lines
      const lines: string[] = [];
      let lineResolve: (() => void) | null = null;
      let done = false;
      let buffer = '';
      const activeToolBlocks = new Map<number, { name: string; input: string }>();
      let hasStreamedText = false;

      child.stdout?.on('data', (data: Buffer) => {
        buffer += data.toString();
        const parts = buffer.split('\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          if (part.trim()) lines.push(part);
        }
        lineResolve?.();
      });

      child.stderr?.on('data', () => {
        // stderr is ignored in the event stream
      });

      const timeout = setTimeout(() => {
        killed = true;
        child.kill('SIGTERM');
      }, timeoutMs);

      child.on('close', () => {
        clearTimeout(timeout);
        done = true;
        lineResolve?.();
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        done = true;
        lines.push(JSON.stringify({ _synthetic: true, type: 'error', message: err.message }));
        lineResolve?.();
      });

      while (!done || lines.length > 0) {
        if (lines.length === 0) {
          await new Promise<void>((resolve) => {
            lineResolve = resolve;
          });
          lineResolve = null;
          continue;
        }

        const line = lines.shift()!;
        try {
          const event = JSON.parse(line);

          // Extract session ID
          if (event.session_id && (event.type === 'system' || event.type === 'result')) {
            sessionWorkDirs.set(event.session_id, workDir);
            yield { type: 'session_id', sessionId: event.session_id };
          }

          if (event.type === 'stream_event') {
            const evt = event.event;

            // Track tool_use content block start
            if (evt?.type === 'content_block_start' && evt.content_block?.type === 'tool_use') {
              activeToolBlocks.set(evt.index, { name: evt.content_block.name, input: '' });
            }

            // Accumulate tool input JSON
            if (evt?.type === 'content_block_delta' && evt.delta?.type === 'input_json_delta') {
              const block = activeToolBlocks.get(evt.index);
              if (block) block.input += evt.delta.partial_json;
            }

            // Emit completed tool_use block
            if (evt?.type === 'content_block_stop') {
              const block = activeToolBlocks.get(evt.index);
              if (block) {
                yield { type: 'tool_use', toolName: block.name, toolInput: block.input };
                activeToolBlocks.delete(evt.index);
              }
            }

            // Stream text deltas
            if (evt?.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
              hasStreamedText = true;
              yield { type: 'text_delta', text: evt.delta.text };
            }
          }

          // Handle result type
          if (event.type === 'result' && event.result && !hasStreamedText) {
            const text = typeof event.result === 'string' ? event.result : event.result.text;
            if (text) yield { type: 'text_delta', text };
          }

          if (event._synthetic && event.type === 'error') {
            yield { type: 'error', message: event.message };
          }
        } catch {
          // Not valid stream-json — output as raw text
          yield { type: 'text_delta', text: line + '\n' };
        }
      }

      // Emit final status
      const exitCode = child.exitCode;
      if (killed) {
        yield { type: 'error', message: `Run timed out after ${timeoutMs / 1000}s` };
        yield { type: 'status', status: 'error' };
      } else if (exitCode === 0) {
        yield { type: 'status', status: 'completed' };
      } else {
        yield { type: 'status', status: 'failed' };
      }
    }

    return {
      events: generate(),
      kill() {
        killed = true;
        child.kill('SIGTERM');
      },
    };
  }

  /** Set up work directory with skill symlink. Returns the work dir path. */
  async setupWorkDir(skillId: string, runId: string): Promise<string> {
    const skillDir = path.join(this.skillsDir, skillId);
    const workDir = path.join(this.runsDir, runId);
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

    return workDir;
  }
}
