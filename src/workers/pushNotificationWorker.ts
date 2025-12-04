import { Worker } from "bullmq";
import { PushNotificationService } from "../services/pushNotificationService";
import MessageQueueEnum from "../enums/message.enum";

export function handlePushNotificationWorker(connection: any) {
  const pushService = new PushNotificationService();

  const worker = new Worker(
    MessageQueueEnum.PUSH_NOTIFICATION,
    async (job) => {
      const { notificationId, userId, message, type } = job.data;
      
      console.log(`[PUSH WORKER] - Processing push for notification ${notificationId}`);
      
      try {
        await pushService.sendPushNotification(
          userId,
          notificationId,
          message,
          type
        );
        
        console.log(`[SUCCESS] - Push sent for notification ${notificationId}`);
        
        return { success: true, notificationId };
      } catch (error: any) {
        console.error(`[ERROR] - Push failed for ${notificationId}:`, error.message);
        throw error;
      }
    },
    {
      connection,
      concurrency: 10,
      limiter: {
        max: 100,
        duration: 60000,
      },
    }
  );

  worker.on("completed", (job, result) => {
    console.log(`[PUSH] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[PUSH] Job ${job?.id} failed:`, err.message);
  });

  console.log("[INIT] Push Notification Worker started");
  return worker;
}

