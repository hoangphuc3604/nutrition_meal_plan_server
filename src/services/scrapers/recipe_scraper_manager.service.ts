import { IRecipeScraper } from "./IRecipeScraper.interface";
import { ScrapedRecipeData } from "../../types/scraped_recipe.type";
import { cheerioScraperService } from "./cheerio_scraper.service";
import { playwrightScraperService } from "./playwright_scraper.service";

/**
 * Recipe Scraper Manager
 * Orchestrates multiple scraping strategies with fallback chain
 * 
 * Priority order:
 * 1. Cheerio (Fast, works for structured sites with JSON-LD)
 * 2. Playwright (Reliable, works on any site)
 * 
 * Usage:
 * const data = await recipeScraperManager.scrapeRecipe(url);
 */
export class RecipeScraperManager {
    private scrapers: IRecipeScraper[];

    constructor(scrapers?: IRecipeScraper[]) {
        // Default scraper chain: Cheerio → Playwright
        this.scrapers = scrapers || [
            cheerioScraperService,     // Try fast static parsing first
            playwrightScraperService,  // Fallback to browser rendering
        ];
    }

    /**
     * Scrape recipe using available scrapers with automatic fallback
     * Tries each scraper in order until one succeeds
     */
    async scrapeRecipe(url: string): Promise<ScrapedRecipeData> {
        const errors: Array<{ scraper: string; error: string }> = [];

        for (const scraper of this.scrapers) {
            // Check if scraper can handle this URL
            const canHandle = await Promise.resolve(scraper.canHandle(url));
            
            if (!canHandle) {
                console.log(`⏭️ [${scraper.name}] Skipped (not available or cannot handle URL)`);
                continue;
            }

            try {
                console.log(`🔄 [RecipeScraperManager] Trying: ${scraper.name}`);
                const result = await scraper.scrape(url);
                console.log(`✅ [RecipeScraperManager] Success with ${scraper.name}`);
                return result;
            } catch (error: any) {
                console.warn(`⚠️ [${scraper.name}] Failed: ${error.message}`);
                errors.push({
                    scraper: scraper.name,
                    error: error.message
                });
                // Continue to next scraper
            }
        }

        // All scrapers failed
        const errorSummary = errors
            .map(e => `${e.scraper}: ${e.error}`)
            .join('; ');
        
        throw new Error(`All scrapers failed. Errors: ${errorSummary}`);
    }

    /**
     * Add a custom scraper to the chain
     * @param scraper - Custom scraper implementation
     * @param priority - Insert at beginning (true) or end (false)
     */
    addScraper(scraper: IRecipeScraper, priority: boolean = false): void {
        if (priority) {
            this.scrapers.unshift(scraper);
        } else {
            this.scrapers.push(scraper);
        }
        console.log(`➕ Added scraper: ${scraper.name} (${priority ? 'high' : 'low'} priority)`);
    }

    /**
     * Get list of available scrapers
     */
    getAvailableScrapers(): string[] {
        return this.scrapers.map(s => s.name);
    }
}

// Export singleton instance
export const recipeScraperManager = new RecipeScraperManager();
