import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { IDELayout } from '../layouts/IDELayout';
import { useSkills } from '../hooks/useSkills';

export function IDEPage() {
  const { author, name } = useParams<{ author: string; name: string }>();
  const { selectSkill } = useSkills();

  useEffect(() => {
    if (author && name) {
      const slug = `@${author}/${name}`;
      selectSkill(slug);
    }
  }, [author, name, selectSkill]);

  return <IDELayout />;
}
