export type SessionType = 'chat' | 'single-run';
export type SessionStatus = 'active' | 'completed' | 'failed';

export interface SessionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Session {
  id: string;
  skillId: string;
  skillName: string;
  type: SessionType;
  status: SessionStatus;
  claudeSessionId: string | null;
  messages: SessionMessage[];
  prompt: string;
  output: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionSummary {
  id: string;
  skillId: string;
  skillName: string;
  type: SessionType;
  status: SessionStatus;
  messageCount: number;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}
