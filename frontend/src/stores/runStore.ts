import { create } from 'zustand';
import type { SkillFile } from '@skill-ide/shared';

interface OutputLine {
  stream: 'stdout' | 'stderr';
  data: string;
}

interface RunState {
  output: OutputLine[];
  running: boolean;
  lastStatus: string | null;
  activeRunId: string | null;
  outputFiles: SkillFile[];
  addOutput: (line: OutputLine) => void;
  clearOutput: () => void;
  setRunning: (running: boolean) => void;
  setLastStatus: (status: string | null) => void;
  setActiveRunId: (id: string | null) => void;
  setOutputFiles: (files: SkillFile[]) => void;
}

export const useRunStore = create<RunState>((set) => ({
  output: [],
  running: false,
  lastStatus: null,
  activeRunId: null,
  outputFiles: [],
  addOutput: (line) => set((state) => ({ output: [...state.output, line] })),
  clearOutput: () => set({ output: [], outputFiles: [], lastStatus: null }),
  setRunning: (running) => set({ running }),
  setLastStatus: (status) => set({ lastStatus: status }),
  setActiveRunId: (id) => set({ activeRunId: id }),
  setOutputFiles: (files) => set({ outputFiles: files }),
}));
