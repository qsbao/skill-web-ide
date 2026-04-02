import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FlaskConical, Trash2, FolderOpen } from 'lucide-react';
import { usePromptLabStore } from '../stores/promptLabStore';

export function PromptLabPage() {
  const { projects, loadProjects, createProject, deleteProject } = usePromptLabStore();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const project = await createProject({ name: name.trim(), description: description.trim() });
    setName('');
    setDescription('');
    setCreating(false);
    navigate(`/prompt-lab/${project.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this project and all its prompts?')) return;
    await deleteProject(projectId);
  };

  return (
    <div className="h-full flex flex-col bg-surface-base">
      <div className="header-bar px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-theme-primary">Prompt Lab</h1>
          {creating ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="input-base max-w-[200px]"
                placeholder="Project name"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setCreating(false);
                }}
              />
              <button onClick={handleCreate} className="btn-primary">Create</button>
              <button onClick={() => setCreating(false)} className="btn-ghost">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setCreating(true)} className="btn-primary">
              <Plus className="w-3.5 h-3.5" />
              New Project
            </button>
          )}
        </div>
        <p className="text-xs text-theme-secondary">Test, evaluate, and optimize your LLM prompts.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center mt-16 gap-4">
            <FlaskConical className="w-16 h-16 text-theme-muted" />
            <p className="text-sm text-theme-muted">No projects yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => navigate(`/prompt-lab/${project.id}`)}
                className="card p-4 cursor-pointer hover:border-theme-accent/30 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="w-4 h-4 text-theme-accent" />
                    <h3 className="text-sm font-medium text-theme-primary">{project.name}</h3>
                  </div>
                  <button
                    onClick={e => handleDelete(e, project.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-theme-muted hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {project.description && (
                  <p className="text-xs text-theme-secondary line-clamp-2">{project.description}</p>
                )}
                <p className="text-[10px] text-theme-muted mt-2">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
