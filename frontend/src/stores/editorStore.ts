import { create } from 'zustand';

export interface EditorTab {
  path: string;
  name: string;
  content: string;
  dirty: boolean;
  language: string;
}

interface EditorState {
  tabs: EditorTab[];
  activeTab: string | null;
  openFile: (path: string, name: string, content: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  markSaved: (path: string) => void;
}

function detectLanguage(name: string): string {
  const ext = name.split('.').pop() || '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescriptreact',
    js: 'javascript',
    jsx: 'javascriptreact',
    json: 'json',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    css: 'css',
    html: 'html',
    py: 'python',
    sh: 'shell',
  };
  return map[ext] || 'plaintext';
}

export const useEditorStore = create<EditorState>((set) => ({
  tabs: [],
  activeTab: null,

  openFile: (path, name, content) =>
    set((state) => {
      const existing = state.tabs.find((t) => t.path === path);
      if (existing) return { activeTab: path };
      return {
        tabs: [...state.tabs, { path, name, content, dirty: false, language: detectLanguage(name) }],
        activeTab: path,
      };
    }),

  closeTab: (path) =>
    set((state) => {
      const tabs = state.tabs.filter((t) => t.path !== path);
      const activeTab =
        state.activeTab === path ? (tabs.length > 0 ? tabs[tabs.length - 1].path : null) : state.activeTab;
      return { tabs, activeTab };
    }),

  setActiveTab: (path) => set({ activeTab: path }),

  updateContent: (path, content) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.path === path ? { ...t, content, dirty: true } : t)),
    })),

  markSaved: (path) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.path === path ? { ...t, dirty: false } : t)),
    })),
}));
