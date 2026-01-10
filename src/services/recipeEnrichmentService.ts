import Database from "../config/database";
import { Recipe, RecipeIngredient, MealPlanItem } from "../models";
import { recipeScraperManager } from "./scrapers/recipe_scraper_manager.service";
import { ScrapedRecipeData } from "../types/scraped_recipe.type";
import { DishIdea } from "../types/dish_idea.type";
import { Repository } from "typeorm";
import { IngredientService } from "./ingredientService";
import Redis from "ioredis";
import { DistributedLock } from "../utils/distributedLock";

/**
 * Service for enriching meal plans with scraped recipe data
 * Uses distributed locking to prevent duplicate scraping across servers
 */
export class RecipeEnrichmentService {
    private recipeRepository: Repository<Recipe>;
    private recipeIngredientRepository: Repository<RecipeIngredient>;
    private mealPlanItemRepository: Repository<MealPlanItem>;
    private ingredientService: IngredientService;
    private distributedLock: DistributedLock;

    constructor() {
        const db = Database.getInstance();
        this.recipeRepository = db.getRepository(Recipe);
        this.recipeIngredientRepository = db.getRepository(RecipeIngredient);
        this.mealPlanItemRepository = db.getRepository(MealPlanItem);
        this.ingredientService = new IngredientService();
        
        // Initialize Redis for distributed locking
        const redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
        });
        this.distributedLock = new DistributedLock(redis);
    }

    /**
     * Enrich a single dish with scraped recipe data
     * Uses distributed locking to coordinate with nutrition_backend
     */
    async enrichSingleDish(
        dish: DishIdea,
        userId: string,
        mealPlanId: string
    ): Promise<{ success: boolean; recipeId?: string; error?: string }> {
        try {
            if (!dish.source_url) {
                return { success: false, error: 'No source URL provided' };
            }

            // Find the recipe that needs enrichment
            const recipe = await this.recipeRepository.findOne({ 
                where: { url: dish.source_url }
            });

            if (!recipe) {
                return { success: false, error: 'Recipe not found in database' };
            }

            // Check if recipe is already enriched (has ingredients)
            const ingredientsCount = await this.recipeIngredientRepository.count({
                where: { recipe_id: recipe.id }
            });

            if (ingredientsCount > 0) {
                console.log(`♻️ Recipe already enriched: ${recipe.id}`);
                return { success: true, recipeId: recipe.id };
            }

            // Create lock key from URL (same format as nutrition_backend)
            const urlHash = Buffer.from(dish.source_url).toString('base64').substring(0, 50);
            const lockKey = `recipe:url:${urlHash}`;

            // Check if another process is already scraping this URL
            const isLocked = await this.distributedLock.isLocked(lockKey);
            if (isLocked) {
                console.log(`⏳ Recipe being scraped, waiting...`);
                await this.waitForEnrichment(recipe.id, 30);
                
                // Check if recipe is enriched now
                const enrichedCount = await this.recipeIngredientRepository.count({
                    where: { recipe_id: recipe.id }
                });
                
                if (enrichedCount > 0) {
                    return { success: true, recipeId: recipe.id };
                }
                return { success: false, error: 'Timeout waiting for enrichment' };
            }

            // Acquire lock
            const lockAcquired = await this.distributedLock.acquire(lockKey, 300);
            if (!lockAcquired) {
                return { success: false, error: 'Could not acquire lock' };
            }

            try {
                // Double-check recipe hasn't been enriched (race condition prevention)
                const ingredientsCount = await this.recipeIngredientRepository.count({
                    where: { recipe_id: recipe.id }
                });
                
                if (ingredientsCount > 0) {
                    console.log(`♻️ Recipe was enriched while acquiring lock: ${recipe.id}`);
                    return { success: true, recipeId: recipe.id };
                }

                // Scrape recipe data
                console.log(`🔍 Scraping: ${dish.source_url}`);
                const scrapedData = await recipeScraperManager.scrapeRecipe(dish.source_url);

                // Update recipe with scraped data
                await this.updateRecipe(recipe, scrapedData);
                
                // Save ingredients
                await this.saveIngredients(recipe.id, scrapedData.ingredients);

                console.log(`✅ Enriched: ${dish.dish_name}`);
                return { success: true, recipeId: recipe.id };

            } finally {
                await this.distributedLock.release(lockKey);
            }

        } catch (error: any) {
            console.error(`❌ Failed to enrich ${dish.dish_name}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Enrich multiple dishes for a meal plan
     */
    async enrichMealPlan(
        mealPlanId: string,
        userId: string,
        dishIdeas: DishIdea[]
    ): Promise<{
        successCount: number;
        failureCount: number;
        results: Array<{ dish: string; success: boolean; recipeId?: string; error?: string }>;
    }> {
        console.log(`[RecipeEnrichment] Starting enrichment for ${dishIdeas.length} dishes`);

        const results = [];
        let successCount = 0;
        let failureCount = 0;

        for (const dish of dishIdeas) {
            const result = await this.enrichSingleDish(dish, userId, mealPlanId);
            
            results.push({
                dish: dish.dish_name,
                success: result.success,
                recipeId: result.recipeId,
                error: result.error,
            });

            if (result.success) {
                successCount++;
            } else {
                failureCount++;
            }

            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`[RecipeEnrichment] Completed: ${successCount}/${dishIdeas.length} successful`);
        return { successCount, failureCount, results };
    }

    /**
     * Update existing recipe with scraped data
     */
    private async updateRecipe(
        recipe: Recipe,
        scrapedData: ScrapedRecipeData
    ): Promise<void> {
        recipe.name = scrapedData.name || recipe.name;
        recipe.description = scrapedData.description || recipe.description;
        recipe.instructions = scrapedData.instructions || 'Instructions not available';
        recipe.prep_time_minutes = scrapedData.prep_time_minutes || 15;
        recipe.cook_time_minutes = scrapedData.cook_time_minutes || 30;
        recipe.servings = scrapedData.servings || 4;
        recipe.image_url = scrapedData.image_url ?? recipe.image_url;
        recipe.cuisine_type = scrapedData.cuisine_type ?? recipe.cuisine_type;
        recipe.difficulty_level = scrapedData.difficulty_level || 'medium';

        await this.recipeRepository.save(recipe);
    }

    /**
     * Save recipe ingredients to database
     */
    private async saveIngredients(
        recipeId: string,
        ingredients: Array<{ name: string; quantity?: string; unit?: string, category_name?: string }>,
    ): Promise<void> {
        if (!ingredients || ingredients.length === 0) {
            console.log(`⚠️ [RecipeEnrichment] No ingredients to save for recipe ${recipeId}`);
            return;
        }

        for (let i = 0; i < ingredients.length; i++) {
            const ing = ingredients[i];
            
            try {
                // Use existing ingredient service to find or create ingredient
                const ingredient = await this.ingredientService.findOrCreateIngredient(
                    ing.name,
                    ing.name, // Use ingredient name as search term for image
                    undefined,
                    ing.category_name // Use provided category name
                );

                // Parse quantity (convert string to number if possible)
                let quantity = 1;
                if (ing.quantity) {
                    const parsed = parseFloat(ing.quantity || "0") || 0;
                    if (!isNaN(parsed)) {
                        quantity = parsed;
                    }
                }

                // Create recipe ingredient
                const recipeIngredient = this.recipeIngredientRepository.create({
                    recipe_id: recipeId,
                    ingredient_id: ingredient.id,
                    quantity: quantity,
                    unit: ing.unit || 'piece',
                    sort_order: i,
                });

                await this.recipeIngredientRepository.save(recipeIngredient);
            } catch (error: any) {
                console.error(`❌ Failed to save ingredient ${ing.name}:`, error.message);
                // Continue with other ingredients
            }
        }
    }

    /**
     * Wait for recipe enrichment to complete (when another process is scraping)
     */
    private async waitForEnrichment(recipeId: string, timeoutSeconds: number): Promise<void> {
        const startTime = Date.now();
        const timeout = timeoutSeconds * 1000;

        while (Date.now() - startTime < timeout) {
            const ingredientsCount = await this.recipeIngredientRepository.count({
                where: { recipe_id: recipeId }
            });
            
            if (ingredientsCount > 0) return;
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}
