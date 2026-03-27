import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink, MessageSquare, Zap } from 'lucide-react';
import { usePlaygroundStore, type PlaygroundMode } from '../stores/playgroundStore';
import { useSessionStore } from '../stores/sessionStore';
import { SkillSelector } from '../components/playground/SkillSelector';
import { ChatMode } from '../components/playground/ChatMode';
import { SingleRunMode } from '../components/playground/SingleRunMode';

const MODES: { key: PlaygroundMode; label: string; icon: typeof MessageSquare }[] = [
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'single', label: 'Single Run', icon: Zap },
];

function buildPlaygroundUrl(skillId: string | null, sessionId: string | null): string {
  const params = new URLSearchParams();
  if (sessionId) {
    // skill is derived from session data on load, no need to duplicate in URL
    params.set('sessionId', sessionId);
  } else if (skillId) {
    params.set('skillId', skillId);
  }
  const qs = params.toString();
  return qs ? `/playground?${qs}` : '/playground';
}

export function PlaygroundPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mode, setMode, selectedSkillId, setSelectedSkillId, internalSessionId, clearChat } = usePlaygroundStore();
  const { restoreSession } = usePlaygroundStore();
  const { fetchSession } = useSessionStore();
  const restoringRef = useRef(false);

  // Restore session from URL ?sessionId=xxx
  useEffect(() => {
    const sessionId = searchParams.get('sessionId');
    if (sessionId && sessionId !== internalSessionId && !restoringRef.current) {
      restoringRef.current = true;
      fetchSession(sessionId).then((session) => {
        restoreSession(session);
      }).catch(() => {}).finally(() => {
        restoringRef.current = false;
      });
    }
  }, [searchParams, internalSessionId, fetchSession, restoreSession]);

  // Pre-select skill from URL ?skillId=xxx (only when no sessionId):
  // clear any existing session so the user starts fresh
  useEffect(() => {
    const skillId = searchParams.get('skillId');
    if (skillId && !searchParams.get('sessionId')) {
      clearChat();
      setSelectedSkillId(skillId);
    }
  }, [searchParams, setSelectedSkillId, clearChat]);

  // Sync internalSessionId to URL (skip when URL has skillId-only — user wants a fresh session)
  useEffect(() => {
    const currentSessionId = searchParams.get('sessionId');
    const hasSkillIdOnly = searchParams.get('skillId') && !currentSessionId;
    if (hasSkillIdOnly) return;
    if (internalSessionId && internalSessionId !== currentSessionId) {
      navigate(buildPlaygroundUrl(selectedSkillId, internalSessionId), { replace: true });
    } else if (!internalSessionId && currentSessionId) {
      navigate(buildPlaygroundUrl(selectedSkillId, null), { replace: true });
    }
  }, [internalSessionId, selectedSkillId, searchParams, navigate]);

  const handleSkillChange = (id: string | null) => {
    setSelectedSkillId(id);
    navigate(buildPlaygroundUrl(id, internalSessionId), { replace: true });
  };

  return (
    <div className="h-full bg-surface-base flex flex-col">
      {/* Sub-bar for playground controls */}
      <div className="h-10 bg-surface-raised border-b border-border-subtle flex items-center px-4 gap-3 shrink-0">
        <SkillSelector value={selectedSkillId} onChange={handleSkillChange} />

        {selectedSkillId && (
          <button
            onClick={() => {
              const slug = selectedSkillId.startsWith('@') ? selectedSkillId.slice(1) : selectedSkillId;
              navigate(`/skills/${slug}`);
            }}
            className="btn-ghost btn-xs"
            title="View skill details"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Details
          </button>
        )}

        {/* Mode pill toggle */}
        <div className="flex ml-auto bg-surface-inset rounded-lg p-0.5 border border-border-subtle/50">
          {MODES.map((m) => {
            const Icon = m.icon;
            const isActive = mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-md transition-all duration-150 font-medium ${
                  isActive
                    ? 'bg-accent-muted text-white shadow-glow-sm'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-surface-overlay/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'chat' ? <ChatMode /> : <SingleRunMode />}
      </div>
    </div>
  );
}
