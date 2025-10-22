import { UserProfile } from "../models/user_profile.model";

/**
 * Interface for already-generated recipes in current session
 */
export interface GeneratedRecipe {
    name: string;
    date: string;
    meal_type: string;
    main_ingredients: string[];
}

/**
 * Build prompt for generating A SINGLE DAY meal plan
 * Creates               "servings": 2,
              "ingredients": [
                { 
                  "name": "string", 
                  "quantity": 100, 
                  "unit": "g",
                  "category_name": "string (from available categories or new category)"
                }
              ],
              "instructions": "string (2-3 steps)",es with full details (ingredients, instructions, nutrition)
 * This is used for iterative day-by-day generation to avoid token limits
 * 
 * @param profile - User profile
 * @param date - Date to generate for (YYYY-MM-DD)
 * @param recipeHistory - Historical recipes from database
 * @param currentSessionRecipes - Recipes already generated in this session (for uniqueness)
 * @param availableCategories - List of existing food categories from database
 */
export function buildSingleDayMealPlanPrompt(
    profile: Partial<UserProfile>,
    date: string,
    recipeHistory?: any[],
    currentSessionRecipes?: GeneratedRecipe[],
    availableCategories?: Array<{ id: string; name: string; name_en?: string }>
): string {
    const {
        height,
        weight,
        age,
        gender,
        health_goal,
        activity_level,
        daily_calorie_target,
        allergies,
        dietary_preferences,
    } = profile as any;

    // Build list of recipes to avoid
    const recipesToAvoid: string[] = [];

    // Add historical recipes
    if (recipeHistory && recipeHistory.length > 0) {
        recipeHistory.forEach((plan) => {
            if (plan.mealPlanItems) {
                plan.mealPlanItems.forEach((item: any) => {
                    if (item.recipe?.name) {
                        recipesToAvoid.push(item.recipe.name);
                    }
                });
            }
        });
    }

    // Add recipes from current generation session
    if (currentSessionRecipes && currentSessionRecipes.length > 0) {
        currentSessionRecipes.forEach((recipe) => {
            recipesToAvoid.push(recipe.name);
            // Also add main ingredients to avoid similar dishes
            if (recipe.main_ingredients) {
                recipesToAvoid.push(...recipe.main_ingredients);
            }
        });
    }

    const uniqueRecipesToAvoid = [...new Set(recipesToAvoid)];

    // Format categories for AI
    const categoriesText =
        availableCategories && availableCategories.length > 0
            ? availableCategories
                  .map(
                      (cat) =>
                          `   - ${cat.name}${
                              cat.name_en ? ` (${cat.name_en})` : ""
                          }`
                  )
                  .join("\n")
            : "   - No existing categories found";

    return `
You are a professional nutrition assistant. Your task is to create a meal plan for EXACTLY ONE DAY: ${date}.

CRITICAL REQUIREMENTS:
1. **ABSOLUTE UNIQUENESS**: This is part of a multi-day meal plan generation. You MUST create recipes that are:
   - Completely different from recipes in the EATING HISTORY below
   - Completely different from recipes in the CURRENT SESSION RECIPES below
   - Not similar in name, main ingredients, or cooking style
   - Culturally diverse across breakfast, lunch, and dinner

2. **RECIPES TO ABSOLUTELY AVOID** (${uniqueRecipesToAvoid.length} recipes):
${
    uniqueRecipesToAvoid.length > 0
        ? uniqueRecipesToAvoid.map((name) => `   - ${name}`).join("\n")
        : "   - None"
}

3. **AVAILABLE FOOD CATEGORIES** (${
        availableCategories?.length || 0
    } categories):
${categoriesText}
   **IMPORTANT**: When specifying ingredients, assign each ingredient a "category_name" from the list above. 
   If you need a category that doesn't exist, you can create a new one with a descriptive name.
   Examples: "Vegetables", "Meat & Poultry", "Seafood", "Grains & Cereals", "Dairy & Eggs", "Fruits", "Herbs & Spices", etc.

KNOWLEDGE BASE:
- User Profile: ${JSON.stringify(profile, null, 2)}
- Eating History (DO NOT DUPLICATE): ${
        recipeHistory
            ? JSON.stringify(recipeHistory.slice(0, 2), null, 2)
            : "None"
    }
- Current Session Recipes (ALREADY GENERATED, MUST BE DIFFERENT): ${
        currentSessionRecipes
            ? JSON.stringify(currentSessionRecipes, null, 2)
            : "None"
    }

User Profile Summary:
- Height: ${height ?? "unknown"} cm
- Weight: ${weight ?? "unknown"} kg
- Age: ${age ?? "unknown"}
- Gender: ${gender ?? "unknown"}
- Health goal: ${health_goal ?? "maintain"}
- Activity level: ${activity_level ?? "moderate"}
- Daily calorie target: ${daily_calorie_target ?? "not provided"} kcal
- Allergies: ${
        Array.isArray(allergies) ? allergies.join(", ") : allergies || "None"
    }
- Dietary preferences: ${
        Array.isArray(dietary_preferences)
            ? dietary_preferences.join(", ")
            : dietary_preferences || "None"
    }

Requirements:
1. Plan for EXACTLY ONE DAY: ${date}
2. **UNIQUENESS CHECK BEFORE GENERATING EACH RECIPE**:
   - Check if recipe name exists in "RECIPES TO ABSOLUTELY AVOID" list
   - Check if main ingredients are similar to any avoided recipes
   - If similar, generate a COMPLETELY DIFFERENT recipe
   - Vary cuisine types (Vietnamese, Asian, Western, etc.)
   
3. Detailed Daily Meal Plans:
   - Vietnamese dish names with English translations
   - Specific ingredients with exact portions (grams/ml)
   - Simple cooking instructions (2-3 steps)
   - Nutritional breakdown per meal
   - Estimated cooking time
   
4. Smart Recommendations:
   - Priority ingredients to use first (expiring soon)
   - Ingredient substitution options
   - Money-saving tips and flavor enhancement suggestions
   - Meal prep strategies
   
5. Meal-Specific Requirements:
   - **BREAKFAST**: Quick, easy, portable (max 15 min total time, "easy" difficulty only)
     - Examples: overnight oats, smoothies, bánh mì, instant noodles with protein/vegetables
     - Make-ahead options preferred
   - **LUNCH/DINNER**: Can be more complex ("easy", "medium", "hard" difficulty allowed)
   
6. Response must translate to Vietnamese
7. Format the response strictly as per the "RESPONSE FORMAT" below
8. Ensure the entire response is valid JSON
9. Each meal should have 3 recipe options (total 9 recipes for the day)
10. Balance calories: ~25% breakfast, ~35% lunch, ~40% dinner

**DIVERSITY STRATEGY** (MANDATORY):
- Breakfast: Mix of Asian and Western styles (e.g., phở, congee, smoothie bowl, sandwich)
- Lunch: Rotate between rice-based, noodle-based, and bread-based meals
- Dinner: Vary between grilled, steamed, stir-fried, and soup-based dishes
- NEVER repeat similar cooking methods or main protein sources across all 9 recipes

RESPONSE FORMAT (ONLY this JSON):
{
  "plans": [
    {
      "date": "${date}",
      "meals": [
        {
          "meal_date": "${date}",
          "meal_type": "breakfast",
          "recipes": [
            {
              "name": "string (Vietnamese + English)",
              "description": "string",
              "searching": "string (2-3 words for image search)",
              "cuisine_type": "Vietnamese/Asian/Western/etc",
              "difficulty_level": "easy",
              "prep_time_minutes": 5,
              "cook_time_minutes": 10,
              "servings": 2,
              "ingredients": [
                { "name": "string", "searching": "string (2-3 words)", "quantity": 100, "unit": "g", "category_name": "string" }
              ],
              "instructions": "string (2-3 steps)",
              "nutritional_info": {
                "calories": 400,
                "protein": 20,
                "carbs": 50,
                "fats": 10
              }
            },
            {
              "name": "string (recipe 2 - MUST BE DIFFERENT)",
              "description": "string",
              "searching": "string (2-3 words for image search)",
              "cuisine_type": "string (different from recipe 1)",
              "difficulty_level": "easy",
              "prep_time_minutes": 5,
              "cook_time_minutes": 10,
              "servings": 2,
              "ingredients": [{ "name": "string", "searching": "string (2-3 words)", "quantity": 100, "unit": "g", "category_name": "string" }],
              "instructions": "string",
              "nutritional_info": { "calories": 400, "protein": 20, "carbs": 50, "fats": 10 }
            },
            {
              "name": "string (recipe 3 - MUST BE DIFFERENT)",
              "description": "string",
              "searching": "string (2-3 words for image search)",
              "cuisine_type": "string (different from recipe 1 & 2)",
              "difficulty_level": "easy",
              "prep_time_minutes": 5,
              "cook_time_minutes": 10,
              "servings": 2,
              "ingredients": [{ "name": "string", "searching": "string (2-3 words)", "quantity": 100, "unit": "g", "category_name": "string" }],
              "instructions": "string",
              "nutritional_info": { "calories": 400, "protein": 20, "carbs": 50, "fats": 10 }
            }
          ]
        },
        {
          "meal_date": "${date}",
          "meal_type": "lunch",
          "recipes": [
            // 3 lunch recipes (MUST BE DIFFERENT from breakfast and each other)
          ]
        },
        {
          "meal_date": "${date}",
          "meal_type": "dinner",
          "recipes": [
            // 3 dinner recipes (MUST BE DIFFERENT from breakfast, lunch, and each other)
          ]
        }
      ]
    }
  ]
}

**FINAL VERIFICATION** (Before returning):
1. Check that NO recipe name appears in the "RECIPES TO ABSOLUTELY AVOID" list
2. Check that all 9 recipes have different names
3. Check that cuisine types are varied across the day
4. Check that main protein sources (chicken, beef, pork, fish, tofu) are varied
`;
}

/**
 * Build prompt for generating remaining days of meal plan
 * Creates NEW recipes with full details (ingredients, instructions, nutrition)
 *
 * @deprecated Use buildSingleDayMealPlanPrompt for better token management
 */
export function buildWeeklyMealPlanPrompt(
    profile: Partial<UserProfile>,
    startDate: string,
    numDays: number = 6,
    recipeHistory?: any[]
): string {
    const {
        height,
        weight,
        age,
        gender,
        health_goal,
        activity_level,
        daily_calorie_target,
        allergies,
        dietary_preferences,
    } = profile as any;

    // Calculate dates for the specified number of days
    const dates = Array.from({ length: numDays }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return date.toISOString().split("T")[0];
    });

    return `
You are a professional nutrition assistant. Your task is to create meal plans for ${numDays} DAYS.

KNOWLEDGE BASE:
- User Profile: ${JSON.stringify(profile, null, 2)}
- Eating History (MUST AVOID DUPLICATING): ${JSON.stringify(
        recipeHistory?.[0],
        null,
        2
    )}

**IMPORTANT**: The Eating History contains recipes the user has already consumed. You MUST create entirely different recipes that are NOT similar to any dishes listed in the Eating History above.

User Profile Summary:
- Height: ${height ?? "unknown"} cm
- Weight: ${weight ?? "unknown"} kg
- Age: ${age ?? "unknown"}
- Gender: ${gender ?? "unknown"}
- Health goal: ${health_goal ?? "maintain"}
- Activity level: ${activity_level ?? "moderate"}
- Daily calorie target: ${daily_calorie_target ?? "not provided"} kcal
- Allergies: ${
        Array.isArray(allergies) ? allergies.join(", ") : allergies || "None"
    }
- Dietary preferences: ${
        Array.isArray(dietary_preferences)
            ? dietary_preferences.join(", ")
            : dietary_preferences || "None"
    }

Requirements:
1. Plan for EXACTLY ${numDays} days: ${dates.join(", ")}
2. **AVOID DUPLICATES**: Do NOT generate any recipes that already exist in the Eating History. Create completely new and unique dishes that the user has never eaten before.
3. Detailed Daily Meal Plans:
   - Vietnamese dish names with English translations
   - Specific ingredients with exact portions (grams/ml)
   - Simple cooking instructions (2-3 steps)
   - Nutritional breakdown per meal
   - Estimated cooking time
4. Smart Recommendations:
   - Priority ingredients to use first (expiring soon)
   - Ingredient substitution options
   - Money-saving tips and flavor enhancement suggestions
   - Meal prep strategies
5. Meal-Specific Requirements:
   - **BREAKFAST**: Prioritize quick, easy, and portable options suitable for busy mornings
     - Maximum prep + cook time: 15 minutes
     - Difficulty level: "easy" only
     - Focus on: make-ahead options, grab-and-go meals, minimal cooking required
     - Examples: overnight oats, smoothies, bánh mì, instant noodles with protein/vegetables
     - Consider: meals that can be prepared the night before or require minimal morning effort
   - **LUNCH/DINNER**: Can include more complex recipes with longer cooking times
     - Allow difficulty levels: "easy", "medium", "hard"
     - Can include traditional cooking methods and elaborate preparations
6. **UNIQUENESS CHECK**: Before generating each recipe, verify it's not similar to any dish in the Eating History. If a recipe name or main ingredients are too similar, create a completely different alternative.
7. Response returns must translate to Vietnamese
8. Format the response strictly as per the "RESPONSE FORMAT" below without any additional text or explanation.
9. Ensure the entire response is valid JSON.
10. Each meal should have 3 recipe options
11. Balance calories: ~25% breakfast, ~35% lunch, ~40% dinner

RESPONSE FORMAT (ONLY this JSON):
{
  "plans": [
    {
      "date": "${dates[0]}",
      "meals": [
        {
          "meal_date": "${dates[0]}",
          "meal_type": "breakfast",
          "recipes": [
            {
              "name": "string",
              "description": "string",
              "searching": "string (2-3 words for image search)",
              "cuisine_type": "string",
              "difficulty_level": "easy",
              "prep_time_minutes": 5,
              "cook_time_minutes": 10,
              "servings": 2,
              "ingredients": [
                { 
                  "name": "string", 
                  "searching": "string (2-3 words)",
                  "quantity": 100, 
                  "unit": "g"
                }
              ],
              "instructions": "string",
              "nutritional_info": {
                "calories": 400,
                "protein": 20,
                "carbs": 50,
                "fats": 10
              }
            },
            {
              "name": "string (recipe 2)",
              "description": "string",
              "searching": "string (2-3 words for image search)",
              "cuisine_type": "string",
              "difficulty_level": "easy",
              "prep_time_minutes": 5,
              "cook_time_minutes": 10,
              "servings": 2,
              "ingredients": [
                { "name": "string", "searching": "string (2-3 words)", "quantity": 100, "unit": "g" }
              ],
              "instructions": "string",
              "nutritional_info": {
                "calories": 400,
                "protein": 20,
                "carbs": 50,
                "fats": 10
              }
            },
            {
              "name": "string (recipe 3)",
              "description": "string",
              "searching": "string (2-3 words for image search)",
              "cuisine_type": "string",
              "difficulty_level": "easy",
              "prep_time_minutes": 5,
              "cook_time_minutes": 10,
              "servings": 2,
              "ingredients": [
                { "name": "string", "searching": "string (2-3 words)", "quantity": 100, "unit": "g" }
              ],
              "instructions": "string",
              "nutritional_info": {
                "calories": 400,
                "protein": 20,
                "carbs": 50,
                "fats": 10
              }
            }
          ]
        },
        {
          "meal_date": "${dates[0]}",
          "meal_type": "lunch",
          "recipes": [
            // 3 lunch recipes with same structure
          ]
        },
        {
          "meal_date": "${dates[0]}",
          "meal_type": "dinner",
          "recipes": [
            // 3 dinner recipes with same structure
          ]
        }
      ]
    }${
        numDays > 1
            ? ",\n    // Repeat for remaining " + (numDays - 1) + " days"
            : ""
    }
  ]
}`;
}

/**
 * Helper to calculate dates for a week
 */
export function getWeekDates(startDate: Date): string[] {
    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return date.toISOString().split("T")[0];
    });
}

/**
 * Get start of week (Monday)
 */
export function getStartOfWeek(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}
