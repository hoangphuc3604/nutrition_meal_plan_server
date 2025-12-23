import { ILLMProvider } from '../ILLMProvider';
import { LLMConfig, LLMResponse, LLMGenerateOptions, LLMStructuredOutputOptions } from '../types';
import { GoogleGeminiModel } from '../../../config/openai.config';

export class GeminiAPIProvider implements ILLMProvider {
  private config: LLMConfig;
  private geminiModel: GoogleGeminiModel;
  private modelName: string;

  constructor(config: LLMConfig) {
    this.config = config;
    this.modelName = config.model;
    
    if (!config.geminiApiKey) {
      throw new Error('Gemini API key is required. Set API_KEY_GENERATE or GOOGLE_GEMINI_API_KEY');
    }

    this.geminiModel = new GoogleGeminiModel();
  }

  async generateText(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    try {
      const temperature = options?.temperature ?? this.config.temperature;
      const maxTokens = options?.maxTokens ?? this.config.maxTokens;
      
      let fullPrompt = prompt;
      if (options?.systemPrompt) {
        fullPrompt = `${options.systemPrompt}\n\n${prompt}`;
      }

      let conversationHistory: any[] = [];
      if (options?.conversationHistory) {
        conversationHistory = options.conversationHistory;
      }

      const response = await this.geminiModel.generateResponse(fullPrompt, conversationHistory);

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Unknown error',
        };
      }

      let text = '';
      if (response.response) {
        text = typeof response.response === 'string' ? response.response : JSON.stringify(response.response);
      } else {
        text = JSON.stringify(response);
      }

      return {
        success: true,
        text,
        data: response,
        usage: response.usage,
      };
    } catch (error: any) {
      console.error('[GeminiAPIProvider] Error generating text:', error);
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
      console.error('[GeminiAPIProvider] Error generating structured data:', error);
      return {
        success: false,
        error: error.message || 'Failed to parse structured data',
      };
    }
  }

  getProviderName(): string {
    return 'gemini-api';
  }
}
