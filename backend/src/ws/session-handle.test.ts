import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/session.service.js', () => ({
  createSession: vi.fn(),
  addMessage: vi.fn(),
  setClaudeSessionId: vi.fn(),
  setRunId: vi.fn(),
  updateStatus: vi.fn(),
  updateOutput: vi.fn(),
}));

vi.mock('../services/skill.service.js', () => ({
  getSkill: vi.fn(),
}));

import { createSessionHandle } from './session-handle.js';
import * as sessionService from '../services/session.service.js';
import * as skillService from '../services/skill.service.js';

describe('createSessionHandle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new session when no existingSessionId is provided', async () => {
    vi.mocked(skillService.getSkill).mockResolvedValue({ name: 'My Skill' } as any);
    vi.mocked(sessionService.createSession).mockResolvedValue({ id: 'new-session-1' } as any);
    vi.mocked(sessionService.addMessage).mockResolvedValue();

    const handle = createSessionHandle({
      skillId: '@local/foo',
      mode: 'chat',
      prompt: 'hello',
    });

    await handle.ready;

    expect(sessionService.createSession).toHaveBeenCalledWith('@local/foo', 'My Skill', 'chat', 'hello');
    expect(sessionService.addMessage).toHaveBeenCalledWith('new-session-1', expect.objectContaining({
      role: 'user',
      content: 'hello',
    }));
    expect(handle.id).toBe('new-session-1');
  });

  it('reuses existing session and adds user message', async () => {
    vi.mocked(sessionService.addMessage).mockResolvedValue();

    const handle = createSessionHandle({
      skillId: '@local/foo',
      existingSessionId: 'existing-1',
      mode: 'chat',
      prompt: 'follow up',
    });

    await handle.ready;

    expect(sessionService.createSession).not.toHaveBeenCalled();
    expect(sessionService.addMessage).toHaveBeenCalledWith('existing-1', expect.objectContaining({
      role: 'user',
      content: 'follow up',
    }));
    expect(handle.id).toBe('existing-1');
  });

  it('delegates addMessage after ready', async () => {
    vi.mocked(sessionService.addMessage).mockResolvedValue();

    const handle = createSessionHandle({
      skillId: '@local/foo',
      existingSessionId: 'existing-1',
      mode: 'chat',
      prompt: 'hello',
    });

    await handle.addMessage({ role: 'assistant', content: 'hi there' });

    expect(sessionService.addMessage).toHaveBeenCalledWith('existing-1', expect.objectContaining({
      role: 'assistant',
      content: 'hi there',
    }));
  });

  it('delegates setClaudeSessionId after ready', async () => {
    vi.mocked(sessionService.addMessage).mockResolvedValue();
    vi.mocked(sessionService.setClaudeSessionId).mockResolvedValue();

    const handle = createSessionHandle({
      skillId: '@local/foo',
      existingSessionId: 'existing-1',
      mode: 'chat',
      prompt: 'hello',
    });

    await handle.setClaudeSessionId('claude-abc');

    expect(sessionService.setClaudeSessionId).toHaveBeenCalledWith('existing-1', 'claude-abc');
  });

  it('delegates setRunId after ready', async () => {
    vi.mocked(sessionService.addMessage).mockResolvedValue();
    vi.mocked(sessionService.setRunId).mockResolvedValue();

    const handle = createSessionHandle({
      skillId: '@local/foo',
      existingSessionId: 'existing-1',
      mode: 'chat',
      prompt: 'hello',
    });

    await handle.setRunId('run-1');

    expect(sessionService.setRunId).toHaveBeenCalledWith('existing-1', 'run-1');
  });

  it('swallows errors from session operations and logs them', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(sessionService.addMessage).mockRejectedValue(new Error('disk full'));

    const handle = createSessionHandle({
      skillId: '@local/foo',
      existingSessionId: 'existing-1',
      mode: 'chat',
      prompt: 'hello',
    });

    // Should not throw
    await handle.addMessage({ role: 'assistant', content: 'reply' });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
