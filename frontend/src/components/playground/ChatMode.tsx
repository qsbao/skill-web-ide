import { useState, useRef, useEffect, useCallback } from 'react';
import { usePlaygroundStore } from '../../stores/playgroundStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { MessageBubble } from './MessageBubble';

export function ChatMode() {
  const {
    selectedSkillId,
    messages,
    sessionId,
    chatRunning,
    addUserMessage,
    addAssistantMessage,
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
    setInput('');
    sendMessage('playground:chat', {
      skillId: selectedSkillId,
      prompt: text,
      sessionId: sessionId || undefined,
    });
  }, [selectedSkillId, chatRunning, input, sessionId, addUserMessage, addAssistantMessage, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (!selectedSkillId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-600 text-sm">
        Select a skill to start chatting
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-300">Chat</span>
          {sessionId && (
            <span className="text-xs text-gray-500">Session: {sessionId.slice(0, 8)}...</span>
          )}
        </div>
        <button
          onClick={clearChat}
          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
        >
          New Conversation
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-600 text-sm mt-8">
            Send a message to start the conversation
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
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 bg-gray-800 text-gray-200 text-sm p-3 rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
          />
          <button
            onClick={handleSend}
            disabled={chatRunning || !input.trim()}
            className="self-end text-sm bg-blue-700 px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition-colors text-white"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
