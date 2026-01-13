import { User } from "../models/user.model";
import { MealPlanScheduleEntry } from "../utils/meal_plan_schedule.util";
import Database from "../config/database";
import * as dotenv from "dotenv";

dotenv.config();

export class MealPlanCronService {
  private readonly backendUrl: string;
  private readonly apiKey: string;
  private readonly batchSize: number;

  constructor() {
    this.backendUrl = process.env.BACKEND_GENERATE_URL || "";
    this.apiKey = process.env.BACKEND_API_KEY || "";
    this.batchSize = parseInt(process.env.MEAL_PLAN_BATCH_SIZE || "100", 10);
  }

  async processMealPlanGeneration(scheduleEntry: MealPlanScheduleEntry): Promise<void> {
    console.log(`[MEAL_PLAN_CRON] Starting meal plan generation for ${scheduleEntry.dayAbbrev}:${scheduleEntry.daysToGenerate} days`);

    try {
      const users = await this.getAllUsers();
      const totalUsers = users.length;

      console.log(`[MEAL_PLAN_CRON] Found ${totalUsers} users to process in batches of ${this.batchSize}`);

      let processedCount = 0;
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < users.length; i += this.batchSize) {
        const batch = users.slice(i, i + this.batchSize);
        console.log(`[MEAL_PLAN_CRON] Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(users.length / this.batchSize)} (${batch.length} users)`);

        const batchResults = [];
        for (const user of batch) {
          try {
            await this.generateMealPlanForUser(user.id, scheduleEntry.daysToGenerate);
            batchResults.push({ status: 'fulfilled' });
            successCount++;
          } catch (error) {
            batchResults.push({ status: 'rejected', reason: error });
            failureCount++;
          }
        }

        const batchSuccess = batchResults.filter(result => result.status === 'fulfilled').length;
        const batchFailure = batchResults.filter(result => result.status === 'rejected').length;
        processedCount += batch.length;

        console.log(`[MEAL_PLAN_CRON] Batch completed: ${batchSuccess} success, ${batchFailure} failed`);

        if (i + this.batchSize < users.length) {
          await this.delay(1000);
        }
      }

      console.log(`[MEAL_PLAN_CRON] Completed: ${processedCount} processed, ${successCount} success, ${failureCount} failed`);
    } catch (error) {
      console.error(`[MEAL_PLAN_CRON] Error processing meal plan generation:`, error);
      throw error;
    }
  }

  private async getAllUsers(): Promise<User[]> {
    try {
      const userRepository = Database.getRepository(User);
      const users = await userRepository.find({
        select: ['id']
      }) as User[];
      return users;
    } catch (error) {
      console.error('[MEAL_PLAN_CRON] Error fetching users:', error);
      throw error;
    }
  }

  private async generateMealPlanForUser(userId: string, daysToGenerate: number): Promise<void> {
    const startDate = this.calculateStartDate();

    try {
      const response = await fetch(`${this.backendUrl}/agent-server/generate-simplified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          userId,
          startDate: startDate.toISOString().split('T')[0],
          days: daysToGenerate,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      console.log(`[MEAL_PLAN_CRON] Successfully generated ${daysToGenerate} days meal plan for user ${userId}`);
    } catch (error) {
      console.error(`[MEAL_PLAN_CRON] Failed to generate meal plan for user ${userId}:`, error);
      throw error;
    }
  }

  private calculateStartDate(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return tomorrow;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}





