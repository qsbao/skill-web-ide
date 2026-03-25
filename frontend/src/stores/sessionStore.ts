import { create } from 'zustand';
import { api } from '../api/client';
import type { Session, SessionSummary } from '@skill-ide/shared';

interface SessionState {
  sessions: SessionSummary[];
  selectedSession: Session | null;
  loading: boolean;
  // Actions
  loadSessions: (skillId?: string) => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  clearSelectedSession: () => void;
  removeSession: (id: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  selectedSession: null,
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

  loadSession: async (id: string) => {
    set({ loading: true });
    try {
      const session = await api.getSession(id);
      set({ selectedSession: session, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  clearSelectedSession: () => set({ selectedSession: null }),

  removeSession: async (id: string) => {
    await api.deleteSession(id);
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      selectedSession: state.selectedSession?.id === id ? null : state.selectedSession,
    }));
  },
}));
