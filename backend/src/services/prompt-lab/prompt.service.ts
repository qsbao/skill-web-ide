import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../../config.js';
import type { PromptLabPrompt } from '@skill-ide/shared';

function promptsDir(projectId: string): string {
  return path.join(config.promptLabDir, projectId, 'prompts');
}

function promptDir(projectId: string, promptId: string): string {
  return path.join(promptsDir(projectId), promptId);
}

function promptJsonPath(projectId: string, promptId: string): string {
  return path.join(promptDir(projectId, promptId), 'prompt.json');
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function listPrompts(projectId: string): Promise<PromptLabPrompt[]> {
  const dir = promptsDir(projectId);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const prompts: PromptLabPrompt[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const raw = await fs.readFile(path.join(dir, entry.name, 'prompt.json'), 'utf-8');
        prompts.push(JSON.parse(raw));
      } catch {
        // skip
      }
    }

    return prompts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function getPrompt(projectId: string, promptId: string): Promise<PromptLabPrompt | undefined> {
  try {
    const raw = await fs.readFile(promptJsonPath(projectId, promptId), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function createPrompt(projectId: string, data: { name: string; description?: string; prompt?: string; model?: string }): Promise<PromptLabPrompt> {
  const id = slugify(data.name) || crypto.randomUUID().slice(0, 8);
  const dir = promptDir(projectId, id);
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(path.join(dir, 'results'), { recursive: true });

  const now = new Date().toISOString();
  const prompt: PromptLabPrompt = {
    id,
    projectId,
    name: data.name,
    description: data.description ?? '',
    prompt: data.prompt ?? '',
    model: data.model,
    createdAt: now,
    updatedAt: now,
  };

  await fs.writeFile(promptJsonPath(projectId, id), JSON.stringify(prompt, null, 2), 'utf-8');
  return prompt;
}

export async function updatePrompt(projectId: string, promptId: string, data: Partial<Pick<PromptLabPrompt, 'name' | 'description' | 'prompt' | 'model'>>): Promise<PromptLabPrompt | undefined> {
  const prompt = await getPrompt(projectId, promptId);
  if (!prompt) return undefined;

  Object.assign(prompt, data, { updatedAt: new Date().toISOString() });
  await fs.writeFile(promptJsonPath(projectId, promptId), JSON.stringify(prompt, null, 2), 'utf-8');
  return prompt;
}

export async function deletePrompt(projectId: string, promptId: string): Promise<boolean> {
  try {
    await fs.rm(promptDir(projectId, promptId), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}
