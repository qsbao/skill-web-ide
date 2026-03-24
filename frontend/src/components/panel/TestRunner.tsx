import { Search, FlaskConical, Gauge, Beaker } from 'lucide-react';
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
    <div className="h-full flex flex-col bg-surface-base">
      <div className="p-3 border-b border-border/40">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="text-xs font-semibold text-theme-primary">Test Runner</span>
          {running && (
            <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse-soft" />
              Running...
            </span>
          )}
          {!running && lastStatus === 'passed' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              All Passed
            </span>
          )}
          {!running && lastStatus === 'failed' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Failed
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => run('lint')}
            disabled={running || !activeSkillId}
            className="btn-secondary text-xs !px-3 !py-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            Lint
          </button>
          <button
            onClick={() => run('unit')}
            disabled={running || !activeSkillId}
            className="btn-secondary text-xs !px-3 !py-1.5"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Unit Tests
          </button>
          <button
            onClick={() => run('benchmark')}
            disabled={running || !activeSkillId}
            className="btn-secondary text-xs !px-3 !py-1.5"
          >
            <Gauge className="w-3.5 h-3.5" />
            Benchmark
          </button>
        </div>
      </div>
      {!activeSkillId && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Beaker className="w-6 h-6 text-theme-muted mb-2" />
          <span className="text-theme-muted text-xs">Select a skill to run tests</span>
        </div>
      )}
    </div>
  );
}
