import Bull from "bull";
import Database from "../config/database";
import { MealPlanService } from "../services/mealPlanService";
import * as dotenv from "dotenv";

dotenv.config();

// Create Bull queue for meal plan generation
const mealPlanQueue = new Bull("meal-plan-generation", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

const mealPlanService = new MealPlanService();

// Process meal plan generation jobs
mealPlanQueue.process(async (job) => {
  const { userId, weekStartDate, numDays = 6 } = job.data;
  
  console.log(`[INFO] - Processing meal plan job for user: ${userId}, week: ${weekStartDate}, days: ${numDays}`);
  
  try {
    const result = await mealPlanService.generateRemainingWeekDays(userId, weekStartDate, numDays);
    
    console.log(`[SUCCESS] - Meal plan generated successfully for user: ${userId}`);
    console.log(`[INFO] - Meal Plan ID: ${result.mealPlanId}`);
    
    return result;
  } catch (error) {
    console.error(`[ERROR] - Failed to generate meal plan for user: ${userId}`, error);
    throw error;
  }
});

// Event handlers
mealPlanQueue.on("completed", (job, result) => {
  console.log(`[SUCCESS] - Job ${job.id} completed with result:`, result);
});

mealPlanQueue.on("failed", (job, err) => {
  console.error(`[ERROR] - Job ${job?.id} failed with error:`, err.message);
});

mealPlanQueue.on("error", (error) => {
  console.error("[ERROR] - Queue error:", error);
});

// Initialize database connection
const initWorker = async () => {
  try {
    await Database.init();
    console.log("[SUCCESS] - Worker: Database connected");
    console.log("[INFO] - Meal Plan Worker is ready to process jobs");
  } catch (error) {
    console.error("[ERROR] - Worker initialization failed:", error);
    process.exit(1);
  }
};

initWorker();

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[INFO] - SIGTERM received, closing worker...");
  await mealPlanQueue.close();
  process.exit(0);
});

export { mealPlanQueue };
