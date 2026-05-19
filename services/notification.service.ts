import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { SecureStorage } from "@/utils/secureStorage";
import { API_URL } from "@/constants/config";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => {
    // Return the full NotificationBehavior shape expected by the types
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // Newer Expo typings expect these too
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

interface NotificationData {
  orderId?: string;
  type?: string;
  [key: string]: any;
}

class NotificationService {
  private expoPushToken: string | null = null;

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    let token = null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#8B5CF6",
      });

      // Create high priority channel for orders
      await Notifications.setNotificationChannelAsync("orders", {
        name: "New Orders",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        sound: "default",
        lightColor: "#FF5722",
        enableVibrate: true,
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Failed to get push token for push notification!");
        return null;
      }

      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;

        if (!projectId) {
          console.warn("Project ID not found");
        }

        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;

        this.expoPushToken = token;
        console.log("✅ Push token obtained:", token);
      } catch (error) {
        console.error("Error getting push token:", error);
      }
    } else {
      console.warn("Must use physical device for Push Notifications");
    }

    return token;
  }

  /**
   * Save push token to server
   */
  async savePushTokenToServer(userId: string, token: string): Promise<boolean> {
    try {
      if (!userId || !token) {
        console.warn("⚠️ Missing userId or token, skipping save");
        return false;
      }

      const authToken =
        (await SecureStorage.getItem("authToken")) ||
        (await SecureStorage.getItem("token"));

      // Fixed: Changed from /api/push-tokens to /api/push-token (singular) to match server route
      // Server expects: { userId, expoPushToken, deviceInfo }
      // deviceInfo must be a JSON string, not an object (per Prisma schema)
      const deviceInfoString = JSON.stringify({
        platform: Platform.OS,
        deviceName: Device.deviceName || "Unknown",
      });

      const response = await fetch(`${API_URL}/api/push-token/save-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          userId,
          expoPushToken: token, // Changed from 'token' to 'expoPushToken'
          deviceInfo: deviceInfoString, // Send as JSON string, not object
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Push token saved to server:", result);
        return true;
      } else {
        const errorData = await response.json();
        console.error("❌ Failed to save push token:", errorData);
        return false;
      }
    } catch (error) {
      console.error("❌ Error saving push token:", error);
      return false;
    }
  }

  /**
   * Show local notification
   */
  async showLocalNotification(
    title: string,
    body: string,
    data?: NotificationData,
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: data?.type === "new_order" ? "orders" : "default",
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Show notification for new order (with special styling)
   */
  async showNewOrderNotification(orderData: {
    orderId: string;
    customerName: string;
    totalAmount: number;
    itemCount: number;
  }): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 New Order Received!",
        body: `Order from ${orderData.customerName}\n${
          orderData.itemCount
        } items - IDR ${orderData.totalAmount.toLocaleString()}`,
        data: {
          type: "new_order",
          orderId: orderData.orderId,
        },
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: "orders",
        badge: 1,
      },
      trigger: null,
    });
  }

  /**
   * Show order status update notification
   */
  async showOrderStatusNotification(
    status: string,
    orderNumber: string,
  ): Promise<void> {
    const statusEmojis: Record<string, string> = {
      ACCEPTED: "✅",
      PREPARING: "👨‍🍳",
      READY: "🎉",
      DISPATCHED: "🚗",
      DELIVERED: "✅",
      CANCELLED: "❌",
    };

    const statusMessages: Record<string, string> = {
      ACCEPTED: "Your order has been accepted",
      PREPARING: "Your order is being prepared",
      READY: "Your order is ready!",
      DISPATCHED: "Your order is on the way",
      DELIVERED: "Your order has been delivered",
      CANCELLED: "Your order was cancelled",
    };

    const emoji = statusEmojis[status] || "📦";
    const message = statusMessages[status] || "Order status updated";

    await this.showLocalNotification(
      `${emoji} Order #${orderNumber}`,
      message,
      { type: "order_status", status },
    );
  }

  /**
   * Add notification received listener
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void,
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add notification response listener (when user taps notification)
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void,
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Get current badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

export default new NotificationService();
