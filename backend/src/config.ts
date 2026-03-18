import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT) || 3001,
  host: process.env.HOST || '0.0.0.0',
  skillsDir: process.env.SKILLS_DIR || path.resolve(__dirname, '../../skills-workspace'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
