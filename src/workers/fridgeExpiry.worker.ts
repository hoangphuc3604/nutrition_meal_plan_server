import { Worker } from "bullmq";
import MessageQueueEnum from "../enums/message.enum";
import NotificationCronService from "../services/notificationCronService";
import { MealPlanCronService } from "../services/mealPlanCronService";
import { MealPlanScheduleEntry } from "../utils/meal_plan_schedule.util";

export function handleFridgeExpiryWorker(connection: any) {
  const cronService = new NotificationCronService();
  const mealPlanService = new MealPlanCronService();

  const worker = new Worker(
    MessageQueueEnum.FRIDGE_EXPIRY_SCAN,
    async (job) => {
      if (job.name === "fridge_expiry_scan") {
        const daysBefore: number = typeof job.data?.daysBefore === "number"
          ? job.data.daysBefore
          : parseInt(process.env.FRIDGE_EXPIRY_DAYS_BEFORE || "1", 10);

        console.log(
          `[CRON] Running fridge expiry scan job ${job.id} (daysBefore=${daysBefore})`
        );

        await cronService.processExpiryNotifications(daysBefore);

        return { success: true, daysBefore };
      } else if (job.name === "meal_plan_generation") {
        const scheduleEntry: MealPlanScheduleEntry = job.data?.scheduleEntry;

        if (!scheduleEntry) {
          throw new Error("Missing scheduleEntry in meal plan generation job data");
        }

        console.log(
          `[CRON] Running meal plan generation job ${job.id} for ${scheduleEntry.dayAbbrev}:${scheduleEntry.daysToGenerate} days`
        );

        await mealPlanService.processMealPlanGeneration(scheduleEntry);

        return { success: true, scheduleEntry };
      } else {
        throw new Error(`Unknown job name: ${job.name}`);
      }
    },
    {
      connection,
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    if (job.name === "fridge_expiry_scan") {
      console.log(`[CRON] Fridge expiry scan job ${job.id} completed`);
    } else if (job.name === "meal_plan_generation") {
      console.log(`[CRON] Meal plan generation job ${job.id} completed`);
    }
  });

  worker.on("failed", (job, err) => {
    if (job?.name === "fridge_expiry_scan") {
      console.error(
        `[CRON] Fridge expiry scan job ${job?.id} failed:`,
        err.message
      );
    } else if (job?.name === "meal_plan_generation") {
      console.error(
        `[CRON] Meal plan generation job ${job?.id} failed:`,
        err.message
      );
    } else {
      console.error(
        `[CRON] Unknown job ${job?.id} failed:`,
        err.message
      );
    }
  });

  console.log("[INIT] Worker started for queue: fridge_expiry_scan (handles both fridge expiry and meal plan generation)");
  return worker;
}


