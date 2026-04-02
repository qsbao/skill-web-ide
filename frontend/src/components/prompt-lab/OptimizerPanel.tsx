import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, Square, Send, Check } from 'lucide-react';
import { usePromptLabStore } from '../../stores/promptLabStore';
import { MetricsCard } from './MetricsCard';

interface Props {
  projectId: string;
  promptId: string;
}

export function OptimizerPanel({ projectId, promptId }: Props) {
  const { optimizationJob, startOptimize, pollOptimize, stopOptimize, guideOptimize, applyOptimize } = usePromptLabStore();
  const [targetAccuracy, setTargetAccuracy] = useState(95);
  const [maxIterations, setMaxIterations] = useState(10);
  const [guidance, setGuidance] = useState('');
  const [liveGuidance, setLiveGuidance] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunning = optimizationJob?.status === 'running';
  const isDone = optimizationJob && optimizationJob.status !== 'running';

  const handleStart = async () => {
    const id = await startOptimize(projectId, promptId, {
      targetAccuracy: targetAccuracy / 100,
      maxIterations,
      guidance: guidance.trim() || undefined,
    });
    setJobId(id);
    pollRef.current = setInterval(() => {
      pollOptimize(projectId, promptId, id);
    }, 2000);
  };

  useEffect(() => {
    if (isDone && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isDone]);

  const handleStop = async () => {
    if (jobId) await stopOptimize(projectId, promptId, jobId);
  };

  const handleGuide = async () => {
    if (!jobId || !liveGuidance.trim()) return;
    await guideOptimize(projectId, promptId, jobId, liveGuidance.trim());
    setLiveGuidance('');
  };

  const handleApply = async () => {
    if (!jobId) return;
    await applyOptimize(projectId, promptId, jobId);
  };

  const iterations = optimizationJob?.iterations ?? [];
  const bestIdx = optimizationJob?.bestIteration ?? 0;

  return (
    <div className="h-full flex flex-col bg-surface-raised">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
        <Sparkles className="w-3.5 h-3.5 text-theme-accent" />
        <span className="text-xs font-medium text-theme-primary">Optimizer</span>
        {optimizationJob && (
          <span className={`badge text-[10px] ml-auto ${isRunning ? 'text-amber-400' : optimizationJob.status === 'completed' ? 'text-green-400' : 'text-red-400'}`}>
            {optimizationJob.status}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Config (show when not running) */}
        {!isRunning && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-theme-muted mb-1 block">Target Accuracy</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={50}
                    max={100}
                    className="input-base w-full text-xs"
                    value={targetAccuracy}
                    onChange={e => setTargetAccuracy(Number(e.target.value))}
                  />
                  <span className="text-xs text-theme-muted">%</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-theme-muted mb-1 block">Max Iterations</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="input-base w-full text-xs"
                  value={maxIterations}
                  onChange={e => setMaxIterations(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-theme-muted mb-1 block">Guidance (optional)</label>
              <textarea
                className="input-base w-full text-xs resize-none"
                rows={2}
                placeholder="Tips for the optimizer..."
                value={guidance}
                onChange={e => setGuidance(e.target.value)}
              />
            </div>
            <button onClick={handleStart} className="btn-primary btn-sm w-full">
              <Sparkles className="w-3.5 h-3.5" />
              Start Optimization
            </button>
          </div>
        )}

        {/* Running controls */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-theme-accent" />
              <span className="text-xs text-theme-primary">
                Iteration {iterations.length}/{optimizationJob?.maxIterations}
              </span>
              <button onClick={handleStop} className="btn-danger btn-xs ml-auto">
                <Square className="w-3 h-3" />
                Stop
              </button>
            </div>

            {/* Live guidance */}
            <div className="flex gap-1">
              <input
                className="input-base flex-1 text-xs"
                placeholder="Inject guidance..."
                value={liveGuidance}
                onChange={e => setLiveGuidance(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGuide()}
              />
              <button onClick={handleGuide} className="btn-secondary btn-xs">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Iterations */}
        {iterations.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-theme-muted">Iterations</span>
            {iterations.map((iter, i) => (
              <div
                key={i}
                className={`p-2 rounded border ${i === bestIdx ? 'border-theme-accent/30 bg-accent-subtle/20' : 'border-border-subtle bg-surface-inset'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-theme-primary">
                    #{iter.iteration + 1}
                    {i === bestIdx && <span className="text-theme-accent ml-1">(best)</span>}
                  </span>
                  <span className="text-xs text-theme-primary">
                    {Math.round(iter.metrics.accuracy * 100)}% acc
                  </span>
                </div>
                <div className="h-1 rounded-full bg-surface-base overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-theme-accent transition-all"
                    style={{ width: `${iter.metrics.accuracy * 100}%` }}
                  />
                </div>
                {iter.failureAnalysis && (
                  <p className="text-[10px] text-theme-secondary line-clamp-2">{iter.failureAnalysis}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Apply best */}
        {isDone && iterations.length > 0 && (
          <button onClick={handleApply} className="btn-primary btn-sm w-full">
            <Check className="w-3.5 h-3.5" />
            Apply Best Prompt (#{(optimizationJob?.bestIteration ?? 0) + 1})
          </button>
        )}
      </div>
    </div>
  );
}
