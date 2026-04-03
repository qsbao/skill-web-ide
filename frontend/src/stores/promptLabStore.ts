import { create } from 'zustand';
import { api } from '../api/client';
import type {
  PromptLabProject,
  PromptLabPrompt,
  PromptTestSuite,
  PromptTestRun,
  PromptLabJob,
  PromptOptimizationJob,
  PromptRunComparison,
} from '@skill-ide/shared';

interface PromptLabState {
  // Projects
  projects: PromptLabProject[];
  activeProject: PromptLabProject | null;
  loadProjects: () => Promise<void>;
  setActiveProject: (project: PromptLabProject | null) => void;
  createProject: (data: { name: string; description?: string }) => Promise<PromptLabProject>;
  deleteProject: (projectId: string) => Promise<void>;

  // Prompts
  prompts: PromptLabPrompt[];
  activePrompt: PromptLabPrompt | null;
  loadPrompts: (projectId: string) => Promise<void>;
  setActivePrompt: (prompt: PromptLabPrompt | null) => void;
  createPrompt: (projectId: string, data: { name: string; description?: string; prompt?: string }) => Promise<PromptLabPrompt>;
  updatePrompt: (projectId: string, promptId: string, data: Partial<PromptLabPrompt>) => Promise<void>;
  deletePrompt: (projectId: string, promptId: string) => Promise<void>;

  // Test Suite
  suite: PromptTestSuite | null;
  loadSuite: (projectId: string, promptId: string) => Promise<void>;
  addCase: (projectId: string, promptId: string, data: { description: string; input: string; expected: { pass: boolean; outputMustContain?: string[] } }) => Promise<void>;
  updateCase: (projectId: string, promptId: string, caseId: string, data: any) => Promise<void>;
  deleteCase: (projectId: string, promptId: string, caseId: string) => Promise<void>;

  // Runs
  runs: PromptTestRun[];
  activeJob: PromptLabJob | null;
  liveResults: import('@skill-ide/shared').PromptTestCaseResult[];
  runningViaWs: boolean;
  loadRuns: (projectId: string, promptId: string) => Promise<void>;
  startRun: (projectId: string, promptId: string) => Promise<string>;
  pollJob: (jobId: string, projectId: string, promptId: string) => Promise<void>;
  wsRunStart: () => void;
  wsRunProgress: (progress: { completed: number; total: number; currentCase: string; latestResult?: import('@skill-ide/shared').PromptTestCaseResult }) => void;
  wsRunComplete: (run: PromptTestRun, projectId: string, promptId: string) => void;
  wsRunError: () => void;

  // Optimization
  optimizationJob: PromptOptimizationJob | null;
  startOptimize: (projectId: string, promptId: string, options?: { targetAccuracy?: number; maxIterations?: number; guidance?: string }) => Promise<string>;
  pollOptimize: (projectId: string, promptId: string, jobId: string) => Promise<void>;
  stopOptimize: (projectId: string, promptId: string, jobId: string) => Promise<void>;
  guideOptimize: (projectId: string, promptId: string, jobId: string, guidance: string) => Promise<void>;
  applyOptimize: (projectId: string, promptId: string, jobId: string) => Promise<void>;

  // Comparison
  comparison: PromptRunComparison | null;
  selectedRunIds: string[];
  toggleRunSelection: (runId: string) => void;
  compareSelectedRuns: (projectId: string, promptId: string) => Promise<void>;
  clearComparison: () => void;
}

export const usePromptLabStore = create<PromptLabState>((set, get) => ({
  // Projects
  projects: [],
  activeProject: null,
  loadProjects: async () => {
    const projects = await api.promptLab.listProjects();
    set({ projects });
  },
  setActiveProject: (project) => set({ activeProject: project, prompts: [], activePrompt: null, suite: null, runs: [] }),
  createProject: async (data) => {
    const project = await api.promptLab.createProject(data);
    await get().loadProjects();
    return project;
  },
  deleteProject: async (projectId) => {
    await api.promptLab.deleteProject(projectId);
    const { activeProject } = get();
    if (activeProject?.id === projectId) set({ activeProject: null });
    await get().loadProjects();
  },

  // Prompts
  prompts: [],
  activePrompt: null,
  loadPrompts: async (projectId) => {
    const prompts = await api.promptLab.listPrompts(projectId);
    set({ prompts });
  },
  setActivePrompt: (prompt) => set({ activePrompt: prompt, suite: null, runs: [], comparison: null, selectedRunIds: [] }),
  createPrompt: async (projectId, data) => {
    const prompt = await api.promptLab.createPrompt(projectId, data);
    await get().loadPrompts(projectId);
    return prompt;
  },
  updatePrompt: async (projectId, promptId, data) => {
    const updated = await api.promptLab.updatePrompt(projectId, promptId, data);
    set({ activePrompt: updated });
    await get().loadPrompts(projectId);
  },
  deletePrompt: async (projectId, promptId) => {
    await api.promptLab.deletePrompt(projectId, promptId);
    const { activePrompt } = get();
    if (activePrompt?.id === promptId) set({ activePrompt: null });
    await get().loadPrompts(projectId);
  },

  // Test Suite
  suite: null,
  loadSuite: async (projectId, promptId) => {
    const suite = await api.promptLab.getSuite(projectId, promptId);
    set({ suite });
  },
  addCase: async (projectId, promptId, data) => {
    await api.promptLab.addCase(projectId, promptId, data);
    await get().loadSuite(projectId, promptId);
  },
  updateCase: async (projectId, promptId, caseId, data) => {
    await api.promptLab.updateCase(projectId, promptId, caseId, data);
    await get().loadSuite(projectId, promptId);
  },
  deleteCase: async (projectId, promptId, caseId) => {
    await api.promptLab.deleteCase(projectId, promptId, caseId);
    await get().loadSuite(projectId, promptId);
  },

  // Runs
  runs: [],
  activeJob: null,
  liveResults: [],
  runningViaWs: false,
  loadRuns: async (projectId, promptId) => {
    const { recentRuns } = await api.promptLab.listRuns(projectId, promptId);
    set({ runs: recentRuns });
  },
  startRun: async (projectId, promptId) => {
    const { jobId } = await api.promptLab.startRun(projectId, promptId);
    set({ activeJob: { id: jobId, type: 'prompt-run', status: 'running', createdAt: new Date().toISOString() } });
    return jobId;
  },
  pollJob: async (jobId, projectId, promptId) => {
    const job = await api.promptLab.getRun(projectId, promptId, jobId);
    if (job.status === 'completed' || job.status === 'failed') {
      set({ activeJob: null });
      await get().loadRuns(projectId, promptId);
    } else {
      set({ activeJob: job });
    }
  },
  wsRunStart: () => {
    const { suite } = get();
    const pending = (suite?.cases ?? []).map(c => ({
      caseId: c.id,
      input: c.input,
      expectedPass: c.expected.pass,
      actualPass: false,
      correct: false,
      issues: [],
      suggestions: [],
      latencyMs: 0,
      pending: true,
    }));
    set({ runningViaWs: true, liveResults: pending, activeJob: { id: '', type: 'prompt-run', status: 'running', createdAt: new Date().toISOString() } });
  },
  wsRunProgress: (progress) => {
    const { liveResults } = get();
    let next = liveResults;
    if (progress.latestResult) {
      // Replace the pending placeholder with the real result
      next = liveResults.map(r => r.caseId === progress.latestResult!.caseId ? progress.latestResult! : r);
    }
    set({
      liveResults: next,
      activeJob: { id: '', type: 'prompt-run', status: 'running', progress: { completed: progress.completed, total: progress.total, currentCase: progress.currentCase }, createdAt: new Date().toISOString() },
    });
  },
  wsRunComplete: (run, projectId, promptId) => {
    set({ runningViaWs: false, liveResults: [], activeJob: null });
    get().loadRuns(projectId, promptId);
  },
  wsRunError: () => {
    set({ runningViaWs: false, liveResults: [], activeJob: null });
  },

  // Optimization
  optimizationJob: null,
  startOptimize: async (projectId, promptId, options) => {
    const { jobId } = await api.promptLab.startOptimize(projectId, promptId, options);
    return jobId;
  },
  pollOptimize: async (projectId, promptId, jobId) => {
    const job = await api.promptLab.getOptimizeStatus(projectId, promptId, jobId);
    set({ optimizationJob: job });
  },
  stopOptimize: async (projectId, promptId, jobId) => {
    await api.promptLab.stopOptimize(projectId, promptId, jobId);
  },
  guideOptimize: async (projectId, promptId, jobId, guidance) => {
    await api.promptLab.guideOptimize(projectId, promptId, jobId, guidance);
  },
  applyOptimize: async (projectId, promptId, jobId) => {
    await api.promptLab.applyOptimize(projectId, promptId, jobId);
    const updated = await api.promptLab.getPrompt(projectId, promptId);
    set({ activePrompt: updated });
  },

  // Comparison
  comparison: null,
  selectedRunIds: [],
  toggleRunSelection: (runId) => {
    const { selectedRunIds } = get();
    const next = selectedRunIds.includes(runId)
      ? selectedRunIds.filter(id => id !== runId)
      : [...selectedRunIds, runId];
    set({ selectedRunIds: next });
  },
  compareSelectedRuns: async (projectId, promptId) => {
    const { selectedRunIds } = get();
    if (selectedRunIds.length < 2) return;
    const comparison = await api.promptLab.compareRuns(projectId, promptId, selectedRunIds);
    set({ comparison });
  },
  clearComparison: () => set({ comparison: null, selectedRunIds: [] }),
}));
