import { z } from "zod";

const ingredientSchema = z.object({
  name: z.string(),
  searching: z.string().optional(),
  quantity: z.number(),
  unit: z.string(),
  category_name: z.string().optional(),
});

const recipeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  searching: z.string().optional(),
  cuisine_type: z.string().optional(),
  difficulty_level: z.enum(["easy", "medium", "hard"]),
  prep_time_minutes: z.number(),
  cook_time_minutes: z.number(),
  servings: z.number(),
  ingredients: z.array(ingredientSchema).min(1),
  instructions: z.string(),
  nutritional_info: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fats: z.number(),
  }),
});

const mealSchema = z.object({
  meal_date: z.string(),
  meal_type: z.enum(["breakfast", "lunch", "dinner"]),
  recipes: z.array(recipeSchema).min(1),
});

export const MealPlanSchema = z.object({
  plans: z
    .array(
      z.object({
        date: z.string(),
        meals: z.array(mealSchema).min(1),
      })
    )
    .min(1),
});

export type MealPlanResponse = z.infer<typeof MealPlanSchema>;

