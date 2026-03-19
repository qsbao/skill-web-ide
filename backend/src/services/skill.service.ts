import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import type { SkillMeta, SkillListQuery } from '@skill-ide/shared';
import { initSkillDir } from './file.service.js';
import { commitChanges, initRepo } from './git.service.js';

const MANIFEST = 'skill.json';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function metaPath(slug: string): string {
  return path.join(config.skillsDir, slug, MANIFEST);
}

export async function listSkills(): Promise<SkillMeta[]> {
  await fs.mkdir(config.skillsDir, { recursive: true });
  const entries = await fs.readdir(config.skillsDir, { withFileTypes: true });
  const skills: SkillMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('@')) continue;
    const authorDir = path.join(config.skillsDir, entry.name);
    let skillDirs;
    try {
      skillDirs = await fs.readdir(authorDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const skillDir of skillDirs) {
      if (!skillDir.isDirectory()) continue;
      try {
        const raw = await fs.readFile(
          path.join(authorDir, skillDir.name, MANIFEST),
          'utf-8',
        );
        skills.push(JSON.parse(raw));
      } catch {
        // skip dirs without manifest
      }
    }
  }

  return skills.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function searchSkills(query: SkillListQuery): Promise<SkillMeta[]> {
  let skills = await listSkills();

  if (query.search) {
    const term = query.search.toLowerCase();
    skills = skills.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term) ||
        s.tags.some((t) => t.toLowerCase().includes(term)) ||
        s.author.toLowerCase().includes(term),
    );
  }

  if (query.author) {
    skills = skills.filter((s) => s.author === query.author);
  }

  if (query.tags?.length) {
    skills = skills.filter((s) => query.tags!.some((t) => s.tags.includes(t)));
  }

  return skills;
}

export async function getSkill(slug: string): Promise<SkillMeta | null> {
  try {
    const raw = await fs.readFile(metaPath(slug), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function createSkill(
  data: Pick<SkillMeta, 'name'> & Partial<Pick<SkillMeta, 'description' | 'author' | 'tags'>>,
): Promise<SkillMeta> {
  const author = data.author || config.defaultAuthor;
  const slug = `@${author}/${slugify(data.name)}`;
  const now = new Date().toISOString();
  const meta: SkillMeta = {
    id: slug,
    name: data.name,
    description: data.description || '',
    version: '0.1.0',
    author,
    tags: data.tags || [],
    entrypoint: 'index.ts',
    createdAt: now,
    updatedAt: now,
  };

  await initSkillDir(slug);
  await fs.writeFile(metaPath(slug), JSON.stringify(meta, null, 2), 'utf-8');

  // Create default entrypoint
  const entryContent = `// ${meta.name}\n// ${meta.description}\n\nexport default async function main(input: unknown) {\n  return { success: true };\n}\n`;
  await fs.writeFile(
    path.join(config.skillsDir, slug, meta.entrypoint),
    entryContent,
    'utf-8',
  );

  await commitChanges(`create skill: ${slug}`);
  return meta;
}

export async function updateSkill(
  slug: string,
  data: Partial<SkillMeta>,
): Promise<SkillMeta | null> {
  const existing = await getSkill(slug);
  if (!existing) return null;

  const updated: SkillMeta = {
    ...existing,
    ...data,
    id: existing.id, // prevent id override
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(metaPath(slug), JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export async function deleteSkill(slug: string): Promise<boolean> {
  try {
    await fs.rm(path.join(config.skillsDir, slug), { recursive: true });
    await commitChanges(`delete skill: ${slug}`);
    return true;
  } catch {
    return false;
  }
}

export async function copySkill(
  sourceSlug: string,
  targetAuthor?: string,
): Promise<SkillMeta | null> {
  const source = await getSkill(sourceSlug);
  if (!source) return null;

  const author = targetAuthor || source.author || config.defaultAuthor;
  const baseName = source.name + '-copy';
  let targetName = baseName;
  let suffix = 1;

  // Find unique name
  while (true) {
    const candidateSlug = `@${author}/${slugify(targetName)}`;
    const existing = await getSkill(candidateSlug);
    if (!existing) break;
    suffix++;
    targetName = `${baseName}-${suffix}`;
  }

  const targetSlug = `@${author}/${slugify(targetName)}`;
  const sourceDir = path.join(config.skillsDir, sourceSlug);
  const targetDir = path.join(config.skillsDir, targetSlug);

  // Ensure parent @author dir exists
  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.cp(sourceDir, targetDir, { recursive: true });

  // Update skill.json
  const now = new Date().toISOString();
  const meta: SkillMeta = {
    ...source,
    id: targetSlug,
    name: targetName,
    author,
    createdAt: now,
    updatedAt: now,
  };

  await fs.writeFile(
    path.join(targetDir, MANIFEST),
    JSON.stringify(meta, null, 2),
    'utf-8',
  );

  await commitChanges(`copy skill: ${sourceSlug} → ${targetSlug}`);
  return meta;
}

export { initRepo };
