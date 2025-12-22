import { ScrapedRecipeData } from "../../types/scraped_recipe.type";

/**
 * Interface for recipe scraping implementations
 * Allows multiple scraping strategies (Cheerio, Parsera, Puppeteer, etc.)
 */
export interface IRecipeScraper {
    /**
     * Check if this scraper can handle the given URL
     * @param url - Recipe URL to scrape
     * @returns true if scraper is available and can handle this URL
     */
    canHandle(url: string): boolean | Promise<boolean>;

    /**
     * Scrape recipe data from URL
     * @param url - Recipe URL to scrape
     * @returns Scraped recipe data in standardized format
     * @throws Error if scraping fails
     */
    scrape(url: string): Promise<ScrapedRecipeData>;

    /**
     * Name of the scraper (for logging/debugging)
     */
    readonly name: string;
}
