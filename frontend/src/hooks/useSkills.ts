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
      return skill;
    },
    [loadSkills],
  );

  const deleteSkill = useCallback(
    async (id: string) => {
      await api.deleteSkill(id);
      if (activeSkillId === id) {
        setActiveSkillId(null);
        setTree([]);
      }
      await loadSkills();
    },
    [activeSkillId, loadSkills, setActiveSkillId, setTree],
  );

  const copySkill = useCallback(
    async (id: string) => {
      const copied = await api.copySkill(id);
      await loadSkills();
      return copied;
    },
    [loadSkills],
  );

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  return { skills, activeSkillId, selectSkill, createSkill, deleteSkill, copySkill, loadSkills };
}
