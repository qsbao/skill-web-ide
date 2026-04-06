import { v4 as uuid } from 'uuid';
import type { Session, SessionSummary } from '@skill-ide/shared';
import type { CreateSessionParams, SessionMutation, SessionStore } from './types.js';

export class InMemorySessionStore implements SessionStore {
  sessions = new Map<string, Session>();
  failOnCreate = false;

  async create(params: CreateSessionParams): Promise<Session> {
    if (this.failOnCreate) throw new Error('session creation failed');
    const now = new Date().toISOString();
    const session: Session = {
      id: uuid(),
      skillId: params.skillId,
      skillName: params.skillName,
      type: params.type,
      status: 'active',
      claudeSessionId: null,
      runId: null,
      messages: [],
      prompt: params.prompt,
      output: '',
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async load(id: string): Promise<Session | null> {
    return this.sessions.get(id) ?? null;
  }

  async update(id: string, mutations: SessionMutation[]): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`session ${id} not found`);
    for (const m of mutations) {
      switch (m.op) {
        case 'add_message':
          session.messages.push(m.message);
          break;
        case 'set_status':
          session.status = m.status;
          break;
        case 'set_output':
          session.output = m.output;
          break;
        case 'set_claude_session_id':
          session.claudeSessionId = m.claudeSessionId;
          break;
        case 'set_run_id':
          session.runId = m.runId;
          break;
      }
    }
    session.updatedAt = new Date().toISOString();
  }

  async delete(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async list(filter?: { skillId?: string }): Promise<SessionSummary[]> {
    const results: SessionSummary[] = [];
    for (const session of this.sessions.values()) {
      if (filter?.skillId && session.skillId !== filter.skillId) continue;
      const lastMsg = session.messages[session.messages.length - 1];
      results.push({
        id: session.id,
        skillId: session.skillId,
        skillName: session.skillName,
        type: session.type,
        status: session.status,
        messageCount: session.messages.length,
        lastMessage: lastMsg ? lastMsg.content.slice(0, 120) : session.prompt.slice(0, 120),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      });
    }
    return results;
  }
}
