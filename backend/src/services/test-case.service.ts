import fs from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuid } from 'uuid';
import { config } from '../config.js';
import type { TestCase } from '@skill-ide/shared';

function casesDir(skillId: string): string {
  return path.join(config.skillsDir, skillId, '.tests');
}

function casePath(skillId: string, caseId: string): string {
  return path.join(casesDir(skillId), `${caseId}.json`);
}

export async function listCases(skillId: string): Promise<TestCase[]> {
  const dir = casesDir(skillId);
  try {
    const files = await fs.readdir(dir);
    const cases: TestCase[] = [];
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const raw = await fs.readFile(path.join(dir, f), 'utf-8');
      cases.push(JSON.parse(raw));
    }
    return cases.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function getCase(skillId: string, caseId: string): Promise<TestCase | null> {
  try {
    const raw = await fs.readFile(casePath(skillId, caseId), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function createCase(skillId: string, data: Omit<TestCase, 'id' | 'skillId'>): Promise<TestCase> {
  const id = uuid();
  const testCase: TestCase = { id, skillId, ...data };
  await fs.mkdir(casesDir(skillId), { recursive: true });
  await fs.writeFile(casePath(skillId, id), JSON.stringify(testCase, null, 2), 'utf-8');
  return testCase;
}

export async function updateCase(skillId: string, caseId: string, data: Partial<TestCase>): Promise<TestCase | null> {
  const existing = await getCase(skillId, caseId);
  if (!existing) return null;
  const updated: TestCase = {
    ...existing,
    ...data,
    id: existing.id,
    skillId: existing.skillId,
  };
  await fs.writeFile(casePath(skillId, caseId), JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export async function deleteCase(skillId: string, caseId: string): Promise<boolean> {
  try {
    await fs.unlink(casePath(skillId, caseId));
    return true;
  } catch {
    return false;
  }
}

export async function importCases(skillId: string, cases: Omit<TestCase, 'id' | 'skillId'>[]): Promise<TestCase[]> {
  const created: TestCase[] = [];
  for (const c of cases) {
    created.push(await createCase(skillId, c));
  }
  return created;
}

export async function exportCases(skillId: string): Promise<TestCase[]> {
  return listCases(skillId);
}
