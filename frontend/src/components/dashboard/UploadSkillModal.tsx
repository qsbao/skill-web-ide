import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-white mb-4">Upload Skill</h2>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">
            Skill archive (.zip or .tar.gz)
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="text-sm bg-gray-700 text-gray-300 px-4 py-2 rounded hover:bg-gray-600"
            >
              Choose File
            </button>
            <span className="text-sm text-gray-400 self-center truncate">
              {fileName || 'No file selected'}
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
          <div className="text-sm text-red-400 mb-4">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 px-4 py-2 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!fileName || uploading}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
