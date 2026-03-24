import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Square, Folder, FileText, Download, Terminal } from 'lucide-react';
import { usePlaygroundStore } from '../../stores/playgroundStore';
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
                className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover shrink-0 transition-colors"
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

export function SingleRunMode() {
  const {
    selectedSkillId,
    singleOutput,
    singleRunning,
    singleLastStatus,
    singleActiveRunId,
    singleOutputFiles,
    clearSingleOutput,
    setSingleOutputFiles,
  } = usePlaygroundStore();
  const { sendMessage } = useWebSocket();
  const [prompt, setPrompt] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [singleOutput]);

  useEffect(() => {
    if (!singleRunning && singleActiveRunId && selectedSkillId && (singleLastStatus === 'completed' || singleLastStatus === 'failed')) {
      api.getRunFiles(selectedSkillId, singleActiveRunId).then(setSingleOutputFiles).catch(() => {});
    }
  }, [singleRunning, singleActiveRunId, selectedSkillId, singleLastStatus, setSingleOutputFiles]);

  const handleRun = useCallback(() => {
    if (!selectedSkillId || singleRunning || !prompt.trim()) return;
    clearSingleOutput();
    sendMessage('playground:single', { skillId: selectedSkillId, prompt: prompt.trim() });
  }, [selectedSkillId, singleRunning, prompt, clearSingleOutput, sendMessage]);

  const handleCancel = useCallback(() => {
    if (!selectedSkillId || !singleActiveRunId) return;
    api.cancelRun(selectedSkillId, singleActiveRunId).catch(() => {});
  }, [selectedSkillId, singleActiveRunId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleRun();
    }
  }, [handleRun]);

  if (!selectedSkillId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-surface-base animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-surface-overlay/60 border border-border-subtle/50 flex items-center justify-center mb-4">
          <Terminal className="w-6 h-6 text-theme-muted" />
        </div>
        <span className="text-theme-muted text-sm">Select a skill to get started</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-base">
      {/* Prompt area */}
      <div className="p-4 border-b border-border/40 bg-surface-raised">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-sm font-semibold text-theme-primary">Single Run</span>
          {singleRunning && (
            <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse-soft" />
              Running...
            </span>
          )}
          {!singleRunning && singleLastStatus === 'completed' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Completed
            </span>
          )}
          {!singleRunning && (singleLastStatus === 'failed' || singleLastStatus === 'error') && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Failed
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your prompt... (Ctrl+Enter to run)"
            rows={4}
            className="input-base flex-1 resize-none font-sans"
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={handleRun}
              disabled={singleRunning || !prompt.trim()}
              className="btn-primary gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              Run
            </button>
            {singleRunning && (
              <button
                onClick={handleCancel}
                className="btn-danger gap-1.5"
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-surface-inset">
          {singleOutput.length === 0 ? (
            <div className="flex items-center gap-2 text-theme-muted">
              <Terminal className="w-4 h-4" />
              <span>No output yet. Enter a prompt and click Run.</span>
            </div>
          ) : (
            singleOutput.map((line, i) => (
              <pre
                key={i}
                className={`whitespace-pre-wrap break-all ${
                  line.stream === 'stderr' ? 'text-red-400' : 'text-theme-primary'
                }`}
              >
                {colorize(line.data)}
              </pre>
            ))
          )}
        </div>

        {!singleRunning && singleOutputFiles.length > 0 && (
          <div className="w-64 border-l border-border/40 overflow-y-auto p-3 bg-surface-raised animate-slide-up">
            <div className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2">Output Files</div>
            <FileTree files={singleOutputFiles} skillId={selectedSkillId} runId={singleActiveRunId!} />
          </div>
        )}
      </div>
    </div>
  );
}
