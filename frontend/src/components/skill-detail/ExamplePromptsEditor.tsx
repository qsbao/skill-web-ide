import { useState } from 'react';
import { Plus, X, Save, MessageSquare } from 'lucide-react';
import { api } from '../../api/client';

interface ExamplePromptsEditorProps {
  skillId: string;
  initialPrompts: string[];
  onSaved: (prompts: string[]) => void;
}

const MAX_PROMPTS = 10;

export function ExamplePromptsEditor({ skillId, initialPrompts, onSaved }: ExamplePromptsEditorProps) {
  const [prompts, setPrompts] = useState<string[]>(initialPrompts.length > 0 ? initialPrompts : ['']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (index: number, value: string) => {
    const next = [...prompts];
    next[index] = value;
    setPrompts(next);
    setSaved(false);
  };

  const remove = (index: number) => {
    setPrompts(prompts.filter((_, i) => i !== index));
    setSaved(false);
  };

  const add = () => {
    if (prompts.length < MAX_PROMPTS) {
      setPrompts([...prompts, '']);
      setSaved(false);
    }
  };

  const save = async () => {
    const cleaned = prompts.map((p) => p.trim()).filter(Boolean);
    setSaving(true);
    try {
      await api.updateSkill(skillId, { examplePrompts: cleaned });
      setPrompts(cleaned.length > 0 ? cleaned : ['']);
      setSaved(true);
      onSaved(cleaned);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(prompts.map((p) => p.trim()).filter(Boolean)) !== JSON.stringify(initialPrompts);

  return (
    <div className="rounded-xl border border-border/40 bg-surface-raised/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-theme-primary">Example Prompts</h3>
        <span className="text-xs text-theme-muted">Shown in the playground to help users get started</span>
      </div>

      <div className="flex flex-col gap-2">
        {prompts.map((prompt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => update(i, e.target.value)}
              placeholder="e.g. Create a landing page for a coffee shop"
              className="input-base flex-1 text-sm rounded-lg px-3 py-2"
            />
            <button
              onClick={() => remove(i)}
              className="btn-ghost p-1.5 text-theme-muted hover:text-red-400"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={add}
          disabled={prompts.length >= MAX_PROMPTS}
          className="btn-ghost text-xs gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add prompt
        </button>
        <div className="flex-1" />
        {saved && <span className="text-xs text-green-400">Saved</span>}
        <button
          onClick={save}
          disabled={saving || !hasChanges}
          className="btn-primary text-xs gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
