import Database from "../config/database";
import { Recipe, RecipeIngredient, MealPlanItem } from "../models";
import { recipeScraperManager } from "./scrapers/recipe_scraper_manager.service";
import { ScrapedRecipeData } from "../types/scraped_recipe.type";
import { DishIdea } from "../types/dish_idea.type";
import { Repository } from "typeorm";
import { IngredientService } from "./ingredientService";
import { CategoryService } from "./categoryService";

/**
 * Service for enriching meal plans with scraped recipe data
 * Handles scraping, database operations, and meal plan updates
 */
export class RecipeEnrichmentService {
    private recipeRepository: Repository<Recipe>;
    private recipeIngredientRepository: Repository<RecipeIngredient>;
    private mealPlanItemRepository: Repository<MealPlanItem>;
    private ingredientService: IngredientService;
    private categoryService: CategoryService;

    constructor() {
        const db = Database.getInstance();
        this.recipeRepository = db.getRepository(Recipe);
        this.recipeIngredientRepository = db.getRepository(RecipeIngredient);
        this.mealPlanItemRepository = db.getRepository(MealPlanItem);
        this.ingredientService = new IngredientService();
        this.categoryService = new CategoryService();
    }

    /**
     * Enrich a single dish with scraped recipe data
     */
    async enrichSingleDish(
        dish: DishIdea,
        userId: string,
        mealPlanId: string
    ): Promise<{ success: boolean; recipeId?: string; error?: string }> {
        try {
            console.log(`[RecipeEnrichment] Processing dish: ${dish.dish_name}`);

            if (!dish.source_url) {
                console.log(`⚠️ [RecipeEnrichment] No URL for ${dish.dish_name}`);
                return { success: false, error: 'No source URL provided' };
            }

            // Scrape recipe data
            const scrapedData = await recipeScraperManager.scrapeRecipe(dish.source_url);

            // Save recipe to database
            const recipe = await this.saveRecipe(scrapedData, userId, dish);

            // Save ingredients
            await this.saveIngredients(recipe.id, scrapedData.ingredients);

            // Update meal plan item
            await this.updateMealPlanItem(mealPlanId, dish, recipe.id);

            console.log(`✅ [RecipeEnrichment] Successfully enriched: ${dish.dish_name}`);
            return { success: true, recipeId: recipe.id };

        } catch (error: any) {
            console.error(`❌ [RecipeEnrichment] Failed to enrich ${dish.dish_name}:`, error.message);
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
     * Save scraped recipe to database
     */
    private async saveRecipe(
        scrapedData: ScrapedRecipeData,
        userId: string,
        dish: DishIdea
    ): Promise<Recipe> {
        const recipe = new Recipe();
        recipe.name = scrapedData.name || dish.dish_name;
        recipe.url = scrapedData.url || dish.source_url || '';
        recipe.description = dish.description || `Recipe imported from ${new URL(scrapedData.url).hostname}`;
        recipe.instructions = scrapedData.instructions || 'Instructions not available';
        recipe.prep_time_minutes = scrapedData.prep_time_minutes || 15;
        recipe.cook_time_minutes = scrapedData.cook_time_minutes || 30;
        recipe.servings = scrapedData.servings || 4;
        recipe.image_url = scrapedData.image_url ?? '';
        recipe.cuisine_type = scrapedData.cuisine_type ?? dish.cuisine_type ?? '';
        recipe.difficulty_level = scrapedData.difficulty_level || 'medium';
        recipe.created_by = userId;
        recipe.is_active = true;
        recipe.is_public = false;
        recipe.ai_generated = false;

        return await this.recipeRepository.save(recipe);
    }

    /**
     * Save recipe ingredients to database
     */
    private async saveIngredients(
        recipeId: string,
        ingredients: Array<{ name: string; quantity?: string; unit?: string }>
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
                    undefined // Will use "Other" category by default
                );

                // Parse quantity (convert string to number if possible)
                let quantity = 1;
                if (ing.quantity) {
                    const parsed = parseFloat(ing.quantity.replace(/[^\d.]/g, ''));
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
     * Update meal plan item to reference the scraped recipe
     */
    private async updateMealPlanItem(
        mealPlanId: string,
        dish: DishIdea,
        recipeId: string
    ): Promise<void> {
        try {
            const items = await this.mealPlanItemRepository
                .createQueryBuilder('item')
                .where('item.meal_plan = :mealPlanId', { mealPlanId })
                .andWhere('item.meal_date = :mealDate', { mealDate: dish.date })
                .andWhere('item.meal_type = :mealType', { mealType: dish.meal_type })
                .getMany();

            if (items.length === 0) {
                console.warn(`⚠️ No meal plan item found for ${dish.dish_name} on ${dish.date} ${dish.meal_type}`);
                return;
            }

            // Update first matching item
            const item = items[0];
            await this.mealPlanItemRepository
                .createQueryBuilder()
                .update(MealPlanItem)
                .set({ recipe: { id: recipeId } as any })
                .where('id = :id', { id: item.id })
                .execute();

            console.log(`✅ Updated meal plan item for ${dish.dish_name}`);
        } catch (error: any) {
            console.error(`❌ Failed to update meal plan item:`, error.message);
            throw error;
        }
    }
}
