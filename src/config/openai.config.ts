import 'dotenv/config';
import { getGeminiModelName } from './llm.config';

export class GoogleGeminiModel {
  private url: string;
  private apiKey: string;
  private modelName: string;

  constructor() {
    this.modelName = getGeminiModelName();
    this.url =
      `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent`;
    this.apiKey = process.env.API_KEY_GENERATE || process.env.GOOGLE_GEMINI_API_KEY || "";
  }

  async generateResponse(userMessage: string, conversationHistory: any[] = []) {
    try {
      const generationConfig = {
        temperature: 0.5,
        maxOutputTokens: 5000, 
      };
      
      // Construct contents based on history if needed, but for now simple implementation
      // matching the one in backend which seemed to ignore history in the snippet I read?
      // Wait, the backend snippet for GoogleGeminiModel.generateResponse only took userMessage.
      // But GeminiAPIProvider passed conversationHistory.
      // Let's check backend GoogleGeminiModel again.
      
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
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      const cleaned = aiResponse?.replace(/```json\n?|\n?```/g, "");
      
      // The backend implementation tried to parse JSON. 
      // But GeminiAPIProvider expects an object with success, response (text), etc.
      // Let's return what GeminiAPIProvider expects.
      
      return {
        success: true,
        response: aiResponse, // Return raw text here, GeminiAPIProvider handles parsing if needed or just uses it.
        usage: data.usageMetadata
      };
    } catch (error: any) {
      console.error("Error generating AI response:", error);
      return {
        success: false,
        response: null,
        error: error.message,
      };
    }
  }
}
