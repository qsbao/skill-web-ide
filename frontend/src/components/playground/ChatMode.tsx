import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Send, MessageSquare, FolderOpen, Share2, Check } from 'lucide-react';
import { usePlaygroundStore } from '../../stores/playgroundStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { MessageBubble } from './MessageBubble';
import { FileTree } from './FileTree';
import { api } from '../../api/client';
import type { SkillMeta } from '@skill-ide/shared';

export function ChatMode() {
  const {
    selectedSkillId,
    messages,
    sessionId,
    internalSessionId,
    chatRunning,
    chatActiveRunId,
    chatOutputFiles,
    chatFilesVisible,
    addUserMessage,
    addAssistantMessage,
    setChatRunning,
    setChatFilesVisible,
    clearChat,
  } = usePlaygroundStore();
  const { sendMessage } = useWebSocket();
  const [input, setInput] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillMeta | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filesJustAppeared, setFilesJustAppeared] = useState(false);
  const prevHadFiles = useRef(false);

  // Detect first appearance of files to trigger entrance animation
  const hasFiles = chatOutputFiles.length > 0;
  useEffect(() => {
    if (hasFiles && !prevHadFiles.current) {
      setFilesJustAppeared(true);
      const timer = setTimeout(() => setFilesJustAppeared(false), 6500);
      return () => clearTimeout(timer);
    }
    if (!hasFiles) {
      prevHadFiles.current = false;
    } else {
      prevHadFiles.current = true;
    }
  }, [hasFiles]);

  const fileCount = useMemo(() => {
    function count(files: typeof chatOutputFiles): number {
      return files.reduce((n, f) => n + (f.type === 'file' ? 1 : 0) + (f.children ? count(f.children) : 0), 0);
    }
    return count(chatOutputFiles);
  }, [chatOutputFiles]);

  useEffect(() => {
    if (!selectedSkillId) { setSelectedSkill(null); return; }
    api.getSkill(selectedSkillId).then(setSelectedSkill).catch(() => setSelectedSkill(null));
  }, [selectedSkillId]);

  const examplePrompts = selectedSkill?.examplePrompts ?? [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!selectedSkillId || chatRunning || !input.trim()) return;
    const text = input.trim();
    addUserMessage(text);
    addAssistantMessage('');
    setChatRunning(true);
    setInput('');
    sendMessage('playground:chat', {
      skillId: selectedSkillId,
      prompt: text,
      sessionId: sessionId || undefined,
      internalSessionId: internalSessionId || undefined,
    });
  }, [selectedSkillId, chatRunning, input, sessionId, internalSessionId, addUserMessage, addAssistantMessage, setChatRunning, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (!selectedSkillId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-surface-base animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-surface-overlay/60 border border-border-subtle/50 flex items-center justify-center mb-4">
          <MessageSquare className="w-6 h-6 text-theme-muted" />
        </div>
        <span className="text-theme-muted text-sm">Select a skill to start chatting</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-base">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-surface-raised border-b border-border/40">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-theme-primary">Chat</span>
          {sessionId && (
            <span className="badge font-mono text-[11px]">
              {sessionId.slice(0, 8)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasFiles && (
            <button
              onClick={() => setChatFilesVisible(!chatFilesVisible)}
              className={[
                'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150',
                filesJustAppeared ? 'animate-pop-glow' : '',
                chatFilesVisible
                  ? 'bg-accent-muted text-white shadow-glow-sm'
                  : 'bg-accent-muted/20 text-accent hover:bg-accent-muted/30 border border-accent/30',
              ].join(' ')}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Files
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-white/20 font-mono text-[10px] px-1.5">
                {fileCount}
              </span>
            </button>
          )}
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setShareCopied(true);
              setTimeout(() => setShareCopied(false), 2000);
            }}
            className={[
              'btn-ghost text-xs gap-1.5 transition-all duration-150',
              shareCopied ? 'text-green-400' : '',
            ].join(' ')}
            title="Copy share link"
          >
            {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            {shareCopied ? 'Copied!' : 'Share'}
          </button>
          <button
            onClick={clearChat}
            className="btn-ghost text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            New Conversation
          </button>
        </div>
      </div>

      {/* Messages + Files sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full animate-fade-in">
                <div className="w-10 h-10 rounded-lg bg-surface-overlay/50 border border-border-subtle/40 flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5 text-theme-muted" />
                </div>
                {examplePrompts.length > 0 ? (
                  <>
                    <span className="text-theme-muted text-sm mb-5">Try one of these prompts to get started</span>
                    <div className="flex flex-wrap justify-center gap-3 w-full max-w-lg">
                      {examplePrompts.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(prompt)}
                          className="text-left px-4 py-3 rounded-xl border border-accent/30 bg-accent-muted/10 hover:bg-accent-muted/25 hover:border-accent/50 text-sm text-theme-primary shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="text-theme-muted text-sm">Send a message to start the conversation</span>
                )}
              </div>
            ) : (
              messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  message={msg}
                  isStreaming={chatRunning && msg.role === 'assistant' && i === messages.length - 1}
                />
              ))
            )}
          </div>

          {/* Input */}
          <div className="p-4">
            <div className="chat-input-bar px-4 py-3 shadow-float flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
                rows={2}
                className="input-base flex-1 resize-none rounded-lg text-sm min-h-[3rem] max-h-32"
              />
              <button
                onClick={handleSend}
                disabled={chatRunning || !input.trim()}
                className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed bg-accent-muted shadow-glow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Files sidebar */}
        {chatFilesVisible && chatOutputFiles.length > 0 && chatActiveRunId && selectedSkillId && (
          <div className="w-64 border-l border-border/40 overflow-y-auto p-3 bg-surface-raised animate-slide-up">
            <div className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2">Work Dir Files</div>
            <FileTree files={chatOutputFiles} skillId={selectedSkillId} runId={chatActiveRunId} />
          </div>
        )}
      </div>
    </div>
  );
}
