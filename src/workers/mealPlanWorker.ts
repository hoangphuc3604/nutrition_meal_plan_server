import { Worker } from "bullmq";
import { MealPlanService } from "../services/mealPlanService";
import MessageQueueEnum from "../enums/message.enum";
import * as dotenv from "dotenv";

dotenv.config();

export function handleMealPlanWorker(connection: any) {
  const mealPlanService = new MealPlanService();

  const worker = new Worker(
    MessageQueueEnum.MEAL_GENERATION,
    async (job) => {
      const { userId, startDate, numDays = 6, initialMealPlan } = job.data;
      
      console.log(`[WORKER] - Processing job ${job.id}`);
      console.log(`[INFO] - Generating ${numDays} remaining days for user: ${userId}`);
      console.log(`[INFO] - Start date: ${startDate}`);
      console.log(`[INFO] - Initial meal plan ID: ${initialMealPlan?.id}`);
      
      try {
        const result = await mealPlanService.generateRemainingWeekDays(userId, numDays);
        
        console.log(`[SUCCESS] - Meal plan generation completed for user: ${userId}`);
        console.log(`[INFO] - Generated ${result.details.days_successful}/${numDays} days`);
        console.log(`[INFO] - Total items saved: ${result.details.items_saved}`);
        
        return {
          success: true,
          userId,
          mealPlanId: result.mealPlanId,
          daysGenerated: result.details.days_successful,
          itemsSaved: result.details.items_saved,
        };
      } catch (error: any) {
        console.error(`[ERROR] - Job ${job.id} failed for user ${userId}:`, error.message);
        throw error;
      }
    },
    {
      connection,
      concurrency: 2, // Process up to 2 jobs simultaneously
      limiter: {
        max: 5, // Max 5 jobs
        duration: 60000, // per 60 seconds (to avoid API rate limits)
      },
    }
  );

  worker.on("completed", (job, result: any) => {
    console.log(`[GEN_MEAL_PLAN] Job ${job.id} completed successfully`);
    console.log(`[INFO] - Result: User ${result.userId} - ${result.daysGenerated} days generated`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[GEN_MEAL_PLAN] Job ${job?.id} failed: ${err.message}`);
  });

  console.log("[INIT] Worker started for queue: gen_meal_plan");
  return worker;
}


