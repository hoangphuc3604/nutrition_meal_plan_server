export type LLMProviderType = 'gemini-api' | 'vertex-ai' | 'azure-openai';

export interface LLMConfig {
  provider: LLMProviderType;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  geminiApiKey?: string;
  vertexAILocation?: string;
  azureOpenAIKey?: string;
  azureOpenAIEndpoint?: string;
}

export interface LLMResponse {
  success: boolean;
  text?: string;
  data?: any;
  error?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface LLMGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface LLMStructuredOutputOptions<T> extends LLMGenerateOptions {
  schema: any;
}
