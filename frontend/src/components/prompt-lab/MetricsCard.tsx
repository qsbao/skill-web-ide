import type { PromptMetrics } from '@skill-ide/shared';

interface Props {
  metrics: PromptMetrics;
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-theme-secondary">{label}</span>
        <span className="text-theme-primary font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-inset overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MetricsCard({ metrics }: Props) {
  return (
    <div className="space-y-2 p-3 rounded-lg bg-surface-overlay/50 border border-border-subtle">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-theme-muted">Metrics</span>
        <span className="text-[10px] text-theme-muted">
          {metrics.totalCases} cases ({metrics.passExpected} pass / {metrics.failExpected} fail)
        </span>
      </div>

      <MetricBar label="Accuracy" value={metrics.accuracy} color="bg-theme-accent" />
      <MetricBar label="Precision" value={metrics.precision} color="bg-emerald-400" />
      <MetricBar label="Recall" value={metrics.recall} color="bg-amber-400" />
      <MetricBar label="F1" value={metrics.f1} color="bg-purple-400" />

      <div className="flex gap-4 text-[10px] text-theme-muted pt-1">
        <span>Avg latency: {Math.round(metrics.avgLatencyMs)}ms</span>
        {metrics.consistency !== undefined && (
          <span>Consistency: {Math.round(metrics.consistency * 100)}%</span>
        )}
      </div>
    </div>
  );
}
