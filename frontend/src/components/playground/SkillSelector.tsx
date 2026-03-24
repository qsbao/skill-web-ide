import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../../api/client';
import type { SkillMeta } from '@skill-ide/shared';

interface SkillSelectorProps {
  value: string | null;
  onChange: (skillId: string | null) => void;
}

export function SkillSelector({ value, onChange }: SkillSelectorProps) {
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listSkills().then(setSkills).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return skills;
    const term = search.toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term),
    );
  }, [skills, search]);

  const selected = skills.find((s) => s.id === value);

  return (
    <div ref={ref} className="relative w-80">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-left hover:border-blue-500 transition-colors"
      >
        {selected ? (
          <span className="text-white truncate">
            <span className="text-blue-400">{selected.id}</span>
            {selected.description && (
              <span className="text-gray-500 ml-2">— {selected.description}</span>
            )}
          </span>
        ) : (
          <span className="text-gray-500">Select a skill...</span>
        )}
        <span className="text-gray-500 ml-2">&#9662;</span>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-gray-800 border border-gray-600 rounded shadow-lg max-h-64 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-700">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="w-full bg-gray-700 text-sm text-white px-2 py-1.5 rounded border border-gray-600 outline-none focus:border-blue-500"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="text-xs text-gray-500 p-3 text-center">No skills found</div>
            ) : (
              filtered.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => {
                    onChange(skill.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                    skill.id === value ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="text-blue-400 text-xs">{skill.id}</div>
                  {skill.description && (
                    <div className="text-gray-400 text-xs truncate">{skill.description}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
