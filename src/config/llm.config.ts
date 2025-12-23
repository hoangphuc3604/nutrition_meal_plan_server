import 'dotenv/config';
import { LLMConfig, LLMProviderType } from '../core/llm/types';
import * as fs from 'fs-extra';
import * as path from 'path';

function getEnv(name: string, def?: string): string | undefined {
  return process.env[name] ?? def;
}

function getEnvRequired(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

function getProviderType(): LLMProviderType {
  const provider = getEnv('LLM_PROVIDER', 'gemini-api') as LLMProviderType;
  const validProviders: LLMProviderType[] = ['gemini-api', 'vertex-ai', 'azure-openai'];
  
  if (!validProviders.includes(provider)) {
    console.warn(`Invalid LLM_PROVIDER "${provider}", defaulting to "gemini-api"`);
    return 'gemini-api';
  }
  
  return provider;
}

function getVertexAILocation(): string {
  const envLocation = getEnv('VERTEX_AI_LOCATION');
  if (envLocation) {
    return envLocation;
  }

  const credentialsPath = getEnv('GOOGLE_APPLICATION_CREDENTIALS');
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    try {
      const credentials = fs.readJsonSync(credentialsPath);
      if (credentials.project_id) {
        console.log(`Using Vertex AI with project: ${credentials.project_id}`);
      }
    } catch (error) {
      console.warn('Failed to read Vertex AI credentials file:', error);
    }
  }

  return 'us-central1';
}

export function getLLMConfig(): LLMConfig {
  const provider = getProviderType();
  
  const baseConfig = {
    provider,
    model: getEnv('LLM_MODEL', 'gemini-2.0-flash')!,
    temperature: Number(getEnv('LLM_TEMPERATURE', '0.5')),
    maxTokens: Number(getEnv('LLM_MAX_TOKENS', '8192')),
    timeoutMs: Number(getEnv('LLM_TIMEOUT_MS', '300000')),
  };

  switch (provider) {
    case 'gemini-api':
      return {
        ...baseConfig,
        geminiApiKey: getEnv('API_KEY_GENERATE') || getEnv('GOOGLE_GEMINI_API_KEY'),
      };
    case 'vertex-ai':
      return {
        ...baseConfig,
        vertexAILocation: getVertexAILocation(),
      };
    case 'azure-openai':
      return {
        ...baseConfig,
        azureOpenAIKey: getEnvRequired('OPENAI_API_KEY'),
        azureOpenAIEndpoint: getEnv('AZURE_OPENAI_ENDPOINT') || 'https://models.github.ai/inference',
      };
    default:
      return baseConfig as LLMConfig;
  }
}

export function getGeminiModelName(): string {
  return getLLMConfig().model;
}

// Export legacy LLM_CONFIG for backward compatibility if needed, 
// but ideally we should migrate to getLLMConfig()
export const LLM_CONFIG = {
  ...getLLMConfig(),
  maxRetries: Number(getEnv("LLM_MAX_RETRIES", "2")),
  retryBackoffMs: Number(getEnv("LLM_RETRY_BACKOFF_MS", "1000")),
};


