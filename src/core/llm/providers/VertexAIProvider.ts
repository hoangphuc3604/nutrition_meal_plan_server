import { ILLMProvider } from '../ILLMProvider';
import { LLMConfig, LLMResponse, LLMGenerateOptions, LLMStructuredOutputOptions } from '../types';
import { ChatVertexAI } from '@langchain/google-vertexai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import * as fs from 'fs-extra';

export class VertexAIProvider implements ILLMProvider {
  private config: LLMConfig;
  private client: ChatVertexAI;
  private modelName: string;

  constructor(config: LLMConfig) {
    this.config = config;
    this.modelName = config.model;

    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentialsPath) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is required for Vertex AI');
    }

    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Vertex AI credentials file not found: ${credentialsPath}`);
    }

    let projectId: string;
    try {
      const credentials = fs.readJsonSync(credentialsPath);
      projectId = credentials.project_id;
      if (!projectId) {
        throw new Error('project_id not found in credentials file');
      }
    } catch (error: any) {
      throw new Error(`Failed to read Vertex AI credentials: ${error.message}`);
    }

    const location = config.vertexAILocation || 'us-central1';

    this.client = new ChatVertexAI({
      model: this.modelName,
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
      project: projectId,
      location: location,
    } as any);
  }

  async generateText(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    try {
      const messages: (HumanMessage | SystemMessage)[] = [];

      if (options?.systemPrompt) {
        messages.push(new SystemMessage(options.systemPrompt));
      }

      if (options?.conversationHistory) {
        for (const msg of options.conversationHistory) {
          if (msg.role === 'system') {
            messages.push(new SystemMessage(msg.content));
          } else if (msg.role === 'user') {
            messages.push(new HumanMessage(msg.content));
          } else if (msg.role === 'assistant') {
            messages.push(new HumanMessage(msg.content));
          }
        }
      }

      messages.push(new HumanMessage(prompt));

      const response = await this.client.invoke(messages);

      const text = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);

      const usage = (response as any).response_metadata?.tokenUsage || 
                    (response as any).usage_metadata || 
                    undefined;

      return {
        success: true,
        text,
        usage: usage ? {
          promptTokens: usage.promptTokenCount || usage.promptTokens,
          completionTokens: usage.completionTokenCount || usage.completionTokens,
          totalTokens: usage.totalTokenCount || usage.totalTokens,
        } : undefined,
      };
    } catch (error: any) {
      console.error('[VertexAIProvider] Error generating text:', error);
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
      console.error('[VertexAIProvider] Error generating structured data:', error);
      return {
        success: false,
        error: error.message || 'Failed to parse structured data',
      };
    }
  }

  getProviderName(): string {
    return 'vertex-ai';
  }
}
