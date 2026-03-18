import { useState } from 'react';
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
        className={`flex items-center gap-1 px-2 py-0.5 text-sm cursor-pointer hover:bg-gray-700 ${
          isSelected ? 'bg-gray-700 text-white' : node.type === 'dir' ? 'text-yellow-300' : 'text-gray-300'
        }`}
      >
        <span className="text-xs">
          {node.type === 'dir' ? (expanded ? '\u25BC' : '\u25B6') : '  '}
        </span>
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

  const handleSelect = (path: string, content: string) => {
    setSelectedPath(path);
    setFileContent(content);
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <div className="text-xs text-gray-400 uppercase tracking-wide px-3 py-2 bg-gray-800 border-b border-gray-700">
        Files
      </div>
      <div className="flex" style={{ height: '400px' }}>
        {/* Tree */}
        <div className="w-56 shrink-0 bg-gray-800 overflow-y-auto border-r border-gray-700 p-1">
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
        <div className="flex-1 bg-gray-900">
          {selectedPath ? (
            <div className="h-full flex flex-col">
              <div className="text-xs text-gray-400 px-3 py-1.5 bg-gray-800 border-b border-gray-700">
                {selectedPath}
              </div>
              <div className="flex-1">
                <Editor
                  theme="vs-dark"
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
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              Select a file to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
