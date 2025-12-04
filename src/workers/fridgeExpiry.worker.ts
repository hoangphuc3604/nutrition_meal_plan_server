import { Worker } from "bullmq";
import MessageQueueEnum from "../enums/message.enum";
import NotificationCronService from "../services/notificationCronService";

export function handleFridgeExpiryWorker(connection: any) {
  const cronService = new NotificationCronService();

  const worker = new Worker(
    MessageQueueEnum.FRIDGE_EXPIRY_SCAN,
    async (job) => {
      const daysBefore: number = typeof job.data?.daysBefore === "number"
        ? job.data.daysBefore
        : parseInt(process.env.FRIDGE_EXPIRY_DAYS_BEFORE || "1", 10);

      console.log(
        `[CRON] Running fridge expiry scan job ${job.id} (daysBefore=${daysBefore})`
      );

      await cronService.processExpiryNotifications(daysBefore);

      return { success: true, daysBefore };
    },
    {
      connection,
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[CRON] Fridge expiry scan job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[CRON] Fridge expiry scan job ${job?.id} failed:`,
      err.message
    );
  });

  console.log("[INIT] Worker started for queue: fridge_expiry_scan");
  return worker;
}


