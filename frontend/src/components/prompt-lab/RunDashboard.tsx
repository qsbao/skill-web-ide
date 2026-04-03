import { useState, useEffect } from 'react';
import { Play, Loader2, Clock, GitCompare, RotateCcw } from 'lucide-react';
import { usePromptLabStore } from '../../stores/promptLabStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { MetricsCard } from './MetricsCard';
import { RunResultsTable } from './RunResultsTable';
import type { PromptTestRun } from '@skill-ide/shared';

interface Props {
  projectId: string;
  promptId: string;
}

type Tab = 'results' | 'history' | 'compare';

export function RunDashboard({ projectId, promptId }: Props) {
  const { runs, activeJob, liveResults, loadRuns, selectedRunIds, toggleRunSelection, compareSelectedRuns, comparison, clearComparison, wsRunStart } = usePromptLabStore();
  const { sendMessage } = useWebSocket();
  const [tab, setTab] = useState<Tab>('results');
  const [selectedRun, setSelectedRun] = useState<PromptTestRun | null>(null);

  // Auto-select latest run
  useEffect(() => {
    if (runs.length > 0 && !selectedRun) {
      setSelectedRun(runs[0]);
    }
  }, [runs]);

  // When run completes via WS, select the latest run
  useEffect(() => {
    if (!activeJob && runs.length > 0 && liveResults.length === 0) {
      setSelectedRun(runs[0]);
    }
  }, [activeJob, runs]);

  const handleRun = (promptOverride?: string) => {
    // Clear previous results and switch to results tab
    setSelectedRun(null);
    setTab('results');
    wsRunStart();
    sendMessage('prompt-lab:run', { projectId, promptId, promptOverride });
  };

  const handleCompare = async () => {
    await compareSelectedRuns(projectId, promptId);
    setTab('compare');
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'results', label: 'Results' },
    { id: 'history', label: 'History' },
    { id: 'compare', label: 'Compare' },
  ];

  return (
    <div className="h-full flex flex-col bg-surface-raised">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-2 py-1 text-xs rounded ${tab === t.id ? 'text-theme-accent bg-accent-subtle' : 'text-theme-secondary hover:text-theme-primary'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => handleRun()}
          disabled={!!activeJob}
          className="btn-primary btn-xs"
        >
          {activeJob ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              {activeJob.progress ? `${activeJob.progress.completed}/${activeJob.progress.total}` : 'Running...'}
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              Run Tests
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'results' && (
          <div>
            {activeJob && liveResults.length > 0 ? (
              <>
                <div className="px-3 py-2 text-xs text-theme-muted flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Running... {activeJob.progress ? `${activeJob.progress.completed}/${activeJob.progress.total}` : ''}
                </div>
                <RunResultsTable results={liveResults} />
              </>
            ) : selectedRun ? (
              <>
                <div className="p-3">
                  <MetricsCard metrics={selectedRun.metrics} />
                </div>
                <RunResultsTable results={selectedRun.results} />
              </>
            ) : activeJob ? (
              <div className="flex items-center justify-center h-32 text-xs text-theme-muted gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Starting run...
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-theme-muted">
                Run tests to see results.
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="divide-y divide-border-subtle">
            {selectedRunIds.length >= 2 && (
              <div className="p-2 bg-surface-overlay/30">
                <button onClick={handleCompare} className="btn-secondary btn-xs w-full">
                  <GitCompare className="w-3 h-3" />
                  Compare {selectedRunIds.length} runs
                </button>
              </div>
            )}
            {runs.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-xs text-theme-muted">
                No runs yet.
              </div>
            ) : (
              runs.map(run => (
                <div
                  key={run.id}
                  className={`flex items-center gap-3 px-3 py-2 hover:bg-surface-overlay/30 cursor-pointer ${selectedRun?.id === run.id ? 'bg-accent-subtle/30' : ''}`}
                  onClick={() => { setSelectedRun(run); setTab('results'); }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRunIds.includes(run.id)}
                    onChange={e => { e.stopPropagation(); toggleRunSelection(run.id); }}
                    className="shrink-0"
                    onClick={e => e.stopPropagation()}
                  />
                  <button
                    onClick={e => { e.stopPropagation(); handleRun(run.promptSnapshot); }}
                    disabled={!!activeJob}
                    className="p-0.5 rounded hover:bg-surface-overlay/50 text-theme-muted hover:text-theme-accent transition-all shrink-0"
                    title="Re-run with this prompt version"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <Clock className="w-3 h-3 text-theme-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-theme-primary">
                      {Math.round(run.metrics.accuracy * 100)}% accuracy
                      <span className="text-theme-muted ml-2">F1: {Math.round(run.metrics.f1 * 100)}%</span>
                      <span className="text-theme-muted ml-2">{(run.metrics.totalLatencyMs / 1000).toFixed(1)}s</span>
                    </div>
                    <div className="text-[10px] text-theme-muted">
                      {new Date(run.timestamp).toLocaleString()} &middot; {run.model}
                      {run.promptVersion && <span className="ml-1 font-mono text-theme-accent/70">v{run.promptVersion}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'compare' && (
          <div className="p-3">
            {comparison ? (
              <div className="space-y-3">
                {/* Run summaries */}
                <div className="grid grid-cols-2 gap-2">
                  {comparison.runs.map(run => (
                    <div key={run.runId} className="p-2 rounded bg-surface-inset text-xs space-y-1">
                      <div className="font-medium text-theme-primary">
                        {Math.round(run.metrics.accuracy * 100)}% acc
                        {run.promptVersion && <span className="ml-1 font-mono text-theme-accent/70">v{run.promptVersion}</span>}
                      </div>
                      <div className="text-[10px] text-theme-muted">{new Date(run.timestamp).toLocaleString()}</div>
                      <div className="text-[10px] text-theme-muted">
                        {(run.metrics.totalLatencyMs / 1000).toFixed(1)}s
                        {run.metrics.totalTokens > 0 && <span className="ml-2">{run.metrics.totalTokens.toLocaleString()} tokens</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Prompt diff (if prompts differ between runs) */}
                {comparison.runs.length >= 2 && comparison.runs[0].prompt !== comparison.runs[1].prompt && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-theme-muted">Prompt Diff</span>
                    <div className="grid grid-cols-2 gap-2">
                      {comparison.runs.map(run => (
                        <div key={run.runId} className="rounded bg-surface-inset p-2 max-h-32 overflow-y-auto">
                          <div className="text-[10px] text-theme-muted mb-1 font-mono">
                            {run.promptVersion ? `v${run.promptVersion}` : run.runId.slice(0, 8)}
                          </div>
                          <pre className="text-[10px] text-theme-secondary font-mono whitespace-pre-wrap">{run.prompt}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Case-by-case comparison */}
                <div className="divide-y divide-border-subtle">
                  {comparison.caseDetails.map(cd => (
                    <div key={cd.caseId} className="py-2">
                      <div className="text-xs text-theme-primary mb-1">{cd.caseId}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {cd.perRun.map(pr => (
                          <div key={pr.runId} className={`text-[10px] px-1.5 py-1 rounded ${pr.correct ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {pr.correct ? 'Correct' : 'Wrong'} ({pr.actualPass ? 'pass' : 'fail'})
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={clearComparison} className="btn-ghost btn-xs">Clear comparison</button>
              </div>
            ) : (
              <div className="text-xs text-theme-muted text-center py-8">
                Select 2+ runs from History tab, then click Compare.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
