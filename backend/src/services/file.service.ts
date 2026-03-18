import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import type { SkillFile } from '@skill-ide/shared';

function getSkillDir(skillId: string): string {
  return path.join(config.skillsDir, skillId);
}

/** Resolve and validate that the resolved path is within the skill directory */
function safePath(skillId: string, filePath: string): string {
  const skillDir = getSkillDir(skillId);
  const resolved = path.resolve(skillDir, filePath);
  if (!resolved.startsWith(skillDir + path.sep) && resolved !== skillDir) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

export async function getFileTree(skillId: string, dirPath = '.'): Promise<SkillFile[]> {
  const absDir = safePath(skillId, dirPath);
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  const result: SkillFile[] = [];

  for (const entry of entries) {
    const relativePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const children = await getFileTree(skillId, relativePath);
      result.push({ path: relativePath, name: entry.name, type: 'dir', children });
    } else {
      result.push({ path: relativePath, name: entry.name, type: 'file' });
    }
  }

  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function readFile(skillId: string, filePath: string): Promise<string> {
  const absPath = safePath(skillId, filePath);
  return fs.readFile(absPath, 'utf-8');
}

export async function writeFile(skillId: string, filePath: string, content: string): Promise<void> {
  const absPath = safePath(skillId, filePath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, 'utf-8');
}

export async function createFile(skillId: string, filePath: string, isDir = false): Promise<void> {
  const absPath = safePath(skillId, filePath);
  if (isDir) {
    await fs.mkdir(absPath, { recursive: true });
  } else {
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, '', 'utf-8');
  }
}

export async function deleteFile(skillId: string, filePath: string): Promise<void> {
  const absPath = safePath(skillId, filePath);
  const stat = await fs.stat(absPath);
  if (stat.isDirectory()) {
    await fs.rm(absPath, { recursive: true });
  } else {
    await fs.unlink(absPath);
  }
}

export async function initSkillDir(skillId: string): Promise<void> {
  const skillDir = getSkillDir(skillId);
  await fs.mkdir(skillDir, { recursive: true });
}
