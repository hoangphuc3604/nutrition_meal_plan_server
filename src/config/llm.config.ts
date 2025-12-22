import * as dotenv from "dotenv";

dotenv.config();

export type LLMProviderType = 'gemini-api' | 'azure-openai';

function getEnv(name: string, def?: string): string | undefined {
    return process.env[name] ?? def;
}

/**
 * Get LLM provider type from environment
 */
export function getLLMProviderType(): LLMProviderType {
    const provider = getEnv('LLM_PROVIDER', 'gemini-api') as LLMProviderType;
    const validProviders: LLMProviderType[] = ['gemini-api', 'azure-openai'];
    
    if (!validProviders.includes(provider)) {
        console.warn(`Invalid LLM_PROVIDER "${provider}", defaulting to "gemini-api"`);
        return 'gemini-api';
    }
    
    return provider;
}

/**
 * Get LLM configuration
 */
export function getLLMConfig() {
    const provider = getLLMProviderType();
    
    const config: any = {
        provider,
        model: getEnv('LLM_MODEL') || getEnv('GEMINI_MODEL') || 'gemini-2.0-flash-exp',
        temperature: Number(getEnv('LLM_TEMPERATURE', '0.5')),
        maxTokens: Number(getEnv('LLM_MAX_TOKENS', '8192')),
    };
    
    switch (provider) {
        case 'gemini-api':
            config.apiKey = getEnv('API_KEY_GENERATE') || getEnv('GOOGLE_GEMINI_API_KEY');
            if (!config.apiKey) {
                console.warn('Warning: No Gemini API key found. Set API_KEY_GENERATE or GOOGLE_GEMINI_API_KEY');
            }
            break;
        case 'azure-openai':
            config.azureOpenAIKey = getEnv('AZURE_OPENAI_API_KEY') || getEnv('OPENAI_API_KEY');
            config.azureOpenAIEndpoint = getEnv('AZURE_OPENAI_ENDPOINT') || 'https://models.github.ai/inference';
            config.model = getEnv('AZURE_OPENAI_MODEL') || getEnv('LLM_MODEL') || 'gpt-4o';
            break;
    }
    
    return config;
}

/**
 * Get model name for Gemini
 */
export function getGeminiModelName(): string {
    return getEnv('GEMINI_MODEL') || getEnv('LLM_MODEL') || 'gemini-2.0-flash-exp';
}
