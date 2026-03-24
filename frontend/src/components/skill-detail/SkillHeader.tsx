import { useNavigate } from 'react-router-dom';
import type { SkillMeta } from '@skill-ide/shared';

interface SkillHeaderProps {
  skill: SkillMeta;
  frontmatter: Record<string, any>;
}

export function SkillHeader({ skill, frontmatter }: SkillHeaderProps) {
  const navigate = useNavigate();
  const idWithoutAt = skill.id.startsWith('@') ? skill.id.slice(1) : skill.id;

  return (
    <div className="border-b border-gray-700 pb-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{skill.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-blue-400">@{skill.author}</span>
            <span className="text-sm text-gray-500">v{skill.version}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/playground/${idWithoutAt}`)}
            className="text-sm bg-green-700 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Try in Playground
          </button>
          <button
            onClick={() => navigate(`/ide/${idWithoutAt}`)}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
          >
            Open in IDE
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm bg-gray-700 text-gray-300 px-4 py-2 rounded hover:bg-gray-600"
          >
            Back
          </button>
        </div>
      </div>

      {skill.description && (
        <p className="text-gray-400 mb-3">{skill.description}</p>
      )}

      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {skill.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-700 text-gray-300 px-2.5 py-1 rounded-full"
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
            <div key={key} className="text-gray-400">
              <span className="text-gray-500">{key}:</span>{' '}
              <span className="text-gray-300">
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span>Created {new Date(skill.createdAt).toLocaleDateString()}</span>
        <span>Updated {new Date(skill.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
