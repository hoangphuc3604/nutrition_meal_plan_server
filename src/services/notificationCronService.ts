import { Repository } from "typeorm";
import Database from "../config/database";
import { Notification, NotificationStatus, NotificationType } from "../models/notification.model";
import { PushNotificationService } from "./pushNotificationService";

class NotificationCronService {
  private notificationRepository: Repository<Notification>;
  private pushService: PushNotificationService;

  constructor() {
    const dataSource = Database.getInstance();
    this.notificationRepository = dataSource.getRepository(Notification);
    this.pushService = new PushNotificationService();
  }

  async processExpiryNotifications(daysBefore: number) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const limit = new Date(now);
    limit.setDate(now.getDate() + daysBefore);

    const from = now.toISOString().split("T")[0];
    const to = limit.toISOString().split("T")[0];

    const pending = await this.notificationRepository
      .createQueryBuilder("notification")
      .leftJoinAndSelect("notification.user", "user")
      .where("notification.type = :type", { type: NotificationType.EXPIRY_REMINDER })
      // .andWhere("notification.status = :status", { status: NotificationStatus.PENDING })
      .andWhere("notification.scheduled_date BETWEEN :from AND :to", { from, to })
      .getMany();

    console.log(`[CRON] Found ${pending.length} pending expiry notifications (${from} -> ${to})`);

    for (const notification of pending) {
      try {
        await this.pushService.sendPushNotification(
          notification.user.id,
          notification.id,
          notification.message,
          notification.type
        );
      } catch (error: any) {
        console.error(
          `[CRON] Failed to send push for notification ${notification.id}:`,
          error.message || error
        );
      }
    }
  }
}

export default NotificationCronService;


