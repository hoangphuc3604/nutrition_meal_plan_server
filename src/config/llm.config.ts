export interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
}

function env(name: string, def?: string) {
  const v = process.env[name];
  return v ?? def;
}

export const LLM_CONFIG: LLMConfig = {
  model: env("LLM_MODEL", "gemini-2.5-flash")!,
  temperature: Number(env("LLM_TEMPERATURE", "0.5")),
  maxTokens: Number(env("LLM_MAX_TOKENS", "8192")),
  timeoutMs: Number(env("LLM_TIMEOUT_MS", "300000")),
  maxRetries: Number(env("LLM_MAX_RETRIES", "2")),
  retryBackoffMs: Number(env("LLM_RETRY_BACKOFF_MS", "1000")),
};

