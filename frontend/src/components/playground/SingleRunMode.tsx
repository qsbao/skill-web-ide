import { useState, useRef, useEffect, useCallback } from 'react';
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
            className="flex items-center gap-1 py-0.5 hover:bg-gray-700 rounded px-1"
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
          >
            <span className="text-xs text-gray-400">{file.type === 'dir' ? '\u{1F4C1}' : '\u{1F4C4}'}</span>
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
      <div className="h-full flex items-center justify-center text-gray-600 text-sm">
        Select a skill to get started
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Prompt area */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-gray-300">Single Run</span>
          {singleRunning && (
            <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
              <span className="animate-spin inline-block w-3 h-3 border border-yellow-400 border-t-transparent rounded-full" />
              Running...
            </span>
          )}
          {!singleRunning && singleLastStatus === 'completed' && (
            <span className="text-xs text-green-400 font-medium">Completed</span>
          )}
          {!singleRunning && (singleLastStatus === 'failed' || singleLastStatus === 'error') && (
            <span className="text-xs text-red-400 font-medium">Failed</span>
          )}
        </div>
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your prompt... (Ctrl+Enter to run)"
            rows={4}
            className="flex-1 bg-gray-800 text-gray-200 text-sm p-3 rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={handleRun}
              disabled={singleRunning || !prompt.trim()}
              className="text-sm bg-blue-700 px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition-colors text-white"
            >
              Run
            </button>
            {singleRunning && (
              <button
                onClick={handleCancel}
                className="text-sm bg-red-700 px-4 py-2 rounded hover:bg-red-600 transition-colors text-white"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Output + Files */}
      <div className="flex-1 flex overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs">
          {singleOutput.length === 0 ? (
            <span className="text-gray-600">No output yet. Enter a prompt and click Run.</span>
          ) : (
            singleOutput.map((line, i) => (
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

        {!singleRunning && singleOutputFiles.length > 0 && (
          <div className="w-64 border-l border-gray-700 overflow-y-auto p-3">
            <div className="text-xs font-semibold text-gray-400 mb-2">Output Files</div>
            <FileTree files={singleOutputFiles} skillId={selectedSkillId} runId={singleActiveRunId!} />
          </div>
        )}
      </div>
    </div>
  );
}
