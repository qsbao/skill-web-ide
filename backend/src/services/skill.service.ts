import fs from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuid } from 'uuid';
import { config } from '../config.js';
import type { SkillMeta } from '@skill-ide/shared';
import { initSkillDir } from './file.service.js';

const MANIFEST = 'skill.json';

function metaPath(skillId: string): string {
  return path.join(config.skillsDir, skillId, MANIFEST);
}

export async function listSkills(): Promise<SkillMeta[]> {
  await fs.mkdir(config.skillsDir, { recursive: true });
  const entries = await fs.readdir(config.skillsDir, { withFileTypes: true });
  const skills: SkillMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = await fs.readFile(path.join(config.skillsDir, entry.name, MANIFEST), 'utf-8');
      skills.push(JSON.parse(raw));
    } catch {
      // skip dirs without manifest
    }
  }

  return skills.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSkill(id: string): Promise<SkillMeta | null> {
  try {
    const raw = await fs.readFile(metaPath(id), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function createSkill(data: Pick<SkillMeta, 'name' | 'description' | 'author' | 'tags'>): Promise<SkillMeta> {
  const id = uuid();
  const now = new Date().toISOString();
  const meta: SkillMeta = {
    id,
    name: data.name,
    description: data.description || '',
    version: '0.1.0',
    author: data.author || '',
    tags: data.tags || [],
    entrypoint: 'index.ts',
    createdAt: now,
    updatedAt: now,
  };

  await initSkillDir(id);
  await fs.writeFile(metaPath(id), JSON.stringify(meta, null, 2), 'utf-8');

  // Create default entrypoint
  const entryContent = `// ${meta.name}\n// ${meta.description}\n\nexport default async function main(input: unknown) {\n  return { success: true };\n}\n`;
  await fs.writeFile(path.join(config.skillsDir, id, meta.entrypoint), entryContent, 'utf-8');

  return meta;
}

export async function updateSkill(id: string, data: Partial<SkillMeta>): Promise<SkillMeta | null> {
  const existing = await getSkill(id);
  if (!existing) return null;

  const updated: SkillMeta = {
    ...existing,
    ...data,
    id: existing.id, // prevent id override
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(metaPath(id), JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export async function deleteSkill(id: string): Promise<boolean> {
  try {
    await fs.rm(path.join(config.skillsDir, id), { recursive: true });
    return true;
  } catch {
    return false;
  }
}
