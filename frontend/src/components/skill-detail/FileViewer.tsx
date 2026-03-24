import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Folder, FileCode } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';
import Editor from '@monaco-editor/react';
import { api } from '../../api/client';
import type { SkillFile } from '@skill-ide/shared';

interface FileViewerProps {
  tree: SkillFile[];
  skillId: string;
}

function FileNode({
  node,
  skillId,
  selectedPath,
  onSelect,
}: {
  node: SkillFile;
  skillId: string;
  selectedPath: string | null;
  onSelect: (path: string, content: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedPath === node.path;

  const handleClick = async () => {
    if (node.type === 'dir') {
      setExpanded(!expanded);
    } else {
      const { content } = await api.readFile(skillId, node.path);
      onSelect(node.path, content);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2 py-1 text-sm cursor-pointer rounded-md transition-all duration-100 ${
          isSelected
            ? 'bg-accent-subtle text-slate-200 border-l-2 border-accent'
            : 'hover:bg-surface-overlay/60 border-l-2 border-transparent'
        } ${node.type === 'dir' ? 'text-slate-300' : 'text-slate-400'}`}
      >
        {node.type === 'dir' ? (
          <>
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <Folder className="w-3.5 h-3.5 text-accent/70 shrink-0" />
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === 'dir' && expanded && node.children && (
        <div className="pl-3">
          {node.children.map((child) => (
            <FileNode
              key={child.path}
              node={child}
              skillId={skillId}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown', css: 'css', html: 'html', yaml: 'yaml',
    yml: 'yaml', py: 'python', sh: 'shell', bash: 'shell',
  };
  return map[ext] || 'plaintext';
}

export function FileViewer({ tree, skillId }: FileViewerProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const currentTheme = useThemeStore((s) => s.theme);

  const handleSelect = (path: string, content: string) => {
    setSelectedPath(path);
    setFileContent(content);
  };

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2.5 bg-surface-raised border-b border-border/40 flex items-center gap-2">
        <FileText className="w-3.5 h-3.5" />
        Files
      </div>
      <div className="flex" style={{ height: '400px' }}>
        {/* Tree */}
        <div className="w-56 shrink-0 bg-surface-raised overflow-y-auto border-r border-border/40 p-1.5">
          {tree.map((node) => (
            <FileNode
              key={node.path}
              node={node}
              skillId={skillId}
              selectedPath={selectedPath}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 bg-surface-base">
          {selectedPath ? (
            <div className="h-full flex flex-col">
              <div className="text-xs text-slate-400 font-mono px-4 py-2 bg-surface-raised border-b border-border/40 flex items-center gap-2">
                <FileCode className="w-3 h-3 text-slate-500" />
                {selectedPath}
              </div>
              <div className="flex-1">
                <Editor
                  theme={currentTheme === 'dark' ? 'vs-dark' : 'light'}
                  language={getLanguage(selectedPath)}
                  value={fileContent}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center">
              <FileText className="w-8 h-8 text-slate-600 mb-2" />
              <span className="text-slate-500 text-sm">Select a file to view</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
