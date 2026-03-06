import * as dotenv from "dotenv";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import MessageQueueEnum from "../enums/message.enum";

dotenv.config();

const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const clearImageQueues = async () => {
  console.log("[TOOL] Clearing image queues...\n");

  const queues = [
    new Queue(MessageQueueEnum.IMAGE_GENERATION, { connection }),
    new Queue(MessageQueueEnum.RECIPE_IMAGE_GENERATION, { connection }),
  ];

  try {
    for (const queue of queues) {
      const counts = await queue.getJobCounts("wait", "active", "delayed", "completed", "failed");
      console.log(`[${queue.name}] Before clear:`, counts);

      await queue.obliterate({ force: true });
      console.log(`[${queue.name}] Cleared ✓\n`);

      await queue.close();
    }

    console.log("✅ All image queues cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing queues:", error);
    process.exit(1);
  }

  await connection.quit();
  process.exit(0);
};

clearImageQueues();
