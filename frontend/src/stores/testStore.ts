import { create } from 'zustand';

interface OutputLine {
  stream: 'stdout' | 'stderr';
  data: string;
}

interface TestState {
  output: OutputLine[];
  running: boolean;
  lastStatus: string | null;
  addOutput: (line: OutputLine) => void;
  clearOutput: () => void;
  setRunning: (running: boolean) => void;
  setLastStatus: (status: string | null) => void;
}

export const useTestStore = create<TestState>((set) => ({
  output: [],
  running: false,
  lastStatus: null,
  addOutput: (line) => set((state) => ({ output: [...state.output, line] })),
  clearOutput: () => set({ output: [] }),
  setRunning: (running) => set({ running }),
  setLastStatus: (status) => set({ lastStatus: status }),
}));
