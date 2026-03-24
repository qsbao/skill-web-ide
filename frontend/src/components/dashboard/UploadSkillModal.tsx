import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud } from 'lucide-react';
import { api } from '../../api/client';

interface UploadSkillModalProps {
  onClose: () => void;
  onUploaded: () => void;
}

export function UploadSkillModal({ onClose, onUploaded }: UploadSkillModalProps) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const skill = await api.uploadSkill(file);
      onUploaded();
      const idWithoutAt = skill.id.startsWith('@') ? skill.id.slice(1) : skill.id;
      navigate(`/skills/${idWithoutAt}`);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div
        className="w-full max-w-md p-6 rounded-xl animate-fade-in"
        style={{
          background: 'rgb(var(--surface-overlay))',
          border: '1px solid rgb(var(--border-default) / 0.6)',
          boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.5), 0 0 1px rgba(129, 140, 248, 0.1)',
        }}
      >
        <h2 className="text-lg font-semibold text-theme-primary mb-4">Upload Skill</h2>

        <div className="mb-4">
          <label className="block text-sm text-theme-secondary mb-2">
            Skill archive (.zip or .tar.gz)
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors"
            style={{
              borderColor: fileName ? 'var(--accent-muted)' : 'rgb(var(--border-default) / 0.5)',
              background: fileName ? 'var(--accent-subtle)' : 'rgb(var(--surface-inset))',
            }}
            onMouseEnter={(e) => {
              if (!fileName) e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
            }}
            onMouseLeave={(e) => {
              if (!fileName) e.currentTarget.style.borderColor = 'rgb(var(--border-default) / 0.5)';
            }}
          >
            <UploadCloud className="w-8 h-8 text-theme-muted" style={fileName ? { color: 'var(--accent)' } : {}} />
            <span className="text-sm text-theme-secondary">
              {fileName || 'Click to choose a file'}
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,.tar.gz,.tgz"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
          />
        </div>

        {error && (
          <div className="text-sm text-red-400 mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!fileName || uploading}
            className="btn-primary"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
