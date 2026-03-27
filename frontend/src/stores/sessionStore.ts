import { create } from 'zustand';
import { api } from '../api/client';
import type { Session, SessionSummary } from '@skill-ide/shared';

interface SessionState {
  sessions: SessionSummary[];
  loading: boolean;
  // Actions
  loadSessions: (skillId?: string) => Promise<void>;
  fetchSession: (id: string) => Promise<Session>;
  removeSession: (id: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  loading: false,

  loadSessions: async (skillId?: string) => {
    set({ loading: true });
    try {
      const sessions = await api.listSessions(skillId ? { skillId } : undefined);
      set({ sessions, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchSession: async (id: string) => {
    return api.getSession(id);
  },

  removeSession: async (id: string) => {
    await api.deleteSession(id);
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
    }));
  },
}));
