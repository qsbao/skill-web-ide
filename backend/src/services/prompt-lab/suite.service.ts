import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import yaml from 'js-yaml';
import { config } from '../../config.js';
import type { PromptTestSuite, PromptTestCase } from '@skill-ide/shared';

function suitePath(projectId: string, promptId: string): string {
  return path.join(config.promptLabDir, projectId, 'prompts', promptId, 'suite.yaml');
}

export async function loadSuite(projectId: string, promptId: string): Promise<PromptTestSuite> {
  try {
    const raw = await fs.readFile(suitePath(projectId, promptId), 'utf-8');
    return yaml.load(raw) as PromptTestSuite;
  } catch {
    return { promptId, projectId, description: '', cases: [] };
  }
}

export async function saveSuite(projectId: string, promptId: string, suite: PromptTestSuite): Promise<void> {
  const filePath = suitePath(projectId, promptId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, yaml.dump(suite, { lineWidth: -1, noRefs: true }), 'utf-8');
}

export async function addCase(projectId: string, promptId: string, data: Omit<PromptTestCase, 'id'>): Promise<PromptTestCase> {
  const suite = await loadSuite(projectId, promptId);
  const testCase: PromptTestCase = { id: crypto.randomUUID().slice(0, 8), ...data };
  suite.cases.push(testCase);
  await saveSuite(projectId, promptId, suite);
  return testCase;
}

export async function updateCase(projectId: string, promptId: string, caseId: string, data: Partial<Omit<PromptTestCase, 'id'>>): Promise<PromptTestCase | undefined> {
  const suite = await loadSuite(projectId, promptId);
  const testCase = suite.cases.find(c => c.id === caseId);
  if (!testCase) return undefined;
  Object.assign(testCase, data);
  await saveSuite(projectId, promptId, suite);
  return testCase;
}

export async function deleteCase(projectId: string, promptId: string, caseId: string): Promise<boolean> {
  const suite = await loadSuite(projectId, promptId);
  const idx = suite.cases.findIndex(c => c.id === caseId);
  if (idx === -1) return false;
  suite.cases.splice(idx, 1);
  await saveSuite(projectId, promptId, suite);
  return true;
}
