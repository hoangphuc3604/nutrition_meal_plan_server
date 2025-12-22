import * as cheerio from "cheerio";
import { IRecipeScraper } from "./IRecipeScraper.interface";
import { ScrapedRecipeData } from "../../types/scraped_recipe.type";
import { parseIngredientText, parseDuration, extractNutritionValue } from "../../utils/recipe_scraper.util";

/**
 * Cheerio-based recipe scraper
 * Uses static HTML parsing with JSON-LD and CSS selectors
 * Works for most recipe sites with structured markup
 */
export class CheerioScraperService implements IRecipeScraper {
    readonly name = "CheerioScraper";

    /**
     * Cheerio can handle any URL (universal fallback)
     */
    canHandle(url: string): boolean {
        const urlPattern = /^https?:\/\/.+/;
        return urlPattern.test(url);
    }

    /**
     * Scrape recipe from URL using Cheerio
     */
    async scrape(url: string): Promise<ScrapedRecipeData> {
        try {
            console.log(`🔍 [${this.name}] Scraping: ${url}`);

            // Fetch the webpage
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // TRY JSON-LD FIRST (best source!)
            const jsonLdData = this.extractRecipeFromJsonLd($, url);
            
            if (jsonLdData && jsonLdData.name && jsonLdData.instructions && jsonLdData.ingredients?.length > 0) {
                console.log(`✅ [${this.name}] Extracted complete recipe from JSON-LD!`);
                return jsonLdData;
            }

            // FALLBACK: Use HTML scraping if JSON-LD incomplete
            console.log(`⚠️ [${this.name}] JSON-LD incomplete, falling back to HTML scraping...`);
            
            const recipeName = this.extractRecipeName($);
            const description = this.extractDescription($);
            const instructions = this.extractInstructions($);
            const cookingTime = this.extractCookingTime($);
            const servings = this.extractServings($);
            const imageUrl = this.extractImageUrl($, url);
            const ingredients = this.extractIngredients($);

            if (!recipeName) {
                throw new Error("Could not extract recipe name from URL");
            }

            return {
                name: recipeName,
                description: description || `Recipe imported from ${new URL(url).hostname}`,
                instructions: instructions || "Instructions not available",
                cook_time_minutes: cookingTime || 30,
                servings: servings || 4,
                image_url: imageUrl || undefined,
                cuisine_type: undefined,
                difficulty_level: "medium",
                url: url,
                ingredients: ingredients || []
            };

        } catch (error: any) {
            console.error(`❌ [${this.name}] Scraping failed:`, error.message);
            throw new Error(`Failed to extract recipe from URL: ${error.message}`);
        }
    }

    /**
     * Extract recipe from JSON-LD structured data (primary method)
     */
    private extractRecipeFromJsonLd($: any, url: string): ScrapedRecipeData | null {
        let recipeData: ScrapedRecipeData | null = null;

        $('script[type="application/ld+json"]').each((index: number, element: any) => {
            try {
                const jsonText = $(element).html() || '{}';
                const jsonData = JSON.parse(jsonText);
                
                // Collect recipe candidates
                let recipeCandidates: any[] = [];
                
                if (jsonData['@type'] === 'Recipe') {
                    recipeCandidates.push(jsonData);
                } else if (Array.isArray(jsonData)) {
                    recipeCandidates = jsonData.filter((item: any) => item['@type'] === 'Recipe');
                } else if (jsonData['@graph']) {
                    recipeCandidates = jsonData['@graph'].filter((item: any) => item['@type'] === 'Recipe');
                } else if (jsonData.mainEntity?.['@type'] === 'Recipe') {
                    recipeCandidates.push(jsonData.mainEntity);
                }

                // Process first valid recipe
                for (const item of recipeCandidates) {
                    const ingredients = (item.recipeIngredient || []).map((ing: string) => 
                        parseIngredientText(ing)
                    ).filter((parsed: any) => parsed !== null);

                    // Parse instructions
                    let instructions = '';
                    if (item.recipeInstructions) {
                        const instructionsList = Array.isArray(item.recipeInstructions) 
                            ? item.recipeInstructions 
                            : [item.recipeInstructions];

                        const steps: string[] = [];
                        instructionsList.forEach((inst: any) => {
                            if (typeof inst === 'string') {
                                steps.push(inst);
                            } else if (inst.text) {
                                steps.push(inst.text);
                            } else if (inst['@type'] === 'HowToSection' && inst.itemListElement) {
                                inst.itemListElement.forEach((step: any) => {
                                    if (step.text) steps.push(step.text);
                                });
                            }
                        });
                        instructions = steps.map((s, i) => `${i + 1}. ${s}`).join('\n\n');
                    }

                    // Extract image URL
                    let imageUrl = undefined;
                    if (item.image) {
                        if (typeof item.image === 'string') {
                            imageUrl = item.image;
                        } else if (item.image.url) {
                            imageUrl = item.image.url;
                        } else if (Array.isArray(item.image) && item.image[0]) {
                            imageUrl = typeof item.image[0] === 'string' ? item.image[0] : item.image[0].url;
                        }
                    }

                    // Extract nutrition
                    let nutrition = undefined;
                    if (item.nutrition) {
                        const cals = extractNutritionValue(item.nutrition.calories);
                        const prot = extractNutritionValue(item.nutrition.proteinContent);
                        const carb = extractNutritionValue(item.nutrition.carbohydrateContent);
                        const fat = extractNutritionValue(item.nutrition.fatContent);
                        
                        if (cals || prot || carb || fat) {
                            nutrition = { calories: cals, protein: prot, carbs: carb, fat: fat };
                        }
                    }

                    recipeData = {
                        name: item.name || 'Unknown Recipe',
                        description: item.description || undefined,
                        instructions: instructions,
                        cook_time_minutes: parseDuration(item.cookTime),
                        prep_time_minutes: parseDuration(item.prepTime),
                        total_time_minutes: parseDuration(item.totalTime),
                        servings: typeof item.recipeYield === 'number' ? item.recipeYield : parseInt(String(item.recipeYield).match(/\d+/)?.[0] || '4'),
                        image_url: imageUrl,
                        cuisine_type: item.recipeCuisine,
                        difficulty_level: undefined,
                        url: url,
                        ingredients: ingredients,
                        nutrition: nutrition,
                    };

                    if (recipeData.name && recipeData.instructions) {
                        return false; // Break loop
                    }
                }
            } catch (error) {
                console.log('Failed to parse JSON-LD:', error);
            }
        });

        return recipeData;
    }

    private extractRecipeName($: any): string | null {
        const selectors = ['h1[class*="recipe"]', 'h1[class*="title"]', '.recipe-title', 'h1'];
        for (const selector of selectors) {
            const text = $(selector).first().text().trim();
            if (text) return text;
        }
        return null;
    }

    private extractDescription($: any): string | null {
        const selectors = ['.recipe-description', '.recipe-summary', 'meta[name="description"]'];
        for (const selector of selectors) {
            if (selector.startsWith('meta')) {
                const content = $(selector).attr('content');
                if (content) return content.trim();
            } else {
                const text = $(selector).first().text().trim();
                if (text) return text;
            }
        }
        return null;
    }

    private extractInstructions($: any): string | null {
        const selectors = ['.recipe-instructions', '.instructions', '.directions'];
        for (const selector of selectors) {
            const instructions: string[] = [];
            $(selector).find('li, p').each((i: number, el: any) => {
                const text = $(el).text().trim();
                if (text && text.length > 10) {
                    instructions.push(`${i + 1}. ${text}`);
                }
            });
            if (instructions.length > 0) {
                return instructions.join('\n');
            }
        }
        return null;
    }

    private extractCookingTime($: any): number | null {
        const selectors = ['.cook-time', '.cooking-time', 'time[datetime]'];
        for (const selector of selectors) {
            const element = $(selector).first();
            const text = element.text().toLowerCase();
            const timeMatch = text.match(/(\d+)\s*(min|hour|hr)/);
            if (timeMatch) {
                const value = parseInt(timeMatch[1]);
                return timeMatch[2].includes('hour') || timeMatch[2].includes('hr') ? value * 60 : value;
            }
            const datetime = element.attr('datetime');
            if (datetime) {
                return parseDuration(datetime) || null;
            }
        }
        return null;
    }

    private extractServings($: any): number | null {
        const selectors = ['.recipe-servings', '.servings', '.yield'];
        for (const selector of selectors) {
            const text = $(selector).first().text();
            const match = text.match(/(\d+)/);
            if (match) return parseInt(match[1]);
        }
        return null;
    }

    private extractImageUrl($: any, baseUrl: string): string | null {
        const selectors = ['.recipe-image img', '.recipe-photo img', 'img[src*="recipe"]'];
        for (const selector of selectors) {
            let src = $(selector).first().attr('src') || $(selector).first().attr('data-src');
            if (src) {
                if (src.startsWith('//')) src = 'https:' + src;
                else if (src.startsWith('/')) src = new URL(baseUrl).origin + src;
                return src;
            }
        }
        return null;
    }

    private extractIngredients($: any): Array<{ name: string; quantity?: string; unit?: string }> {
        const selectors = ['.recipe-ingredients', '.ingredients', '.ingredient-list'];
        for (const selector of selectors) {
            const ingredients: any[] = [];
            $(selector).find('li, .ingredient').each((i: number, el: any) => {
                const text = $(el).text().trim();
                if (text) {
                    const parsed = parseIngredientText(text);
                    if (parsed) ingredients.push(parsed);
                }
            });
            if (ingredients.length > 0) return ingredients;
        }
        return [];
    }
}

export const cheerioScraperService = new CheerioScraperService();
