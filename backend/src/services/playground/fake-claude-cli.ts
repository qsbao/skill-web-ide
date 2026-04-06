import type { ClaudeCliPort, ClaudeCliHandle, ClaudeEvent } from './types.js';

interface Script {
  events: ClaudeEvent[];
  /** If true, the iterable hangs after yielding all events until kill() is called. */
  hangAfter?: boolean;
}

export class FakeClaudeCli implements ClaudeCliPort {
  private scripts: Script[] = [];
  spawnCalls: Array<{ prompt: string; workDir: string; resumeSessionId?: string }> = [];
  killed = new Set<number>();

  /** Queue a sequence of events for the next spawn() call. */
  enqueue(events: ClaudeEvent[]): void {
    this.scripts.push({ events });
  }

  /** Queue events that yield then hang indefinitely until kill() is called. */
  enqueueHanging(events: ClaudeEvent[]): void {
    this.scripts.push({ events, hangAfter: true });
  }

  spawn(opts: { prompt: string; workDir: string; resumeSessionId?: string }): ClaudeCliHandle {
    const callIndex = this.spawnCalls.length;
    this.spawnCalls.push(opts);
    const script = this.scripts[callIndex] ?? { events: [] };

    const self = this;
    let killResolve: (() => void) | undefined;
    const killPromise = new Promise<void>((resolve) => {
      killResolve = resolve;
    });

    async function* generate(): AsyncIterable<ClaudeEvent> {
      for (const event of script.events) {
        yield event;
      }
      if (script.hangAfter) {
        await killPromise;
      }
    }

    return {
      events: generate(),
      kill() {
        self.killed.add(callIndex);
        killResolve?.();
      },
    };
  }
}
