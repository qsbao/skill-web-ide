import { useState, useEffect, useCallback } from 'react';
import { Save, Settings, Tag, History, RotateCcw, Download } from 'lucide-react';
import { usePromptLabStore } from '../../stores/promptLabStore';
import { api } from '../../api/client';
import type { PromptVersion } from '@skill-ide/shared';

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
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showMajorBump, setShowMajorBump] = useState(false);
  const [majorDescription, setMajorDescription] = useState('');

  useEffect(() => {
    api.promptLab.listModels()
      .then(({ models, default: def }) => {
        setAvailableModels(models);
        setDefaultModel(def);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activePrompt) {
      setPromptText(activePrompt.prompt);
      setDescription(activePrompt.description);
      setModel(activePrompt.model ?? '');
      setDirty(false);
    }
  }, [activePrompt]);

  const handleSave = useCallback(async (bumpMajor = false) => {
    if (!dirty && !bumpMajor) return;
    setSaving(true);
    await updatePrompt(projectId, promptId, {
      prompt: promptText,
      description,
      model: model || undefined,
      ...(bumpMajor ? { bumpMajor: true, majorDescription: majorDescription.trim() || undefined } : {}),
    });
    setDirty(false);
    setSaving(false);
    setShowMajorBump(false);
    setMajorDescription('');
  }, [projectId, promptId, promptText, description, model, dirty, majorDescription]);

  const handleExport = async () => {
    const data = await api.promptLab.exportPrompt(projectId, promptId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePrompt?.name ?? promptId}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = async (version: PromptVersion) => {
    const restored = await api.promptLab.restoreVersion(projectId, promptId, version.version);
    // Use setState directly to avoid setActivePrompt which wipes suite/runs
    usePromptLabStore.setState({ activePrompt: restored });
    setShowHistory(false);
  };

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

  const versions = activePrompt?.versions ?? [];

  return (
    <div className="h-full flex flex-col bg-surface-raised">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-theme-accent" />
          <span className="text-xs font-medium text-theme-primary">Prompt</span>
          {activePrompt?.version && (
            <span className="badge text-[10px] font-mono">v{activePrompt.version}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExport}
            className="btn-ghost btn-xs"
            title="Export prompt"
          >
            <Download className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`btn-ghost btn-xs ${showHistory ? 'text-theme-accent' : ''}`}
            title="Version history"
          >
            <History className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleSave()}
            disabled={!dirty || saving}
            className={`btn-primary btn-xs ${!dirty ? 'opacity-50' : ''}`}
          >
            <Save className="w-3 h-3" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Version history panel */}
      {showHistory && (
        <div className="border-b border-border-subtle bg-surface-overlay/50 max-h-48 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-theme-muted">Version History</div>
          {versions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-theme-muted">No versions yet.</div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {[...versions].reverse().map(v => (
                <div key={v.version} className={`flex items-center gap-2 px-3 py-1.5 text-xs ${v.version === activePrompt?.version ? 'bg-accent-subtle/20' : 'hover:bg-surface-overlay/30'}`}>
                  <span className="font-mono text-theme-accent shrink-0">v{v.version}</span>
                  <span className="font-mono text-[10px] text-theme-muted shrink-0">#{v.hash.slice(0, 7)}</span>
                  {v.description && <span className="text-theme-secondary truncate">{v.description}</span>}
                  <span className="text-[10px] text-theme-muted ml-auto shrink-0">{new Date(v.timestamp).toLocaleDateString()}</span>
                  {v.version !== activePrompt?.version && (
                    <button
                      onClick={() => handleRestore(v)}
                      className="btn-ghost btn-xs shrink-0"
                      title="Restore this version"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
          <select
            className="input-base w-full text-xs"
            value={model}
            onChange={e => { setModel(e.target.value); setDirty(true); }}
          >
            <option value="">Default ({defaultModel || 'from env'})</option>
            {availableModels.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
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

        {/* Stats + Major bump */}
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-theme-muted flex gap-3">
            <span>{promptText.length} chars</span>
            <span>{promptText.split(/\s+/).filter(Boolean).length} words</span>
            {dirty && <span className="text-theme-accent">unsaved</span>}
          </div>
          {dirty && (
            <div>
              {showMajorBump ? (
                <div className="flex items-center gap-1">
                  <input
                    className="input-base text-xs w-32"
                    placeholder="Version note..."
                    value={majorDescription}
                    onChange={e => setMajorDescription(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave(true)}
                  />
                  <button onClick={() => handleSave(true)} className="btn-primary btn-xs">
                    <Tag className="w-3 h-3" />
                    Major
                  </button>
                  <button onClick={() => setShowMajorBump(false)} className="btn-ghost btn-xs">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowMajorBump(true)} className="btn-ghost btn-xs text-[10px]">
                  <Tag className="w-3 h-3" />
                  Bump Major
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
