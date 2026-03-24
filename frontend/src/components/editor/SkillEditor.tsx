import Editor from '@monaco-editor/react';
import { useEditorStore } from '../../stores/editorStore';
import { useSkillStore } from '../../stores/skillStore';
import { api } from '../../api/client';
import { useCallback, useEffect } from 'react';
import { X, FileCode } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

export function SkillEditor() {
  const { tabs, activeTab, setActiveTab, closeTab, updateContent, markSaved } = useEditorStore();
  const theme = useThemeStore((s) => s.theme);
  const { activeSkillId } = useSkillStore();

  const currentTab = tabs.find((t) => t.path === activeTab);

  const handleSave = useCallback(async () => {
    if (!currentTab || !activeSkillId) return;
    await api.writeFile(activeSkillId, currentTab.path, currentTab.content);
    markSaved(currentTab.path);
  }, [currentTab, activeSkillId, markSaved]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  if (tabs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-surface-base text-slate-500 gap-3">
        <FileCode className="w-10 h-10 text-slate-600" />
        <span className="text-sm">Select a file to edit</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-base">
      {/* Tabs */}
      <div className="flex bg-surface-raised overflow-x-auto shrink-0">
        {tabs.map((tab) => (
          <div
            key={tab.path}
            onClick={() => setActiveTab(tab.path)}
            className={`group flex items-center gap-1.5 px-3.5 py-2 text-xs cursor-pointer shrink-0 transition-colors relative ${
              tab.path === activeTab
                ? 'bg-surface-base text-slate-100'
                : 'text-slate-500 hover:text-slate-300 hover:bg-surface-overlay/30'
            }`}
          >
            <span>{tab.name}</span>
            {tab.dirty && <span className="text-accent text-[10px]">●</span>}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.path);
              }}
              className="ml-0.5 text-slate-600 hover:text-slate-200 transition-colors opacity-0 group-hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
            {tab.path === activeTab && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
            )}
          </div>
        ))}
      </div>

      {/* Editor */}
      {currentTab && (
        <div className="flex-1">
          <Editor
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            language={currentTab.language}
            value={currentTab.content}
            onChange={(value) => updateContent(currentTab.path, value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </div>
      )}
    </div>
  );
}
