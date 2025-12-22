import "dotenv/config";
import { getLLMProviderType, getLLMConfig, LLMProviderType } from "../config/llm.config";

/**
 * Universal LLM Service
 * Supports multiple LLM providers: Gemini, Azure OpenAI, OpenAI
 */
export class LLMService {
    private provider: LLMProviderType;
    private config: any;

    constructor() {
        this.provider = getLLMProviderType();
        this.config = getLLMConfig();
        
        console.log(`[LLMService] Using provider: ${this.provider}`);
    }

    async generateResponse(
        userMessage: string,
        conversationHistory: any[] = []
    ) {
        try {
            switch (this.provider) {
                case 'azure-openai':
                    return await this.generateWithAzureOpenAI(userMessage);
                case 'gemini-api':
                default:
                    return await this.generateWithGemini(userMessage);
            }
        } catch (error: any) {
            console.error(`[ERROR] - Error generating AI response with ${this.provider}:`, error);
            return {
                success: false,
                response: null,
                error: error.message,
            };
        }
    }

    /**
     * Generate response using Google Gemini
     */
    private async generateWithGemini(userMessage: string) {
        const model = this.config.model || 'gemini-2.0-flash-exp';
        const apiKey = this.config.apiKey;

        if (!apiKey) {
            throw new Error("API_KEY_GENERATE not found in environment variables");
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const generationConfig = {
            temperature: 0.5,
            maxOutputTokens: 8192,
        };

        const body = {
            contents: [
                {
                    parts: [
                        {
                            text: userMessage,
                        },
                    ],
                },
            ],
            generationConfig: generationConfig,
        };

        const response = await fetch(`${url}?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Request failed");
        }

        const data = await response.json();
        const aiResponse =
            data.candidates?.[0]?.content?.parts?.[0]?.text || null;

        if (!aiResponse) {
            throw new Error("No response from AI");
        }

        // Clean JSON response - remove markdown code blocks
        const cleaned = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
        const formatted = JSON.parse(cleaned);

        return {
            success: true,
            ...formatted,
        };
    }

    /**
     * Generate response using Azure OpenAI
     */
    private async generateWithAzureOpenAI(userMessage: string) {
        const model = this.config.model || 'gpt-4o';
        const apiKey = this.config.azureOpenAIKey;
        const endpoint = this.config.azureOpenAIEndpoint || 'https://models.github.ai/inference';

        if (!apiKey) {
            throw new Error("AZURE_OPENAI_API_KEY not found in environment variables");
        }

        const url = `${endpoint}/chat/completions`;

        const body = {
            model: model,
            messages: [
                {
                    role: "user",
                    content: userMessage,
                },
            ],
            temperature: 0.5,
            max_tokens: 8192,
            response_format: { type: "json_object" },
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Azure OpenAI] Error response: ${errorText}`);
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                throw new Error(`Request failed with status ${response.status}: ${errorText}`);
            }
            throw new Error(errorData.error?.message || `Request failed with status ${response.status}`);
        }

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError: any) {
            console.error(`[Azure OpenAI] Failed to parse response as JSON`);
            console.error(`Response text: ${responseText.substring(0, 500)}...`);
            throw new Error(`Invalid JSON response from Azure OpenAI: ${parseError.message}`);
        }
        
        const aiResponse = data.choices?.[0]?.message?.content || null;

        if (!aiResponse) {
            throw new Error("No response from AI");
        }

        // Parse JSON response
        const formatted = JSON.parse(aiResponse);

        return {
            success: true,
            ...formatted,
        };
    }
}

// Export singleton instance
export default new LLMService();

// Export class for manual instantiation if needed
export { LLMService as GoogleGeminiModel };
