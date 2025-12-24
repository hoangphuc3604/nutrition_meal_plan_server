import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import * as dns from "dns";
import { User } from "../models/user.model";
import { KeyToken } from "../models/key.model";
import { UserProfile } from "../models/user_profile.model";
import { MealPlan } from "../models/meal_plan.model";
import { MealPlanItem } from "../models/meal_plan_item.model";
import { Recipe } from "../models/recipe.model";
import { RecipeIngredient } from "../models/recipe_ingredient.model";
import { Ingredient } from "../models/ingredient.model";
import { FoodCategory } from "../models/food_category.model";
import { DeviceToken } from "../models/device_token.model";
import { Notification } from "../models/notification.model";

dotenv.config();
import { config } from "./db.config";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

class Database {
  private static instance: DataSource;

  private constructor() {}

  public static getInstance(): DataSource {
    if (!Database.instance) {
      const dbOpt = config.db;
      const isProduction = process.env.NODE_ENV === 'prod' || config.db.host.includes('render.com');

      const connectOptions: any = {
        type: "postgres",
        entities: [
          User,
          KeyToken,
          UserProfile,
          MealPlan,
          MealPlanItem,
          Recipe,
          RecipeIngredient,
          Ingredient,
          FoodCategory,
          DeviceToken,
          Notification
        ],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
        ssl: isProduction ? { rejectUnauthorized: false } : false,
        extra: {
          connectionTimeoutMillis: 10000,
        },
      };

      if (dbOpt.url) {
        let dbUrl = dbOpt.url;
        const ipv6Match = dbUrl.match(/postgres:\/\/([^:]+):([^@]+)@\[([\da-f:]+)\]:(\d+)\/(.+)/i);
        if (ipv6Match) {
          const username = ipv6Match[1];
          const password = ipv6Match[2];
          const port = ipv6Match[4];
          const dbPath = ipv6Match[5];
          
          console.log("[WARNING] - IPv6 address detected in database URL, replacing with hostname");
          
          const hostname = dbOpt.host;
          if (hostname && hostname !== 'localhost') {
            dbUrl = `postgres://${username}:${password}@${hostname}:${port}/${dbPath}`;
            console.log(`[INFO] - Replaced IPv6 address with hostname: ${hostname}`);
          } else {
            console.warn("[WARNING] - No hostname found in PROD_DB_HOST, connection may fail");
          }
        }
        connectOptions.url = dbUrl;
      } else {
        connectOptions.host = dbOpt.host;
        connectOptions.port = dbOpt.port;
        connectOptions.username = dbOpt.user;
        connectOptions.password = dbOpt.password;
        connectOptions.database = dbOpt.database;
      }

      if (!connectOptions.extra) {
        connectOptions.extra = {};
      }
      connectOptions.extra.connectionTimeoutMillis = 10000;

      Database.instance = new DataSource(connectOptions);
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
