import { ILLMProvider } from '../ILLMProvider';
import { LLMConfig, LLMResponse, LLMGenerateOptions, LLMStructuredOutputOptions } from '../types';
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

export class AzureOpenAIProvider implements ILLMProvider {
  private config: LLMConfig;
  private client: any;
  private modelName: string;
  private endpoint: string;

  constructor(config: LLMConfig) {
    this.config = config;
    this.modelName = config.model || 'gpt-4o-mini';
    this.endpoint = config.azureOpenAIEndpoint || 'https://models.github.ai/inference';
    
    if (!config.azureOpenAIKey) {
      throw new Error('Azure OpenAI API key is required. Set OPENAI_API_KEY');
    }

    this.client = ModelClient(
      this.endpoint,
      new AzureKeyCredential(config.azureOpenAIKey)
    );
  }

  async generateText(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    try {
      const messages: any[] = [];
      
      if (options?.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }

      if (options?.conversationHistory) {
        messages.push(...options.conversationHistory);
      }

      messages.push({ role: 'user', content: prompt });

      const response = await this.client.path("/chat/completions").post({
        body: {
          messages,
          model: this.modelName,
        }
      });

      if (isUnexpected(response)) {
        throw new Error(
          `Model request failed: ${response.body?.error?.message || "Unknown error"}`
        );
      }

      const result = response.body;
      const aiResponse = result.choices[0]?.message?.content;

      return {
        success: true,
        text: aiResponse || '',
        usage: result.usage ? {
          promptTokens: (result.usage as any).prompt_tokens,
          completionTokens: (result.usage as any).completion_tokens,
          totalTokens: (result.usage as any).total_tokens,
        } : undefined,
      };
    } catch (error: any) {
      console.error('[AzureOpenAIProvider] Error generating text:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate text',
      };
    }
  }

  async generateStructured<T = any>(
    prompt: string,
    options: LLMStructuredOutputOptions<T>
  ): Promise<LLMResponse & { data?: T }> {
    try {
      const jsonPrompt = `${prompt}\n\nReturn the response as valid JSON only, no markdown, no explanations.`;

      const response = await this.generateText(jsonPrompt, {
        ...options,
        systemPrompt: options.systemPrompt || 'You are a helpful assistant that returns structured JSON data.',
      });

      if (!response.success || !response.text) {
        return {
          ...response,
          data: undefined,
        };
      }

      let cleanedText = response.text;
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanedText) as T;

      return {
        ...response,
        data: parsed,
      };
    } catch (error: any) {
      console.error('[AzureOpenAIProvider] Error generating structured data:', error);
      return {
        success: false,
        error: error.message || 'Failed to parse structured data',
      };
    }
  }

  getProviderName(): string {
    return 'azure-openai';
  }
}
