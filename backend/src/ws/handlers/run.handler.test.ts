import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WsSender } from '../types.js';

vi.mock('../../services/run.service.js', () => ({
  runSkill: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

import { runHandler } from './run.handler.js';
import * as runService from '../../services/run.service.js';

function fakeSender(): WsSender & { messages: Array<{ type: string; payload: unknown }> } {
  const messages: Array<{ type: string; payload: unknown }> = [];
  return { messages, send: (type, payload) => messages.push({ type, payload }) };
}

describe('runHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has prefix "run"', () => {
    expect(runHandler.prefix).toBe('run');
  });

  it('calls runSkill and sends run:started on success', async () => {
    const fakeRun = { id: 'mock-uuid', skillId: '@local/foo', status: 'running' };
    vi.mocked(runService.runSkill).mockResolvedValue(fakeRun as any);

    const sender = fakeSender();
    runHandler.handle('run:run', { skillId: '@local/foo', prompt: 'hello' }, sender);

    // Wait for the promise to resolve
    await vi.waitFor(() => {
      expect(sender.messages).toContainEqual({ type: 'run:started', payload: fakeRun });
    });

    expect(runService.runSkill).toHaveBeenCalledWith(
      '@local/foo',
      'hello',
      expect.any(Function),
      expect.any(Function),
      'mock-uuid',
    );
  });

  it('forwards output callback through sender', () => {
    let capturedOnOutput: any;
    vi.mocked(runService.runSkill).mockImplementation((_sid, _p, onOutput) => {
      capturedOnOutput = onOutput;
      return new Promise(() => {}); // never resolves
    });

    const sender = fakeSender();
    runHandler.handle('run:run', { skillId: '@local/foo', prompt: 'hello' }, sender);

    capturedOnOutput('stdout', 'output data');

    expect(sender.messages).toContainEqual({
      type: 'run:output',
      payload: { runId: 'mock-uuid', stream: 'stdout', data: 'output data' },
    });
  });

  it('sends error on rejection', async () => {
    vi.mocked(runService.runSkill).mockRejectedValue(new Error('boom'));

    const sender = fakeSender();
    runHandler.handle('run:run', { skillId: '@local/foo', prompt: 'hello' }, sender);

    await vi.waitFor(() => {
      expect(sender.messages).toContainEqual({ type: 'error', payload: 'Error: boom' });
    });
  });
});
