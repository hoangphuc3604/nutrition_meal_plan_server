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

    const messages = deviceTokens
      .filter(token => Expo.isExpoPushToken(token.token))
      .map(token => ({
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

    if (messages.length === 0) {
      console.log(`[WARN] No valid Expo push tokens for user ${userId}`);
      return;
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("[ERROR] Error sending push chunk:", error);
      }
    }

    await this.handleTicketResponses(tickets, deviceTokens);
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

