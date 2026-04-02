import { useState, useEffect, useCallback } from 'react';
import { Save, Settings } from 'lucide-react';
import { usePromptLabStore } from '../../stores/promptLabStore';

interface Props {
  projectId: string;
  promptId: string;
}

export function PromptEditor({ projectId, promptId }: Props) {
  const { activePrompt, updatePrompt } = usePromptLabStore();
  const [promptText, setPromptText] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activePrompt) {
      setPromptText(activePrompt.prompt);
      setDescription(activePrompt.description);
      setModel(activePrompt.model ?? '');
      setDirty(false);
    }
  }, [activePrompt]);

  const handleSave = useCallback(async () => {
    if (!dirty) return;
    setSaving(true);
    await updatePrompt(projectId, promptId, {
      prompt: promptText,
      description,
      model: model || undefined,
    });
    setDirty(false);
    setSaving(false);
  }, [projectId, promptId, promptText, description, model, dirty]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  return (
    <div className="h-full flex flex-col bg-surface-raised">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-theme-accent" />
          <span className="text-xs font-medium text-theme-primary">Prompt</span>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className={`btn-primary btn-xs ${!dirty ? 'opacity-50' : ''}`}
        >
          <Save className="w-3 h-3" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Description */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-theme-muted mb-1 block">Description</label>
          <input
            className="input-base w-full text-xs"
            placeholder="What does this prompt do?"
            value={description}
            onChange={e => { setDescription(e.target.value); setDirty(true); }}
          />
        </div>

        {/* Model */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-theme-muted mb-1 block">Model</label>
          <input
            className="input-base w-full text-xs"
            placeholder="gpt-4o-mini (default from env)"
            value={model}
            onChange={e => { setModel(e.target.value); setDirty(true); }}
          />
        </div>

        {/* Prompt text */}
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wider text-theme-muted mb-1 block">Prompt Text</label>
          <textarea
            className="input-base w-full text-xs font-mono resize-none"
            style={{ minHeight: '300px' }}
            placeholder="Enter your prompt here..."
            value={promptText}
            onChange={e => { setPromptText(e.target.value); setDirty(true); }}
          />
        </div>

        {/* Stats */}
        <div className="text-[10px] text-theme-muted flex gap-3">
          <span>{promptText.length} chars</span>
          <span>{promptText.split(/\s+/).filter(Boolean).length} words</span>
          {dirty && <span className="text-theme-accent">unsaved</span>}
        </div>
      </div>
    </div>
  );
}
