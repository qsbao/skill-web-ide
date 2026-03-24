import { useState, useRef } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, type ImperativePanelHandle } from 'react-resizable-panels';
import { Terminal, TestTube2, ListChecks, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { Toolbar } from '../components/Toolbar';
import { FileExplorer } from '../components/sidebar/FileExplorer';
import { SkillEditor } from '../components/editor/SkillEditor';
import { OutputPanel } from '../components/panel/OutputPanel';
import { TestRunner } from '../components/panel/TestRunner';
import { TestSuiteManager } from '../components/panel/TestSuiteManager';
import { SkillRunner } from '../components/panel/SkillRunner';
import { useWebSocket } from '../hooks/useWebSocket';

type BottomTab = 'output' | 'tests' | 'test-suite' | 'run';

const tabs: { id: BottomTab; label: string; icon: typeof Terminal }[] = [
  { id: 'output', label: 'Output', icon: Terminal },
  { id: 'tests', label: 'Test Runner', icon: TestTube2 },
  { id: 'test-suite', label: 'Test Suite', icon: ListChecks },
  { id: 'run', label: 'Run', icon: Play },
];

export function IDELayout() {
  useWebSocket();
  const [bottomTab, setBottomTab] = useState<BottomTab>('output');
  const [collapsed, setCollapsed] = useState(false);
  const bottomPanelRef = useRef<ImperativePanelHandle>(null);

  const toggleCollapse = () => {
    const panel = bottomPanelRef.current;
    if (!panel) return;
    if (collapsed) {
      panel.expand();
    } else {
      panel.collapse();
    }
    setCollapsed(!collapsed);
  };

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
        <Panel
          ref={bottomPanelRef}
          defaultSize={30}
          minSize={10}
          collapsible
          collapsedSize={0}
          onCollapse={() => setCollapsed(true)}
          onExpand={() => setCollapsed(false)}
        >
          <div className="h-full flex flex-col">
            <div className="flex bg-surface-raised shrink-0 items-center">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setBottomTab(tab.id);
                      if (collapsed) toggleCollapse();
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors relative ${
                      bottomTab === tab.id
                        ? 'text-theme-primary bg-surface-base/50'
                        : 'text-theme-muted hover:text-theme-primary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {bottomTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-accent shadow-glow-sm" />
                    )}
                  </button>
                );
              })}
              <div className="flex-1" />
              <button
                onClick={toggleCollapse}
                className="btn-ghost btn-xs mr-1"
                title={collapsed ? 'Expand panel' : 'Collapse panel'}
              >
                {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
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
