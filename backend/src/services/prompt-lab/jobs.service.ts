import type { PromptLabJob } from '@skill-ide/shared';

const jobs = new Map<string, PromptLabJob>();

export function createJob(id: string, type: 'prompt-run' | 'prompt-optimize'): PromptLabJob {
  const job: PromptLabJob = { id, type, status: 'pending', createdAt: new Date().toISOString() };
  jobs.set(id, job);
  return job;
}

export function updateJob(id: string, update: Partial<PromptLabJob>): void {
  const job = jobs.get(id);
  if (job) Object.assign(job, update);
}

export function getJob(id: string): PromptLabJob | undefined {
  return jobs.get(id);
}

export function listJobs(type?: 'prompt-run' | 'prompt-optimize'): PromptLabJob[] {
  const all = Array.from(jobs.values());
  return type ? all.filter(j => j.type === type) : all;
}
