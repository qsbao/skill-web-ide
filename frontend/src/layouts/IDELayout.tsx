import { useState } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { Toolbar } from '../components/Toolbar';
import { FileExplorer } from '../components/sidebar/FileExplorer';
import { SkillEditor } from '../components/editor/SkillEditor';
import { OutputPanel } from '../components/panel/OutputPanel';
import { TestRunner } from '../components/panel/TestRunner';
import { TestSuiteManager } from '../components/panel/TestSuiteManager';
import { useWebSocket } from '../hooks/useWebSocket';

type BottomTab = 'output' | 'tests' | 'test-suite';

export function IDELayout() {
  useWebSocket();
  const [bottomTab, setBottomTab] = useState<BottomTab>('output');

  const tabs: { id: BottomTab; label: string }[] = [
    { id: 'output', label: 'Output' },
    { id: 'tests', label: 'Test Runner' },
    { id: 'test-suite', label: 'Test Suite' },
  ];

  return (
    <div className="h-full flex flex-col">
      <Toolbar />
      <PanelGroup direction="vertical" className="flex-1">
        <Panel defaultSize={70} minSize={30}>
          <PanelGroup direction="horizontal">
            <Panel defaultSize={20} minSize={15} maxSize={40}>
              <FileExplorer />
            </Panel>
            <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
            <Panel>
              <SkillEditor />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="h-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
        <Panel defaultSize={30} minSize={10}>
          <div className="h-full flex flex-col">
            <div className="flex bg-gray-800 border-b border-gray-700 shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBottomTab(tab.id)}
                  className={`px-3 py-1.5 text-xs border-r border-gray-700 transition-colors ${
                    bottomTab === tab.id
                      ? 'bg-gray-900 text-white border-b-2 border-b-blue-500'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              {bottomTab === 'output' && <OutputPanel />}
              {bottomTab === 'tests' && <TestRunner />}
              {bottomTab === 'test-suite' && <TestSuiteManager />}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
