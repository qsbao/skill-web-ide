import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, PlayCircle, Layers } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { SearchBar } from '../components/dashboard/SearchBar';
import { SkillCard } from '../components/dashboard/SkillCard';
import { UploadSkillModal } from '../components/dashboard/UploadSkillModal';
import { useSkills } from '../hooks/useSkills';
import { useSkillStore } from '../stores/skillStore';

export function Dashboard() {
  const { skills, createSkill, deleteSkill, copySkill, loadSkills } = useSkills();
  const { searchQuery, setSearchQuery } = useSkillStore();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const filteredSkills = useMemo(() => {
    if (!searchQuery) return skills;
    const term = searchQuery.toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term) ||
        s.tags.some((t) => t.toLowerCase().includes(term)) ||
        s.author.toLowerCase().includes(term),
    );
  }, [skills, searchQuery]);

  const handleCreate = async () => {
    if (!skillName.trim()) return;
    const skill = await createSkill(skillName.trim());
    setSkillName('');
    setCreating(false);
    const idWithoutAt = skill.id.startsWith('@') ? skill.id.slice(1) : skill.id;
    navigate(`/ide/${idWithoutAt}`);
  };

  const handleCopy = async (id: string) => {
    await copySkill(id);
  };

  const handleDelete = async (id: string) => {
    await deleteSkill(id);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'rgb(var(--surface-base))' }}>
      {/* Header */}
      <div
        className="px-6 py-4"
        style={{
          background: 'rgb(var(--surface-raised))',
          borderBottom: '1px solid transparent',
          backgroundImage: 'linear-gradient(rgb(var(--surface-raised)), rgb(var(--surface-raised))), linear-gradient(90deg, transparent, rgb(var(--border-default) / 0.6), transparent)',
          backgroundClip: 'padding-box, border-box',
          backgroundOrigin: 'padding-box, border-box',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Skill Library</h1>
            <button
              onClick={() => navigate('/playground')}
              className="btn-ghost text-xs gap-1"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Playground
            </button>
            <ThemeToggle />
          </div>
          {creating ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="input-base max-w-[200px]"
                placeholder="Skill name"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setCreating(false);
                }}
              />
              <button
                onClick={handleCreate}
                className="btn-primary"
              >
                Create
              </button>
              <button
                onClick={() => setCreating(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowUpload(true)}
                className="btn-secondary"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </button>
              <button
                onClick={() => setCreating(true)}
                className="btn-primary"
              >
                <Plus className="w-3.5 h-3.5" />
                New Skill
              </button>
            </div>
          )}
        </div>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center mt-16 gap-4">
            <Layers className="w-16 h-16 text-theme-muted" />
            <p className="text-sm text-theme-muted">
              {searchQuery ? 'No skills match your search.' : 'No skills yet. Create one to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onCopy={handleCopy}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadSkillModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            loadSkills();
          }}
        />
      )}
    </div>
  );
}
