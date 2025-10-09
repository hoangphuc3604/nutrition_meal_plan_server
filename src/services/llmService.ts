import 'dotenv/config';

/**
 * Google Gemini Model Service
 */
export class GoogleGeminiModel {
  private url: string;
  private apiKey: string;

  constructor() {
    this.url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    this.apiKey = process.env.API_KEY_GENERATE || "";
    
    if (!this.apiKey) {
      console.warn("[WARNING] - API_KEY_GENERATE not found in environment variables");
    }
  }

  async generateResponse(userMessage: string, conversationHistory: any[] = []) {
    try {
      const generationConfig = {
        // Temperature (0.0 = deterministic, 1.0 = more random)
        temperature: 0.5,
        // Max output tokens
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

      const response = await fetch(`${this.url}?key=${this.apiKey}`, {
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
      console.log("[SUCCESS] - AI response data:", JSON.stringify(data, null, 2));
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      
      if (!aiResponse) {
        throw new Error("No response from AI");
      }

      // Clean JSON response - remove markdown code blocks
      const cleaned = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
      const formatted = JSON.parse(cleaned);

      return {
        success: true,
        ...formatted
      };
    } catch (error: any) {
      console.error("[ERROR] - Error generating AI response:", error);
      return {
        success: false,
        response: null,
        error: error.message,
      };
    }
  }
}

export default new GoogleGeminiModel();
