import { useState, useEffect, useRef } from 'react';
import { Play, Loader2, Clock, GitCompare } from 'lucide-react';
import { usePromptLabStore } from '../../stores/promptLabStore';
import { MetricsCard } from './MetricsCard';
import { RunResultsTable } from './RunResultsTable';
import type { PromptTestRun } from '@skill-ide/shared';

interface Props {
  projectId: string;
  promptId: string;
}

type Tab = 'results' | 'history' | 'compare';

export function RunDashboard({ projectId, promptId }: Props) {
  const { runs, activeJob, startRun, pollJob, loadRuns, selectedRunIds, toggleRunSelection, compareSelectedRuns, comparison, clearComparison } = usePromptLabStore();
  const [tab, setTab] = useState<Tab>('results');
  const [selectedRun, setSelectedRun] = useState<PromptTestRun | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-select latest run
  useEffect(() => {
    if (runs.length > 0 && !selectedRun) {
      setSelectedRun(runs[0]);
    }
  }, [runs]);

  const handleRun = async () => {
    const jobId = await startRun(projectId, promptId);
    // Poll for completion
    pollRef.current = setInterval(async () => {
      await pollJob(jobId, projectId, promptId);
    }, 1000);
  };

  // Stop polling when job completes
  useEffect(() => {
    if (!activeJob && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      // Refresh and select latest
      loadRuns(projectId, promptId).then(() => {
        const { runs: latestRuns } = usePromptLabStore.getState();
        if (latestRuns.length > 0) setSelectedRun(latestRuns[0]);
      });
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeJob]);

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
          onClick={handleRun}
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
            {selectedRun ? (
              <>
                <div className="p-3">
                  <MetricsCard metrics={selectedRun.metrics} />
                </div>
                <RunResultsTable results={selectedRun.results} />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-theme-muted">
                Run tests to see results.
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="divide-y divide-border-subtle">
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
                  <Clock className="w-3 h-3 text-theme-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-theme-primary">
                      {Math.round(run.metrics.accuracy * 100)}% accuracy
                      <span className="text-theme-muted ml-2">F1: {Math.round(run.metrics.f1 * 100)}%</span>
                    </div>
                    <div className="text-[10px] text-theme-muted">
                      {new Date(run.timestamp).toLocaleString()} &middot; {run.model}
                    </div>
                  </div>
                </div>
              ))
            )}
            {selectedRunIds.length >= 2 && (
              <div className="p-3">
                <button onClick={handleCompare} className="btn-secondary btn-xs w-full">
                  <GitCompare className="w-3 h-3" />
                  Compare {selectedRunIds.length} runs
                </button>
              </div>
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
                      <div className="font-medium text-theme-primary">{Math.round(run.metrics.accuracy * 100)}% acc</div>
                      <div className="text-[10px] text-theme-muted">{new Date(run.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>

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
