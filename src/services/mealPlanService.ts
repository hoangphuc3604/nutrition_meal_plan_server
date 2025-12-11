import Database from "../config/database";
import {
    User,
    UserProfile,
    MealPlan,
    MealPlanItem,
    Recipe,
    RecipeIngredient,
    MealType,
} from "../models";
import { GoogleGeminiModel } from "./llmService";
import { IngredientService } from "./ingredientService";
import { CategoryService } from "./categoryService";
import {
    buildSingleDayMealPlanPrompt,
    GeneratedRecipe,
    getStartOfWeek,
} from "../utils/prompt.builder";
import { BadRequestError } from "../core/error.response";
import { Repository } from "typeorm";
import { getUnsplashImage } from "../utils/image_searching.util";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import MessageQueueEnum from "../enums/message.enum";
import * as dotenv from "dotenv";
import { LLM_CONFIG } from "../config/llm.config";
import { GENERATION_CONFIG } from "../config/generation.config";
import { MealPlanResponse } from "../utils/meal_plan.schema";

dotenv.config();

/**
 * Interface for AI response - creates NEW recipes with full details
 */
interface AIRecipeResponse {
    name: string;
    description: string;
    searching: string; // Search terms for image generation
    cuisine_type: string;
    difficulty_level: "easy" | "medium" | "hard";
    prep_time_minutes: number;
    cook_time_minutes: number;
    servings: number;
    ingredients: Array<{
        name: string;
        searching: string; // Search terms for ingredient image
        quantity: number;
        unit: string;
        category_name?: string; // Optional category name from AI
    }>;
    instructions: string;
    nutritional_info: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
}

function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export class MealPlanService {
    private llmService: GoogleGeminiModel;
    private ingredientService: IngredientService;
    private categoryService: CategoryService;
    private recipeImageQueue: Queue;
    private ingredientImageQueue: Queue;

    constructor() {
        this.llmService = new GoogleGeminiModel();
        this.ingredientService = new IngredientService();
        this.categoryService = new CategoryService();
        
        // Initialize Redis connection and queues
        const connection = new Redis({
            host: process.env.REDIS_HOST || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: null,
        });

        this.recipeImageQueue = new Queue(MessageQueueEnum.RECIPE_IMAGE_GENERATION, {
            connection,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: "exponential", delay: 2000 },
                removeOnComplete: { age: 24 * 3600, count: 100 },
                removeOnFail: { age: 7 * 24 * 3600 },
            },
        });

        this.ingredientImageQueue = new Queue(MessageQueueEnum.IMAGE_GENERATION, {
            connection,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: "exponential", delay: 2000 },
                removeOnComplete: { age: 24 * 3600, count: 100 },
                removeOnFail: { age: 7 * 24 * 3600 },
            },
        });
    }

    /**
     * Generate remaining days of meal plan using AI - ONE DAY AT A TIME
     * Creates NEW recipes (doesn't select from existing)
     * Saves each day immediately after generation to avoid data loss
     *
     * @param userId - User ID
     * @param numDays - Number of days to generate (default 6 for days 2-7)
     */
    async generateRemainingWeekDays(
        userId: string,
        numDays: number = 6,
        startDateInput?: string
    ): Promise<{
        mealPlanId: string;
        message: string;
        details: any;
        startDate: string;
        endDate: string;
    }> {
        console.log(`[INFO] - Generating ${numDays} days for user ${userId}`);

        try {
            // 1. Get user and profile
            const userRepo = Database.getRepository(User);
            const profileRepo = Database.getRepository(UserProfile);
            const mealPlanRepo = Database.getRepository(MealPlan);

            const user = await userRepo.findOne({ where: { id: userId } });
            if (!user) {
                throw new BadRequestError("User not found");
            }

            const profile = (await profileRepo.findOne({
                where: { user: { id: userId } },
            })) as UserProfile | null;

            // 2. Get recipe history to avoid duplicates
            const recipeHistory = await this.getUserMealPlanHistory(
                userId,
                mealPlanRepo as Repository<MealPlan>
            );
            console.log(
                `[INFO] - Retrieved ${recipeHistory.length} past meal plans for history`
            );

            // 3. Calculate generation start (tomorrow) and week range
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate =
                startDateInput && !isNaN(Date.parse(startDateInput))
                    ? new Date(startDateInput)
                    : new Date(today);
            if (!startDateInput) {
                startDate.setDate(startDate.getDate() + 1);
            }
            const startDateStr = formatDateLocal(startDate);
            const weekStart = getStartOfWeek(startDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekStartStr = formatDateLocal(weekStart);
            const weekEndStr = formatDateLocal(weekEnd);

            // 4. Find or create meal plan (do this ONCE at the beginning)
            let mealPlan = await mealPlanRepo.findOne({
                where: {
                    user: { id: userId },
                    start_date: weekStartStr,
                    end_date: weekEndStr,
                    is_active: true,
                },
            });

            if (!mealPlan) {
                mealPlan = new MealPlan();
                mealPlan.user = { id: userId } as User;
                mealPlan.name = `AI Weekly Plan - ${weekStartStr}`;
                mealPlan.start_date = weekStartStr;
                mealPlan.end_date = weekEndStr;
                mealPlan.ai_generated = true;
                mealPlan.is_active = true;
                mealPlan.notes = `Generated by AI Meal Plan Server (${numDays} days, iterative)`;

                mealPlan = await mealPlanRepo.save(mealPlan);
                console.log(
                    `[SUCCESS] - Created new meal plan: ${mealPlan.id}`
                );
            } else {
                console.log(
                    `[SUCCESS] - Using existing meal plan: ${mealPlan.id}`
                );
            }

            // 5. Track recipes generated in this session for uniqueness
            const currentSessionRecipes: GeneratedRecipe[] = [];
            let totalSavedItems = 0;
            const generationResults = [];

            // 6. GENERATE EACH DAY ONE BY ONE
            for (let dayIndex = 0; dayIndex < numDays; dayIndex++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(currentDate.getDate() + dayIndex);
                const currentDateStr = formatDateLocal(currentDate);

                console.log(
                    `[INFO] - Generating day ${
                        dayIndex + 1
                    } (${currentDateStr})...`
                );

                try {
                    // Get available categories from database
                    const availableCategories =
                        await this.categoryService.getCategoriesForAI();

                    // Build prompt for single day with current session recipes
                    const prompt = buildSingleDayMealPlanPrompt(
                        profile || {},
                        currentDateStr,
                        recipeHistory,
                        currentSessionRecipes,
                        availableCategories
                    );

                    console.log(
                        `[INFO] - Calling AI for day ${currentDateStr}...`
                    );

                    // Call AI to generate ONE day (validated)
                    const aiResponse = await this.llmService.generateResponse(
                        prompt
                    );

                    if (
                        !aiResponse.success ||
                        !aiResponse.data?.plans ||
                        aiResponse.data.plans.length === 0
                    ) {
                        console.error(
                            `[ERROR] - Failed to generate day ${currentDateStr}`
                        );
                        generationResults.push({
                            date: currentDateStr,
                            success: false,
                            error: "AI generation failed",
                        });
                        continue; // Skip this day but continue with next
                    }

                    const dayPlan = aiResponse.data.plans[0]; // Should only have 1 day

                    // Save this day's recipes and meal plan items
                    let dayItemsCount = 0;
                    const dayRecipes: GeneratedRecipe[] = [];

                    // Use transaction for each day
                    const queryRunner =
                        Database.getInstance().createQueryRunner();
                    await queryRunner.connect();
                    await queryRunner.startTransaction();

                    try {
                        for (const meal of dayPlan.meals) {
                            const existingItems = await queryRunner.manager.find(MealPlanItem, {
                                where: {
                                    meal_plan: { id: mealPlan.id },
                                    meal_date: meal.meal_date,
                                },
                            });
                            if (existingItems.length > 0) {
                                await queryRunner.manager.remove(MealPlanItem, existingItems);
                            }
                            for (const aiRecipe of meal.recipes) {
                                const recipeInput: AIRecipeResponse = {
                                    ...aiRecipe,
                                    description: aiRecipe.description ?? "",
                                    searching: aiRecipe.searching ?? aiRecipe.name,
                                    cuisine_type: aiRecipe.cuisine_type ?? "unknown",
                                    difficulty_level: aiRecipe.difficulty_level ?? "easy",
                                    prep_time_minutes: aiRecipe.prep_time_minutes ?? 0,
                                    cook_time_minutes: aiRecipe.cook_time_minutes ?? 0,
                                    servings: aiRecipe.servings ?? 1,
                                    ingredients: (aiRecipe.ingredients ?? []).map((ing: any) => ({
                                        ...ing,
                                        searching: ing.searching ?? ing.name,
                                    })),
                                    instructions: aiRecipe.instructions ?? "",
                                    nutritional_info: aiRecipe.nutritional_info ?? {
                                        calories: 0,
                                        protein: 0,
                                        carbs: 0,
                                        fats: 0,
                                    },
                                };
                                // Create NEW recipe from AI response
                                const recipe = await this.createRecipeFromAI(
                                    recipeInput,
                                    userId,
                                    queryRunner
                                );

                                // Create meal plan item
                                const mealPlanItem = new MealPlanItem();
                                mealPlanItem.meal_plan = mealPlan as MealPlan;
                                mealPlanItem.recipe = recipe;
                                mealPlanItem.meal_date = meal.meal_date;
                                mealPlanItem.meal_type =
                                    meal.meal_type as MealType;
                                mealPlanItem.servings = recipeInput.servings;
                                mealPlanItem.is_completed = false;

                                await queryRunner.manager.save(
                                    MealPlanItem,
                                    mealPlanItem
                                );
                                dayItemsCount++;

                                // Track this recipe for uniqueness in next days
                                dayRecipes.push({
                                    name: aiRecipe.name,
                                    date: currentDateStr,
                                    meal_type: meal.meal_type,
                                    main_ingredients: aiRecipe.ingredients
                                        .slice(0, 3)
                                        .map((ing: any) => ing.name),
                                });
                            }
                        }

                        await queryRunner.commitTransaction();
                        console.log(
                            `[SUCCESS] - Day ${currentDateStr} saved: ${dayItemsCount} items`
                        );
                        if (aiResponse.tokenUsage) {
                            console.log(
                                `[INFO] - LLM tokens day ${currentDateStr}`,
                                JSON.stringify(aiResponse.tokenUsage)
                            );
                        }

                        // Add to session history
                        currentSessionRecipes.push(...dayRecipes);
                        totalSavedItems += dayItemsCount;

                        generationResults.push({
                            date: currentDateStr,
                            success: true,
                            items: dayItemsCount,
                            recipes: dayRecipes.map((r) => r.name),
                        });
                    } catch (error) {
                        await queryRunner.rollbackTransaction();
                        console.error(
                            `[ERROR] - Error saving day ${currentDateStr}:`,
                            error
                        );
                        generationResults.push({
                            date: currentDateStr,
                            success: false,
                            error: (error as Error).message,
                        });
                    } finally {
                        await queryRunner.release();
                    }
                } catch (error) {
                    console.error(
                        `[ERROR] - Error generating day ${currentDateStr}:`,
                        error
                    );
                    generationResults.push({
                        date: currentDateStr,
                        success: false,
                        error: (error as Error).message,
                    });
                }

                // Small delay between API calls to avoid rate limiting
                if (dayIndex < numDays - 1) {
                    await new Promise((resolve) => setTimeout(resolve, GENERATION_CONFIG.dayDelayMs));
                }
            }

            // 8. Summary
            const successfulDays = generationResults.filter(
                (r) => r.success
            ).length;
            const failedDays = generationResults.filter(
                (r) => !r.success
            ).length;

            console.log(`[SUCCESS] - Meal plan generation complete`);
            console.log(
                `[INFO] - Successful: ${successfulDays}/${numDays} days`
            );
            console.log(`[INFO] - Failed: ${failedDays} days`);
            console.log(`[INFO] - Total items saved: ${totalSavedItems}`);

            return {
                mealPlanId: mealPlan.id,
                message: `${successfulDays}/${numDays} days generated successfully`,
                details: {
                    start_date: mealPlan.start_date,
                    end_date: mealPlan.end_date,
                    days_requested: numDays,
                    days_successful: successfulDays,
                    days_failed: failedDays,
                    items_saved: totalSavedItems,
                    generation_results: generationResults,
                },
                startDate: formatDateLocal(startDate),
                endDate: formatDateLocal(new Date(startDate.getTime() + (numDays - 1) * 86400000)),
            };
        } catch (error) {
            console.error("[ERROR] - Error in meal plan generation:", error);
            throw error;
        }
    }

    /**
     * Create recipe from AI response with image generation
     */
    private async createRecipeFromAI(
        aiRecipe: AIRecipeResponse,
        userId: string,
        queryRunner: any
    ): Promise<Recipe> {
        // Create recipe
        const recipe = new Recipe();
        recipe.name = aiRecipe.name;
        recipe.description = aiRecipe.description;
        recipe.cuisine_type = aiRecipe.cuisine_type;
        recipe.difficulty_level = aiRecipe.difficulty_level;
        recipe.prep_time_minutes = aiRecipe.prep_time_minutes;
        recipe.cook_time_minutes = aiRecipe.cook_time_minutes;
        recipe.servings = aiRecipe.servings;
        recipe.instructions = aiRecipe.instructions;
        recipe.created_by = userId;
        recipe.ai_generated = true;
        recipe.is_active = true;
        recipe.is_public = false;

        // Generate image URL from Unsplash
        try {
            const imageUrl = await getUnsplashImage(aiRecipe.searching);
            recipe.image_url = imageUrl || "https://via.placeholder.com/400x300?text=Recipe";
        } catch (error) {
            console.warn(`[RECIPE IMAGE] - Failed to fetch image for "${aiRecipe.searching}":`, error);
            recipe.image_url = "https://via.placeholder.com/400x300?text=Recipe";
        }

        const savedRecipe = await queryRunner.manager.save(Recipe, recipe);

        // Enqueue image processing job if we got an image URL
        if (recipe.image_url && recipe.image_url !== "https://via.placeholder.com/400x300?text=Recipe") {
            try {
                await this.recipeImageQueue.add("recipe_image_processed", {
                    recipeId: savedRecipe.id,
                    url: recipe.image_url
                }, {
                    jobId: `recipe_image_${savedRecipe.id}_${Date.now()}`,
                    priority: 1,
                });
                console.log(`[RECIPE IMAGE] - Enqueued image processing job for recipe: ${savedRecipe.name}`);
            } catch (error) {
                console.error(`[RECIPE IMAGE] - Failed to enqueue image job for recipe ${savedRecipe.name}:`, error);
            }
        }

        // Create ingredients and recipe_ingredients using IngredientService
        for (let i = 0; i < aiRecipe.ingredients.length; i++) {
            const aiIngredient = aiRecipe.ingredients[i];

            // Find or create ingredient using IngredientService with category and image search
            const ingredient =
                await this.ingredientService.findOrCreateIngredient(
                    aiIngredient.name,
                    aiIngredient.searching, // Pass searching term for image generation
                    queryRunner,
                    aiIngredient.category_name // Pass category name from AI
                );

            // Create recipe_ingredient
            const recipeIngredient = new RecipeIngredient();
            recipeIngredient.recipe_id = savedRecipe.id;
            recipeIngredient.ingredient_id = ingredient.id;
            recipeIngredient.recipe = savedRecipe;
            recipeIngredient.ingredient = ingredient;
            recipeIngredient.quantity = aiIngredient.quantity;
            recipeIngredient.unit = aiIngredient.unit;
            recipeIngredient.is_optional = false;
            recipeIngredient.sort_order = i + 1;

            await queryRunner.manager.save(RecipeIngredient, recipeIngredient);
        }

        return savedRecipe;
    }

    /**
     * Get user's meal plan history to avoid duplicates
     */
    private async getUserMealPlanHistory(
        userId: string,
        mealPlanRepo: Repository<MealPlan>
    ): Promise<MealPlan[]> {
        try {
            const recentPlans = await mealPlanRepo.find({
                where: {
                    user: { id: userId },
                    is_active: true,
                },
                relations: ["mealPlanItems", "mealPlanItems.recipe"],
                order: {
                    start_date: "DESC",
                },
                take: GENERATION_CONFIG.maxPlansToScan,
            });

            return recentPlans;
        } catch (error) {
            console.warn("[WARNING] - Could not fetch recipe history:", error);
            return [];
        }
    }
}

export default new MealPlanService();
