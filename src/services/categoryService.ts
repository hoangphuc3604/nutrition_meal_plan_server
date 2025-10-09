import { Repository } from "typeorm";
import Database from "../config/database";
import { FoodCategory } from "../models";

/**
 * Category Service
 * Manages food category operations
 */
export class CategoryService {
  private categoryRepo: Repository<FoodCategory>;

  constructor() {
    this.categoryRepo = Database.getRepository(FoodCategory) as Repository<FoodCategory>;
  }

  /**
   * Find category by name (case-insensitive)
   * @param categoryName - Name of the category
   * @param queryRunner - Optional query runner for transaction support
   * @returns Promise<FoodCategory | null>
   */
  async findCategoryByName(
    categoryName: string,
    queryRunner?: any
  ): Promise<FoodCategory | null> {
    const manager = queryRunner ? queryRunner.manager : this.categoryRepo.manager;
    
    return manager.findOne(FoodCategory, {
      where: { name: categoryName }
    });
  }

  /**
   * Find existing category or create new one
   * @param categoryName - Name of the category
   * @param queryRunner - Optional query runner for transaction support
   * @returns Promise<FoodCategory>
   */
  async findOrCreateCategory(
    categoryName: string,
    queryRunner?: any
  ): Promise<FoodCategory> {
    const manager = queryRunner ? queryRunner.manager : this.categoryRepo.manager;
    
    // Try to find existing category
    let category = await this.findCategoryByName(categoryName, queryRunner);

    if (category) {
      return category;
    }

    // Create new category if not found
    console.log(`[INFO] - Creating new category: ${categoryName}`);
    
    const newCategory = new FoodCategory();
    newCategory.name = categoryName;
    newCategory.description = `AI generated category: ${categoryName}`;
    newCategory.is_active = true;
    newCategory.sort_order = 999; // Default sort order for AI-generated categories

    const savedCategory = await manager.save(FoodCategory, newCategory);
    console.log(`[SUCCESS] - Created category: ${savedCategory.name} (${savedCategory.id})`);
    
    return savedCategory;
  }

  /**
   * Get all active categories
   * @returns Promise<FoodCategory[]>
   */
  async getAllActiveCategories(): Promise<FoodCategory[]> {
    return this.categoryRepo.find({
      where: { is_active: true },
      order: { sort_order: "ASC", name: "ASC" }
    });
  }

  /**
   * Get category by ID
   * @param id - Category ID
   * @returns Promise<FoodCategory | null>
   */
  async getCategoryById(id: string): Promise<FoodCategory | null> {
    if (!id) {
      throw new Error("Category ID is required");
    }
    
    return this.categoryRepo.findOne({
      where: { id }
    });
  }

  /**
   * Get category name and ID mapping for AI prompts
   * Returns a simplified object for easier AI consumption
   */
  async getCategoriesForAI(): Promise<Array<{ id: string; name: string; name_en?: string }>> {
    const categories = await this.getAllActiveCategories();
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      name_en: cat.name_en || undefined
    }));
  }
}

export default new CategoryService();
