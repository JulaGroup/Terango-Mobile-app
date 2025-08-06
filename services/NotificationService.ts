import * as Notifications from "expo-notifications";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  static async scheduleOrderNotification(orderData: {
    orderId: string;
    title: string;
    body: string;
    data?: any;
  }) {
    try {
      const { orderId, title, body, data } = orderData;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { orderId, ...data },
          categoryIdentifier: "order-update",
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error("Failed to schedule notification:", error);
    }
  }

  static async scheduleDeliveryNotification(deliveryData: {
    orderId: string;
    title: string;
    body: string;
    estimatedTime?: number; // in minutes
  }) {
    try {
      const { orderId, title, body, estimatedTime } = deliveryData;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { orderId, type: "delivery" },
          categoryIdentifier: "delivery-update",
        },
        trigger: estimatedTime
          ? {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: estimatedTime * 60,
            }
          : null, // Show immediately if no time specified
      });
    } catch (error) {
      console.error("Failed to schedule delivery notification:", error);
    }
  }

  static async schedulePromotionNotification(promotionData: {
    title: string;
    body: string;
    data?: any;
    scheduleTime?: Date;
  }) {
    try {
      const { title, body, data, scheduleTime } = promotionData;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: "promotion", ...data },
          categoryIdentifier: "promotion",
        },
        trigger: scheduleTime
          ? {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: scheduleTime,
            }
          : null, // Show immediately if no schedule time
      });
    } catch (error) {
      console.error("Failed to schedule promotion notification:", error);
    }
  }

  static async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error("Failed to cancel notification:", error);
    }
  }

  static async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Failed to cancel all notifications:", error);
    }
  }

  static async getPushToken(): Promise<string | null> {
    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: "your-project-id", // Replace with your actual project ID
      });
      return token;
    } catch (error) {
      console.error("Failed to get push token:", error);
      return null;
    }
  }
}
