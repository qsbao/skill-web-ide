export type RunStatus = 'running' | 'completed' | 'failed' | 'error';

export interface SkillRun {
  id: string;
  skillId: string;
  prompt: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
}
