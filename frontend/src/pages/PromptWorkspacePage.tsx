import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { PromptEditor } from '../components/prompt-lab/PromptEditor';
import { TestSuiteEditor } from '../components/prompt-lab/TestSuiteEditor';
import { RunDashboard } from '../components/prompt-lab/RunDashboard';
import { OptimizerPanel } from '../components/prompt-lab/OptimizerPanel';
import { usePromptLabStore } from '../stores/promptLabStore';

export function PromptWorkspacePage() {
  const { projectId, promptId } = useParams<{ projectId: string; promptId: string }>();
  const navigate = useNavigate();
  const { activeProject, activePrompt, loadProjects, loadPrompts, loadSuite, loadRuns } = usePromptLabStore();

  useEffect(() => {
    if (!projectId || !promptId) return;

    // Load metadata first, then data — avoid setActiveProject/setActivePrompt
    // which reset suite/runs state. Instead, set them inline without wiping.
    loadProjects().then(() => {
      const { projects: ps } = usePromptLabStore.getState();
      const project = ps.find(p => p.id === projectId);
      if (project && usePromptLabStore.getState().activeProject?.id !== projectId) {
        usePromptLabStore.setState({ activeProject: project });
      }
      loadPrompts(projectId).then(() => {
        const { prompts: prs } = usePromptLabStore.getState();
        const prompt = prs.find(p => p.id === promptId);
        if (prompt) usePromptLabStore.setState({ activePrompt: prompt });
      });
    });
    loadSuite(projectId, promptId);
    loadRuns(projectId, promptId);
  }, [projectId, promptId]);

  if (!projectId || !promptId) return null;

  return (
    <div className="h-full flex flex-col bg-surface-base">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle text-xs">
        <button onClick={() => navigate('/prompt-lab')} className="text-theme-muted hover:text-theme-primary transition-colors">
          Prompt Lab
        </button>
        <span className="text-theme-muted">/</span>
        <button onClick={() => navigate(`/prompt-lab/${projectId}`)} className="text-theme-muted hover:text-theme-primary transition-colors">
          {activeProject?.name ?? projectId}
        </button>
        <span className="text-theme-muted">/</span>
        <span className="text-theme-primary font-medium">{activePrompt?.name ?? promptId}</span>
      </div>

      {/* Main workspace */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Left: Prompt Editor */}
          <Panel defaultSize={30} minSize={20}>
            <PromptEditor projectId={projectId} promptId={promptId} />
          </Panel>

          <PanelResizeHandle className="w-px bg-border-subtle hover:bg-theme-accent/50 transition-colors" />

          {/* Center: Test Suite + Run Results */}
          <Panel defaultSize={40} minSize={25}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={40} minSize={20}>
                <TestSuiteEditor projectId={projectId} promptId={promptId} />
              </Panel>
              <PanelResizeHandle className="h-px bg-border-subtle hover:bg-theme-accent/50 transition-colors" />
              <Panel defaultSize={60} minSize={20}>
                <RunDashboard projectId={projectId} promptId={promptId} />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-px bg-border-subtle hover:bg-theme-accent/50 transition-colors" />

          {/* Right: Optimizer + History */}
          <Panel defaultSize={30} minSize={20}>
            <OptimizerPanel projectId={projectId} promptId={promptId} />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
