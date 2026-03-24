import { useNavigate } from 'react-router-dom';
import { Play, Code2, Copy, Trash2 } from 'lucide-react';
import type { SkillMeta } from '@skill-ide/shared';

interface SkillCardProps {
  skill: SkillMeta;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SkillCard({ skill, onCopy, onDelete }: SkillCardProps) {
  const navigate = useNavigate();

  const idWithoutAt = skill.id.startsWith('@') ? skill.id.slice(1) : skill.id;

  const handleClick = () => {
    navigate(`/skills/${idWithoutAt}`);
  };

  return (
    <div
      onClick={handleClick}
      className="card p-4 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-theme-primary truncate">{skill.name}</h3>
        <span className="badge shrink-0 ml-2 text-[10px] py-0 px-1.5 text-theme-accent bg-accent-subtle border-accent/25">
          v{skill.version}
        </span>
      </div>

      <div className="text-xs mb-2 text-theme-accent">@{skill.author}</div>

      {skill.description && (
        <p className="text-xs text-theme-secondary mb-3 line-clamp-2">{skill.description}</p>
      )}

      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
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

      <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50">
        <span className="text-xs text-theme-muted">
          {new Date(skill.updatedAt).toLocaleDateString()}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/playground/${idWithoutAt}`);
            }}
            title="Try in Playground"
            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/ide/${idWithoutAt}`);
            }}
            title="Edit in IDE"
            className="p-1.5 rounded-lg transition-colors text-theme-accent hover:bg-accent-subtle"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy(skill.id);
            }}
            title="Duplicate Skill"
            className="p-1.5 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-surface-overlay/60 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(skill.id);
            }}
            title="Delete Skill"
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
