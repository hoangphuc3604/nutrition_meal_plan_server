import { LLMResponse, LLMGenerateOptions, LLMStructuredOutputOptions } from './types';

export interface ILLMProvider {
  generateText(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse>;
  generateStructured<T = any>(
    prompt: string,
    options: LLMStructuredOutputOptions<T>
  ): Promise<LLMResponse & { data?: T }>;
  generateStream?(
    prompt: string,
    options?: LLMGenerateOptions
  ): AsyncGenerator<string, void, unknown>;
  getProviderName(): string;
}
