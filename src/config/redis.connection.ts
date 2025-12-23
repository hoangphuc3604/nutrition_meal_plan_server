import { Redis } from "ioredis";
import * as dotenv from "dotenv";
dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

let sharedConnection: Redis | null = null;

export const getSharedRedisConnection = () => {
  if (!sharedConnection) {
    sharedConnection = new Redis(redisConfig);
  }
  return sharedConnection;
};

export const closeSharedRedisConnection = async () => {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
    console.log("[INFO] Shared Redis connection closed");
  }
};
