/**
 * Common structure for scraped recipe data
 * Used by all recipe scraper implementations
 */
export interface ScrapedRecipeData {
    name: string;
    description?: string;
    instructions: string;
    cook_time_minutes?: number;
    prep_time_minutes?: number;
    servings?: number;
    image_url?: string;
    cuisine_type?: string;
    difficulty_level?: 'easy' | 'medium' | 'hard';
    url: string;
    ingredients: Array<{
        name: string;
        quantity?: string;
        unit?: string;
    }>;
    nutrition?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
    };
    rating?: number;
    total_time_minutes?: number;
}
