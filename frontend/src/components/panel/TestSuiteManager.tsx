import { useState, useEffect, useCallback } from 'react';
import { Upload, Download, Edit2, Trash2, Plus, ClipboardList } from 'lucide-react';
import { useSkillStore } from '../../stores/skillStore';
import { api } from '../../api/client';
import type { TestCase, TestType } from '@skill-ide/shared';

export function TestSuiteManager() {
  const { activeSkillId } = useSkillStore();
  const [cases, setCases] = useState<TestCase[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'unit' as TestType, input: '', expectedOutput: '' });

  const loadCases = useCallback(async () => {
    if (!activeSkillId) return;
    const data = await api.listTestCases(activeSkillId);
    setCases(data);
  }, [activeSkillId]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleSave = async () => {
    if (!activeSkillId || !form.name.trim()) return;
    if (editing) {
      await api.updateTestCase(activeSkillId, editing, form);
    } else {
      await api.createTestCase(activeSkillId, form);
    }
    setForm({ name: '', type: 'unit', input: '', expectedOutput: '' });
    setEditing(null);
    loadCases();
  };

  const handleEdit = (tc: TestCase) => {
    setEditing(tc.id);
    setForm({ name: tc.name, type: tc.type, input: tc.input, expectedOutput: tc.expectedOutput || '' });
  };

  const handleDelete = async (id: string) => {
    if (!activeSkillId) return;
    await api.deleteTestCase(activeSkillId, id);
    loadCases();
  };

  const handleExport = async () => {
    if (!activeSkillId) return;
    const data = await api.exportTestCases(activeSkillId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-cases-${activeSkillId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !activeSkillId) return;
      const text = await file.text();
      const data = JSON.parse(text);
      const importData = Array.isArray(data) ? data : data.cases || [];
      await api.importTestCases(activeSkillId, importData);
      loadCases();
    };
    input.click();
  };

  if (!activeSkillId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-surface-base">
        <ClipboardList className="w-6 h-6 text-theme-muted mb-2" />
        <span className="text-theme-muted text-xs">Select a skill to manage test cases</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-base overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-surface-raised border-b border-border/40 shrink-0">
        <span className="text-xs font-semibold text-theme-primary">
          Test Cases <span className="badge ml-1.5">{cases.length}</span>
        </span>
        <div className="flex gap-1">
          <button onClick={handleImport} className="btn-ghost text-xs !px-2 !py-1">
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <button onClick={handleExport} className="btn-ghost text-xs !px-2 !py-1">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="p-2.5 border-b border-border/40 shrink-0 bg-surface-raised/50">
        <div className="flex gap-1.5 mb-1.5">
          <input
            className="input-base flex-1 !text-xs !px-2 !py-1.5"
            placeholder="Test name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="input-base !w-auto !text-xs !px-2 !py-1.5"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as TestType })}
          >
            <option value="unit">Unit</option>
            <option value="lint">Lint</option>
            <option value="benchmark">Bench</option>
          </select>
        </div>
        <textarea
          className="input-base !text-xs !px-2 !py-1.5 font-mono resize-none"
          rows={2}
          placeholder="Input (JSON)"
          value={form.input}
          onChange={(e) => setForm({ ...form, input: e.target.value })}
        />
        <textarea
          className="input-base !text-xs !px-2 !py-1.5 font-mono resize-none mt-1.5"
          rows={2}
          placeholder="Expected output (optional)"
          value={form.expectedOutput}
          onChange={(e) => setForm({ ...form, expectedOutput: e.target.value })}
        />
        <div className="flex gap-1.5 mt-1.5">
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="btn-primary text-xs !px-2.5 !py-1"
          >
            <Plus className="w-3 h-3" />
            {editing ? 'Update' : 'Add'}
          </button>
          {editing && (
            <button
              onClick={() => { setEditing(null); setForm({ name: '', type: 'unit', input: '', expectedOutput: '' }); }}
              className="btn-ghost text-xs !px-2.5 !py-1"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <ClipboardList className="w-5 h-5 text-theme-muted mb-2" />
            <span className="text-xs text-theme-muted">No test cases yet.</span>
          </div>
        ) : (
          cases.map((tc) => (
            <div key={tc.id} className="px-3 py-2.5 border-b border-border-subtle/30 hover:bg-surface-overlay/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`badge !text-[10px] !px-1.5 !py-0 ${
                    tc.type === 'unit' ? '!bg-emerald-500/10 !text-emerald-400 !border-emerald-500/20' :
                    tc.type === 'lint' ? '!bg-yellow-500/10 !text-yellow-400 !border-yellow-500/20' :
                    '!bg-violet-500/10 !text-violet-400 !border-violet-500/20'
                  }`}>{tc.type}</span>
                  <span className="text-xs text-theme-primary">{tc.name}</span>
                </div>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => handleEdit(tc)}
                    className="btn-ghost !px-1.5 !py-1 text-theme-muted hover:text-accent"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(tc.id)}
                    className="btn-ghost !px-1.5 !py-1 text-theme-muted hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {tc.input && (
                <pre className="text-[10px] text-theme-muted mt-1 truncate font-mono">{tc.input}</pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
