import { ILLMProvider } from './ILLMProvider';
import { LLMConfig, LLMProviderType } from './types';
import { getLLMConfig } from '../../config/llm.config';
import { GeminiAPIProvider } from './providers/GeminiAPIProvider';
import { VertexAIProvider } from './providers/VertexAIProvider';
import { AzureOpenAIProvider } from './providers/AzureOpenAIProvider';

export class LLMProviderFactory {
  private static instances: Map<LLMProviderType, ILLMProvider> = new Map();

  static createProvider(config?: LLMConfig): ILLMProvider {
    const finalConfig = config || getLLMConfig();
    const providerType = finalConfig.provider;

    if (this.instances.has(providerType)) {
      return this.instances.get(providerType)!;
    }

    let provider: ILLMProvider;

    switch (providerType) {
      case 'gemini-api':
        provider = new GeminiAPIProvider(finalConfig);
        break;
      case 'vertex-ai':
        provider = new VertexAIProvider(finalConfig);
        break;
      case 'azure-openai':
        provider = new AzureOpenAIProvider(finalConfig);
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${providerType}`);
    }

    console.log(`[LLMProviderFactory] Initialized ${providerType} provider (model: ${finalConfig.model})`);
    this.instances.set(providerType, provider);
    return provider;
  }

  static getDefaultProvider(): ILLMProvider {
    return this.createProvider();
  }

  static clearCache(): void {
    this.instances.clear();
  }
}
