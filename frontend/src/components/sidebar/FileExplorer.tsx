import { useState, useRef, useEffect } from 'react';
import { useFileStore } from '../../stores/fileStore';
import { useSkillStore } from '../../stores/skillStore';
import { useEditorStore } from '../../stores/editorStore';
import { api } from '../../api/client';
import type { SkillFile } from '@skill-ide/shared';
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  Trash2,
} from 'lucide-react';

interface ContextMenuState {
  x: number;
  y: number;
  node?: SkillFile;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return <FileCode className="w-4 h-4 text-blue-400/70 shrink-0" />;
    case 'js':
    case 'jsx':
      return <FileCode className="w-4 h-4 text-yellow-400/70 shrink-0" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-amber-400/70 shrink-0" />;
    case 'md':
    case 'mdx':
      return <FileText className="w-4 h-4 text-sky-400/70 shrink-0" />;
    case 'css':
    case 'scss':
      return <FileCode className="w-4 h-4 text-purple-400/70 shrink-0" />;
    case 'yaml':
    case 'yml':
      return <FileText className="w-4 h-4 text-rose-400/70 shrink-0" />;
    default:
      return <FileText className="w-4 h-4 text-theme-muted shrink-0" />;
  }
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
  const activeTab = useEditorStore((s) => s.activeTab);
  const [expanded, setExpanded] = useState(true);

  const isActive = node.type !== 'dir' && activeTab === node.path;

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
        className={`group flex items-center gap-1.5 px-2 py-1 text-[13px] cursor-pointer rounded-md mx-1 transition-colors relative ${
          isActive
            ? 'bg-surface-overlay/60 text-theme-primary'
            : 'hover:bg-surface-overlay/50 text-theme-secondary hover:text-theme-primary'
        } ${node.type === 'dir' ? 'text-theme-primary font-medium' : ''}`}
      >
        {isActive && (
          <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-accent" />
        )}
        {node.type === 'dir' ? (
          <>
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-theme-muted shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-theme-muted shrink-0" />
            )}
            {expanded ? (
              <FolderOpen className="w-4 h-4 text-accent/70 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-accent/70 shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            {getFileIcon(node.name)}
          </>
        )}
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

  const clampMenu = (x: number, y: number) => ({
    x: Math.min(x, window.innerWidth - 200),
    y: Math.min(y, window.innerHeight - 160),
  });

  const handleContext = (e: React.MouseEvent, node: SkillFile) => {
    e.preventDefault();
    const pos = clampMenu(e.clientX, e.clientY);
    setCtx({ ...pos, node });
  };

  const handleRootContext = (e: React.MouseEvent) => {
    e.preventDefault();
    const pos = clampMenu(e.clientX, e.clientY);
    setCtx(pos);
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
      <div className="h-full bg-surface-raised flex items-center justify-center">
        <span className="text-xs text-theme-muted">No skill selected</span>
      </div>
    );
  }

  return (
    <div className="h-full bg-surface-raised overflow-y-auto flex flex-col">
      <div className="flex-1 overflow-y-auto py-2" onContextMenu={handleRootContext}>
        <div className="text-[11px] uppercase tracking-widest text-theme-muted font-medium px-3 py-1.5 truncate" title={activeSkillId || 'Files'}>
          {activeSkillId || 'Files'}
        </div>
        {loading ? (
          <div className="text-xs text-theme-muted px-3 animate-pulse-soft">Loading...</div>
        ) : (
          tree.map((node) => (
            <FileNode key={node.path} node={node} skillId={activeSkillId} onContext={handleContext} />
          ))
        )}
      </div>

      {/* Create input */}
      {creating && (
        <div className="p-2.5 border-t border-border-subtle">
          <div className="text-[11px] text-theme-muted mb-1.5">
            New {creating.isDir ? 'folder' : 'file'} in <span className="font-mono text-theme-secondary">{creating.parentPath}</span>
          </div>
          <div className="flex gap-1.5">
            <input
              autoFocus
              className="input-base text-xs py-1.5 px-2.5 flex-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateConfirm();
                if (e.key === 'Escape') setCreating(null);
              }}
            />
            <button onClick={handleCreateConfirm} className="btn-primary btn-xs">OK</button>
            <button onClick={() => setCreating(null)} className="btn-ghost btn-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Context menu */}
      {ctx && (
        <div
          ref={menuRef}
          className="fixed w-44 bg-surface-overlay border border-border rounded-lg shadow-float py-1.5 z-50 animate-fade-in"
          style={{ left: ctx.x, top: ctx.y }}
        >
          <button
            onClick={() => handleNewFile(false)}
            className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-theme-primary hover:bg-surface-raised/80 hover:text-theme-primary transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5 text-theme-muted" />
            New File
          </button>
          <button
            onClick={() => handleNewFile(true)}
            className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-theme-primary hover:bg-surface-raised/80 hover:text-theme-primary transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5 text-theme-muted" />
            New Folder
          </button>
          {ctx.node && (
            <>
              <div className="border-t border-border-subtle my-1.5 mx-2" />
              <button
                onClick={handleDeleteFile}
                className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
