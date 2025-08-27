import { API_URL } from "@/constants/config";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

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

// Global callback for refreshing orders
let onOrdersRefresh: (() => void) | null = null;
export function setOrdersRefreshCallback(cb: () => void) {
  onOrdersRefresh = cb;
}

export function useRegisterPushToken(userId: string) {
  useEffect(() => {
    async function registerForPushNotificationsAsync() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return;
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const expoPushToken = tokenData.data;
      // Send token to backend
      await fetch(`${API_URL}/api/push-token/save-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          expoPushToken,
          deviceInfo: Platform.OS,
        }),
      });
      console.log("Expo Push Token:", expoPushToken);
    }
    if (userId) registerForPushNotificationsAsync();

    // Listen for notifications
    const receivedListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log(
          "[Expo] Push notification received and listener is active:",
          notification
        );
        // Trigger orders refresh if callback is set
        if (onOrdersRefresh) {
          onOrdersRefresh();
        }
      }
    );
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(
          "[Expo] Push notification response received and listener is active:",
          response
        );
        // Handle notification tap here
      });
    return () => {
      receivedListener.remove();
      responseListener.remove();
    };
  }, [userId]);
}

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
        projectId: "terango-af158", // Updated to actual project ID
      });
      return token;
    } catch (error) {
      console.error("Failed to get push token:", error);
      return null;
    }
  }
}
