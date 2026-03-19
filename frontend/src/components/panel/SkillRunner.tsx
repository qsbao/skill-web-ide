import { useState, useRef, useEffect, useCallback } from 'react';
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
            className="flex items-center gap-1 py-0.5 hover:bg-gray-700 rounded px-1"
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
          >
            <span className="text-xs text-gray-400">{file.type === 'dir' ? '📁' : '📄'}</span>
            <span className="text-xs text-gray-300 flex-1 truncate">{file.name}</span>
            {file.type === 'file' && (
              <a
                href={api.getRunDownloadUrl(skillId, runId, file.path)}
                download
                className="text-xs text-blue-400 hover:text-blue-300 shrink-0"
              >
                Download
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
      <div className="h-full flex items-center justify-center bg-gray-900 text-gray-600 text-xs">
        Select a skill to run
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Prompt input */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-300">Run Skill</span>
          {running && (
            <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
              <span className="animate-spin inline-block w-3 h-3 border border-yellow-400 border-t-transparent rounded-full" />
              Running...
            </span>
          )}
          {!running && lastStatus === 'completed' && (
            <span className="text-xs text-green-400 font-medium">Completed</span>
          )}
          {!running && lastStatus === 'failed' && (
            <span className="text-xs text-red-400 font-medium">Failed</span>
          )}
          {!running && lastStatus === 'error' && (
            <span className="text-xs text-red-400 font-medium">Error</span>
          )}
        </div>
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter prompt... (Ctrl+Enter to run)"
            rows={2}
            className="flex-1 bg-gray-800 text-gray-200 text-xs p-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={handleRun}
              disabled={running || !prompt.trim()}
              className="text-xs bg-blue-700 px-3 py-1.5 rounded hover:bg-blue-600 disabled:opacity-50 transition-colors text-white"
            >
              Run
            </button>
            {running && (
              <button
                onClick={handleCancel}
                className="text-xs bg-red-700 px-3 py-1.5 rounded hover:bg-red-600 transition-colors text-white"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Output + Files */}
      <div className="flex-1 flex overflow-hidden">
        {/* Log output */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono text-xs">
          {output.length === 0 ? (
            <span className="text-gray-600">No output yet. Enter a prompt and click Run.</span>
          ) : (
            output.map((line, i) => (
              <pre
                key={i}
                className={`whitespace-pre-wrap break-all ${
                  line.stream === 'stderr' ? 'text-red-400' : 'text-gray-300'
                }`}
              >
                {colorize(line.data)}
              </pre>
            ))
          )}
        </div>

        {/* Output files panel */}
        {!running && outputFiles.length > 0 && (
          <div className="w-60 border-l border-gray-700 overflow-y-auto p-2">
            <div className="text-xs font-semibold text-gray-400 mb-2">Output Files</div>
            <FileTree files={outputFiles} skillId={activeSkillId} runId={activeRunId!} />
          </div>
        )}
      </div>
    </div>
  );
}
