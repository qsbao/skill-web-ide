import { useState, useRef, useEffect } from 'react';
import { useFileStore } from '../../stores/fileStore';
import { useSkillStore } from '../../stores/skillStore';
import { useEditorStore } from '../../stores/editorStore';
import { api } from '../../api/client';
import type { SkillFile } from '@skill-ide/shared';

interface ContextMenuState {
  x: number;
  y: number;
  node?: SkillFile;
}

function FileNode({
  node,
  skillId,
  onContext,
}: {
  node: SkillFile;
  skillId: string;
  onContext: (e: React.MouseEvent, node: SkillFile) => void;
}) {
  const { openFile } = useEditorStore();
  const [expanded, setExpanded] = useState(true);

  const handleClick = async () => {
    if (node.type === 'dir') {
      setExpanded(!expanded);
    } else {
      const { content } = await api.readFile(skillId, node.path);
      openFile(node.path, node.name, content);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={(e) => onContext(e, node)}
        className={`flex items-center gap-1 px-2 py-0.5 text-sm cursor-pointer hover:bg-gray-700 ${
          node.type === 'dir' ? 'text-yellow-300' : 'text-gray-300'
        }`}
      >
        <span className="text-xs">
          {node.type === 'dir' ? (expanded ? '\u25BC' : '\u25B6') : '  '}
        </span>
        <span className="text-xs">{node.type === 'dir' ? '\u{1F4C1}' : '\u{1F4C4}'}</span>
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === 'dir' && expanded && node.children && (
        <div className="pl-3">
          {node.children.map((child) => (
            <FileNode key={child.path} node={child} skillId={skillId} onContext={onContext} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer() {
  const { tree, loading } = useFileStore();
  const { activeSkillId } = useSkillStore();
  const [ctx, setCtx] = useState<ContextMenuState | null>(null);
  const [creating, setCreating] = useState<{ parentPath: string; isDir: boolean } | null>(null);
  const [newName, setNewName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setCtx(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const handleContext = (e: React.MouseEvent, node: SkillFile) => {
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY, node });
  };

  const handleRootContext = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY });
  };

  const handleNewFile = (isDir: boolean) => {
    if (!ctx) return;
    const parentPath = ctx.node?.type === 'dir' ? ctx.node.path : '.';
    setCreating({ parentPath, isDir });
    setNewName('');
    setCtx(null);
  };

  const handleCreateConfirm = async () => {
    if (!activeSkillId || !creating || !newName.trim()) return;
    const fullPath = creating.parentPath === '.' ? newName.trim() : `${creating.parentPath}/${newName.trim()}`;
    await api.createFile(activeSkillId, fullPath, creating.isDir);
    setCreating(null);
    setNewName('');
    // Refresh tree
    const tree = await api.getFileTree(activeSkillId);
    useFileStore.getState().setTree(tree);
  };

  const handleDeleteFile = async () => {
    if (!activeSkillId || !ctx?.node) return;
    await api.deleteFile(activeSkillId, ctx.node.path);
    setCtx(null);
    const tree = await api.getFileTree(activeSkillId);
    useFileStore.getState().setTree(tree);
  };

  if (!activeSkillId) {
    return (
      <div className="h-full bg-gray-800 flex items-center justify-center">
        <span className="text-xs text-gray-500">No skill selected</span>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-800 overflow-y-auto flex flex-col">
      <div className="flex-1 overflow-y-auto p-1" onContextMenu={handleRootContext}>
        <div className="text-xs text-gray-400 uppercase tracking-wide px-2 py-1">Files</div>
        {loading ? (
          <div className="text-xs text-gray-500 px-2">Loading...</div>
        ) : (
          tree.map((node) => (
            <FileNode key={node.path} node={node} skillId={activeSkillId} onContext={handleContext} />
          ))
        )}
      </div>

      {/* Create input */}
      {creating && (
        <div className="p-2 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-1">
            New {creating.isDir ? 'folder' : 'file'} in {creating.parentPath}
          </div>
          <div className="flex gap-1">
            <input
              autoFocus
              className="flex-1 bg-gray-700 text-xs px-2 py-1 rounded border border-gray-600 text-white outline-none focus:border-blue-500"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateConfirm();
                if (e.key === 'Escape') setCreating(null);
              }}
            />
            <button onClick={handleCreateConfirm} className="text-xs bg-blue-600 px-2 py-1 rounded">OK</button>
            <button onClick={() => setCreating(null)} className="text-xs text-gray-400">Cancel</button>
          </div>
        </div>
      )}

      {/* Context menu */}
      {ctx && (
        <div
          ref={menuRef}
          className="fixed bg-gray-700 border border-gray-600 rounded shadow-lg py-1 z-50"
          style={{ left: ctx.x, top: ctx.y }}
        >
          <button
            onClick={() => handleNewFile(false)}
            className="block w-full text-left px-3 py-1 text-xs text-gray-200 hover:bg-gray-600"
          >
            New File
          </button>
          <button
            onClick={() => handleNewFile(true)}
            className="block w-full text-left px-3 py-1 text-xs text-gray-200 hover:bg-gray-600"
          >
            New Folder
          </button>
          {ctx.node && (
            <>
              <div className="border-t border-gray-600 my-1" />
              <button
                onClick={handleDeleteFile}
                className="block w-full text-left px-3 py-1 text-xs text-red-400 hover:bg-gray-600"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
