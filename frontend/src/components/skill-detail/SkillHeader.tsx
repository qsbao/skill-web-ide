import { useNavigate } from 'react-router-dom';
import { Play, Code2, ArrowLeft, Calendar, Clock } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import type { SkillMeta } from '@skill-ide/shared';

interface SkillHeaderProps {
  skill: SkillMeta;
  frontmatter: Record<string, any>;
}

export function SkillHeader({ skill, frontmatter }: SkillHeaderProps) {
  const navigate = useNavigate();
  const idWithoutAt = skill.id.startsWith('@') ? skill.id.slice(1) : skill.id;

  return (
    <div
      className="rounded-xl border border-border/40 pb-6 px-6 pt-6"
      style={{
        background: 'linear-gradient(180deg, rgb(var(--surface-overlay)) 0%, transparent 100%)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{skill.name}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-sm font-medium text-accent">@{skill.author}</span>
            <span className="badge font-mono">v{skill.version}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/playground/${idWithoutAt}`)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg text-white transition-all duration-150 bg-emerald-600 hover:bg-emerald-500 shadow-sm hover:shadow-md"
          >
            <Play className="w-3.5 h-3.5" />
            Playground
          </button>
          <button
            onClick={() => navigate(`/ide/${idWithoutAt}`)}
            className="btn-primary"
          >
            <Code2 className="w-3.5 h-3.5" />
            Open in IDE
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-ghost"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <ThemeToggle />
        </div>
      </div>

      {skill.description && (
        <p className="text-slate-400 mb-4 leading-relaxed">{skill.description}</p>
      )}

      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {skill.tags.map((tag) => (
            <span
              key={tag}
              className="badge"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Extra frontmatter metadata */}
      {Object.keys(frontmatter).length > 0 && (
        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          {Object.entries(frontmatter).map(([key, value]) => (
            <div key={key} className="text-slate-400">
              <span className="text-slate-500">{key}:</span>{' '}
              <span className="text-slate-300">
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-5 mt-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          Created {new Date(skill.createdAt).toLocaleDateString()}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Updated {new Date(skill.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
