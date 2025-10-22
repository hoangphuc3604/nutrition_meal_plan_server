import Database from "../config/database";
import { Recipe } from "../models/recipe.model";

export class RecipeService {
  private recipeRepository = Database.getRepository(Recipe);

  async updateRecipe(recipeId: string, updateData: Partial<Recipe>) {
    try {
      const result = await this.recipeRepository.update(recipeId, updateData);
      return result;
    } catch (error) {
      console.error("[RecipeService] Error updating recipe:", error);
      throw error;
    }
  }

  async getRecipeById(recipeId: string) {
    try {
      const recipe = await this.recipeRepository.findOne({
        where: { id: recipeId }
      });
      return recipe;
    } catch (error) {
      console.error("[RecipeService] Error getting recipe:", error);
      throw error;
    }
  }
}
