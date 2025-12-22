import "dotenv/config";
import { LLM_CONFIG } from "../config/llm.config";
import { MealPlanSchema, MealPlanResponse } from "../utils/meal_plan.schema";

/**
 * Google Gemini Model Service
 */
export class GoogleGeminiModel {
  private url: string;
  private apiKey: string;

    constructor() {
        this.url =
            `https://generativelanguage.googleapis.com/v1beta/models/${LLM_CONFIG.model}:generateContent`;
        this.apiKey = process.env.API_KEY_GENERATE || "";

        if (!this.apiKey) {
            console.warn(
                "[WARNING] - API_KEY_GENERATE not found in environment variables"
            );
        }
    }

    async generateResponse(
        userMessage: string,
        outputSchema: any = MealPlanSchema
    ): Promise<{ success: boolean; data?: MealPlanResponse; error?: string; tokenUsage?: any }> {
        const generationConfig = {
            temperature: LLM_CONFIG.temperature,
            maxOutputTokens: LLM_CONFIG.maxTokens,
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
            generationConfig,
        };

        let lastError: any = null;
        for (let attempt = 1; attempt <= LLM_CONFIG.maxRetries + 1; attempt++) {
            const abort = new AbortController();
            const timeout = setTimeout(
                () => abort.abort("LLM request timeout"),
                LLM_CONFIG.timeoutMs
            );

            try {
                const response = await fetch(`${this.url}?key=${this.apiKey}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                    signal: abort.signal,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
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
                const parsed = JSON.parse(cleaned);
                const validated = outputSchema.parse(parsed);

                const tokenUsage = data.usage || data.tokenUsage;

                return {
                    success: true,
                    data: validated,
                    tokenUsage,
                };
            } catch (error: any) {
                lastError = error;
                if (attempt <= LLM_CONFIG.maxRetries) {
                    await new Promise((res) =>
                        setTimeout(res, LLM_CONFIG.retryBackoffMs)
                    );
                    continue;
                }
            } finally {
                clearTimeout(timeout);
            }
        }

        console.error("[ERROR] - Error generating AI response:", lastError);
        return {
            success: false,
            error: lastError?.message || "LLM generation failed",
        };
    }
}

export default new GoogleGeminiModel();
