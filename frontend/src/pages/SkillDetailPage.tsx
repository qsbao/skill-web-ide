import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
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
      <div className="h-full bg-surface-base flex flex-col items-center justify-center animate-fade-in">
        <Loader2 className="w-8 h-8 text-accent animate-spin mb-3" />
        <span className="text-slate-500 text-sm">Loading skill...</span>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="h-full bg-surface-base flex flex-col items-center justify-center animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <span className="text-red-400 text-sm">{error || 'Skill not found'}</span>
      </div>
    );
  }

  return (
    <div className="h-full bg-surface-base overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
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
