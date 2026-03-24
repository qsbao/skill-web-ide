import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
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
        className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-left transition-all duration-150 border"
        style={{
          background: 'rgb(var(--surface-inset))',
          borderColor: open ? 'var(--accent-muted)' : 'rgb(var(--border-default) / 0.5)',
          boxShadow: open ? '0 0 0 2px var(--accent-subtle), 0 0 12px -4px var(--accent-glow)' : 'none',
        }}
      >
        {selected ? (
          <span className="text-slate-200 truncate flex-1">
            <span className="text-accent">{selected.id}</span>
            {selected.description && (
              <span className="text-slate-500 ml-2">-- {selected.description}</span>
            )}
          </span>
        ) : (
          <span className="text-slate-500 flex-1">Select a skill...</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-500 ml-2 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 w-full bg-surface-overlay border border-border/60 rounded-xl shadow-float max-h-64 overflow-hidden flex flex-col animate-slide-down">
          <div className="p-2 border-b border-border-subtle/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills..."
                className="input-base !pl-8 !py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="text-xs text-slate-500 p-4 text-center">No skills found</div>
            ) : (
              filtered.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => {
                    onChange(skill.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-all duration-100 border-l-2 ${
                    skill.id === value
                      ? 'bg-accent-subtle border-l-accent text-slate-200'
                      : 'border-l-transparent hover:bg-surface-raised/60 hover:border-l-accent/40'
                  }`}
                >
                  <div className="text-accent text-xs font-medium">{skill.id}</div>
                  {skill.description && (
                    <div className="text-slate-500 text-xs truncate mt-0.5">{skill.description}</div>
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
