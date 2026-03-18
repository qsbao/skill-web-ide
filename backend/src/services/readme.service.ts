import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { config } from '../config.js';
import type { SkillReadme } from '@skill-ide/shared';

export async function getReadme(slug: string): Promise<SkillReadme> {
  const filePath = path.join(config.skillsDir, slug, 'skill.md');
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);
    return { frontmatter: data, body: content };
  } catch {
    return { frontmatter: {}, body: '' };
  }
}
