import { useState } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, ChevronDown, ChevronRight, Edit3, Save, X } from 'lucide-react';
import { usePromptLabStore } from '../../stores/promptLabStore';
import type { PromptTestCase } from '@skill-ide/shared';

interface Props {
  projectId: string;
  promptId: string;
}

export function TestSuiteEditor({ projectId, promptId }: Props) {
  const { suite, addCase, updateCase, deleteCase } = usePromptLabStore();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New case form
  const [newDescription, setNewDescription] = useState('');
  const [newInput, setNewInput] = useState('');
  const [newPass, setNewPass] = useState(true);
  const [newMustContain, setNewMustContain] = useState('');
  const [newMustNotContain, setNewMustNotContain] = useState('');
  const [newRegex, setNewRegex] = useState('');

  // Edit form
  const [editDescription, setEditDescription] = useState('');
  const [editInput, setEditInput] = useState('');
  const [editPass, setEditPass] = useState(true);
  const [editMustContain, setEditMustContain] = useState('');
  const [editMustNotContain, setEditMustNotContain] = useState('');
  const [editRegex, setEditRegex] = useState('');

  const handleAdd = async () => {
    if (!newInput.trim()) return;
    const expected: any = { pass: newPass };
    const mustContain = newMustContain.split(',').map(s => s.trim()).filter(Boolean);
    const mustNotContain = newMustNotContain.split(',').map(s => s.trim()).filter(Boolean);
    if (mustContain.length > 0) expected.outputMustContain = mustContain;
    if (mustNotContain.length > 0) expected.outputMustNotContain = mustNotContain;
    if (newRegex.trim()) expected.outputMatchRegex = newRegex.trim();
    await addCase(projectId, promptId, {
      description: newDescription.trim(),
      input: newInput.trim(),
      expected,
    });
    setNewDescription('');
    setNewInput('');
    setNewPass(true);
    setNewMustContain('');
    setNewMustNotContain('');
    setNewRegex('');
    setAdding(false);
  };

  const handleDelete = async (caseId: string) => {
    await deleteCase(projectId, promptId, caseId);
  };

  const handleToggleExpected = async (tc: PromptTestCase) => {
    await updateCase(projectId, promptId, tc.id, {
      expected: { ...tc.expected, pass: !tc.expected.pass },
    });
  };

  const startEdit = (tc: PromptTestCase) => {
    setEditingId(tc.id);
    setExpandedId(tc.id);
    setEditDescription(tc.description);
    setEditInput(tc.input);
    setEditPass(tc.expected.pass);
    setEditMustContain((tc.expected.outputMustContain ?? []).join(', '));
    setEditMustNotContain((tc.expected.outputMustNotContain ?? []).join(', '));
    setEditRegex(tc.expected.outputMatchRegex ?? '');
  };

  const handleSaveEdit = async (caseId: string) => {
    const expected: any = { pass: editPass };
    const mustContain = editMustContain.split(',').map(s => s.trim()).filter(Boolean);
    const mustNotContain = editMustNotContain.split(',').map(s => s.trim()).filter(Boolean);
    if (mustContain.length > 0) expected.outputMustContain = mustContain;
    if (mustNotContain.length > 0) expected.outputMustNotContain = mustNotContain;
    if (editRegex.trim()) expected.outputMatchRegex = editRegex.trim();
    await updateCase(projectId, promptId, caseId, {
      description: editDescription.trim(),
      input: editInput.trim(),
      expected,
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const cases = suite?.cases ?? [];

  return (
    <div className="h-full flex flex-col bg-surface-raised">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-theme-primary">Test Suite</span>
          <span className="badge text-[10px]">{cases.length} cases</span>
        </div>
        <button onClick={() => setAdding(!adding)} className="btn-primary btn-xs">
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Add form */}
        {adding && (
          <div className="p-3 border-b border-border-subtle bg-surface-overlay/50 space-y-2">
            <input
              autoFocus
              className="input-base w-full text-xs"
              placeholder="Description (optional)"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
            />
            <textarea
              className="input-base w-full text-xs font-mono resize-none"
              rows={3}
              placeholder="Test input..."
              value={newInput}
              onChange={e => setNewInput(e.target.value)}
            />
            <input
              className="input-base w-full text-xs font-mono"
              placeholder="Must contain (comma-separated)"
              value={newMustContain}
              onChange={e => setNewMustContain(e.target.value)}
            />
            <input
              className="input-base w-full text-xs font-mono"
              placeholder="Must NOT contain (comma-separated)"
              value={newMustNotContain}
              onChange={e => setNewMustNotContain(e.target.value)}
            />
            <input
              className="input-base w-full text-xs font-mono"
              placeholder="Regex pattern (optional)"
              value={newRegex}
              onChange={e => setNewRegex(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <button
                onClick={() => setNewPass(!newPass)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${newPass ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}
              >
                {newPass ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                Expected: {newPass ? 'PASS' : 'FAIL'}
              </button>
              <div className="flex gap-1">
                <button onClick={() => setAdding(false)} className="btn-ghost btn-xs">Cancel</button>
                <button onClick={handleAdd} className="btn-primary btn-xs">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Cases list */}
        {cases.length === 0 && !adding ? (
          <div className="flex items-center justify-center h-full text-xs text-theme-muted">
            No test cases. Add one to start testing.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {cases.map(tc => (
              <div key={tc.id} className="group">
                <div
                  className="flex items-center gap-2 px-3 py-2 hover:bg-surface-overlay/30 cursor-pointer"
                  onClick={() => { if (editingId !== tc.id) setExpandedId(expandedId === tc.id ? null : tc.id); }}
                >
                  {expandedId === tc.id
                    ? <ChevronDown className="w-3 h-3 text-theme-muted shrink-0" />
                    : <ChevronRight className="w-3 h-3 text-theme-muted shrink-0" />}
                  <button
                    onClick={e => { e.stopPropagation(); handleToggleExpected(tc); }}
                    className={`shrink-0 ${tc.expected.pass ? 'text-green-400' : 'text-red-400'}`}
                    title={`Expected: ${tc.expected.pass ? 'PASS' : 'FAIL'}`}
                  >
                    {tc.expected.pass ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-xs text-theme-primary truncate flex-1">
                    {tc.description || tc.input.slice(0, 60)}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); startEdit(tc); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent-subtle text-theme-muted hover:text-theme-accent transition-all"
                    title="Edit case"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(tc.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-theme-muted hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Edit mode */}
                {expandedId === tc.id && editingId === tc.id && (
                  <div className="px-3 pb-3 pl-9 space-y-2">
                    <input
                      autoFocus
                      className="input-base w-full text-xs"
                      placeholder="Description (optional)"
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                    />
                    <textarea
                      className="input-base w-full text-xs font-mono resize-none"
                      rows={3}
                      placeholder="Test input..."
                      value={editInput}
                      onChange={e => setEditInput(e.target.value)}
                    />
                    <input
                      className="input-base w-full text-xs font-mono"
                      placeholder="Must contain (comma-separated)"
                      value={editMustContain}
                      onChange={e => setEditMustContain(e.target.value)}
                    />
                    <input
                      className="input-base w-full text-xs font-mono"
                      placeholder="Must NOT contain (comma-separated)"
                      value={editMustNotContain}
                      onChange={e => setEditMustNotContain(e.target.value)}
                    />
                    <input
                      className="input-base w-full text-xs font-mono"
                      placeholder="Regex pattern (optional)"
                      value={editRegex}
                      onChange={e => setEditRegex(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setEditPass(!editPass)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${editPass ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}
                      >
                        {editPass ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        Expected: {editPass ? 'PASS' : 'FAIL'}
                      </button>
                      <div className="flex gap-1">
                        <button onClick={cancelEdit} className="btn-ghost btn-xs">
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                        <button onClick={() => handleSaveEdit(tc.id)} className="btn-primary btn-xs">
                          <Save className="w-3 h-3" />
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* View mode */}
                {expandedId === tc.id && editingId !== tc.id && (
                  <div className="px-3 pb-3 pl-9 space-y-1">
                    <pre className="text-[11px] text-theme-secondary font-mono bg-surface-inset p-2 rounded overflow-x-auto whitespace-pre-wrap">
                      {tc.input}
                    </pre>
                    {tc.expected.outputMustContain && tc.expected.outputMustContain.length > 0 && (
                      <div className="text-[10px] text-theme-muted">
                        Must contain: <span className="text-green-400/70">{tc.expected.outputMustContain.join(', ')}</span>
                      </div>
                    )}
                    {tc.expected.outputMustNotContain && tc.expected.outputMustNotContain.length > 0 && (
                      <div className="text-[10px] text-theme-muted">
                        Must NOT contain: <span className="text-red-400/70">{tc.expected.outputMustNotContain.join(', ')}</span>
                      </div>
                    )}
                    {tc.expected.outputMatchRegex && (
                      <div className="text-[10px] text-theme-muted">
                        Regex: <span className="font-mono text-amber-400/70">{tc.expected.outputMatchRegex}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
