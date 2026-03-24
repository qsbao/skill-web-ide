import { useNavigate } from 'react-router-dom';
import { useSkillStore } from '../stores/skillStore';
import { useTestStore } from '../stores/testStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSkills } from '../hooks/useSkills';
import { AlertTriangle, Play, Timer } from 'lucide-react';
import { SkillSelector } from './playground/SkillSelector';

export function Toolbar() {
  const navigate = useNavigate();
  const { activeSkillId } = useSkillStore();
  const { running, clearOutput, setRunning } = useTestStore();
  const { sendMessage } = useWebSocket();
  const { selectSkill } = useSkills();

  const handleSkillChange = (id: string | null) => {
    if (!id) return;
    selectSkill(id);
    const slug = id.startsWith('@') ? id.slice(1) : id;
    navigate(`/ide/${slug}`, { replace: true });
  };

  const handleRunTest = (type: 'lint' | 'unit' | 'benchmark') => {
    if (!activeSkillId || running) return;
    clearOutput();
    setRunning(true);
    sendMessage('test:run', { skillId: activeSkillId, type });
  };

  return (
    <div className="h-10 bg-surface-raised border-b border-border-subtle flex items-center px-4 gap-3 shrink-0">
      <SkillSelector value={activeSkillId} onChange={handleSkillChange} />

      <div className="flex-1" />

      {activeSkillId && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleRunTest('lint')}
            disabled={running}
            className="btn-secondary btn-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Lint
          </button>
          <button
            onClick={() => handleRunTest('unit')}
            disabled={running}
            className="btn-secondary btn-sm text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-300"
          >
            <Play className="w-3.5 h-3.5" />
            Test
          </button>
          <button
            onClick={() => handleRunTest('benchmark')}
            disabled={running}
            className="btn-secondary btn-sm"
          >
            <Timer className="w-3.5 h-3.5" />
            Bench
          </button>
        </div>
      )}
    </div>
  );
}
