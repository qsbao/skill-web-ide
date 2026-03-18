import { useState, useEffect, useCallback } from 'react';
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
      <div className="h-full flex items-center justify-center text-gray-600 text-xs">
        Select a skill to manage test cases
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700 shrink-0">
        <span className="text-xs font-semibold text-gray-300">Test Cases ({cases.length})</span>
        <div className="flex gap-1">
          <button onClick={handleImport} className="text-xs text-blue-400 hover:text-blue-300">Import</button>
          <button onClick={handleExport} className="text-xs text-blue-400 hover:text-blue-300">Export</button>
        </div>
      </div>

      {/* Form */}
      <div className="p-2 border-b border-gray-700 shrink-0">
        <div className="flex gap-1 mb-1">
          <input
            className="flex-1 bg-gray-700 text-xs px-2 py-1 rounded border border-gray-600 text-white outline-none focus:border-blue-500"
            placeholder="Test name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="bg-gray-700 text-xs px-2 py-1 rounded border border-gray-600 text-white outline-none"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as TestType })}
          >
            <option value="unit">Unit</option>
            <option value="lint">Lint</option>
            <option value="benchmark">Bench</option>
          </select>
        </div>
        <textarea
          className="w-full bg-gray-700 text-xs px-2 py-1 rounded border border-gray-600 text-white outline-none focus:border-blue-500 font-mono resize-none"
          rows={2}
          placeholder="Input (JSON)"
          value={form.input}
          onChange={(e) => setForm({ ...form, input: e.target.value })}
        />
        <textarea
          className="w-full bg-gray-700 text-xs px-2 py-1 rounded border border-gray-600 text-white outline-none focus:border-blue-500 font-mono resize-none mt-1"
          rows={2}
          placeholder="Expected output (optional)"
          value={form.expectedOutput}
          onChange={(e) => setForm({ ...form, expectedOutput: e.target.value })}
        />
        <div className="flex gap-1 mt-1">
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-500 disabled:opacity-50"
          >
            {editing ? 'Update' : 'Add'}
          </button>
          {editing && (
            <button
              onClick={() => { setEditing(null); setForm({ name: '', type: 'unit', input: '', expectedOutput: '' }); }}
              className="text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {cases.length === 0 ? (
          <div className="text-xs text-gray-600 p-3">No test cases yet.</div>
        ) : (
          cases.map((tc) => (
            <div key={tc.id} className="px-3 py-2 border-b border-gray-800 hover:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1 rounded ${
                    tc.type === 'unit' ? 'bg-green-900 text-green-300' :
                    tc.type === 'lint' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-purple-900 text-purple-300'
                  }`}>{tc.type}</span>
                  <span className="text-xs text-gray-200">{tc.name}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(tc)} className="text-xs text-gray-500 hover:text-blue-400">Edit</button>
                  <button onClick={() => handleDelete(tc.id)} className="text-xs text-gray-500 hover:text-red-400">Del</button>
                </div>
              </div>
              {tc.input && (
                <pre className="text-[10px] text-gray-500 mt-1 truncate font-mono">{tc.input}</pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
