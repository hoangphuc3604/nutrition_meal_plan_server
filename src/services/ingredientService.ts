import { Repository } from "typeorm";
import Database from "../config/database";
import { Ingredient, FoodCategory } from "../models";
import { CategoryService } from "./categoryService";

/**
 * Ingredient Service
 * Manages ingredient creation and lookup
 * Mirrors logic from nutrition_backend/src/services/ingredient.service.ts
 */
export class IngredientService {
  private ingredientRepo: Repository<Ingredient>;
  private foodCategoryRepo: Repository<FoodCategory>;
  private categoryService: CategoryService;

  constructor() {
    this.ingredientRepo = Database.getRepository(Ingredient) as Repository<Ingredient>;
    this.foodCategoryRepo = Database.getRepository(FoodCategory) as Repository<FoodCategory>;
    this.categoryService = new CategoryService();
  }

  /**
   * Find existing ingredient or create new one
   * Used during AI recipe generation to handle ingredients
   * 
   * @param ingredientName - Name of the ingredient
   * @param queryRunner - Optional query runner for transaction support
   * @param categoryName - Optional category name (if not provided, uses "Other")
   * @returns Promise<Ingredient>
   */
  async findOrCreateIngredient(
    ingredientName: string,
    queryRunner?: any,
    categoryName?: string
  ): Promise<Ingredient> {
    const manager = queryRunner ? queryRunner.manager : this.ingredientRepo.manager;
    
    // Find existing ingredient
    let ingredient = await manager.findOne(Ingredient, {
      where: { name: ingredientName },
      relations: ["category"]
    });

    if (!ingredient) {
      console.log(`[INFO] - Creating new ingredient: ${ingredientName}`);
      
      // Find or create category
      const finalCategoryName = categoryName || "Other";
      const category = await this.categoryService.findOrCreateCategory(
        finalCategoryName,
        queryRunner
      );

      // Create new ingredient
      ingredient = new Ingredient();
      ingredient.name = ingredientName;
      ingredient.category = category;
      ingredient.description = `AI generated ingredient: ${ingredientName}`;
      ingredient.storage_temperature = "room_temp";
      ingredient.is_active = true;

      ingredient = await manager.save(Ingredient, ingredient);
      console.log(`[SUCCESS] - Created ingredient: ${ingredient.name} (${ingredient.id}) with category: ${category.name}`);
    } else {
      // If ingredient exists but category is provided and different, optionally update it
      if (categoryName && ingredient.category?.name !== categoryName) {
        console.log(`[INFO] - Ingredient ${ingredientName} already exists with category ${ingredient.category?.name}`);
      }
    }

    return ingredient;
  }

  /**
   * Get ingredient by ID
   * @param id - Ingredient ID
   * @returns Promise<Ingredient | null>
   */
  async getIngredientById(id: string): Promise<Ingredient | null> {
    if (!id) {
      throw new Error("Ingredient ID is required");
    }
    
    return this.ingredientRepo.findOne({
      where: { id },
      relations: ["category"]
    });
  }

  /**
   * Get all active ingredients
   * @returns Promise<Ingredient[]>
   */
  async getAllIngredients(): Promise<Ingredient[]> {
    return this.ingredientRepo.find({
      relations: ["category"],
      where: { is_active: true },
      order: { name: "ASC" }
    });
  }

  /**
   * Search ingredients by name
   * @param searchTerm - Search term
   * @returns Promise<Ingredient[]>
   */
  async searchIngredients(searchTerm: string): Promise<Ingredient[]> {
    if (!searchTerm || searchTerm.trim() === "") {
      return this.getAllIngredients();
    }
    
    return this.ingredientRepo.createQueryBuilder("ingredient")
      .leftJoinAndSelect("ingredient.category", "category")
      .where("ingredient.name ILIKE :searchTerm", { searchTerm: `%${searchTerm}%` })
      .andWhere("ingredient.is_active = :isActive", { isActive: true })
      .orderBy("ingredient.name", "ASC")
      .getMany();
  }
  async updateIngredient(id: string, partialIngredient: Partial<Ingredient>): Promise<Ingredient> {
    const ingredient = await this.getIngredientById(id);
    if (!ingredient) {
      throw new Error("Ingredient not found");
    }
    Object.assign(ingredient, partialIngredient);
    return this.ingredientRepo.save(ingredient);
  }
}

export default new IngredientService();
