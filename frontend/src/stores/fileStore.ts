import { create } from 'zustand';
import type { SkillFile } from '@skill-ide/shared';

interface FileState {
  tree: SkillFile[];
  loading: boolean;
  setTree: (tree: SkillFile[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useFileStore = create<FileState>((set) => ({
  tree: [],
  loading: false,
  setTree: (tree) => set({ tree }),
  setLoading: (loading) => set({ loading }),
}));
