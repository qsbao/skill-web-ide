import Editor from '@monaco-editor/react';
import { useEditorStore } from '../../stores/editorStore';
import { useSkillStore } from '../../stores/skillStore';
import { api } from '../../api/client';
import { useCallback, useEffect } from 'react';

export function SkillEditor() {
  const { tabs, activeTab, setActiveTab, closeTab, updateContent, markSaved } = useEditorStore();
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
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Select a file to edit
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Tabs */}
      <div className="flex bg-gray-800 border-b border-gray-700 overflow-x-auto shrink-0">
        {tabs.map((tab) => (
          <div
            key={tab.path}
            onClick={() => setActiveTab(tab.path)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer border-r border-gray-700 shrink-0 ${
              tab.path === activeTab ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{tab.name}</span>
            {tab.dirty && <span className="text-blue-400">●</span>}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.path);
              }}
              className="ml-1 text-gray-500 hover:text-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Editor */}
      {currentTab && (
        <div className="flex-1">
          <Editor
            theme="vs-dark"
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
