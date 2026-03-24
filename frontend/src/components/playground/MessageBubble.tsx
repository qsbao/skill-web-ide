import type { ChatMessage } from '../../stores/playgroundStore';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
          isUser
            ? 'bg-blue-700 text-white'
            : 'bg-gray-800 border border-gray-700 text-gray-200'
        }`}
      >
        <pre className="whitespace-pre-wrap break-words font-sans">
          {message.content || (isStreaming ? '' : '...')}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom" />
          )}
        </pre>
      </div>
    </div>
  );
}
