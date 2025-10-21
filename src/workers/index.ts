import { Redis } from "ioredis";
import * as dotenv from "dotenv";
import Database from "../config/database";
import { handleUpdateImageWorker } from "./image.worker";

dotenv.config();

const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

let workers: any[] = [];
export const initWorkers = async () => {
  await Database.init();
  console.log("[SUCCESS] Database connected");

  if (workers.length === 0) {
    workers = [handleUpdateImageWorker(connection)];
  }

  console.log(`[INFO] Workers active: ${workers.length}`);
  return { connection, workers };
};

export const closeWorkers = async () => {
  console.log("[INFO] Closing workers...");
  for (const w of workers) await w.close();
  await connection.quit();
  console.log("[SUCCESS] All workers closed");
};
