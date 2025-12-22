/**
 * Dish idea structure from meal plan generation
 */
export interface DishIdea {
    dish_name: string;
    date: string;
    meal_type: 'breakfast' | 'lunch' | 'dinner';
    source_url?: string;
    cuisine_type?: string;
    estimated_calories?: number;
    description?: string;
}

/**
 * Job data structure for recipe enrichment queue
 */
export interface RecipeEnrichmentJobData {
    mealPlanId: string;
    userId: string;
    dishIdeas: DishIdea[];
}
