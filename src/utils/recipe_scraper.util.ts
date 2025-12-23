/**
 * Utility functions for scraping recipe data
 * Based on nutrition_backend ingredient parser
 */

/**
 * Parse ingredient text into structured format (for web scraping)
 * Keeps quantity as string for flexibility and user review
 */
export function parseIngredientText(text: string): { name: string; quantity?: string; unit?: string } | null {
    if (!text || text.length < 2) return null;
    
    // Normalize fraction slash (U+2044) to regular slash (U+002F)
    const normalizedText = text.replace(/⁄/g, '/');
    
    // Remove extra whitespace and clean the text
    const cleanText = normalizedText.replace(/\s+/g, ' ').trim();
    
    // Pattern to match quantity, unit, and ingredient name
    const patterns = [
        // Range + standard unit + ingredient (e.g., "1-2 cups flour", "2-3 tablespoons")
        /^(\d+\s*[-–]\s*\d+)\s+(cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|pints?|quarts?|gallons?)\s+(.+)$/i,
        // Range + item unit + ingredient (e.g., "10-12 leaves", "1-2 cloves", "2-3 sprigs")
        /^(\d+\s*[-–]\s*\d+)\s+(leaves?|cloves?|sprigs?|stalks?|slices?|pieces?|strips?|heads?|bunches?|packages?|cans?|jars?)\s+(.+)$/i,
        // Simple number + standard unit + ingredient
        /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|pints?|quarts?|gallons?)\s+(.+)$/i,
        // Simple number + item unit + ingredient (e.g., "12 leaves", "2 cloves")
        /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(leaves?|cloves?|sprigs?|stalks?|slices?|pieces?|strips?|heads?|bunches?|packages?|cans?|jars?)\s+(.+)$/i,
        // number + adjective + ingredient (e.g., "2 large eggs")
        /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(large|medium|small|whole|fresh|dried|chopped|minced|sliced|diced)?\s*(.+)$/i,
        // fraction + unit + ingredient
        /^(\d+\/\d+|\d+\s+\d+\/\d+)\s+(cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?)\s+(.+)$/i,
        // Unicode fractions + unit + ingredient
        /^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]|\d+\s*[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒])\s+(cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?)\s+(.+)$/i,
        // just ingredient name (no quantity)
        /^(.+)$/
    ];

    for (const pattern of patterns) {
        const match = cleanText.match(pattern);
        if (match) {
            let quantity = '';
            let unit = '';
            let name = '';

            if (match.length === 4) {
                // Has quantity, unit, and name
                quantity = match[1];
                unit = match[2] || '';
                name = match[3];
            } else if (match.length === 3) {
                // Has quantity and name (or unit and name)
                if (isNaN(Number(match[1]))) {
                    // First match is not a number, so it's probably unit + name
                    unit = match[1];
                    name = match[2];
                } else {
                    // First match is quantity
                    quantity = match[1];
                    name = match[2];
                }
            } else {
                // Just ingredient name
                name = match[1];
            }

            // Clean up the ingredient name
            name = name.replace(/^(of\s+|,\s*)/i, '').trim();
            
            if (name.length > 0) {
                return {
                    name: name,
                    quantity: quantity || undefined,
                    unit: unit || undefined,
                };
            }
        }
    }

    return null;
}

/**
 * Parse ISO 8601 duration format (e.g., "PT20M") to minutes
 */
export function parseDuration(duration: string): number | undefined {
    if (!duration) return undefined;
    
    // Handle minutes: PT20M -> 20
    const minutesMatch = duration.match(/PT(\d+)M/);
    if (minutesMatch) return parseInt(minutesMatch[1]);
    
    // Handle hours: PT2H -> 120
    const hoursMatch = duration.match(/PT(\d+)H/);
    if (hoursMatch) return parseInt(hoursMatch[1]) * 60;
    
    // Handle hours and minutes: PT2H30M -> 150
    const fullMatch = duration.match(/PT(\d+)H(\d+)M/);
    if (fullMatch) return parseInt(fullMatch[1]) * 60 + parseInt(fullMatch[2]);
    
    return undefined;
}

/**
 * Extract numeric value from nutrition strings like "243 kcal" or "16.7 g"
 */
export function extractNutritionValue(value: any): number | undefined {
    if (!value) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const match = value.match(/[\d.]+/);
        return match ? parseFloat(match[0]) : undefined;
    }
    return undefined;
}
