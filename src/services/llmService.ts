import "dotenv/config";
import { LLM_CONFIG } from "../config/llm.config";
import { MealPlanSchema, MealPlanResponse } from "../utils/meal_plan.schema";
import { LLMProviderFactory } from "../core/llm/LLMProviderFactory";

/**
 * Google Gemini Model Service (Refactored to use LLMProviderFactory)
 */
export class GoogleGeminiModel {
    
    constructor() {
    }

    async generateResponse(
        userMessage: string,
        outputSchema: any = MealPlanSchema
    ): Promise<{ success: boolean; data?: any; error?: string; tokenUsage?: any }> {
        
        let lastError: any = null;
        const provider = LLMProviderFactory.getDefaultProvider();

        for (let attempt = 1; attempt <= LLM_CONFIG.maxRetries + 1; attempt++) {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("LLM request timeout")), LLM_CONFIG.timeoutMs)
            );

            try {
                const generatePromise = provider.generateStructured(userMessage, {
                    schema: outputSchema,
                    temperature: LLM_CONFIG.temperature,
                    maxTokens: LLM_CONFIG.maxTokens,
                });

                const response: any = await Promise.race([generatePromise, timeoutPromise]);

                if (!response.success) {
                    throw new Error(response.error || "Request failed");
                }

                // Validate with Zod
                // response.data is already parsed JSON, but we need to validate it against the schema
                const validated = outputSchema.parse(response.data);

                return {
                    success: true,
                    data: validated,
                    tokenUsage: response.usage,
                };

            } catch (error: any) {
                lastError = error;
                console.warn(`[LLMService] Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt <= LLM_CONFIG.maxRetries) {
                    await new Promise((res) =>
                        setTimeout(res, LLM_CONFIG.retryBackoffMs)
                    );
                    continue;
                }
            }
        }
        
        console.error("[ERROR] - Error generating AI response:", lastError);
        return {
            success: false,
            error: lastError?.message || "All attempts failed",
        };
    }
}

export default new GoogleGeminiModel();

