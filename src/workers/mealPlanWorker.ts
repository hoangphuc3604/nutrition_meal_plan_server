import { Worker, Queue } from "bullmq";
import { Redis } from "ioredis";
import Database from "../config/database";
import { MealPlanService } from "../services/mealPlanService";
import * as dotenv from "dotenv";

dotenv.config();

// Create Redis connection for BullMQ
const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const mealPlanService = new MealPlanService();

// Create BullMQ Worker to process meal plan generation jobs
export const worker = new Worker(
  "generate_week",
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

// Worker event handlers
worker.on("completed", (job, result) => {
  console.log(`[SUCCESS] - Job ${job.id} completed successfully`);
  console.log(`[INFO] - Result: User ${result.userId} - ${result.daysGenerated} days generated`);
});

worker.on("failed", (job, err) => {
  console.error(`[ERROR] - Job ${job?.id} failed`);
  console.error(`[ERROR] - User: ${job?.data?.userId}`);
  console.error(`[ERROR] - Error: ${err.message}`);
});

worker.on("error", (error) => {
  console.error("[ERROR] - Worker error:", error);
});

worker.on("active", (job) => {
  console.log(`[INFO] - Job ${job.id} is now active`);
});

const initWorker = async () => {
  try {
    await Database.init();
    console.log("[SUCCESS] - Worker: Database connected");
    console.log("[INFO] - Meal Plan Worker is ready to process jobs from queue: generate_week");
    console.log(`[INFO] - Redis connection: ${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`);
  } catch (error) {
    console.error("[ERROR] - Worker initialization failed:", error);
    process.exit(1);
  }
};

initWorker();

process.on("SIGTERM", async () => {
  console.log("[INFO] - SIGTERM received, closing worker...");
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[INFO] - SIGINT received, closing worker...");
  await worker.close();
  await connection.quit();
  process.exit(0);
});

export { connection };

