import { create } from 'zustand';
import type { SkillMeta } from '@skill-ide/shared';

interface SkillState {
  skills: SkillMeta[];
  activeSkillId: string | null;
  setSkills: (skills: SkillMeta[]) => void;
  setActiveSkillId: (id: string | null) => void;
}

export const useSkillStore = create<SkillState>((set) => ({
  skills: [],
  activeSkillId: null,
  setSkills: (skills) => set({ skills }),
  setActiveSkillId: (id) => set({ activeSkillId: id }),
}));
