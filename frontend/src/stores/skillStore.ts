import { create } from 'zustand';
import type { SkillMeta } from '@skill-ide/shared';

interface SkillState {
  skills: SkillMeta[];
  activeSkillId: string | null;
  searchQuery: string;
  setSkills: (skills: SkillMeta[]) => void;
  setActiveSkillId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useSkillStore = create<SkillState>((set) => ({
  skills: [],
  activeSkillId: null,
  searchQuery: '',
  setSkills: (skills) => set({ skills }),
  setActiveSkillId: (id) => set({ activeSkillId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
