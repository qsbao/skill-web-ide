import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WsSender } from '../types.js';

vi.mock('../../services/prompt-lab/runner.service.js', () => ({
  runTestSuite: vi.fn(),
}));

vi.mock('../../services/prompt-lab/optimizer.service.js', () => ({
  optimizePrompt: vi.fn(),
}));

vi.mock('../../services/prompt-lab/results.service.js', () => ({
  saveTestRun: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

import { promptLabHandler } from './prompt-lab.handler.js';
import * as runnerService from '../../services/prompt-lab/runner.service.js';
import * as optimizerService from '../../services/prompt-lab/optimizer.service.js';
import * as resultsService from '../../services/prompt-lab/results.service.js';

function fakeSender(): WsSender & { messages: Array<{ type: string; payload: unknown }> } {
  const messages: Array<{ type: string; payload: unknown }> = [];
  return { messages, send: (type, payload) => messages.push({ type, payload }) };
}

describe('promptLabHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('has prefix "prompt-lab"', () => {
    expect(promptLabHandler.prefix).toBe('prompt-lab');
  });

  describe('prompt-lab:run', () => {
    it('calls runTestSuite and sends complete on success', async () => {
      vi.useRealTimers();
      const fakeResult = { id: 'run-1', results: [] };
      vi.mocked(runnerService.runTestSuite).mockResolvedValue(fakeResult as any);
      vi.mocked(resultsService.saveTestRun).mockResolvedValue();

      const sender = fakeSender();
      promptLabHandler.handle('prompt-lab:run', {
        projectId: 'p1',
        promptId: 'pr1',
      }, sender);

      await vi.waitFor(() => {
        expect(sender.messages).toContainEqual({
          type: 'prompt-lab:run:complete',
          payload: { runId: 'mock-uuid', run: fakeResult },
        });
      });

      expect(resultsService.saveTestRun).toHaveBeenCalledWith(fakeResult);
    });

    it('forwards onProgress callback through sender', async () => {
      vi.useRealTimers();
      let capturedCallbacks: any;
      vi.mocked(runnerService.runTestSuite).mockImplementation((_opts, cbs) => {
        capturedCallbacks = cbs;
        return new Promise(() => {});
      });

      const sender = fakeSender();
      promptLabHandler.handle('prompt-lab:run', {
        projectId: 'p1',
        promptId: 'pr1',
      }, sender);

      capturedCallbacks.onProgress({ completed: 1, total: 5, currentCase: 'test-1' });

      expect(sender.messages).toContainEqual({
        type: 'prompt-lab:run:progress',
        payload: {
          runId: 'mock-uuid',
          completed: 1,
          total: 5,
          currentCase: 'test-1',
          latestResult: undefined,
        },
      });
    });

    it('sends error on rejection', async () => {
      vi.useRealTimers();
      vi.mocked(runnerService.runTestSuite).mockRejectedValue(new Error('test failed'));

      const sender = fakeSender();
      promptLabHandler.handle('prompt-lab:run', { projectId: 'p1', promptId: 'pr1' }, sender);

      await vi.waitFor(() => {
        expect(sender.messages).toContainEqual({ type: 'error', payload: 'Error: test failed' });
      });
    });
  });

  describe('prompt-lab:optimize', () => {
    it('sends complete with job on success', async () => {
      vi.useRealTimers();
      const fakeJob = { id: 'mock-uuid', status: 'completed', iterations: [] };
      vi.mocked(optimizerService.optimizePrompt).mockResolvedValue(fakeJob as any);

      const sender = fakeSender();
      promptLabHandler.handle('prompt-lab:optimize', {
        projectId: 'p1',
        promptId: 'pr1',
      }, sender);

      await vi.waitFor(() => {
        expect(sender.messages).toContainEqual({
          type: 'prompt-lab:opt:complete',
          payload: { runId: 'mock-uuid', job: fakeJob },
        });
      });
    });

    it('polls iterations and sends them via WS', async () => {
      let resolveOptimize: any;
      vi.mocked(optimizerService.optimizePrompt).mockImplementation(({ job }) => {
        // Simulate iterations being added during optimization
        setTimeout(() => {
          job!.iterations.push({ index: 0, prompt: 'v1', accuracy: 0.8 } as any);
        }, 500);
        return new Promise((resolve) => {
          resolveOptimize = resolve;
        });
      });

      const sender = fakeSender();
      promptLabHandler.handle('prompt-lab:optimize', {
        projectId: 'p1',
        promptId: 'pr1',
      }, sender);

      // Advance past the setTimeout that adds the iteration
      vi.advanceTimersByTime(600);
      // Advance past poll interval
      vi.advanceTimersByTime(1000);

      expect(sender.messages).toContainEqual({
        type: 'prompt-lab:opt:iteration',
        payload: { runId: 'mock-uuid', iteration: { index: 0, prompt: 'v1', accuracy: 0.8 } },
      });

      // Clean up
      resolveOptimize({ id: 'mock-uuid', iterations: [] });
      vi.advanceTimersByTime(1000);
    });
  });
});
