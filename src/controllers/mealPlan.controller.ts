import { Request, Response, NextFunction } from "express";
import { SuccessResponse, OkResponse } from "../core/success.response";
import { BadRequestError } from "../core/error.response";
import MealPlanGeneratorUtil from "../utils/meal_plan_generator.util";

/**
 * Meal Plan Controller
 * Handles API endpoints for generating meal plans with NEW recipes created by AI
 * 
 * This server generates remaining days after the main nutrition_backend generates day 1
 */
export class MealPlanController {
  /**
   * POST /api/meal-plan/generate
   * Generate meal plan for the given number of days (default 6 days)
   * Body (optional): { days: number }
   */
  async generateRemainingDays(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        throw new BadRequestError("User ID not found in token");
      }

      // Get number of days from request body (default 6)
      const { days = 6 } = req.body;

      // Validate days
      if (typeof days !== 'number' || days < 1 || days > 7) {
        throw new BadRequestError("Days must be a number between 1 and 7");
      }

      console.log(`[INFO] - Generating ${days} days for user: ${userId}`);
      
      const result = await MealPlanGeneratorUtil.generateRemainingWeekDays(userId, days);

      if (!result.success) {
        throw new BadRequestError(result.error || "Failed to generate meal plan");
      }

      new OkResponse(result.data, `${days} days generated successfully with NEW recipes`).send(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/meal-plan/status
   * Get server status and health check
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      new OkResponse({
        server: "Meal Plan Server",
        version: "1.0.0",
        purpose: "Generates meal plans with NEW AI-created recipes",
        features: [
          "Creates NEW recipes (not selecting from existing)",
          "Flexible days generation (1-7 days)",
          "Avoids recipe duplicates from history",
          "Full ingredient and nutrition details"
        ],
        status: "operational",
        timestamp: new Date().toISOString()
      }, "Server is running").send(res);
    } catch (error) {
      next(error);
    }
  }
}

export default new MealPlanController();
