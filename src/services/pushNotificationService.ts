import { Expo } from "expo-server-sdk";
import { Repository } from "typeorm";
import Database from "../config/database";
import { DeviceToken } from "../models/device_token.model";
import { Notification, NotificationStatus } from "../models/notification.model";

class PushNotificationService {
  private expo: Expo;
  private deviceTokenRepo: Repository<DeviceToken>;
  private notificationRepo: Repository<Notification>;

  constructor() {
    this.expo = new Expo();
    const dataSource = Database.getInstance();
    this.deviceTokenRepo = dataSource.getRepository(DeviceToken);
    this.notificationRepo = dataSource.getRepository(Notification);
  }

  async sendPushNotification(
    userId: string,
    notificationId: string,
    message: string,
    type: string
  ) {
    const deviceTokens = await this.deviceTokenRepo.find({
      where: { user: { id: userId }, isActive: true },
    });

    if (deviceTokens.length === 0) {
      console.log(`[WARN] No device tokens for user ${userId}`);
      return;
    }

    const validTokens = deviceTokens.filter(token => Expo.isExpoPushToken(token.token));

    if (validTokens.length === 0) {
      console.log(`[WARN] No valid Expo push tokens for user ${userId}`);
      return;
    }

    const messages = validTokens.map(token => ({
      to: token.token,
      sound: "default" as const,
      title: "Thông báo thực phẩm",
      body: message,
      data: {
        notificationId,
        type,
        userId,
      },
    }));

    const tickets: any[] = [];

    for (const msg of messages) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync([msg]);
        tickets.push(...ticketChunk);
      } catch (error: any) {
        console.error("[ERROR] Error sending push to token:", error);
        if (error.code === 'PUSH_TOO_MANY_EXPERIENCE_IDS') {
          console.log(`[WARN] Skipping token due to project mismatch: ${msg.to}`);
        }
      }
    }

    await this.handleTicketResponses(tickets, validTokens);
    await this.updateNotificationStatus(notificationId);
  }

  private async handleTicketResponses(
    tickets: any[],
    deviceTokens: DeviceToken[]
  ) {
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const token = deviceTokens[i];

      if (ticket.status === "error") {
        if (
          ticket.details?.error === "DeviceNotRegistered" ||
          ticket.details?.error === "InvalidCredentials"
        ) {
          await this.deviceTokenRepo.delete({ id: token.id });
          console.log(`[INFO] Removed invalid token: ${token.id}`);
        }
      }
    }
  }

  private async updateNotificationStatus(notificationId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });

    if (notification) {
      notification.status = NotificationStatus.SENT;
      notification.sent_at = new Date();
      await this.notificationRepo.save(notification);
    }
  }
}

export { PushNotificationService };

