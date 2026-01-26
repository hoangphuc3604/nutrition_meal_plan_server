import { fridgeScanQueue } from "../config/message.config";
import { MealPlanScheduleParser } from "../utils/meal_plan_schedule.util";
import { MealPlanCronService } from "../services/mealPlanCronService";

const DEFAULT_CRON = process.env.FRIDGE_SCAN_CRON || "0 9 * * *";
const DEFAULT_DAYS = parseInt(process.env.FRIDGE_EXPIRY_DAYS_BEFORE || "1", 10);
const DEFAULT_TZ = process.env.FRIDGE_SCAN_TZ || "UTC";

export const initCronJobs = async () => {
  await fridgeScanQueue.add(
    "fridge_expiry_scan",
    { daysBefore: DEFAULT_DAYS },
    {
      repeat: {
        pattern: DEFAULT_CRON,
        tz: DEFAULT_TZ,
      },
      jobId: "fridge_expiry_scan_daily",
    }
  );

  console.log(
    `[CRON] Scheduled fridge expiry scan (cron=${DEFAULT_CRON}, daysBefore=${DEFAULT_DAYS}, tz=${DEFAULT_TZ})`
  );

  // await initMealPlanCronJobs();
};

const initMealPlanCronJobs = async () => {
  const scheduleString = process.env.MEAL_PLAN_SCHEDULE;

  if (!scheduleString || scheduleString.trim() === '') {
    console.log('[CRON] MEAL_PLAN_SCHEDULE not configured, skipping meal plan cron jobs');
    return;
  }

  try {
    const parsedSchedule = MealPlanScheduleParser.parse(scheduleString);
    const mealPlanService = new MealPlanCronService();

    console.log(`[CRON] Setting up meal plan cron jobs for ${parsedSchedule.entries.length} schedule entries`);

    for (const entry of parsedSchedule.entries) {
      const cronPattern = `${parsedSchedule.minute} ${parsedSchedule.hour} * * ${entry.cronDayOfWeek}`;
      const jobId = `meal_plan_generation_${entry.dayAbbrev.toLowerCase()}_${entry.daysToGenerate}days`;

      await fridgeScanQueue.add(
        "meal_plan_generation",
        {
          scheduleEntry: entry,
          daysToGenerate: entry.daysToGenerate
        },
        {
          repeat: {
            pattern: cronPattern,
            tz: parsedSchedule.timezone,
          },
          jobId,
        }
      );

      console.log(
        `[CRON] Scheduled meal plan generation for ${entry.dayAbbrev} (${entry.daysToGenerate} days) at ${parsedSchedule.hour}:${parsedSchedule.minute.toString().padStart(2, '0')} ${parsedSchedule.timezone} (cron: ${cronPattern})`
      );
    }
  } catch (error) {
    console.error('[CRON] Error setting up meal plan cron jobs:', error);
    throw error;
  }
};


