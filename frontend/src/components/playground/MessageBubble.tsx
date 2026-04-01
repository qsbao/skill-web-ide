import { useState } from 'react';
import { User, Bot, Terminal, ChevronRight, ChevronDown } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../stores/playgroundStore';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

function formatToolInput(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function ToolUseBubble({ message }: { message: ChatMessage }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex gap-2.5 justify-start mb-2 animate-fade-in">
      <div className="shrink-0 w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mt-0.5">
        <Terminal className="w-3.5 h-3.5 text-amber-400" />
      </div>
      <div className="max-w-[75%]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-overlay border border-border-subtle/50 text-xs font-medium text-theme-secondary hover:bg-surface-overlay/80 transition-colors"
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span className="text-amber-400">{message.toolName}</span>
        </button>
        {expanded && message.content && (
          <pre className="mt-1.5 px-3 py-2 rounded-lg bg-surface-inset border border-border-subtle/30 text-[11px] leading-relaxed text-theme-muted font-mono overflow-x-auto max-h-48 overflow-y-auto">
            {formatToolInput(message.content)}
          </pre>
        )}
      </div>
    </div>
  );
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  if (message.role === 'tool_use') {
    return <ToolUseBubble message={message} />;
  }

  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-surface-overlay border border-border-subtle/60 flex items-center justify-center mt-0.5">
          <Bot className="w-3.5 h-3.5 text-accent" />
        </div>
      )}

      <div
        className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'rounded-2xl rounded-br-sm text-white'
            : 'rounded-2xl rounded-bl-sm bg-surface-overlay border border-border-subtle/50 text-theme-primary'
        }`}
        style={
          isUser
            ? {
                background: 'linear-gradient(135deg, var(--accent-muted), #1d4ed8)',
              }
            : undefined
        }
      >
        {isUser ? (
          <pre className="whitespace-pre-wrap break-words font-sans">
            {message.content}
          </pre>
        ) : (
          <div className="prose-chat break-words">
            {message.content ? (
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            ) : (
              !isStreaming && <span>...</span>
            )}
            {isStreaming && (
              <span className="sparkle-container">
                <span className="sparkle" />
                <span className="sparkle" />
                <span className="sparkle" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
          style={{ background: 'var(--accent-muted)' }}
        >
          <User className="w-3.5 h-3.5 text-white" />
        </div>
      )}
    </div>
  );
}
