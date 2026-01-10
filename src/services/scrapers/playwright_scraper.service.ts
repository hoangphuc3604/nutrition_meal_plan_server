import { IRecipeScraper } from "./IRecipeScraper.interface";
import { ScrapedRecipeData } from "../../types/scraped_recipe.type";
import { chromium, Browser, Page } from "playwright";
import { GoogleGeminiModel as LLMService } from "../llmService";
import { RecipeSchema } from "../../utils/recipe.schema";
/**
 * Playwright-based Recipe Scraper
 * Uses headless browser to fetch full HTML content, then LLM to parse recipe
 * 
 * Pros:
 * - Works on any recipe website (even dynamic/JS-heavy sites)
 * - Bypasses most anti-scraping measures
 * - Can extract from complex layouts
 * 
 * Cons:
 * - Slower than static parsing (~3-5 seconds per recipe)
 * - Higher resource usage (browser instance)
 */
export class PlaywrightScraperService implements IRecipeScraper {
    readonly name = "Playwright";
    private llm: LLMService;

    constructor() {
        // Use existing LLM service (supports multiple providers)
        this.llm = new LLMService();
    }

    async canHandle(url: string): Promise<boolean> {
        // Playwright can handle any HTTP/HTTPS URL
        return url.startsWith('http://') || url.startsWith('https://');
    }

    async scrape(url: string): Promise<ScrapedRecipeData> {
        console.log(`🎭 [Playwright] Starting scrape: ${url}`);
        
        let browser: Browser | null = null;
        let page: Page | null = null;

        try {
            // Launch browser
            browser = await chromium.launch({ 
                headless: true,
                timeout: 30000,
            });

            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            });

            page = await context.newPage();

            // Navigate to URL
            await page.goto(url, { 
                waitUntil: 'domcontentloaded', 
                timeout: 30000 
            });

            // Wait a bit for dynamic content
            await page.waitForTimeout(2000);

          // Extract structured data (JSON-LD)
          const structuredData = await this.extractStructuredData(page);

          // Extract content
          const content = await this.extractContent(page);
          // Close browser
          await browser.close();

            // Parse with LLM
            const recipe = await this.parseWithLLM(content, structuredData, url);

            console.log(`✅ [Playwright] Successfully scraped: ${recipe.name}`);
            return recipe;

        } catch (error: any) {
            console.error(`❌ [Playwright] Failed to scrape ${url}:`, error.message);
            
            // Cleanup
            if (browser) {
                try {
                    await browser.close();
                } catch {}
            }

            throw new Error(`Playwright scraping failed: ${error.message}`);
        }
    }

    /**
     * Extract main text content from page
     */
    private async extractContent(page: Page): Promise<string> {
        return await page.evaluate(() => {
            // Remove unwanted elements
            const unwanted = document.querySelectorAll(
                'script, style, nav, footer, header, aside, .advertisement, .ads, .social-share, .comments'
            );
            unwanted.forEach(el => el.remove());

            // Try to find main content
            const mainSelectors = [
                'main',
                'article',
                '[role="main"]',
                '.recipe-content',
                '.recipe',
                '#recipe',
                '.post-content',
                '.entry-content',
                '.wprm-recipe',
                '.tasty-recipes',
            ];

            for (const selector of mainSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    return (element as HTMLElement).innerText.trim();
                }
            }

            // Fallback to body
            return document.body.innerText.trim();
        });
    }

    /**
     * Extract JSON-LD structured data
     */
    private async extractStructuredData(page: Page): Promise<any[]> {
        return await page.evaluate(() => {
            const scripts = Array.from(
                document.querySelectorAll('script[type="application/ld+json"]')
            );
            return scripts
                .map(script => {
                    try {
                        return JSON.parse(script.textContent || '');
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean);
        });
    }

    /**
     * Parse scraped content with LLM
     */
    private async parseWithLLM(
        content: string, 
        structuredData: any[], 
        url: string
    ): Promise<ScrapedRecipeData> {
        const prompt = `Extract recipe information from the following webpage content.

URL: ${url}

STRUCTURED DATA (JSON-LD):
${JSON.stringify(structuredData, null, 2)}

TEXT CONTENT:
${content.slice(0, 8000)}

IMPORTANT: If the page contains multiple recipes, extract ONLY THE FIRST ONE.

TASK: Extract complete recipe with:
- name (exact recipe title)
- ingredients (array of objects: {name, quantity, unit, notes, category})
  * IMPORTANT: For each ingredient, you MUST determine and assign a "category" field
  * Analyze the ingredient name and select the most appropriate category
  * Examples:
    - "cà chua" → "rau củ"
    - "thịt bò" → "thịt"
    - "cá hồi" → "cá hải sản"
    - "sữa tươi" → "sữa phẩm"
    - "gạo" → "ngũ cốc"
    - "muối" → "gia vị"
  * If uncertain, use "khác"
- instructions (string: '1. Step one\\n2. Step two\\n...')
- prep_time_minutes, cook_time_minutes, total_time_minutes (numbers or null)
- servings (number or null)
- description (brief description)
- cuisine_type (string: "Việt Nam", "Ý", "Nhật" or null NOT {"Vietnamese"} no curly braces)
- difficulty_level (easy | medium | hard or null)
- tags (array of strings or empty array)
- image_url (image link of recipe, string or null)

CRITICAL: 
- Each ingredient object MUST include the "category" field with one of the allowed category values listed above.
- Translate recipe name, description, ingredient names, instructions to Vietnamese if they are in another language.
- Convert all units to metric system (grams, ml, độ C).

Return ONLY valid JSON matching this structure. Extract exactly as written in source.`;

        const response = await this.llm.generateResponse(prompt, RecipeSchema);
        
        if (!response.success) {
            throw new Error(`LLM parsing failed: ${response.error}`);
        }
        
        // Handle both direct recipe object and wrapped response
        let recipeData = response.data;

        // Normalize instructions to string format
        let instructions = recipeData.instructions || '';
        if (Array.isArray(instructions)) {
            instructions = instructions.map((step: any, idx: number) => 
                typeof step === 'string' ? `${idx + 1}. ${step}` : step
            ).join('\n\n');
        }
        
        // Normalize difficulty level to lowercase
        let difficultyLevel: 'easy' | 'medium' | 'hard' | undefined = undefined;
        if (recipeData.difficulty_level) {
            const normalized = recipeData.difficulty_level.toLowerCase();
            if (['easy', 'medium', 'hard'].includes(normalized)) {
                difficultyLevel = normalized as 'easy' | 'medium' | 'hard';
            }
        }

        // Map to ScrapedRecipeData format
        return {
            name: recipeData.name || 'Unknown Recipe',
            description: recipeData.description || null,
            ingredients: recipeData.ingredients || [],
            instructions: instructions,
            prep_time_minutes: recipeData.prep_time_minutes || null,
            cook_time_minutes: recipeData.cook_time_minutes || null,
            total_time_minutes: recipeData.total_time_minutes || null,
            servings: recipeData.servings || null,
            cuisine_type: recipeData.cuisine_type || null,
            difficulty_level: difficultyLevel,
            image_url: recipeData.image_url || null,
            url: url,
            nutrition: recipeData.nutrition || null,
        };
    }
}

// Export singleton instance
export const playwrightScraperService = new PlaywrightScraperService();
