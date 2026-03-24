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
    <div ref={ref} className="relative w-52">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between rounded-md px-2.5 py-1 text-xs text-left transition-all duration-150 border ${
          open
            ? 'border-accent-muted shadow-glow-sm'
            : 'border-border/50'
        }`}
        style={{ background: 'rgb(var(--surface-inset))' }}
      >
        {selected ? (
          <span className="text-theme-accent truncate flex-1 font-medium">{selected.id}</span>
        ) : (
          <span className="text-theme-muted flex-1">Select skill...</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-theme-muted ml-1.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-64 bg-surface-overlay border border-border/60 rounded-lg shadow-float max-h-56 overflow-hidden flex flex-col animate-slide-down">
          <div className="p-1.5 border-b border-border-subtle/50">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-theme-muted" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills..."
                className="input-base pl-7 py-1 text-xs"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="text-xs text-theme-muted p-3 text-center">No skills found</div>
            ) : (
              filtered.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => {
                    onChange(skill.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs transition-all duration-100 border-l-2 ${
                    skill.id === value
                      ? 'bg-accent-subtle border-l-accent text-theme-primary'
                      : 'border-l-transparent hover:bg-surface-raised/60 hover:border-l-accent/40'
                  }`}
                >
                  <div className="text-accent font-medium">{skill.id}</div>
                  {skill.description && (
                    <div className="text-theme-muted text-[11px] truncate mt-0.5">{skill.description}</div>
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
