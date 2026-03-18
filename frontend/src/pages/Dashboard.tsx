import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-white">Skill Library</h1>
          {creating ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="bg-gray-700 text-sm px-3 py-1.5 rounded border border-gray-600 text-white outline-none focus:border-blue-500"
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
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-500"
              >
                Create
              </button>
              <button
                onClick={() => setCreating(false)}
                className="text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowUpload(true)}
                className="text-sm bg-gray-700 text-gray-300 px-4 py-1.5 rounded hover:bg-gray-600"
              >
                Upload
              </button>
              <button
                onClick={() => setCreating(true)}
                className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-500"
              >
                + New Skill
              </button>
            </div>
          )}
        </div>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredSkills.length === 0 ? (
          <div className="text-center text-gray-500 mt-16">
            {searchQuery ? 'No skills match your search.' : 'No skills yet. Create one to get started.'}
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
