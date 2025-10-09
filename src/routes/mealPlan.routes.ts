import { Router } from "express";
import mealPlanController from "../controllers/mealPlan.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

/**
 * Routes for meal plan generation
 * This server generates days 2-7 of weekly meal plans
 */

router.get("/status", mealPlanController.getStatus);
router.post(
    "/generate",
    authMiddleware,
    mealPlanController.generateRemainingDays
);

export default router;
