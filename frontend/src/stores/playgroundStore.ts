import { create } from 'zustand';
import type { SkillFile, Session } from '@skill-ide/shared';
import { api } from '../api/client';

export type PlaygroundMode = 'chat' | 'single';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool_use';
  content: string;
  toolName?: string;
}

interface OutputLine {
  stream: 'stdout' | 'stderr';
  data: string;
}

interface PlaygroundState {
  mode: PlaygroundMode;
  selectedSkillId: string | null;
  // Chat mode
  messages: ChatMessage[];
  sessionId: string | null;
  internalSessionId: string | null;
  chatRunning: boolean;
  chatActiveRunId: string | null;
  chatOutputFiles: SkillFile[];
  chatFilesVisible: boolean;
  // Single-run mode
  singleOutput: OutputLine[];
  singleRunning: boolean;
  singleLastStatus: string | null;
  singleActiveRunId: string | null;
  singleOutputFiles: SkillFile[];
  // Actions
  setMode: (mode: PlaygroundMode) => void;
  setSelectedSkillId: (id: string | null) => void;
  // Chat actions
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string) => void;
  addToolUseMessage: (toolName: string, toolInput: string) => void;
  appendToLastAssistant: (content: string) => void;
  setSessionId: (id: string | null) => void;
  setInternalSessionId: (id: string | null) => void;
  setChatRunning: (running: boolean) => void;
  setChatActiveRunId: (id: string | null) => void;
  setChatOutputFiles: (files: SkillFile[]) => void;
  setChatFilesVisible: (visible: boolean) => void;
  clearChat: () => void;
  // Single-run actions
  addSingleOutput: (line: OutputLine) => void;
  clearSingleOutput: () => void;
  setSingleRunning: (running: boolean) => void;
  setSingleLastStatus: (status: string | null) => void;
  setSingleActiveRunId: (id: string | null) => void;
  setSingleOutputFiles: (files: SkillFile[]) => void;
  restoreSession: (session: Session) => void;
}

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  mode: 'chat',
  selectedSkillId: null,
  // Chat
  messages: [],
  sessionId: null,
  internalSessionId: null,
  chatRunning: false,
  chatActiveRunId: null,
  chatOutputFiles: [],
  chatFilesVisible: false,
  // Single-run
  singleOutput: [],
  singleRunning: false,
  singleLastStatus: null,
  singleActiveRunId: null,
  singleOutputFiles: [],
  // Actions
  setMode: (mode) => set({ mode }),
  setSelectedSkillId: (id) => set({ selectedSkillId: id }),
  // Chat actions
  addUserMessage: (content) =>
    set((state) => ({ messages: [...state.messages, { role: 'user', content }] })),
  addAssistantMessage: (content) =>
    set((state) => ({ messages: [...state.messages, { role: 'assistant', content }] })),
  addToolUseMessage: (toolName, toolInput) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      // Insert tool_use before the current streaming assistant message
      if (last?.role === 'assistant') {
        const assistantMsg = msgs.pop()!;
        msgs.push({ role: 'tool_use', content: toolInput, toolName });
        msgs.push(assistantMsg);
      } else {
        msgs.push({ role: 'tool_use', content: toolInput, toolName });
      }
      return { messages: msgs };
    }),
  appendToLastAssistant: (content) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + content };
      }
      return { messages: msgs };
    }),
  setSessionId: (id) => set({ sessionId: id }),
  setInternalSessionId: (id) => set({ internalSessionId: id }),
  setChatRunning: (running) => set({ chatRunning: running }),
  setChatActiveRunId: (id) => set({ chatActiveRunId: id }),
  setChatOutputFiles: (files) => set({ chatOutputFiles: files }),
  setChatFilesVisible: (visible) => set({ chatFilesVisible: visible }),
  clearChat: () => set({ messages: [], sessionId: null, internalSessionId: null, chatRunning: false, chatActiveRunId: null, chatOutputFiles: [], chatFilesVisible: false }),
  // Single-run actions
  addSingleOutput: (line) =>
    set((state) => ({ singleOutput: [...state.singleOutput, line] })),
  clearSingleOutput: () =>
    set({ singleOutput: [], singleOutputFiles: [], singleLastStatus: null }),
  setSingleRunning: (running) => set({ singleRunning: running }),
  setSingleLastStatus: (status) => set({ singleLastStatus: status }),
  setSingleActiveRunId: (id) => set({ singleActiveRunId: id }),
  setSingleOutputFiles: (files) => set({ singleOutputFiles: files }),
  restoreSession: (session) => {
    set({
      mode: 'chat',
      selectedSkillId: session.skillId,
      messages: session.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'tool_use')
        .map((m) => ({ role: m.role as 'user' | 'assistant' | 'tool_use', content: m.content, toolName: m.toolName })),
      internalSessionId: session.id,
      sessionId: session.claudeSessionId,
      chatRunning: false,
      chatActiveRunId: session.runId || null,
      chatOutputFiles: [],
      chatFilesVisible: false,
    });
    // Load work dir files if runId exists
    if (session.runId) {
      api.getRunFiles(session.skillId, session.runId).then((files) => {
        set({ chatOutputFiles: files });
      }).catch(() => {});
    }
  },
}));
