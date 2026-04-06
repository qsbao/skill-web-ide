import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WsSender } from '../types.js';

vi.mock('../../services/run.service.js', () => ({
  runPlaygroundChat: vi.fn(),
  runSkill: vi.fn(),
}));

vi.mock('../../services/session.service.js', () => ({
  createSession: vi.fn(),
  addMessage: vi.fn(),
  setClaudeSessionId: vi.fn(),
  setRunId: vi.fn(),
  updateStatus: vi.fn(),
  updateOutput: vi.fn(),
}));

vi.mock('../../services/skill.service.js', () => ({
  getSkill: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

import { playgroundHandler } from './playground.handler.js';
import * as runService from '../../services/run.service.js';
import * as sessionService from '../../services/session.service.js';
import * as skillService from '../../services/skill.service.js';

function fakeSender(): WsSender & { messages: Array<{ type: string; payload: unknown }> } {
  const messages: Array<{ type: string; payload: unknown }> = [];
  return { messages, send: (type, payload) => messages.push({ type, payload }) };
}

describe('playgroundHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(skillService.getSkill).mockResolvedValue({ name: 'Test Skill' } as any);
    vi.mocked(sessionService.createSession).mockResolvedValue({ id: 'new-session-1' } as any);
    vi.mocked(sessionService.addMessage).mockResolvedValue();
    vi.mocked(sessionService.setRunId).mockResolvedValue();
    vi.mocked(sessionService.setClaudeSessionId).mockResolvedValue();
    vi.mocked(sessionService.updateStatus).mockResolvedValue();
    vi.mocked(sessionService.updateOutput).mockResolvedValue();
  });

  it('has prefix "playground"', () => {
    expect(playgroundHandler.prefix).toBe('playground');
  });

  describe('playground:chat', () => {
    it('streams text through sender', async () => {
      let capturedOnText: any;
      vi.mocked(runService.runPlaygroundChat).mockImplementation(
        (_sid, _p, onText) => {
          capturedOnText = onText;
          return new Promise(() => {});
        },
      );

      const sender = fakeSender();
      playgroundHandler.handle('playground:chat', {
        skillId: '@local/foo',
        prompt: 'hello',
      }, sender);

      capturedOnText('chunk1');
      capturedOnText('chunk2');

      expect(sender.messages).toContainEqual({
        type: 'playground:chat:text',
        payload: { runId: 'mock-uuid', text: 'chunk1' },
      });
      expect(sender.messages).toContainEqual({
        type: 'playground:chat:text',
        payload: { runId: 'mock-uuid', text: 'chunk2' },
      });
    });

    it('sends internal-session for new sessions', async () => {
      vi.mocked(runService.runPlaygroundChat).mockImplementation(() => new Promise(() => {}));

      const sender = fakeSender();
      playgroundHandler.handle('playground:chat', {
        skillId: '@local/foo',
        prompt: 'hello',
      }, sender);

      // Wait for session setup
      await vi.waitFor(() => {
        expect(sender.messages).toContainEqual({
          type: 'playground:chat:internal-session',
          payload: { runId: 'mock-uuid', internalSessionId: 'new-session-1' },
        });
      });
    });

    it('does not send internal-session when reusing existing session', async () => {
      vi.mocked(runService.runPlaygroundChat).mockImplementation(() => new Promise(() => {}));

      const sender = fakeSender();
      playgroundHandler.handle('playground:chat', {
        skillId: '@local/foo',
        prompt: 'hello',
        internalSessionId: 'existing-1',
      }, sender);

      // Give async setup time to run
      await new Promise((r) => setTimeout(r, 10));

      const internalSessionMsgs = sender.messages.filter((m) => m.type === 'playground:chat:internal-session');
      expect(internalSessionMsgs).toHaveLength(0);
    });

    it('forwards tool_use through sender', () => {
      let capturedOnToolUse: any;
      vi.mocked(runService.runPlaygroundChat).mockImplementation(
        (_sid, _p, _onText, _onStatus, _onSession, onToolUse) => {
          capturedOnToolUse = onToolUse;
          return new Promise(() => {});
        },
      );

      const sender = fakeSender();
      playgroundHandler.handle('playground:chat', {
        skillId: '@local/foo',
        prompt: 'hello',
      }, sender);

      capturedOnToolUse('Write', '{"path": "test.ts"}');

      expect(sender.messages).toContainEqual({
        type: 'playground:chat:tool_use',
        payload: { runId: 'mock-uuid', toolName: 'Write', toolInput: '{"path": "test.ts"}' },
      });
    });

    it('sends started on resolve and persists completion', async () => {
      const fakeRun = { id: 'mock-uuid' };
      let capturedOnStatus: any;
      vi.mocked(runService.runPlaygroundChat).mockImplementation(
        (_sid, _p, _onText, onStatus) => {
          capturedOnStatus = onStatus;
          return Promise.resolve(fakeRun as any);
        },
      );

      const sender = fakeSender();
      playgroundHandler.handle('playground:chat', {
        skillId: '@local/foo',
        prompt: 'hello',
        internalSessionId: 'existing-1',
      }, sender);

      await vi.waitFor(() => {
        expect(sender.messages).toContainEqual({
          type: 'playground:chat:started',
          payload: fakeRun,
        });
      });

      capturedOnStatus('completed');

      expect(sender.messages).toContainEqual({
        type: 'playground:chat:status',
        payload: { runId: 'mock-uuid', status: 'completed' },
      });
    });

    it('sends error on rejection', async () => {
      vi.mocked(runService.runPlaygroundChat).mockRejectedValue(new Error('failed'));

      const sender = fakeSender();
      playgroundHandler.handle('playground:chat', {
        skillId: '@local/foo',
        prompt: 'hello',
      }, sender);

      await vi.waitFor(() => {
        expect(sender.messages).toContainEqual({ type: 'error', payload: 'Error: failed' });
      });
    });
  });

  describe('playground:single', () => {
    it('streams output through sender', () => {
      let capturedOnOutput: any;
      vi.mocked(runService.runSkill).mockImplementation(
        (_sid, _p, onOutput) => {
          capturedOnOutput = onOutput;
          return new Promise(() => {});
        },
      );

      const sender = fakeSender();
      playgroundHandler.handle('playground:single', {
        skillId: '@local/foo',
        prompt: 'run this',
      }, sender);

      capturedOnOutput('stdout', 'hello');

      expect(sender.messages).toContainEqual({
        type: 'playground:single:output',
        payload: { runId: 'mock-uuid', stream: 'stdout', data: 'hello' },
      });
    });

    it('sends started on resolve', async () => {
      const fakeRun = { id: 'mock-uuid' };
      vi.mocked(runService.runSkill).mockResolvedValue(fakeRun as any);

      const sender = fakeSender();
      playgroundHandler.handle('playground:single', {
        skillId: '@local/foo',
        prompt: 'run this',
      }, sender);

      await vi.waitFor(() => {
        expect(sender.messages).toContainEqual({
          type: 'playground:single:started',
          payload: fakeRun,
        });
      });
    });

    it('persists session output on completion', async () => {
      let capturedOnOutput: any;
      let capturedOnStatus: any;
      vi.mocked(runService.runSkill).mockImplementation(
        (_sid, _p, onOutput, onStatus) => {
          capturedOnOutput = onOutput;
          capturedOnStatus = onStatus;
          return Promise.resolve({ id: 'mock-uuid' } as any);
        },
      );

      const sender = fakeSender();
      playgroundHandler.handle('playground:single', {
        skillId: '@local/foo',
        prompt: 'run this',
      }, sender);

      // Wait for session setup
      await vi.waitFor(() => {
        expect(sessionService.createSession).toHaveBeenCalled();
      });

      capturedOnOutput('stdout', 'result data');
      capturedOnStatus('completed');

      await vi.waitFor(() => {
        expect(sessionService.updateOutput).toHaveBeenCalledWith('new-session-1', 'result data');
        expect(sessionService.updateStatus).toHaveBeenCalledWith('new-session-1', 'completed');
      });
    });
  });
});
