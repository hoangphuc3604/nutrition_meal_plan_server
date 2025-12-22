import { z } from "zod";

/**
 * Schema for scraped recipe ingredient
 */
const scrapedIngredientSchema = z.object({
  name: z.string(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  category_name: z.string().optional(),
});

/**
 * Schema for recipe nutrition information
 */
const nutritionSchema = z.object({
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
});

/**
 * Schema for scraped recipe data from LLM
 * Matches ScrapedRecipeData interface structure
 */
export const RecipeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  instructions: z.string(),
  cook_time_minutes: z.number().nullable().optional(),
  prep_time_minutes: z.number().nullable().optional(),
  total_time_minutes: z.number().nullable().optional(),
  servings: z.number().nullable().optional(),
  image_url: z.string().nullable().optional(),
  cuisine_type: z.string().nullable().optional(),
  difficulty_level: z.enum(["easy", "medium", "hard"]).nullable().optional(),
  ingredients: z.array(scrapedIngredientSchema).min(1),
  nutrition: nutritionSchema.optional(),
  rating: z.number().nullable().optional(),
});

export type RecipeResponse = z.infer<typeof RecipeSchema>;
