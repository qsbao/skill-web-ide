import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../../config.js';
import type { PromptLabProject } from '@skill-ide/shared';

function projectDir(projectId: string): string {
  return path.join(config.promptLabDir, projectId);
}

function projectJsonPath(projectId: string): string {
  return path.join(projectDir(projectId), 'project.json');
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function listProjects(): Promise<PromptLabProject[]> {
  await fs.mkdir(config.promptLabDir, { recursive: true });
  const entries = await fs.readdir(config.promptLabDir, { withFileTypes: true });
  const projects: PromptLabProject[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = await fs.readFile(path.join(config.promptLabDir, entry.name, 'project.json'), 'utf-8');
      projects.push(JSON.parse(raw));
    } catch {
      // skip invalid directories
    }
  }

  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(projectId: string): Promise<PromptLabProject | undefined> {
  try {
    const raw = await fs.readFile(projectJsonPath(projectId), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function createProject(data: { name: string; description?: string }): Promise<PromptLabProject> {
  const id = slugify(data.name) || crypto.randomUUID().slice(0, 8);
  const dir = projectDir(id);
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(path.join(dir, 'prompts'), { recursive: true });

  const now = new Date().toISOString();
  const project: PromptLabProject = {
    id,
    name: data.name,
    description: data.description ?? '',
    createdAt: now,
    updatedAt: now,
  };

  await fs.writeFile(projectJsonPath(id), JSON.stringify(project, null, 2), 'utf-8');
  return project;
}

export async function updateProject(projectId: string, data: Partial<Pick<PromptLabProject, 'name' | 'description'>>): Promise<PromptLabProject | undefined> {
  const project = await getProject(projectId);
  if (!project) return undefined;

  Object.assign(project, data, { updatedAt: new Date().toISOString() });
  await fs.writeFile(projectJsonPath(projectId), JSON.stringify(project, null, 2), 'utf-8');
  return project;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  try {
    await fs.rm(projectDir(projectId), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}
