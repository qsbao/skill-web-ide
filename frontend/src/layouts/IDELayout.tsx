import { useState } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { Toolbar } from '../components/Toolbar';
import { FileExplorer } from '../components/sidebar/FileExplorer';
import { SkillEditor } from '../components/editor/SkillEditor';
import { OutputPanel } from '../components/panel/OutputPanel';
import { TestRunner } from '../components/panel/TestRunner';
import { TestSuiteManager } from '../components/panel/TestSuiteManager';
import { SkillRunner } from '../components/panel/SkillRunner';
import { useWebSocket } from '../hooks/useWebSocket';

type BottomTab = 'output' | 'tests' | 'test-suite' | 'run';

export function IDELayout() {
  useWebSocket();
  const [bottomTab, setBottomTab] = useState<BottomTab>('output');

  const tabs: { id: BottomTab; label: string }[] = [
    { id: 'output', label: 'Output' },
    { id: 'tests', label: 'Test Runner' },
    { id: 'test-suite', label: 'Test Suite' },
    { id: 'run', label: 'Run' },
  ];

  return (
    <div className="h-full flex flex-col bg-surface-base">
      <Toolbar />
      <PanelGroup direction="vertical" className="flex-1">
        <Panel defaultSize={70} minSize={30}>
          <PanelGroup direction="horizontal">
            <Panel defaultSize={20} minSize={15} maxSize={40}>
              <FileExplorer />
            </Panel>
            <PanelResizeHandle className="group relative w-px bg-border-subtle transition-colors hover:bg-accent">
              <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
            </PanelResizeHandle>
            <Panel>
              <SkillEditor />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="group relative h-px bg-border-subtle transition-colors hover:bg-accent">
          <div className="absolute inset-x-0 -top-1 -bottom-1 z-10" />
        </PanelResizeHandle>
        <Panel defaultSize={30} minSize={10}>
          <div className="h-full flex flex-col">
            <div className="flex bg-surface-raised shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBottomTab(tab.id)}
                  className={`px-4 py-2 text-xs font-medium transition-colors relative ${
                    bottomTab === tab.id
                      ? 'text-slate-100 bg-surface-base/50'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                  {bottomTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              {bottomTab === 'output' && <OutputPanel />}
              {bottomTab === 'tests' && <TestRunner />}
              {bottomTab === 'test-suite' && <TestSuiteManager />}
              {bottomTab === 'run' && <SkillRunner />}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
