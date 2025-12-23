import { Worker } from "bullmq";
import { RecipeEnrichmentService } from "../services/recipeEnrichmentService";
import MessageQueueEnum from "../enums/message.enum";
import { RecipeEnrichmentJobData } from "../types/dish_idea.type";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Worker for recipe enrichment queue
 * Processes background jobs to scrape recipe details from URLs
 * and enrich meal plans with full recipe data
 */
export function handleRecipeEnrichmentWorker(connection: any) {
    const enrichmentService = new RecipeEnrichmentService();

    const worker = new Worker(
        MessageQueueEnum.RECIPE_ENRICHMENT,
        async (job) => {
            const { mealPlanId, userId, dishIdeas } = job.data as RecipeEnrichmentJobData;

            console.log(`[WORKER] - Processing job ${job.id}`);
            console.log(`[INFO] - Enriching ${dishIdeas.length} recipes for meal plan: ${mealPlanId}`);
            console.log(`[INFO] - User: ${userId}`);

            try {
                const result = await enrichmentService.enrichMealPlan(
                    mealPlanId,
                    userId,
                    dishIdeas
                );

                console.log(`[SUCCESS] - Recipe enrichment completed for meal plan: ${mealPlanId}`);
                console.log(`[INFO] - Successful: ${result.successCount}/${dishIdeas.length}`);
                console.log(`[INFO] - Failed: ${result.failureCount}/${dishIdeas.length}`);

                // Log failures
                if (result.failureCount > 0) {
                    console.log(`[WARNING] - Failed dishes:`);
                    result.results
                        .filter(r => !r.success)
                        .forEach(r => {
                            console.log(`  ❌ ${r.dish}: ${r.error}`);
                        });
                }

                return {
                    success: true,
                    mealPlanId,
                    userId,
                    successCount: result.successCount,
                    failureCount: result.failureCount,
                    results: result.results,
                };
            } catch (error: any) {
                console.error(`[ERROR] - Job ${job.id} failed for meal plan ${mealPlanId}:`, error.message);
                throw error;
            }
        },
        {
            connection,
            concurrency: 1, // Process one enrichment job at a time (scraping is heavy)
            limiter: {
                max: 3, // Max 3 jobs
                duration: 60000, // per 60 seconds (to avoid overwhelming scrapers)
            },
        }
    );

    worker.on("completed", (job, result: any) => {
        console.log(`[RECIPE_ENRICHMENT] Job ${job.id} completed successfully`);
        console.log(`[INFO] - Meal Plan: ${result.mealPlanId}`);
        console.log(`[INFO] - Success Rate: ${result.successCount}/${result.successCount + result.failureCount}`);
    });

    worker.on("failed", (job, err) => {
        console.error(`[RECIPE_ENRICHMENT] Job ${job?.id} failed: ${err.message}`);
        if (job) {
            console.error(`[INFO] - Meal Plan: ${job.data?.mealPlanId}`);
            console.error(`[INFO] - User: ${job.data?.userId}`);
        }
    });

    worker.on("error", (err) => {
        console.error(`[RECIPE_ENRICHMENT] Worker error:`, err.message);
    });

    console.log("[INIT] Worker started for queue: recipe_enrichment");
    return worker;
}
