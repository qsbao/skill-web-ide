import { useState } from 'react';
import { useSkills } from '../hooks/useSkills';
import { useSkillStore } from '../stores/skillStore';
import { useTestStore } from '../stores/testStore';
import { useWebSocket } from '../hooks/useWebSocket';

export function Toolbar() {
  const { createSkill } = useSkills();
  const { activeSkillId } = useSkillStore();
  const { running, clearOutput, setRunning } = useTestStore();
  const { sendMessage } = useWebSocket();
  const [creating, setCreating] = useState(false);
  const [skillName, setSkillName] = useState('');

  const handleCreate = async () => {
    if (!skillName.trim()) return;
    await createSkill(skillName.trim());
    setSkillName('');
    setCreating(false);
  };

  const handleRunTest = (type: 'lint' | 'unit' | 'benchmark') => {
    if (!activeSkillId || running) return;
    clearOutput();
    setRunning(true);
    sendMessage('test:run', { skillId: activeSkillId, type });
  };

  return (
    <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-3 gap-2 shrink-0">
      <span className="text-sm font-semibold text-blue-400">Skill IDE</span>
      <div className="w-px h-5 bg-gray-600" />

      {creating ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            className="bg-gray-700 text-sm px-2 py-0.5 rounded border border-gray-600 text-white outline-none focus:border-blue-500"
            placeholder="Skill name"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button onClick={handleCreate} className="text-xs bg-blue-600 px-2 py-0.5 rounded hover:bg-blue-500">
            Create
          </button>
          <button onClick={() => setCreating(false)} className="text-xs text-gray-400 hover:text-white">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600">
          + New Skill
        </button>
      )}

      <div className="flex-1" />

      {activeSkillId && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleRunTest('lint')}
            disabled={running}
            className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Lint
          </button>
          <button
            onClick={() => handleRunTest('unit')}
            disabled={running}
            className="text-xs bg-green-700 px-2 py-1 rounded hover:bg-green-600 disabled:opacity-50"
          >
            Test
          </button>
          <button
            onClick={() => handleRunTest('benchmark')}
            disabled={running}
            className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Bench
          </button>
        </div>
      )}
    </div>
  );
}
