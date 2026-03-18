import { useSkillStore } from '../../stores/skillStore';
import { useTestStore } from '../../stores/testStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { TestType } from '@skill-ide/shared';

export function TestRunner() {
  const { activeSkillId } = useSkillStore();
  const { running, lastStatus, clearOutput, setRunning } = useTestStore();
  const { sendMessage } = useWebSocket();

  const run = (type: TestType) => {
    if (!activeSkillId || running) return;
    clearOutput();
    setRunning(true);
    sendMessage('test:run', { skillId: activeSkillId, type });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-300">Test Runner</span>
          {running && (
            <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
              <span className="animate-spin inline-block w-3 h-3 border border-yellow-400 border-t-transparent rounded-full" />
              Running...
            </span>
          )}
          {!running && lastStatus === 'passed' && (
            <span className="text-xs text-green-400 font-medium">All Passed</span>
          )}
          {!running && lastStatus === 'failed' && (
            <span className="text-xs text-red-400 font-medium">Failed</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => run('lint')}
            disabled={running || !activeSkillId}
            className="text-xs bg-gray-700 px-3 py-1.5 rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            Lint
          </button>
          <button
            onClick={() => run('unit')}
            disabled={running || !activeSkillId}
            className="text-xs bg-green-700 px-3 py-1.5 rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            Unit Tests
          </button>
          <button
            onClick={() => run('benchmark')}
            disabled={running || !activeSkillId}
            className="text-xs bg-purple-700 px-3 py-1.5 rounded hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            Benchmark
          </button>
        </div>
      </div>
      {!activeSkillId && (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
          Select a skill to run tests
        </div>
      )}
    </div>
  );
}
