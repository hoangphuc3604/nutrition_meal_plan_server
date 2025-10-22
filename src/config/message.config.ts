import { Queue } from "bullmq";
import { Redis } from "ioredis";
import * as dotenv from "dotenv";
import MessageQueueEnum from "../enums/message.enum";

dotenv.config();

const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

export const createQueue = (name: string) =>
  new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 24 * 3600, count: 100 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });

export const mealQueue = createQueue(MessageQueueEnum.MEAL_GENERATION);

mealQueue.on("error", (error) => {
  console.error("[QUEUE ERROR] - Meal Queue error:", error);
});

mealQueue.on("waiting", (jobId) => {
  console.log(`[QUEUE] - Job ${jobId} is waiting to be processed`);
});

process.on("SIGTERM", async () => {
  console.log("[INFO] - SIGTERM received, closing queue connection...");
  await mealQueue.close();
  await connection.quit();
});

process.on("SIGINT", async () => {
  console.log("[INFO] - SIGINT received, closing queue connection...");
  await mealQueue.close();
  await connection.quit();
});

console.log("[SUCCESS] - Meal Queue initialized");

export default mealQueue;
