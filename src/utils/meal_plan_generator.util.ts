import { MealPlanService } from "../services/mealPlanService";
import { getStartOfWeek } from "./prompt.builder";

/**
 * Meal Plan Generator Utility
 * Generates NEW recipes using AI (not selecting from existing)
 *
 * This server handles remaining days of the week
 * Day 1 is handled by the main nutrition_backend server
 */
export interface MealPlanGenerationResult {
    success: boolean;
    data?: {
        mealPlanId: string;
        startDate: string;
        endDate: string;
        daysGenerated: number;
        message: string;
    };
    error?: string;
    details?: any;
}

class MealPlanGeneratorUtil {
    private mealPlanService: MealPlanService;

    constructor() {
        this.mealPlanService = new MealPlanService();
    }

    /**
     * Generate remaining days of meal plan for the current week
     * This is called after the main server has generated day 1
     *
     * @param userId - User ID
     * @param numDays - Number of days to generate (default 6)
     * @returns Promise<MealPlanGenerationResult>
     */
    async generateRemainingWeekDays(
        userId: string,
        numDays: number = 6
    ): Promise<MealPlanGenerationResult> {
        try {
            console.log(
                `[INFO] - Starting ${numDays}-day generation for user: ${userId}`
            );

            // Calculate week start date (Monday)
            const today = new Date();
            const weekStart = getStartOfWeek(today);
            const weekStartStr = weekStart.toISOString().split("T")[0];

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekEndStr = weekEnd.toISOString().split("T")[0];

            // Call service to generate remaining days
            const result = await this.mealPlanService.generateRemainingWeekDays(
                userId,
                numDays
            );

            console.log(`[SUCCESS] - Generation complete:`, result);

            return {
                success: true,
                data: {
                    mealPlanId: result.mealPlanId,
                    startDate: weekStartStr,
                    endDate: weekEndStr,
                    daysGenerated: numDays,
                    message: result.message,
                },
            };
        } catch (error: any) {
            console.error("[ERROR] - Error generating meal plan:", error);
            return {
                success: false,
                error: "Failed to generate meal plan",
                details: error.message,
            };
        }
    }

    /**
     * Generate meal plan for a specific week with flexible days
     *
     * @param userId - User ID
     * @param weekStartDate - Start date of the week (Monday, YYYY-MM-DD format)
     * @param numDays - Number of days to generate (default 6)
     * @returns Promise<MealPlanGenerationResult>
     */
    async generateForSpecificWeek(
        userId: string,
        numDays: number = 6
    ): Promise<MealPlanGenerationResult> {
        try {
            // Generate remaining days
            const result = await this.mealPlanService.generateRemainingWeekDays(
                userId,
                numDays
            );

            return {
                success: true,
                data: {
                    mealPlanId: result.mealPlanId,
                    startDate: result.startDate,
                    endDate: result.endDate,
                    daysGenerated: numDays,
                    message: result.message,
                },
            };
        } catch (error: any) {
            console.error("[ERROR] - Error generating meal plan:", error);
            return {
                success: false,
                error: "Failed to generate meal plan",
                details: error.message,
            };
        }
    }
}

export default new MealPlanGeneratorUtil();
