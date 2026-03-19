import { useNavigate } from 'react-router-dom';
import { useSkillStore } from '../stores/skillStore';
import { useTestStore } from '../stores/testStore';
import { useWebSocket } from '../hooks/useWebSocket';

export function Toolbar() {
  const navigate = useNavigate();
  const { activeSkillId } = useSkillStore();
  const { running, clearOutput, setRunning } = useTestStore();
  const { sendMessage } = useWebSocket();

  const handleRunTest = (type: 'lint' | 'unit' | 'benchmark') => {
    if (!activeSkillId || running) return;
    clearOutput();
    setRunning(true);
    sendMessage('test:run', { skillId: activeSkillId, type });
  };

  return (
    <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-3 gap-2 shrink-0">
      <button
        onClick={() => navigate('/dashboard')}
        className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-600"
      >
        &larr; Dashboard
      </button>
      <div className="w-px h-5 bg-gray-600" />
      <span className="text-sm font-semibold text-blue-400">Skill IDE</span>

      {activeSkillId && (
        <span className="text-xs text-gray-400 truncate max-w-xs">{activeSkillId}</span>
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
