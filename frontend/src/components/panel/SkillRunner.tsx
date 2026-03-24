import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Square, Folder, FileText, Download, Terminal } from 'lucide-react';
import { useSkillStore } from '../../stores/skillStore';
import { useRunStore } from '../../stores/runStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { api } from '../../api/client';
import type { SkillFile } from '@skill-ide/shared';

function colorize(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

function FileTree({ files, skillId, runId, depth = 0 }: { files: SkillFile[]; skillId: string; runId: string; depth?: number }) {
  return (
    <>
      {files.map((file) => (
        <div key={file.path}>
          <div
            className="flex items-center gap-1.5 py-1 hover:bg-surface-overlay/50 rounded-md px-1.5 transition-colors"
            style={{ paddingLeft: `${depth * 14 + 6}px` }}
          >
            {file.type === 'dir' ? (
              <Folder className="w-3.5 h-3.5 text-accent/70 shrink-0" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-theme-muted shrink-0" />
            )}
            <span className="text-xs text-theme-primary flex-1 truncate">{file.name}</span>
            {file.type === 'file' && (
              <a
                href={api.getRunDownloadUrl(skillId, runId, file.path)}
                download
                className="inline-flex items-center text-xs text-accent hover:text-accent-hover shrink-0 transition-colors"
              >
                <Download className="w-3 h-3" />
              </a>
            )}
          </div>
          {file.children && <FileTree files={file.children} skillId={skillId} runId={runId} depth={depth + 1} />}
        </div>
      ))}
    </>
  );
}

export function SkillRunner() {
  const { activeSkillId } = useSkillStore();
  const { output, running, lastStatus, activeRunId, outputFiles, clearOutput, setOutputFiles } = useRunStore();
  const { sendMessage } = useWebSocket();
  const [prompt, setPrompt] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  // Fetch output files when run completes
  useEffect(() => {
    if (!running && activeRunId && activeSkillId && (lastStatus === 'completed' || lastStatus === 'failed')) {
      api.getRunFiles(activeSkillId, activeRunId).then(setOutputFiles).catch(() => {});
    }
  }, [running, activeRunId, activeSkillId, lastStatus, setOutputFiles]);

  const handleRun = useCallback(() => {
    if (!activeSkillId || running || !prompt.trim()) return;
    clearOutput();
    sendMessage('run:run', { skillId: activeSkillId, prompt: prompt.trim() });
  }, [activeSkillId, running, prompt, clearOutput, sendMessage]);

  const handleCancel = useCallback(() => {
    if (!activeSkillId || !activeRunId) return;
    api.cancelRun(activeSkillId, activeRunId).catch(() => {});
  }, [activeSkillId, activeRunId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleRun();
    }
  }, [handleRun]);

  if (!activeSkillId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-surface-base">
        <Terminal className="w-6 h-6 text-theme-muted mb-2" />
        <span className="text-theme-muted text-xs">Select a skill to run</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-base">
      {/* Prompt input */}
      <div className="p-3 border-b border-border/40 bg-surface-raised">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-xs font-semibold text-theme-primary">Run Skill</span>
          {running && (
            <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse-soft" />
              Running...
            </span>
          )}
          {!running && lastStatus === 'completed' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Completed
            </span>
          )}
          {!running && lastStatus === 'failed' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Failed
            </span>
          )}
          {!running && lastStatus === 'error' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Error
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter prompt... (Ctrl+Enter to run)"
            rows={2}
            className="input-base flex-1 !text-xs resize-none"
          />
          <div className="flex flex-col gap-1.5">
            <button
              onClick={handleRun}
              disabled={running || !prompt.trim()}
              className="btn-primary text-xs !px-3 !py-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              Run
            </button>
            {running && (
              <button
                onClick={handleCancel}
                className="btn-danger text-xs !px-3 !py-1.5"
              >
                <Square className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Output + Files */}
      <div className="flex-1 flex overflow-hidden">
        {/* Log output */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs bg-surface-inset">
          {output.length === 0 ? (
            <div className="flex items-center gap-2 text-theme-muted py-1">
              <Terminal className="w-4 h-4" />
              <span>No output yet. Enter a prompt and click Run.</span>
            </div>
          ) : (
            output.map((line, i) => (
              <pre
                key={i}
                className={`whitespace-pre-wrap break-all leading-relaxed ${
                  line.stream === 'stderr' ? 'text-red-400' : 'text-theme-primary'
                }`}
              >
                {colorize(line.data)}
              </pre>
            ))
          )}
        </div>

        {/* Output files panel */}
        {!running && outputFiles.length > 0 && (
          <div className="w-60 border-l border-border/40 overflow-y-auto p-2.5 bg-surface-raised animate-slide-up">
            <div className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2">Output Files</div>
            <FileTree files={outputFiles} skillId={activeSkillId} runId={activeRunId!} />
          </div>
        )}
      </div>
    </div>
  );
}
