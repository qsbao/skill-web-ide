import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../../config.js';
import type { PromptLabPrompt, PromptVersion } from '@skill-ide/shared';

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

function promptHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function parseVersion(v: string): { major: number; minor: number } {
  const [major, minor] = v.split('.').map(Number);
  return { major: major || 1, minor: minor || 0 };
}

function formatVersion(major: number, minor: number): string {
  return `${major}.${minor}`;
}

/** Migrate old prompts that lack version fields */
function ensureVersionFields(prompt: PromptLabPrompt): PromptLabPrompt {
  if (!prompt.version) {
    prompt.version = '1.0';
    prompt.versions = [{
      version: '1.0',
      prompt: prompt.prompt,
      hash: promptHash(prompt.prompt),
      timestamp: prompt.createdAt,
    }];
  }
  if (!prompt.versions) {
    prompt.versions = [{
      version: prompt.version,
      prompt: prompt.prompt,
      hash: promptHash(prompt.prompt),
      timestamp: prompt.updatedAt,
    }];
  }
  return prompt;
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
        prompts.push(ensureVersionFields(JSON.parse(raw)));
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
    return ensureVersionFields(JSON.parse(raw));
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
  const text = data.prompt ?? '';
  const prompt: PromptLabPrompt = {
    id,
    projectId,
    name: data.name,
    description: data.description ?? '',
    prompt: text,
    model: data.model,
    version: '1.0',
    versions: [{
      version: '1.0',
      prompt: text,
      hash: promptHash(text),
      timestamp: now,
    }],
    createdAt: now,
    updatedAt: now,
  };

  await fs.writeFile(promptJsonPath(projectId, id), JSON.stringify(prompt, null, 2), 'utf-8');
  return prompt;
}

export async function updatePrompt(
  projectId: string,
  promptId: string,
  data: Partial<Pick<PromptLabPrompt, 'name' | 'description' | 'prompt' | 'model'>> & { bumpMajor?: boolean; majorDescription?: string }
): Promise<PromptLabPrompt | undefined> {
  const prompt = await getPrompt(projectId, promptId);
  if (!prompt) return undefined;

  const promptChanged = data.prompt !== undefined && data.prompt !== prompt.prompt;
  const bumpMajor = data.bumpMajor;

  // Apply field updates (exclude our custom fields)
  const { bumpMajor: _, majorDescription, ...fields } = data;
  Object.assign(prompt, fields, { updatedAt: new Date().toISOString() });

  // Version bump if prompt text changed
  if (promptChanged) {
    const { major, minor } = parseVersion(prompt.version);
    let newMajor = major;
    let newMinor = minor + 1;

    if (bumpMajor) {
      newMajor = major + 1;
      newMinor = 0;
    }

    const newVersion = formatVersion(newMajor, newMinor);
    prompt.version = newVersion;

    const entry: PromptVersion = {
      version: newVersion,
      prompt: prompt.prompt,
      hash: promptHash(prompt.prompt),
      timestamp: prompt.updatedAt,
    };
    if (bumpMajor && majorDescription) {
      entry.description = majorDescription;
    }

    prompt.versions.push(entry);
  }

  await fs.writeFile(promptJsonPath(projectId, promptId), JSON.stringify(prompt, null, 2), 'utf-8');
  return prompt;
}

export async function restoreVersion(projectId: string, promptId: string, targetVersion: string): Promise<PromptLabPrompt | undefined> {
  const prompt = await getPrompt(projectId, promptId);
  if (!prompt) return undefined;

  const versionEntry = prompt.versions.find(v => v.version === targetVersion);
  if (!versionEntry) return undefined;

  // Restoring creates a new minor version with the old prompt text
  return updatePrompt(projectId, promptId, { prompt: versionEntry.prompt });
}

export async function deletePrompt(projectId: string, promptId: string): Promise<boolean> {
  try {
    await fs.rm(promptDir(projectId, promptId), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}
