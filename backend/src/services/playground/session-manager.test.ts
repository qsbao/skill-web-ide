import { describe, it, expect } from 'vitest';
import { FakeClaudeCli } from './fake-claude-cli.js';
import { InMemorySessionStore } from './in-memory-session-store.js';
import { createPlaygroundSessionManager } from './session-manager.js';
import type { PlaygroundEvent } from './types.js';

async function collectAll(events: AsyncIterable<PlaygroundEvent>): Promise<PlaygroundEvent[]> {
  const result: PlaygroundEvent[] = [];
  for await (const e of events) result.push(e);
  return result;
}

describe('PlaygroundSessionManager', () => {
  describe('chat', () => {
    it('creates session, streams events, persists user+assistant messages', async () => {
      const store = new InMemorySessionStore();
      const cli = new FakeClaudeCli();
      cli.enqueue([
        { type: 'session_id', sessionId: 'claude-session-1' },
        { type: 'text_delta', text: 'Hello ' },
        { type: 'text_delta', text: 'world' },
        { type: 'status', status: 'completed' },
      ]);

      const manager = createPlaygroundSessionManager({ cli, store, skillsDir: '/tmp/skills', runsDir: '/tmp/runs' });
      const { runId, events } = manager.chat({ skillId: '@local/foo', prompt: 'Hi' });

      const collected = await collectAll(events);

      // Verify events streamed
      const started = collected.find((e): e is Extract<PlaygroundEvent, { type: 'started' }> => e.type === 'started');
      expect(started).toBeDefined();
      expect(started!.sessionId).toBeTruthy();

      expect(collected).toContainEqual({ type: 'text', runId, text: 'Hello ' });
      expect(collected).toContainEqual({ type: 'text', runId, text: 'world' });
      expect(collected).toContainEqual({ type: 'claude_session', runId, claudeSessionId: 'claude-session-1' });
      expect(collected).toContainEqual({ type: 'status', runId, status: 'completed' });

      // Verify persistence
      const session = await store.load(started!.sessionId);
      expect(session).not.toBeNull();
      expect(session!.messages).toHaveLength(2); // user + assistant
      expect(session!.messages[0]).toMatchObject({ role: 'user', content: 'Hi' });
      expect(session!.messages[1]).toMatchObject({ role: 'assistant', content: 'Hello world' });
      expect(session!.status).toBe('completed');
      expect(session!.claudeSessionId).toBe('claude-session-1');
      expect(session!.runId).toBe(runId);
    });
    it('resumed chat passes claudeSessionId to CLI and appends to existing session', async () => {
      const store = new InMemorySessionStore();
      const cli = new FakeClaudeCli();

      // Pre-create an existing session
      const existing = await store.create({
        skillId: '@local/foo',
        skillName: 'Foo',
        type: 'chat',
        prompt: 'original',
      });
      // Add initial messages
      await store.update(existing.id, [
        { op: 'add_message', message: { role: 'user', content: 'original', timestamp: new Date().toISOString() } },
        { op: 'add_message', message: { role: 'assistant', content: 'first reply', timestamp: new Date().toISOString() } },
      ]);

      cli.enqueue([
        { type: 'text_delta', text: 'follow-up reply' },
        { type: 'status', status: 'completed' },
      ]);

      const manager = createPlaygroundSessionManager({ cli, store, skillsDir: '/tmp/skills', runsDir: '/tmp/runs' });
      const { events } = manager.chat({
        skillId: '@local/foo',
        prompt: 'follow up',
        sessionId: existing.id,
        claudeSessionId: 'claude-abc',
      });

      await collectAll(events);

      // Verify CLI was called with resumeSessionId
      expect(cli.spawnCalls[0].resumeSessionId).toBe('claude-abc');

      // Verify messages appended to existing session (not a new one)
      const session = await store.load(existing.id);
      expect(session!.messages).toHaveLength(4); // original user + assistant + follow-up user + assistant
      expect(session!.messages[2]).toMatchObject({ role: 'user', content: 'follow up' });
      expect(session!.messages[3]).toMatchObject({ role: 'assistant', content: 'follow-up reply' });
    });
  });

  describe('run', () => {
    it('persists output and sets status on single run', async () => {
      const store = new InMemorySessionStore();
      const cli = new FakeClaudeCli();
      cli.enqueue([
        { type: 'text_delta', text: 'generated code' },
        { type: 'status', status: 'completed' },
      ]);

      const manager = createPlaygroundSessionManager({ cli, store, skillsDir: '/tmp/skills', runsDir: '/tmp/runs' });
      const { runId, events } = manager.run({ skillId: '@local/foo', prompt: 'build a thing' });

      const collected = await collectAll(events);

      const started = collected.find((e): e is Extract<PlaygroundEvent, { type: 'started' }> => e.type === 'started');
      expect(started).toBeDefined();

      const session = await store.load(started!.sessionId);
      expect(session!.type).toBe('single-run');
      expect(session!.output).toBe('generated code');
      expect(session!.status).toBe('completed');
      expect(session!.messages[0]).toMatchObject({ role: 'user', content: 'build a thing' });
    });
  });

  describe('abort', () => {
    it('kills CLI process and persists failed status', async () => {
      const store = new InMemorySessionStore();
      const cli = new FakeClaudeCli();
      cli.enqueueHanging([
        { type: 'text_delta', text: 'partial...' },
      ]);

      const manager = createPlaygroundSessionManager({ cli, store, skillsDir: '/tmp/skills', runsDir: '/tmp/runs' });
      const { runId, events, abort } = manager.chat({ skillId: '@local/foo', prompt: 'hello' });

      const collected: PlaygroundEvent[] = [];
      const iter = events[Symbol.asyncIterator]();

      // Consume events until we get text
      let next = await iter.next();
      while (!next.done) {
        collected.push(next.value);
        if (next.value.type === 'text') break;
        next = await iter.next();
      }

      // Abort mid-stream
      abort();

      // Drain remaining events
      next = await iter.next();
      while (!next.done) {
        collected.push(next.value);
        next = await iter.next();
      }

      // Verify kill was called
      expect(cli.killed.has(0)).toBe(true);

      // Verify session persisted as failed
      const started = collected.find((e): e is Extract<PlaygroundEvent, { type: 'started' }> => e.type === 'started');
      const session = await store.load(started!.sessionId);
      expect(session!.status).toBe('failed');
    });
  });

  describe('error handling', () => {
    it('CLI error event surfaces as PlaygroundEvent error and persists failed', async () => {
      const store = new InMemorySessionStore();
      const cli = new FakeClaudeCli();
      cli.enqueue([
        { type: 'text_delta', text: 'partial' },
        { type: 'error', message: 'API rate limit exceeded' },
        { type: 'status', status: 'error' },
      ]);

      const manager = createPlaygroundSessionManager({ cli, store, skillsDir: '/tmp/skills', runsDir: '/tmp/runs' });
      const { runId, events } = manager.chat({ skillId: '@local/foo', prompt: 'hello' });

      const collected = await collectAll(events);

      expect(collected).toContainEqual({ type: 'error', runId, message: 'API rate limit exceeded' });
      expect(collected).toContainEqual({ type: 'status', runId, status: 'error' });

      const started = collected.find((e): e is Extract<PlaygroundEvent, { type: 'started' }> => e.type === 'started');
      const session = await store.load(started!.sessionId);
      expect(session!.status).toBe('failed');
    });

    it('session store create failure emits error event without spawning CLI', async () => {
      const store = new InMemorySessionStore();
      store.failOnCreate = true;
      const cli = new FakeClaudeCli();
      cli.enqueue([{ type: 'status', status: 'completed' }]);

      const manager = createPlaygroundSessionManager({ cli, store, skillsDir: '/tmp/skills', runsDir: '/tmp/runs' });
      const { runId, events } = manager.chat({ skillId: '@local/foo', prompt: 'hello' });

      const collected = await collectAll(events);

      expect(collected).toHaveLength(1);
      expect(collected[0]).toMatchObject({ type: 'error', runId });

      // CLI should never have been called
      expect(cli.spawnCalls).toHaveLength(0);
    });
  });

  describe('concurrency', () => {
    it('concurrent turns on same session are serialized', async () => {
      const store = new InMemorySessionStore();
      const cli = new FakeClaudeCli();

      const existing = await store.create({
        skillId: '@local/foo',
        skillName: 'Foo',
        type: 'chat',
        prompt: 'original',
      });

      cli.enqueue([
        { type: 'text_delta', text: 'reply-1' },
        { type: 'status', status: 'completed' },
      ]);
      cli.enqueue([
        { type: 'text_delta', text: 'reply-2' },
        { type: 'status', status: 'completed' },
      ]);

      const manager = createPlaygroundSessionManager({ cli, store, skillsDir: '/tmp/skills', runsDir: '/tmp/runs' });

      // Fire both concurrently
      const turn1 = manager.chat({ skillId: '@local/foo', prompt: 'q1', sessionId: existing.id });
      const turn2 = manager.chat({ skillId: '@local/foo', prompt: 'q2', sessionId: existing.id });

      const [events1, events2] = await Promise.all([
        collectAll(turn1.events),
        collectAll(turn2.events),
      ]);

      // Both should complete
      expect(events1).toContainEqual(expect.objectContaining({ type: 'status', status: 'completed' }));
      expect(events2).toContainEqual(expect.objectContaining({ type: 'status', status: 'completed' }));

      // Messages should be serialized: user1, assistant1, user2, assistant2
      const session = await store.load(existing.id);
      const msgs = session!.messages.map((m) => `${m.role}:${m.content}`);
      expect(msgs).toEqual([
        'user:q1', 'assistant:reply-1',
        'user:q2', 'assistant:reply-2',
      ]);
    });
  });

  describe('text accumulation', () => {
    it('100 text deltas produce 100 streamed events but 1 persisted assistant message', async () => {
      const store = new InMemorySessionStore();
      const cli = new FakeClaudeCli();

      const deltas: import('./types.js').ClaudeEvent[] = [];
      for (let i = 0; i < 100; i++) {
        deltas.push({ type: 'text_delta', text: `chunk${i} ` });
      }
      deltas.push({ type: 'status', status: 'completed' });
      cli.enqueue(deltas);

      const manager = createPlaygroundSessionManager({ cli, store, skillsDir: '/tmp/skills', runsDir: '/tmp/runs' });
      const { events } = manager.chat({ skillId: '@local/foo', prompt: 'go' });

      const collected = await collectAll(events);

      // Should have streamed 100 text events
      const textEvents = collected.filter((e) => e.type === 'text');
      expect(textEvents).toHaveLength(100);

      // But only ONE assistant message persisted
      const started = collected.find((e): e is Extract<PlaygroundEvent, { type: 'started' }> => e.type === 'started');
      const session = await store.load(started!.sessionId);
      const assistantMsgs = session!.messages.filter((m) => m.role === 'assistant');
      expect(assistantMsgs).toHaveLength(1);
      expect(assistantMsgs[0].content).toBe(
        Array.from({ length: 100 }, (_, i) => `chunk${i} `).join(''),
      );
    });
  });
});
