import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { User } from "../models/user.model";
import { KeyToken } from "../models/key.model";
import { UserProfile } from "../models/user_profile.model";
import { MealPlan } from "../models/meal_plan.model";
import { MealPlanItem } from "../models/meal_plan_item.model";
import { Recipe } from "../models/recipe.model";
import { RecipeIngredient } from "../models/recipe_ingredient.model";
import { Ingredient } from "../models/ingredient.model";
import { FoodCategory } from "../models/food_category.model";

dotenv.config();
import { config } from "./db.config";

class Database {
  private static instance: DataSource;

  private constructor() {}

  public static getInstance(): DataSource {
    if (!Database.instance) {
      // Use centralized DB config
      const dbOpt = config.db;
      Database.instance = new DataSource({
        type: "postgres",
        host: dbOpt.host,
        port: dbOpt.port,
        username: dbOpt.user,
        password: dbOpt.password,
        database: dbOpt.database,
        entities: [
          User,
          KeyToken,
          UserProfile,
          MealPlan,
          MealPlanItem,
          Recipe,
          RecipeIngredient,
          Ingredient,
          FoodCategory
        ],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
      });
    }
    return Database.instance;
  }

  public static async init(): Promise<void> {
    const dataSource = Database.getInstance();

    if (!dataSource.isInitialized) {
      try {
        await dataSource.initialize();
        console.log("[SUCCESS] - PostgreSQL database connected successfully");
      } catch (error) {
        console.error("[ERROR] - Database connection failed:", error);
        throw error;
      }
    } else {
      console.log("[WARNING] - Database already initialized");
    }
  }

  public static getRepository<T>(entity: any) {
    return Database.getInstance().getRepository(entity);
  }
}

export default Database;
