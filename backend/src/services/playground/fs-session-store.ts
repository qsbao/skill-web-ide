import * as sessionService from '../session.service.js';
import { getSkill } from '../skill.service.js';
import type { Session, SessionSummary } from '@skill-ide/shared';
import type { CreateSessionParams, SessionMutation, SessionStore } from './types.js';

export class FsSessionStore implements SessionStore {
  async create(params: CreateSessionParams): Promise<Session> {
    return sessionService.createSession(params.skillId, params.skillName, params.type, params.prompt);
  }

  async load(id: string): Promise<Session | null> {
    return sessionService.getSession(id);
  }

  async update(id: string, mutations: SessionMutation[]): Promise<void> {
    for (const m of mutations) {
      switch (m.op) {
        case 'add_message':
          await sessionService.addMessage(id, m.message);
          break;
        case 'set_status':
          await sessionService.updateStatus(id, m.status);
          break;
        case 'set_output':
          await sessionService.updateOutput(id, m.output);
          break;
        case 'set_claude_session_id':
          await sessionService.setClaudeSessionId(id, m.claudeSessionId);
          break;
        case 'set_run_id':
          await sessionService.setRunId(id, m.runId);
          break;
      }
    }
  }

  async delete(id: string): Promise<boolean> {
    return sessionService.deleteSession(id);
  }

  async list(filter?: { skillId?: string }): Promise<SessionSummary[]> {
    return sessionService.listSessions(filter?.skillId);
  }

  /** Resolve skill name from skill ID for session creation. */
  async resolveSkillName(skillId: string): Promise<string> {
    const skill = await getSkill(skillId);
    return skill?.name || skillId;
  }
}
