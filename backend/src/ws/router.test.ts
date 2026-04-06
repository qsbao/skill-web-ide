import { describe, it, expect, vi } from 'vitest';
import { createRouter } from './router.js';
import type { DomainHandler, WsSender } from './types.js';

function fakeSender(): WsSender & { messages: Array<{ type: string; payload: unknown }> } {
  const messages: Array<{ type: string; payload: unknown }> = [];
  return {
    messages,
    send(type, payload) {
      messages.push({ type, payload });
    },
  };
}

function fakeHandler(prefix: string): DomainHandler & { calls: Array<{ action: string; payload: unknown }> } {
  const calls: Array<{ action: string; payload: unknown }> = [];
  return {
    prefix,
    calls,
    handle(action, payload) {
      calls.push({ action, payload });
    },
  };
}

describe('createRouter', () => {
  it('dispatches to handler matching action prefix', () => {
    const test = fakeHandler('test');
    const run = fakeHandler('run');
    const router = createRouter([test, run]);
    const sender = fakeSender();

    router.dispatch('test:run', { skillId: 's1', type: 'unit' }, sender);

    expect(test.calls).toEqual([{ action: 'test:run', payload: { skillId: 's1', type: 'unit' } }]);
    expect(run.calls).toEqual([]);
  });

  it('dispatches to correct handler when multiple match by longest prefix', () => {
    const playground = fakeHandler('playground');
    const promptLab = fakeHandler('prompt-lab');
    const router = createRouter([playground, promptLab]);
    const sender = fakeSender();

    router.dispatch('prompt-lab:run', { projectId: 'p1' }, sender);

    expect(promptLab.calls).toEqual([{ action: 'prompt-lab:run', payload: { projectId: 'p1' } }]);
    expect(playground.calls).toEqual([]);
  });

  it('sends error when no handler matches', () => {
    const router = createRouter([fakeHandler('test')]);
    const sender = fakeSender();

    router.dispatch('unknown:action', {}, sender);

    expect(sender.messages).toEqual([{ type: 'error', payload: 'Unknown action: unknown:action' }]);
  });
});
