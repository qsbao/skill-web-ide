import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlaygroundStore, type PlaygroundMode } from '../stores/playgroundStore';
import { SkillSelector } from '../components/playground/SkillSelector';
import { ChatMode } from '../components/playground/ChatMode';
import { SingleRunMode } from '../components/playground/SingleRunMode';

const MODES: { key: PlaygroundMode; label: string }[] = [
  { key: 'chat', label: 'Chat' },
  { key: 'single', label: 'Single Run' },
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
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          &larr; Dashboard
        </button>
        <h1 className="text-sm font-semibold text-white">Playground</h1>
        <SkillSelector value={selectedSkillId} onChange={handleSkillChange} />

        {/* Mode tabs */}
        <div className="flex ml-auto bg-gray-900 rounded p-0.5">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`text-xs px-3 py-1.5 rounded transition-colors ${
                mode === m.key
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'chat' ? <ChatMode /> : <SingleRunMode />}
      </div>
    </div>
  );
}
