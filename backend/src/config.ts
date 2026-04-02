import 'dotenv/config';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT) || 3001,
  host: process.env.HOST || '0.0.0.0',
  skillsDir: process.env.SKILLS_DIR || path.resolve(__dirname, '../../skills-workspace'),
  runsDir: process.env.RUNS_DIR || path.join(os.homedir(), '.skill-runs'),
  sessionsDir: process.env.SESSIONS_DIR || path.join(os.homedir(), '.skill-sessions'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  defaultAuthor: process.env.DEFAULT_AUTHOR || 'local',
  // Prompt Lab
  promptLabDir: process.env.PROMPT_LAB_DIR || path.resolve(__dirname, '../../prompt-lab-workspace'),
  llmBaseUrl: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
  llmApiKey: process.env.LLM_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS) || 60_000,
};
