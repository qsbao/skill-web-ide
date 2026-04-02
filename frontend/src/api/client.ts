const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (init?.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Build /skills/@author/name from a slug like @author/name */
function skillPath(slug: string): string {
  return `/skills/${slug}`;
}

export const api = {
  // Skills
  listSkills: () => request<any[]>('/skills'),
  searchSkills: (params: { search?: string; tags?: string; author?: string }) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.tags) qs.set('tags', params.tags);
    if (params.author) qs.set('author', params.author);
    const q = qs.toString();
    return request<any[]>(`/skills${q ? `?${q}` : ''}`);
  },
  createSkill: (data: { name: string; description?: string; author?: string; tags?: string[] }) =>
    request<any>('/skills', { method: 'POST', body: JSON.stringify(data) }),
  getSkill: (id: string) => request<any>(skillPath(id)),
  updateSkill: (id: string, data: any) =>
    request<any>(skillPath(id), { method: 'PUT', body: JSON.stringify(data) }),
  deleteSkill: (id: string) => request<void>(skillPath(id), { method: 'DELETE' }),
  copySkill: (id: string, targetAuthor?: string) =>
    request<any>(`${skillPath(id)}/copy`, {
      method: 'POST',
      body: JSON.stringify({ targetAuthor }),
    }),

  // Skill Readme
  getSkillReadme: (id: string) =>
    request<{ frontmatter: Record<string, any>; body: string }>(`${skillPath(id)}/readme`),

  // Upload
  uploadSkill: async (file: File): Promise<any> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/skills/upload`, { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  // Files
  getFileTree: (skillId: string) => request<any[]>(`${skillPath(skillId)}/files`),
  readFile: (skillId: string, path: string) =>
    request<{ path: string; content: string }>(`${skillPath(skillId)}/files/${path}`),
  writeFile: (skillId: string, path: string, content: string) =>
    request<any>(`${skillPath(skillId)}/files/${path}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
  createFile: (skillId: string, path: string, isDir = false) =>
    request<any>(`${skillPath(skillId)}/files/${path}`, {
      method: 'POST',
      body: JSON.stringify({ isDir }),
    }),
  deleteFile: (skillId: string, path: string) =>
    request<void>(`${skillPath(skillId)}/files/${path}`, { method: 'DELETE' }),

  // Tests
  runTest: (skillId: string, type: string) =>
    request<any>(`${skillPath(skillId)}/tests/run`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),
  getTestRuns: (skillId: string) => request<any[]>(`${skillPath(skillId)}/tests/runs`),

  // Test Cases
  listTestCases: (skillId: string) => request<any[]>(`${skillPath(skillId)}/tests/cases`),
  createTestCase: (skillId: string, data: { name: string; type: string; input: string; expectedOutput?: string }) =>
    request<any>(`${skillPath(skillId)}/tests/cases`, { method: 'POST', body: JSON.stringify(data) }),
  updateTestCase: (skillId: string, caseId: string, data: any) =>
    request<any>(`${skillPath(skillId)}/tests/cases/${caseId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTestCase: (skillId: string, caseId: string) =>
    request<void>(`${skillPath(skillId)}/tests/cases/${caseId}`, { method: 'DELETE' }),
  importTestCases: (skillId: string, cases: any[]) =>
    request<any[]>(`${skillPath(skillId)}/tests/cases/import`, { method: 'POST', body: JSON.stringify({ cases }) }),
  exportTestCases: (skillId: string) => request<any[]>(`${skillPath(skillId)}/tests/cases/export`),

  // Runs
  getSkillRuns: (skillId: string) => request<any[]>(`${skillPath(skillId)}/runs`),
  getRunFiles: (skillId: string, runId: string) =>
    request<any[]>(`${skillPath(skillId)}/runs/${runId}/files`),
  readRunFile: (skillId: string, runId: string, path: string) =>
    request<{ path: string; content: string }>(`${skillPath(skillId)}/runs/${runId}/files/${path}`),
  getRunDownloadUrl: (skillId: string, runId: string, path: string) =>
    `${BASE}${skillPath(skillId)}/runs/${runId}/download/${encodeURIComponent(path)}`,
  cancelRun: (skillId: string, runId: string) =>
    request<{ ok: boolean }>(`${skillPath(skillId)}/runs/${runId}/cancel`, { method: 'POST' }),

  // Sessions
  listSessions: (params?: { skillId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.skillId) qs.set('skillId', params.skillId);
    const q = qs.toString();
    return request<any[]>(`/sessions${q ? `?${q}` : ''}`);
  },
  getSession: (sessionId: string) => request<any>(`/sessions/${sessionId}`),
  deleteSession: (sessionId: string) => request<void>(`/sessions/${sessionId}`, { method: 'DELETE' }),

  // ── Prompt Lab ──
  promptLab: {
    // Models
    listModels: () => request<{ models: string[]; default: string }>('/prompt-lab/models'),

    // Projects
    listProjects: () => request<any[]>('/prompt-lab/projects'),
    createProject: (data: { name: string; description?: string }) =>
      request<any>('/prompt-lab/projects', { method: 'POST', body: JSON.stringify(data) }),
    getProject: (projectId: string) => request<any>(`/prompt-lab/projects/${projectId}`),
    updateProject: (projectId: string, data: { name?: string; description?: string }) =>
      request<any>(`/prompt-lab/projects/${projectId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProject: (projectId: string) =>
      request<void>(`/prompt-lab/projects/${projectId}`, { method: 'DELETE' }),

    // Prompts
    listPrompts: (projectId: string) =>
      request<any[]>(`/prompt-lab/projects/${projectId}/prompts`),
    createPrompt: (projectId: string, data: { name: string; description?: string; prompt?: string; model?: string }) =>
      request<any>(`/prompt-lab/projects/${projectId}/prompts`, { method: 'POST', body: JSON.stringify(data) }),
    getPrompt: (projectId: string, promptId: string) =>
      request<any>(`/prompt-lab/projects/${projectId}/prompts/${promptId}`),
    updatePrompt: (projectId: string, promptId: string, data: { name?: string; description?: string; prompt?: string; model?: string }) =>
      request<any>(`/prompt-lab/projects/${projectId}/prompts/${promptId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePrompt: (projectId: string, promptId: string) =>
      request<void>(`/prompt-lab/projects/${projectId}/prompts/${promptId}`, { method: 'DELETE' }),

    // Test Suite
    getSuite: (projectId: string, promptId: string) =>
      request<any>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/suite`),
    saveSuite: (projectId: string, promptId: string, data: { description?: string; cases?: any[] }) =>
      request<any>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/suite`, { method: 'PUT', body: JSON.stringify(data) }),
    addCase: (projectId: string, promptId: string, data: { description: string; input: string; expected: { pass: boolean; outputMustContain?: string[] } }) =>
      request<any>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/suite/cases`, { method: 'POST', body: JSON.stringify(data) }),
    updateCase: (projectId: string, promptId: string, caseId: string, data: any) =>
      request<any>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/suite/cases/${caseId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCase: (projectId: string, promptId: string, caseId: string) =>
      request<void>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/suite/cases/${caseId}`, { method: 'DELETE' }),

    // Runs
    startRun: (projectId: string, promptId: string, options?: { concurrency?: number; repeatCount?: number }) =>
      request<{ jobId: string }>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/runs`, { method: 'POST', body: JSON.stringify(options ?? {}) }),
    listRuns: (projectId: string, promptId: string) =>
      request<{ activeJobs: any[]; recentRuns: any[] }>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/runs`),
    getRun: (projectId: string, promptId: string, runId: string) =>
      request<any>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/runs/${runId}`),

    // Comparison
    compareRuns: (projectId: string, promptId: string, ids: string[]) =>
      request<any>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/compare?ids=${ids.join(',')}`),

    // Optimization
    startOptimize: (projectId: string, promptId: string, options?: { targetAccuracy?: number; maxIterations?: number; guidance?: string }) =>
      request<{ jobId: string }>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/optimize`, { method: 'POST', body: JSON.stringify(options ?? {}) }),
    getOptimizeStatus: (projectId: string, promptId: string, jobId: string) =>
      request<any>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/optimize/${jobId}`),
    stopOptimize: (projectId: string, promptId: string, jobId: string) =>
      request<any>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/optimize/${jobId}/stop`, { method: 'POST' }),
    guideOptimize: (projectId: string, promptId: string, jobId: string, guidance: string) =>
      request<any>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/optimize/${jobId}/guide`, { method: 'POST', body: JSON.stringify({ guidance }) }),
    applyOptimize: (projectId: string, promptId: string, jobId: string) =>
      request<any>(`/prompt-lab/projects/${projectId}/prompts/${promptId}/optimize/${jobId}/apply`, { method: 'POST' }),
  },
};
