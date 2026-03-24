import { useNavigate } from 'react-router-dom';
import { useSkillStore } from '../stores/skillStore';
import { useTestStore } from '../stores/testStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { ArrowLeft, AlertTriangle, Play, Timer } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

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
    <div className="h-12 bg-surface-raised border-b border-border-subtle flex items-center px-4 gap-3 shrink-0">
      <button
        onClick={() => navigate('/dashboard')}
        className="btn-ghost !px-2 !py-1 !text-xs !gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Dashboard
      </button>

      <div className="w-px h-5 bg-border-subtle" />

      <span className="text-sm font-semibold text-accent tracking-tight">Skill IDE</span>

      {activeSkillId && (
        <span className="badge font-mono text-[11px]">{activeSkillId}</span>
      )}

      <div className="flex-1" />

      <ThemeToggle />

      {activeSkillId && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleRunTest('lint')}
            disabled={running}
            className="btn-secondary !px-2.5 !py-1 !text-xs !gap-1"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Lint
          </button>
          <button
            onClick={() => handleRunTest('unit')}
            disabled={running}
            className="btn-secondary !px-2.5 !py-1 !text-xs !gap-1 !text-emerald-400 !border-emerald-500/20 hover:!border-emerald-500/40 hover:!text-emerald-300"
          >
            <Play className="w-3.5 h-3.5" />
            Test
          </button>
          <button
            onClick={() => handleRunTest('benchmark')}
            disabled={running}
            className="btn-secondary !px-2.5 !py-1 !text-xs !gap-1"
          >
            <Timer className="w-3.5 h-3.5" />
            Bench
          </button>
        </div>
      )}
    </div>
  );
}
