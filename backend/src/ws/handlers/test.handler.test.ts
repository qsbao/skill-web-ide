import { describe, it, expect, vi } from 'vitest';
import type { WsSender } from '../types.js';

// Mock test-runner service
vi.mock('../../services/test-runner.service.js', () => ({
  runTest: vi.fn(),
}));

import { testHandler } from './test.handler.js';
import * as testRunner from '../../services/test-runner.service.js';

function fakeSender(): WsSender & { messages: Array<{ type: string; payload: unknown }> } {
  const messages: Array<{ type: string; payload: unknown }> = [];
  return { messages, send: (type, payload) => messages.push({ type, payload }) };
}

describe('testHandler', () => {
  it('has prefix "test"', () => {
    expect(testHandler.prefix).toBe('test');
  });

  it('calls runTest and sends test:started', () => {
    const fakeRun = { id: 'run-1', skillId: '@local/foo', type: 'unit', status: 'running', startedAt: '2024-01-01' };
    vi.mocked(testRunner.runTest).mockReturnValue(fakeRun as any);

    const sender = fakeSender();
    testHandler.handle('test:run', { skillId: '@local/foo', type: 'unit' }, sender);

    expect(testRunner.runTest).toHaveBeenCalledWith(
      '@local/foo',
      'unit',
      expect.any(Function),
      expect.any(Function),
    );
    expect(sender.messages).toContainEqual({ type: 'test:started', payload: fakeRun });
  });

  it('forwards output callback through sender', () => {
    let capturedOnOutput: any;
    vi.mocked(testRunner.runTest).mockImplementation((_, __, onOutput) => {
      capturedOnOutput = onOutput;
      return { id: 'run-1' } as any;
    });

    const sender = fakeSender();
    testHandler.handle('test:run', { skillId: '@local/foo', type: 'unit' }, sender);

    capturedOnOutput('stdout', 'hello world');

    expect(sender.messages).toContainEqual({
      type: 'test:output',
      payload: { runId: 'run-1', stream: 'stdout', data: 'hello world' },
    });
  });

  it('forwards status callback through sender', () => {
    let capturedOnStatus: any;
    vi.mocked(testRunner.runTest).mockImplementation((_, __, _onOutput, onStatus) => {
      capturedOnStatus = onStatus;
      return { id: 'run-1' } as any;
    });

    const sender = fakeSender();
    testHandler.handle('test:run', { skillId: '@local/foo', type: 'unit' }, sender);

    capturedOnStatus('completed');

    expect(sender.messages).toContainEqual({
      type: 'test:status',
      payload: { runId: 'run-1', status: 'completed' },
    });
  });
});
