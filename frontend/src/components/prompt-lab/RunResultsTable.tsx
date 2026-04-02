import { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { PromptTestCaseResult } from '@skill-ide/shared';

interface Props {
  results: PromptTestCaseResult[];
}

export function RunResultsTable({ results }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (results.length === 0) {
    return <div className="text-xs text-theme-muted text-center py-4">No results yet.</div>;
  }

  return (
    <div className="divide-y divide-border-subtle">
      {/* Header */}
      <div className="grid grid-cols-[1fr_60px_60px_60px_60px] gap-1 px-3 py-1.5 text-[10px] uppercase tracking-wider text-theme-muted">
        <span>Case</span>
        <span className="text-center">Expected</span>
        <span className="text-center">Actual</span>
        <span className="text-center">Result</span>
        <span className="text-right">Latency</span>
      </div>

      {results.map(r => (
        <div key={r.caseId}>
          {r.pending ? (
            <>
              <div
                className="grid grid-cols-[1fr_60px_60px_60px_60px] gap-1 px-3 py-1.5 items-center opacity-50 cursor-pointer hover:bg-surface-overlay/20"
                onClick={() => setExpandedId(expandedId === r.caseId ? null : r.caseId)}
              >
                <div className="flex items-center gap-1.5 text-xs text-theme-muted truncate">
                  {expandedId === r.caseId
                    ? <ChevronDown className="w-3 h-3 shrink-0" />
                    : <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                  <span className="truncate">{r.caseId}</span>
                </div>
                <div className="flex justify-center">
                  {r.expectedPass
                    ? <CheckCircle className="w-3.5 h-3.5 text-green-400/50" />
                    : <XCircle className="w-3.5 h-3.5 text-red-400/50" />}
                </div>
                <div className="flex justify-center text-[10px] text-theme-muted">—</div>
                <div className="flex justify-center text-[10px] text-theme-muted">—</div>
                <span className="text-[10px] text-theme-muted text-right">—</span>
              </div>
              {expandedId === r.caseId && (
                <div className="px-3 pb-3 pl-8 opacity-50">
                  <span className="text-[10px] uppercase text-theme-muted">Input</span>
                  <pre className="text-[11px] text-theme-secondary font-mono bg-surface-inset p-2 rounded mt-0.5 whitespace-pre-wrap">{r.input}</pre>
                </div>
              )}
            </>
          ) : (
            <>
              <div
                className="grid grid-cols-[1fr_60px_60px_60px_60px] gap-1 px-3 py-1.5 hover:bg-surface-overlay/30 cursor-pointer items-center"
                onClick={() => setExpandedId(expandedId === r.caseId ? null : r.caseId)}
              >
                <div className="flex items-center gap-1.5 text-xs text-theme-primary truncate">
                  {expandedId === r.caseId
                    ? <ChevronDown className="w-3 h-3 text-theme-muted shrink-0" />
                    : <ChevronRight className="w-3 h-3 text-theme-muted shrink-0" />}
                  <span className="truncate">{r.caseId}</span>
                </div>
                <div className="flex justify-center">
                  {r.expectedPass
                    ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <div className="flex justify-center">
                  {r.actualPass
                    ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <div className="flex justify-center">
                  {r.correct
                    ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">OK</span>
                    : <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">FAIL</span>}
                </div>
                <span className="text-[10px] text-theme-muted text-right">{Math.round(r.latencyMs)}ms</span>
              </div>

              {expandedId === r.caseId && (
                <div className="px-3 pb-3 pl-8 space-y-2">
                  <div>
                    <span className="text-[10px] uppercase text-theme-muted">Input</span>
                    <pre className="text-[11px] text-theme-secondary font-mono bg-surface-inset p-2 rounded mt-0.5 whitespace-pre-wrap">{r.input}</pre>
                  </div>
                  {r.issues.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase text-theme-muted">Issues</span>
                      <ul className="mt-0.5 space-y-0.5">
                        {r.issues.map((issue, i) => (
                          <li key={i} className="text-[11px] text-red-400">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {r.suggestions.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase text-theme-muted">Suggestions</span>
                      <ul className="mt-0.5 space-y-0.5">
                        {r.suggestions.map((s, i) => (
                          <li key={i} className="text-[11px] text-theme-secondary">{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
