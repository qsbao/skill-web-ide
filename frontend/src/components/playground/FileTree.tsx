import { Folder, FileText, Download } from 'lucide-react';
import { api } from '../../api/client';
import type { SkillFile } from '@skill-ide/shared';

export function FileTree({ files, skillId, runId, depth = 0 }: { files: SkillFile[]; skillId: string; runId: string; depth?: number }) {
  return (
    <>
      {files.map((file) => (
        <div key={file.path}>
          <div
            className="flex items-center gap-1.5 py-1 hover:bg-surface-overlay/50 rounded-md px-1.5 transition-colors"
            style={{ paddingLeft: `${depth * 14 + 6}px` }}
          >
            {file.type === 'dir' ? (
              <Folder className="w-3.5 h-3.5 text-accent/70 shrink-0" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-theme-muted shrink-0" />
            )}
            <span className="text-xs text-theme-primary flex-1 truncate">{file.name}</span>
            {file.type === 'file' && (
              <a
                href={api.getRunDownloadUrl(skillId, runId, file.path)}
                download
                className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover shrink-0 transition-colors"
              >
                <Download className="w-3 h-3" />
              </a>
            )}
          </div>
          {file.children && <FileTree files={file.children} skillId={skillId} runId={runId} depth={depth + 1} />}
        </div>
      ))}
    </>
  );
}
