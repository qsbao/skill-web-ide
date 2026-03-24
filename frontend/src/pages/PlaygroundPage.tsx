import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Zap } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { usePlaygroundStore, type PlaygroundMode } from '../stores/playgroundStore';
import { SkillSelector } from '../components/playground/SkillSelector';
import { ChatMode } from '../components/playground/ChatMode';
import { SingleRunMode } from '../components/playground/SingleRunMode';

const MODES: { key: PlaygroundMode; label: string; icon: typeof MessageSquare }[] = [
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'single', label: 'Single Run', icon: Zap },
];

export function PlaygroundPage() {
  const { author, name } = useParams<{ author: string; name: string }>();
  const navigate = useNavigate();
  const { mode, setMode, selectedSkillId, setSelectedSkillId } = usePlaygroundStore();

  // Pre-select skill from URL params
  useEffect(() => {
    if (author && name) {
      setSelectedSkillId(`@${author}/${name}`);
    }
  }, [author, name, setSelectedSkillId]);

  const handleSkillChange = (id: string | null) => {
    setSelectedSkillId(id);
    if (id) {
      const slug = id.startsWith('@') ? id.slice(1) : id;
      navigate(`/playground/${slug}`, { replace: true });
    } else {
      navigate('/playground', { replace: true });
    }
  };

  return (
    <div className="h-screen bg-surface-base flex flex-col">
      {/* Top bar */}
      <div className="bg-surface-raised border-b border-border/40 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-ghost gap-1.5 text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Dashboard
        </button>

        <div className="h-4 w-px bg-border-subtle" />

        <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Playground</h1>

        <ThemeToggle />

        <SkillSelector value={selectedSkillId} onChange={handleSkillChange} />

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
