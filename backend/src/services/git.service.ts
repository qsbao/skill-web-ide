import fs from 'node:fs/promises';
import path from 'node:path';
import simpleGit from 'simple-git';
import { config } from '../config.js';

const git = simpleGit(config.skillsDir);

export async function initRepo(): Promise<void> {
  const gitDir = path.join(config.skillsDir, '.git');
  try {
    await fs.stat(gitDir);
  } catch {
    // No .git in skills-workspace — init a new repo
    await git.init();
    await git.add('-A');
    await git.commit('Initial commit', { '--allow-empty': null });
  }
}

export async function commitChanges(message: string): Promise<void> {
  try {
    await git.add('-A');
    const status = await git.status();
    if (status.files.length > 0) {
      await git.commit(message);
    }
  } catch (err) {
    console.error('Git commit failed:', err);
  }
}
