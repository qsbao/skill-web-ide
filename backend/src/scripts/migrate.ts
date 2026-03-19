/**
 * Migration script: moves UUID-based skill dirs to @author/slug-name format.
 *
 * Usage: npx tsx backend/src/scripts/migrate.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = process.env.SKILLS_DIR || path.resolve(__dirname, '../../../skills-workspace');
const DEFAULT_AUTHOR = process.env.DEFAULT_AUTHOR || 'local';
const MANIFEST = 'skill.json';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// UUID pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function migrate() {
  const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
  let migrated = 0;

  for (const entry of entries) {
    if (!entry.isDirectory() || !UUID_RE.test(entry.name)) continue;

    const oldDir = path.join(SKILLS_DIR, entry.name);
    const manifestPath = path.join(oldDir, MANIFEST);

    let meta;
    try {
      const raw = await fs.readFile(manifestPath, 'utf-8');
      meta = JSON.parse(raw);
    } catch {
      console.log(`Skipping ${entry.name}: no valid skill.json`);
      continue;
    }

    const author = meta.author || DEFAULT_AUTHOR;
    const slug = `@${author}/${slugify(meta.name || entry.name)}`;
    const newDir = path.join(SKILLS_DIR, slug);

    // Ensure @author dir exists
    await fs.mkdir(path.dirname(newDir), { recursive: true });

    // Move directory
    await fs.rename(oldDir, newDir);

    // Update skill.json with new id and author
    meta.id = slug;
    meta.author = author;
    await fs.writeFile(path.join(newDir, MANIFEST), JSON.stringify(meta, null, 2), 'utf-8');

    console.log(`Migrated: ${entry.name} → ${slug}`);
    migrated++;
  }

  console.log(`\nDone. Migrated ${migrated} skill(s).`);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
