import { ArrowLeft, MessageSquare, Zap, Terminal } from 'lucide-react';
import { MessageBubble } from '../playground/MessageBubble';
import type { Session } from '@skill-ide/shared';

interface SessionDetailProps {
  session: Session;
  onBack: () => void;
}

export function SessionDetail({ session, onBack }: SessionDetailProps) {
  return (
    <div className="h-full flex flex-col bg-surface-base">
      {/* Header */}
      <div className="header-bar px-5 py-3 flex items-center gap-3 border-b border-border-subtle">
        <button onClick={onBack} className="btn-ghost p-1.5">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {session.type === 'chat' ? (
            <MessageSquare className="w-4 h-4 text-theme-accent shrink-0" />
          ) : (
            <Zap className="w-4 h-4 text-theme-accent shrink-0" />
          )}
          <h2 className="text-sm font-semibold text-theme-primary truncate">{session.skillName}</h2>
          <span className="badge text-[10px]">{session.type === 'chat' ? 'Chat' : 'Single Run'}</span>
          <span
            className={`badge text-[10px] py-0 px-1.5 ${
              session.status === 'completed'
                ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'
                : session.status === 'active'
                  ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25'
                  : 'text-red-400 bg-red-400/10 border-red-400/25'
            }`}
          >
            {session.status}
          </span>
        </div>
        <span className="text-[10px] text-theme-muted shrink-0">
          {new Date(session.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {session.type === 'chat' ? (
          session.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <MessageSquare className="w-8 h-8 text-theme-muted mb-2" />
              <span className="text-sm text-theme-muted">No messages in this session</span>
            </div>
          ) : (
            session.messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={{ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content }}
              />
            ))
          )
        ) : (
          /* Single-run view */
          <div className="space-y-4">
            {/* Prompt */}
            <div>
              <div className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2">Prompt</div>
              <div className="bg-surface-overlay border border-border-subtle/50 rounded-lg p-4 text-sm text-theme-primary">
                <pre className="whitespace-pre-wrap break-words font-sans">{session.prompt}</pre>
              </div>
            </div>
            {/* Output */}
            <div>
              <div className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Output
              </div>
              <div className="bg-surface-inset border border-border-subtle/50 rounded-lg p-4 font-mono text-xs text-theme-primary overflow-x-auto">
                <pre className="whitespace-pre-wrap break-all">
                  {session.output || (session.messages.find((m) => m.role === 'assistant')?.content) || 'No output'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
