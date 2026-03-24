import { User, Bot } from 'lucide-react';
import type { ChatMessage } from '../../stores/playgroundStore';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
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
            : 'rounded-2xl rounded-bl-sm bg-surface-overlay border border-border-subtle/50 text-slate-200'
        }`}
        style={
          isUser
            ? {
                background: 'linear-gradient(135deg, var(--accent-muted), #7c3aed)',
              }
            : undefined
        }
      >
        <pre className="whitespace-pre-wrap break-words font-sans">
          {message.content || (isStreaming ? '' : '...')}
          {isStreaming && (
            <span
              className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom rounded-sm animate-pulse-soft"
              style={{ background: 'var(--accent)' }}
            />
          )}
        </pre>
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
