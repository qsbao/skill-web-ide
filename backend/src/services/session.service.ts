import path from 'node:path';
import fs from 'node:fs/promises';
import { v4 as uuid } from 'uuid';
import { config } from '../config.js';
import { withSessionLock } from './session-lock.js';
import type { Session, SessionSummary, SessionMessage, SessionType, SessionStatus } from '@skill-ide/shared';

function sessionPath(id: string): string {
  return path.join(config.sessionsDir, `${id}.json`);
}

export async function createSession(
  skillId: string,
  skillName: string,
  type: SessionType,
  prompt: string,
): Promise<Session> {
  const now = new Date().toISOString();
  const session: Session = {
    id: uuid(),
    skillId,
    skillName,
    type,
    status: 'active',
    claudeSessionId: null,
    runId: null,
    messages: [],
    prompt,
    output: '',
    createdAt: now,
    updatedAt: now,
  };
  await fs.writeFile(sessionPath(session.id), JSON.stringify(session, null, 2), 'utf-8');
  return session;
}

export async function getSession(id: string): Promise<Session | null> {
  try {
    const data = await fs.readFile(sessionPath(id), 'utf-8');
    return JSON.parse(data) as Session;
  } catch {
    return null;
  }
}

export async function listSessions(skillId?: string): Promise<SessionSummary[]> {
  let files: string[];
  try {
    files = await fs.readdir(config.sessionsDir);
  } catch {
    return [];
  }

  const summaries: SessionSummary[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = await fs.readFile(path.join(config.sessionsDir, file), 'utf-8');
      const session = JSON.parse(data) as Session;
      if (skillId && session.skillId !== skillId) continue;
      const lastMsg = session.messages[session.messages.length - 1];
      summaries.push({
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
    } catch {
      // skip corrupt files
    }
  }

  return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function addMessage(id: string, message: SessionMessage): Promise<void> {
  return withSessionLock(id, async () => {
    const session = await getSession(id);
    if (!session) {
      console.warn(`[session] addMessage: session ${id} not found`);
      return;
    }
    session.messages.push(message);
    session.updatedAt = new Date().toISOString();
    await fs.writeFile(sessionPath(id), JSON.stringify(session, null, 2), 'utf-8');
  });
}

export async function updateStatus(id: string, status: SessionStatus): Promise<void> {
  return withSessionLock(id, async () => {
    const session = await getSession(id);
    if (!session) {
      console.warn(`[session] updateStatus: session ${id} not found`);
      return;
    }
    session.status = status;
    session.updatedAt = new Date().toISOString();
    await fs.writeFile(sessionPath(id), JSON.stringify(session, null, 2), 'utf-8');
  });
}

export async function setClaudeSessionId(id: string, claudeSessionId: string): Promise<void> {
  return withSessionLock(id, async () => {
    const session = await getSession(id);
    if (!session) {
      console.warn(`[session] setClaudeSessionId: session ${id} not found`);
      return;
    }
    session.claudeSessionId = claudeSessionId;
    session.updatedAt = new Date().toISOString();
    await fs.writeFile(sessionPath(id), JSON.stringify(session, null, 2), 'utf-8');
  });
}

export async function setRunId(id: string, runId: string): Promise<void> {
  return withSessionLock(id, async () => {
    const session = await getSession(id);
    if (!session) {
      console.warn(`[session] setRunId: session ${id} not found`);
      return;
    }
    if (!session.runId) {
      session.runId = runId;
      session.updatedAt = new Date().toISOString();
      await fs.writeFile(sessionPath(id), JSON.stringify(session, null, 2), 'utf-8');
    }
  });
}

export async function updateOutput(id: string, output: string): Promise<void> {
  return withSessionLock(id, async () => {
    const session = await getSession(id);
    if (!session) {
      console.warn(`[session] updateOutput: session ${id} not found`);
      return;
    }
    session.output = output;
    session.updatedAt = new Date().toISOString();
    await fs.writeFile(sessionPath(id), JSON.stringify(session, null, 2), 'utf-8');
  });
}

export async function deleteSession(id: string): Promise<boolean> {
  return withSessionLock(id, async () => {
    try {
      await fs.unlink(sessionPath(id));
      return true;
    } catch {
      return false;
    }
  });
}
