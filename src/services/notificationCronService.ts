import { Repository } from "typeorm";
import Database from "../config/database";
import { Notification, NotificationStatus, NotificationType } from "../models/notification.model";
import { PushNotificationService } from "./pushNotificationService";

const DEFAULT_TZ = process.env.DEFAULT_TZ || process.env.FRIDGE_SCAN_TZ || "UTC";

const formatDateInTimeZone = (date: Date, timeZone: string): string => {
  return date.toLocaleDateString("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

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

    const limit = new Date(now);
    limit.setDate(limit.getDate() + daysBefore);

    const from = formatDateInTimeZone(now, DEFAULT_TZ);
    const to = formatDateInTimeZone(limit, DEFAULT_TZ);

    const pending = await this.notificationRepository
      .createQueryBuilder("notification")
      .leftJoinAndSelect("notification.user", "user")
      .where("notification.type = :type", { type: NotificationType.EXPIRY_REMINDER })
      // .andWhere("notification.status = :status", { status: NotificationStatus.PENDING })
      .andWhere("notification.scheduled_date BETWEEN :from AND :to", { from, to })
      .getMany();

    console.log(
      `[CRON] Found ${pending.length} pending expiry notifications (${from} -> ${to}) [tz=${DEFAULT_TZ}]`
    );

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


