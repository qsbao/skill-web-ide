import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { SkillHeader } from '../components/skill-detail/SkillHeader';
import { MarkdownBody } from '../components/skill-detail/MarkdownBody';
import { FileViewer } from '../components/skill-detail/FileViewer';
import type { SkillMeta, SkillFile } from '@skill-ide/shared';

export function SkillDetailPage() {
  const { author, name } = useParams<{ author: string; name: string }>();
  const [skill, setSkill] = useState<SkillMeta | null>(null);
  const [readme, setReadme] = useState<{ frontmatter: Record<string, any>; body: string }>({
    frontmatter: {},
    body: '',
  });
  const [tree, setTree] = useState<SkillFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const skillId = author && name ? `@${author}/${name}` : '';

  useEffect(() => {
    if (!skillId) return;

    setLoading(true);
    setError(null);

    Promise.all([
      api.getSkill(skillId),
      api.getSkillReadme(skillId),
      api.getFileTree(skillId),
    ])
      .then(([skillData, readmeData, treeData]) => {
        setSkill(skillData);
        setReadme(readmeData);
        setTree(treeData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [skillId]);

  if (loading) {
    return (
      <div className="h-full bg-gray-900 flex items-center justify-center">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="h-full bg-gray-900 flex items-center justify-center">
        <span className="text-red-400">{error || 'Skill not found'}</span>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <SkillHeader skill={skill} frontmatter={readme.frontmatter} />

        <div className="mt-8">
          <MarkdownBody content={readme.body} />
        </div>

        <div className="mt-8">
          <FileViewer tree={tree} skillId={skillId} />
        </div>
      </div>
    </div>
  );
}
