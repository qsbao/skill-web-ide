import type { Session, SessionMessage, SessionStatus, SessionSummary, SessionType } from '@skill-ide/shared';

// === Claude CLI port (mocked in tests) ===

export type ClaudeEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use'; toolName: string; toolInput: string }
  | { type: 'session_id'; sessionId: string }
  | { type: 'status'; status: 'completed' | 'failed' | 'error' }
  | { type: 'error'; message: string };

export interface ClaudeCliHandle {
  events: AsyncIterable<ClaudeEvent>;
  kill(): void;
}

export interface ClaudeCliPort {
  spawn(opts: {
    prompt: string;
    workDir: string;
    resumeSessionId?: string;
    allowedTools?: string[];
    timeoutMs?: number;
  }): ClaudeCliHandle;
}

// === Session store port ===

export type SessionMutation =
  | { op: 'add_message'; message: SessionMessage }
  | { op: 'set_status'; status: SessionStatus }
  | { op: 'set_output'; output: string }
  | { op: 'set_claude_session_id'; claudeSessionId: string }
  | { op: 'set_run_id'; runId: string };

export interface CreateSessionParams {
  skillId: string;
  skillName: string;
  type: SessionType;
  prompt: string;
}

export interface SessionStore {
  create(params: CreateSessionParams): Promise<Session>;
  load(id: string): Promise<Session | null>;
  update(id: string, mutations: SessionMutation[]): Promise<void>;
  delete(id: string): Promise<boolean>;
  list(filter?: { skillId?: string }): Promise<SessionSummary[]>;
}

// === Playground events emitted to callers ===

export type PlaygroundEvent =
  | { type: 'started'; runId: string; sessionId: string }
  | { type: 'text'; runId: string; text: string }
  | { type: 'tool_use'; runId: string; toolName: string; toolInput: string }
  | { type: 'claude_session'; runId: string; claudeSessionId: string }
  | { type: 'status'; runId: string; status: 'running' | 'completed' | 'failed' | 'error' }
  | { type: 'error'; runId: string; message: string };

// === The deep module interface ===

export interface PlaygroundRunHandle {
  runId: string;
  events: AsyncIterable<PlaygroundEvent>;
  abort(): void;
}

export interface PlaygroundSessionManager {
  chat(opts: {
    skillId: string;
    prompt: string;
    sessionId?: string;
    claudeSessionId?: string;
  }): PlaygroundRunHandle;

  run(opts: {
    skillId: string;
    prompt: string;
  }): PlaygroundRunHandle;
}
