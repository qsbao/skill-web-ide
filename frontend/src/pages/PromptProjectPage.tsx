import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, FileText, Trash2, FlaskConical } from 'lucide-react';
import { usePromptLabStore } from '../stores/promptLabStore';

export function PromptProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { activeProject, setActiveProject, loadProjects, projects, prompts, loadPrompts, createPrompt, deletePrompt } = usePromptLabStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!projectId) return;
    loadProjects().then(() => {
      loadPrompts(projectId);
    });
  }, [projectId]);

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) setActiveProject(project);
    }
  }, [projectId, projects]);

  const handleCreate = async () => {
    if (!name.trim() || !projectId) return;
    const prompt = await createPrompt(projectId, { name: name.trim() });
    setName('');
    setCreating(false);
    navigate(`/prompt-lab/${projectId}/${prompt.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, promptId: string) => {
    e.stopPropagation();
    if (!projectId) return;
    if (!confirm('Delete this prompt and all its test data?')) return;
    await deletePrompt(projectId, promptId);
  };

  return (
    <div className="h-full flex flex-col bg-surface-base">
      <div className="header-bar px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/prompt-lab')} className="btn-ghost btn-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <h1 className="text-lg font-semibold text-theme-primary">{activeProject?.name ?? projectId}</h1>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-theme-secondary">{activeProject?.description || 'Prompts in this project'}</p>
          {creating ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="input-base max-w-[200px]"
                placeholder="Prompt name"
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
              New Prompt
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {prompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center mt-16 gap-4">
            <FlaskConical className="w-16 h-16 text-theme-muted" />
            <p className="text-sm text-theme-muted">No prompts yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {prompts.map(prompt => (
              <div
                key={prompt.id}
                onClick={() => navigate(`/prompt-lab/${projectId}/${prompt.id}`)}
                className="card p-4 cursor-pointer hover:border-theme-accent/30 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-theme-accent" />
                    <h3 className="text-sm font-medium text-theme-primary">{prompt.name}</h3>
                  </div>
                  <button
                    onClick={e => handleDelete(e, prompt.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-theme-muted hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {prompt.description && (
                  <p className="text-xs text-theme-secondary line-clamp-2">{prompt.description}</p>
                )}
                <p className="text-[10px] text-theme-muted mt-2">
                  {prompt.prompt ? `${prompt.prompt.length} chars` : 'Empty prompt'}
                  {prompt.model && ` \u00b7 ${prompt.model}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
