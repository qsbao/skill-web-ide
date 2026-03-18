const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Skills
  listSkills: () => request<any[]>('/skills'),
  createSkill: (data: { name: string; description?: string; author?: string; tags?: string[] }) =>
    request<any>('/skills', { method: 'POST', body: JSON.stringify(data) }),
  getSkill: (id: string) => request<any>(`/skills/${id}`),
  updateSkill: (id: string, data: any) =>
    request<any>(`/skills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSkill: (id: string) => request<void>(`/skills/${id}`, { method: 'DELETE' }),

  // Files
  getFileTree: (skillId: string) => request<any[]>(`/skills/${skillId}/files`),
  readFile: (skillId: string, path: string) =>
    request<{ path: string; content: string }>(`/skills/${skillId}/files/${path}`),
  writeFile: (skillId: string, path: string, content: string) =>
    request<any>(`/skills/${skillId}/files/${path}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
  createFile: (skillId: string, path: string, isDir = false) =>
    request<any>(`/skills/${skillId}/files/${path}`, {
      method: 'POST',
      body: JSON.stringify({ isDir }),
    }),
  deleteFile: (skillId: string, path: string) =>
    request<void>(`/skills/${skillId}/files/${path}`, { method: 'DELETE' }),

  // Tests
  runTest: (skillId: string, type: string) =>
    request<any>(`/skills/${skillId}/tests/run`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),
  getTestRuns: (skillId: string) => request<any[]>(`/skills/${skillId}/tests/runs`),

  // Test Cases
  listTestCases: (skillId: string) => request<any[]>(`/skills/${skillId}/tests/cases`),
  createTestCase: (skillId: string, data: { name: string; type: string; input: string; expectedOutput?: string }) =>
    request<any>(`/skills/${skillId}/tests/cases`, { method: 'POST', body: JSON.stringify(data) }),
  updateTestCase: (skillId: string, caseId: string, data: any) =>
    request<any>(`/skills/${skillId}/tests/cases/${caseId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTestCase: (skillId: string, caseId: string) =>
    request<void>(`/skills/${skillId}/tests/cases/${caseId}`, { method: 'DELETE' }),
  importTestCases: (skillId: string, cases: any[]) =>
    request<any[]>(`/skills/${skillId}/tests/cases/import`, { method: 'POST', body: JSON.stringify({ cases }) }),
  exportTestCases: (skillId: string) => request<any[]>(`/skills/${skillId}/tests/cases/export`),
};
