import { useState } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, ChevronDown, ChevronRight, Edit3 } from 'lucide-react';
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

  const handleAdd = async () => {
    if (!newInput.trim()) return;
    await addCase(projectId, promptId, {
      description: newDescription.trim(),
      input: newInput.trim(),
      expected: { pass: newPass },
    });
    setNewDescription('');
    setNewInput('');
    setNewPass(true);
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
                  onClick={() => setExpandedId(expandedId === tc.id ? null : tc.id)}
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
                    onClick={e => { e.stopPropagation(); handleDelete(tc.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-theme-muted hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {expandedId === tc.id && (
                  <div className="px-3 pb-3 pl-9">
                    <pre className="text-[11px] text-theme-secondary font-mono bg-surface-inset p-2 rounded overflow-x-auto whitespace-pre-wrap">
                      {tc.input}
                    </pre>
                    {tc.expected.outputMustContain && tc.expected.outputMustContain.length > 0 && (
                      <div className="mt-1 text-[10px] text-theme-muted">
                        Must contain: {tc.expected.outputMustContain.join(', ')}
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
