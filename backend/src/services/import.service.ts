import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import matter from 'gray-matter';
import { config } from '../config.js';
import type { SkillMeta } from '@skill-ide/shared';
import { commitChanges } from './git.service.js';

const exec = promisify(execFile);

export async function importSkillFromZip(
  buffer: Buffer,
  filename: string,
): Promise<SkillMeta> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-import-'));

  try {
    const zipPath = path.join(tmpDir, filename);
    await fs.writeFile(zipPath, buffer);

    const extractDir = path.join(tmpDir, 'extracted');
    await fs.mkdir(extractDir, { recursive: true });

    if (filename.endsWith('.zip')) {
      await exec('unzip', ['-o', zipPath, '-d', extractDir]);
    } else if (filename.endsWith('.tar.gz') || filename.endsWith('.tgz')) {
      await exec('tar', ['-xzf', zipPath, '-C', extractDir]);
    } else {
      throw new Error('Unsupported file format. Use .zip or .tar.gz');
    }

    // Find the skill root: look for skill.json or SKILL.md
    const root = await findSkillRoot(extractDir);

    // Read or generate skill.json
    let meta: SkillMeta;
    const manifestPath = path.join(root, 'skill.json');
    try {
      const raw = await fs.readFile(manifestPath, 'utf-8');
      meta = JSON.parse(raw);
    } catch {
      // Try to extract metadata from SKILL.md frontmatter
      const fm = await readSkillMdFrontmatter(root);
      const name = fm.name || path.basename(root);
      const author = fm.author || config.defaultAuthor;
      const slugName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const now = new Date().toISOString();
      meta = {
        id: `@${author}/${slugName}`,
        name,
        description: fm.description || '',
        version: fm.version || '0.1.0',
        author,
        tags: fm.tags || [],
        entrypoint: fm.entrypoint || 'index.ts',
        createdAt: now,
        updatedAt: now,
      };
    }

    // Ensure id format
    if (!meta.id.startsWith('@')) {
      meta.id = `@${meta.author || config.defaultAuthor}/${meta.name}`;
    }
    meta.updatedAt = new Date().toISOString();

    const targetDir = path.join(config.skillsDir, meta.id);
    await fs.mkdir(path.dirname(targetDir), { recursive: true });

    // Copy skill files
    await fs.cp(root, targetDir, { recursive: true });

    // Write updated manifest
    await fs.writeFile(
      path.join(targetDir, 'skill.json'),
      JSON.stringify(meta, null, 2),
      'utf-8',
    );

    await commitChanges(`import skill: ${meta.id}`);
    return meta;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function readSkillMdFrontmatter(dir: string): Promise<Record<string, any>> {
  try {
    const raw = await fs.readFile(path.join(dir, 'SKILL.md'), 'utf-8');
    const { data } = matter(raw);
    return data;
  } catch {
    return {};
  }
}

async function findSkillRoot(dir: string): Promise<string> {
  // Check if skill.json or SKILL.md exists at this level
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && (entry.name === 'skill.json' || entry.name === 'SKILL.md')) {
      return dir;
    }
  }

  // If only one subdirectory, descend into it (common with zip archives)
  const dirs = entries.filter((e) => e.isDirectory());
  if (dirs.length === 1) {
    return findSkillRoot(path.join(dir, dirs[0].name));
  }

  // Default to current dir
  return dir;
}
