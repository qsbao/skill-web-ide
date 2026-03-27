import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History } from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import { SessionCard } from '../components/sessions/SessionCard';

export function SessionsPage() {
  const navigate = useNavigate();
  const { sessions, loading, loadSessions, removeSession } = useSessionStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleClick = (id: string) => {
    navigate(`/playground?sessionId=${encodeURIComponent(id)}`);
  };

  return (
    <div className="h-full flex flex-col bg-surface-base">
      {/* Header */}
      <div className="header-bar px-6 py-4">
        <h1 className="text-lg font-semibold text-theme-primary">Sessions</h1>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && sessions.length === 0 ? (
          <div className="flex items-center justify-center mt-16">
            <span className="text-sm text-theme-muted">Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center mt-16 gap-4">
            <History className="w-16 h-16 text-theme-muted" />
            <p className="text-sm text-theme-muted">
              No sessions yet. Run a skill in the Playground to create one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={() => handleClick(session.id)}
                onDelete={() => removeSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
