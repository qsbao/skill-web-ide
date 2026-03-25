import { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, Send, MessageSquare } from 'lucide-react';
import { usePlaygroundStore } from '../../stores/playgroundStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { MessageBubble } from './MessageBubble';

export function ChatMode() {
  const {
    selectedSkillId,
    messages,
    sessionId,
    internalSessionId,
    chatRunning,
    addUserMessage,
    addAssistantMessage,
    setChatRunning,
    clearChat,
  } = usePlaygroundStore();
  const { sendMessage } = useWebSocket();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

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
        <button
          onClick={clearChat}
          className="btn-ghost text-xs gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          New Conversation
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in">
            <div className="w-10 h-10 rounded-lg bg-surface-overlay/50 border border-border-subtle/40 flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-theme-muted" />
            </div>
            <span className="text-theme-muted text-sm">Send a message to start the conversation</span>
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
  );
}
