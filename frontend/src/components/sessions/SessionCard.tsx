import { MessageSquare, Zap, Trash2 } from 'lucide-react';
import type { SessionSummary } from '@skill-ide/shared';

interface SessionCardProps {
  session: SessionSummary;
  onClick: () => void;
  onDelete: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function SessionCard({ session, onClick, onDelete }: SessionCardProps) {
  const TypeIcon = session.type === 'chat' ? MessageSquare : Zap;

  return (
    <div
      onClick={onClick}
      className="card p-3.5 cursor-pointer group transition-all duration-150"
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <TypeIcon className="w-3.5 h-3.5 text-theme-accent shrink-0" />
          <span className="text-sm font-semibold text-theme-primary truncate">
            {session.skillName}
          </span>
        </div>
        <span
          className={`badge shrink-0 ml-2 text-[10px] py-0 px-1.5 ${
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

      <div className="flex items-center gap-2 mb-2">
        <span className="badge text-[10px]">{session.type === 'chat' ? 'Chat' : 'Single Run'}</span>
        <span className="text-[10px] text-theme-muted">{session.messageCount} messages</span>
      </div>

      <p className="text-xs text-theme-secondary line-clamp-2 mb-2">{session.lastMessage}</p>

      <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50">
        <span className="text-[10px] text-theme-muted">{timeAgo(session.updatedAt)}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete Session"
          className="p-1 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
