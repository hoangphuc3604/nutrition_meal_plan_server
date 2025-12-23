import { Redis } from "ioredis";
import * as dotenv from "dotenv";
import Database from "../config/database";
import { handleUpdateImageWorker } from "./image.worker";
import { handleUpdateRecipeImageWorker } from "./recipe.image.worker";
import { handleMealPlanWorker } from "./mealPlanWorker";
import { handlePushNotificationWorker } from "./pushNotificationWorker";
import { handleFridgeExpiryWorker } from "./fridgeExpiry.worker";
import { handleRecipeEnrichmentWorker } from "./recipeEnrichment.worker";

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

let workers: any[] = [];
let connections: Redis[] = [];

export const initWorkers = async () => {
  await Database.init();
  console.log("[SUCCESS] Database connected");

  if (workers.length === 0) {
    const createConnection = () => {
      const conn = new Redis(redisConfig);
      connections.push(conn);
      return conn;
    };

    workers = [
      handleUpdateImageWorker(createConnection()),
      handleUpdateRecipeImageWorker(createConnection()),
      handleMealPlanWorker(createConnection()),
      handlePushNotificationWorker(createConnection()),
      handleFridgeExpiryWorker(createConnection()),
      handleRecipeEnrichmentWorker(createConnection())
    ];
  }

  console.log(`[INFO] Workers active: ${workers.length}`);
  return { workers };
};

export const closeWorkers = async () => {
  console.log("[INFO] Closing workers...");
  for (const w of workers) {
    if (w && typeof w.close === 'function') {
      await w.close();
    }
  }
  
  console.log("[INFO] Closing redis connections...");
  for (const conn of connections) {
    try {
      await conn.quit();
    } catch (e) {
      console.error("[ERROR] Failed to close redis connection", e);
    }
  }
  connections = [];
  workers = [];
  console.log("[SUCCESS] All workers and connections closed");
};
