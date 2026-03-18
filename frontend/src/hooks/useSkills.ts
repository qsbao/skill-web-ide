import { useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useSkillStore } from '../stores/skillStore';
import { useFileStore } from '../stores/fileStore';

export function useSkills() {
  const { skills, activeSkillId, setSkills, setActiveSkillId } = useSkillStore();
  const { setTree, setLoading } = useFileStore();

  const loadSkills = useCallback(async () => {
    const data = await api.listSkills();
    setSkills(data);
  }, [setSkills]);

  const selectSkill = useCallback(
    async (id: string) => {
      setActiveSkillId(id);
      setLoading(true);
      try {
        const tree = await api.getFileTree(id);
        setTree(tree);
      } finally {
        setLoading(false);
      }
    },
    [setActiveSkillId, setTree, setLoading],
  );

  const createSkill = useCallback(
    async (name: string) => {
      const skill = await api.createSkill({ name });
      await loadSkills();
      await selectSkill(skill.id);
      return skill;
    },
    [loadSkills, selectSkill],
  );

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  return { skills, activeSkillId, selectSkill, createSkill, loadSkills };
}
