import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { usePlaygroundStore } from '../stores/playgroundStore';
import { useSessionStore } from '../stores/sessionStore';
import { SkillSelector } from '../components/playground/SkillSelector';
import { ChatMode } from '../components/playground/ChatMode';

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
  const { selectedSkillId, setSelectedSkillId, internalSessionId, clearChat } = usePlaygroundStore();
  const { restoreSession } = usePlaygroundStore();
  const { fetchSession } = useSessionStore();
  const restoringRef = useRef(false);
  // Track whether the initial ?skillId= clearing has happened,
  // so we don't sync a stale session ID into the URL before clearChat() runs.
  const skillInitRef = useRef(false);

  // Pre-select skill from URL ?skillId=xxx (only when no sessionId):
  // clear any existing session so the user starts fresh.
  // This MUST run before the other effects to prevent stale session restoration.
  useEffect(() => {
    const skillId = searchParams.get('skillId');
    if (skillId && !searchParams.get('sessionId')) {
      clearChat();
      setSelectedSkillId(skillId);
      skillInitRef.current = true;
    } else {
      skillInitRef.current = false;
    }
  }, [searchParams, setSelectedSkillId, clearChat]);

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

  // Sync internalSessionId to URL
  useEffect(() => {
    const currentSessionId = searchParams.get('sessionId');
    // If we just cleared for a ?skillId= navigation, don't sync stale session
    if (!internalSessionId && skillInitRef.current) return;
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

      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ChatMode />
      </div>
    </div>
  );
}
