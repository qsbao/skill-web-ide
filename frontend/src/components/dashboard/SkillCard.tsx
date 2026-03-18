import { useNavigate } from 'react-router-dom';
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
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-gray-750 transition-colors group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-white truncate">{skill.name}</h3>
        <span className="text-xs text-gray-500 shrink-0 ml-2">v{skill.version}</span>
      </div>

      <div className="text-xs text-blue-400 mb-2">@{skill.author}</div>

      {skill.description && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">{skill.description}</p>
      )}

      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {skill.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
        <span className="text-xs text-gray-500">
          {new Date(skill.updatedAt).toLocaleDateString()}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/ide/${idWithoutAt}`);
            }}
            className="text-xs bg-gray-700 text-blue-400 px-2 py-1 rounded hover:bg-gray-600"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy(skill.id);
            }}
            className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-600"
          >
            Copy
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(skill.id);
            }}
            className="text-xs bg-gray-700 text-red-400 px-2 py-1 rounded hover:bg-gray-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
