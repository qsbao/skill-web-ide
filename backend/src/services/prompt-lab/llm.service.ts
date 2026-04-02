import OpenAI from 'openai';
import { config } from '../../config.js';

let client: OpenAI | null = null;

export function getLLMClient(): OpenAI {
  if (!client) {
    if (!config.llmApiKey) {
      throw new Error('LLM_API_KEY is not set. Configure it in your environment.');
    }
    client = new OpenAI({ baseURL: config.llmBaseUrl, apiKey: config.llmApiKey });
  }
  return client;
}

export function getLLMModel(): string {
  return config.llmModel;
}

export interface EvaluationResult {
  pass: boolean;
  issues: string[];
  suggestions: string[];
  rawOutput: string;
  latencyMs: number;
  tokenUsage?: { prompt: number; completion: number; total: number };
}

export async function evaluatePrompt(
  input: string,
  prompt: string
): Promise<EvaluationResult> {
  const llm = getLLMClient();
  const model = getLLMModel();
  const startTime = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.llmTimeoutMs);

  try {
    const response = await llm.chat.completions.create(
      {
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a prompt evaluator. Evaluate whether the given input produces correct results when processed by the prompt.

Respond with ONLY a raw JSON object. Do NOT wrap it in markdown code fences or any other formatting.

The JSON must have exactly three fields:
- "pass": a boolean, true if the prompt handles the input correctly
- "issues": an array of strings listing specific problems, empty if pass is true
- "suggestions": an array of strings with actionable improvements, empty if pass is true

Be concise. Respond in the same language as the content.`,
          },
          {
            role: 'user',
            content: `## Prompt\n${prompt}\n\n## Input\n${input}`,
          },
        ],
        temperature: 0.1,
      },
      { signal: controller.signal }
    );

    const latencyMs = Date.now() - startTime;
    const usage = response.usage;
    const tokenUsage = usage
      ? { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens }
      : undefined;

    const text = response.choices[0]?.message?.content ?? '';
    if (!text) {
      return { pass: true, issues: [], suggestions: ['LLM returned empty response'], rawOutput: '', latencyMs, tokenUsage };
    }

    try {
      const parsed = JSON.parse(text);
      return {
        pass: Boolean(parsed.pass),
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        rawOutput: text,
        latencyMs,
        tokenUsage,
      };
    } catch {
      return { pass: true, issues: [], suggestions: ['Failed to parse LLM response'], rawOutput: text, latencyMs, tokenUsage };
    }
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    if (controller.signal.aborted) {
      throw new Error(`LLM call timed out after ${config.llmTimeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
