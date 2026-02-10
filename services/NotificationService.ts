import { API_URL } from "@/constants/config";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import {
  initSocket,
  on as socketOn,
  off as socketOff,
} from "@/services/SocketService";

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

// Browser notification utilities for web platform
class BrowserNotificationService {
  private static permission: NotificationPermission = "default";

  static async requestPermission(): Promise<NotificationPermission> {
    if (Platform.OS !== "web") return "default";

    if (!("Notification" in window)) {
      console.warn(
        "[BrowserNotification] This browser does not support notifications",
      );
      return "denied";
    }

    if (Notification.permission === "granted") {
      this.permission = "granted";
      return "granted";
    }

    if (Notification.permission === "denied") {
      this.permission = "denied";
      return "denied";
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      console.error(
        "[BrowserNotification] Error requesting permission:",
        error,
      );
      return "denied";
    }
  }

  static async showNotification(
    title: string,
    options?: NotificationOptions,
  ): Promise<void> {
    if (Platform.OS !== "web" || this.permission !== "granted") return;

    try {
      const notification = new Notification(title, {
        icon: "/favicon.ico", // You can customize this
        badge: "/favicon.ico",
        ...options,
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error("[BrowserNotification] Error showing notification:", error);
    }
  }

  static async showOrderStatusNotification(
    orderId: string,
    status: string,
    message?: string,
  ): Promise<void> {
    const title = `Order Status Update`;
    const body =
      message ||
      `Your order #${orderId.slice(-8).toUpperCase()} status changed to ${status}`;

    await this.showNotification(title, {
      body,
      tag: `order-${orderId}`, // Prevents duplicate notifications
      data: { orderId, type: "order_status_update" },
    });
  }
}

// Global callback for refreshing orders
let onOrdersRefresh: (() => void) | null = null;
export function setOrdersRefreshCallback(cb: () => void) {
  onOrdersRefresh = cb;
}

// Global callback for navigation
let onNavigateToOrder: ((orderId: string) => void) | null = null;
export function setNavigateToOrderCallback(cb: (orderId: string) => void) {
  onNavigateToOrder = cb;
}

// Store successful order data for modal on app reopen
const SUCCESSFUL_ORDER_KEY = "teranggo_last_successful_order";

export async function storeSuccessfulOrder(orderData: {
  orderId: string;
  timestamp: number;
  data?: any;
}): Promise<boolean> {
  try {
    console.log("[NotificationService] Storing successful order:", orderData);
    // Check existing stored order and avoid overwriting the same order
    const existingRaw = await AsyncStorage.getItem(SUCCESSFUL_ORDER_KEY);
    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw);
        if (
          existing &&
          existing.orderId &&
          existing.orderId === orderData.orderId
        ) {
          console.log(
            "[NotificationService] Same order already stored, skipping store",
          );
          return false; // not new
        }
      } catch (e) {
        // If parse fails, fall through and overwrite
        console.warn(
          "[NotificationService] Failed to parse existing successful order, will overwrite",
          e,
        );
      }
    }

    await AsyncStorage.setItem(SUCCESSFUL_ORDER_KEY, JSON.stringify(orderData));
    console.log("[NotificationService] Successfully stored order data");
    return true; // newly stored
  } catch (error) {
    console.warn(
      "[NotificationService] Failed to store successful order:",
      error,
    );
    return false;
  }
}

export async function getSuccessfulOrder() {
  try {
    console.log("[NotificationService] Checking for successful order data");
    const data = await AsyncStorage.getItem(SUCCESSFUL_ORDER_KEY);
    if (data) {
      const orderData = JSON.parse(data);
      console.log("[NotificationService] Found order data:", orderData);
      // Check if order is recent (within last 24 hours)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (orderData.timestamp > oneDayAgo) {
        console.log("[NotificationService] Order is recent, returning data");
        return orderData;
      } else {
        console.log("[NotificationService] Order is old, clearing data");
        // Clear old data
        await AsyncStorage.removeItem(SUCCESSFUL_ORDER_KEY);
      }
    } else {
      console.log("[NotificationService] No order data found");
    }
  } catch (error) {
    console.warn(
      "[NotificationService] Failed to get successful order:",
      error,
    );
  }
  return null;
}

export async function clearSuccessfulOrder() {
  try {
    await AsyncStorage.removeItem(SUCCESSFUL_ORDER_KEY);
  } catch (error) {
    console.warn(
      "[NotificationService] Failed to clear successful order:",
      error,
    );
  }
}

/**
 * FIX: Improved push token registration with proper sequencing
 *
 * ISSUE: Push tokens were not being saved after user authentication because
 * the function was called before auth was complete. This caused users to miss
 * critical notifications like order assignments and order status updates.
 *
 * SOLUTION:
 * 1. Only attempt to register push token if userId exists (auth confirmed)
 * 2. Add retry logic with exponential backoff (up to 3 attempts)
 * 3. Add comprehensive error handling with user-friendly logging
 * 4. Ensure cleanup of listeners to prevent memory leaks
 */
export function useRegisterPushToken(userId: string) {
  useEffect(() => {
    // Initialize socket listeners for real-time backend events.
    // Derive a sensible socket URL from API_URL by stripping any /api suffix.
    const socketBase = API_URL
      ? String(API_URL).replace(/\/api\/?(.*)?$/, "")
      : null;
    let socketInitialized = false;
    const maxRetries = 3;

    const paymentSuccessHandler = async (data: any) => {
      console.log("[Socket] paymentSuccess", data);
      if (onOrdersRefresh) onOrdersRefresh();

      // Show browser notification for web users
      if (Platform.OS === "web" && data && data.orderId) {
        BrowserNotificationService.showNotification("🎉 Payment Successful!", {
          body: "Your payment has been processed. Your order is being prepared.",
          tag: `payment-${data.orderId}`,
          data: { orderId: data.orderId, type: "payment_success" },
        }).catch((err) =>
          console.warn(
            "[BrowserNotification] Failed to show payment notification:",
            err,
          ),
        );
      }

      // Store successful order data for modal on app reopen
      if (data && data.orderId) {
        await storeSuccessfulOrder({
          orderId: data.orderId,
          timestamp: Date.now(),
          data: data,
        });

        // Send instant push notification for successful payment
        try {
          await NotificationService.scheduleOrderNotification({
            orderId: data.orderId,
            title: "🎉 Order Successful!",
            body: "Your order has been placed successfully. Tap to view your order.",
            data: {
              orderId: data.orderId,
              type: "payment_success",
              paymentId: data.paymentId,
            },
          });
          console.log("[Notification] Sent payment success notification");
        } catch (error) {
          console.error(
            "[Notification] Failed to send payment success notification:",
            error,
          );
        }
      }

      // Navigate to orders tab instead of order details
      if (onNavigateToOrder && data && data.orderId) {
        // Instead of navigating to order details, we'll navigate to orders
        // and let the user view the order from there
        onNavigateToOrder(""); // Empty string to indicate navigate to orders
      }

      try {
        WebBrowser.dismissBrowser();
        console.log("[Browser] Dismissed browser after payment success");
      } catch (error) {
        console.log("[Browser] Failed to dismiss browser:", error);
      }
    };
    const paymentFailedHandler = (data: any) => {
      console.log("[Socket] paymentFailed", data);
      if (onOrdersRefresh) onOrdersRefresh();
    };
    const orderCreatedHandler = (data: any) => {
      console.log("[Socket] orderCreated", data);

      // Show browser notification for web users
      if (Platform.OS === "web" && data && data.orderId) {
        BrowserNotificationService.showNotification("🔔 Order Created!", {
          body: `Your order #${data.orderId.slice(-8).toUpperCase()} has been created and is being processed.`,
          tag: `order-created-${data.orderId}`,
          data: { orderId: data.orderId, type: "order_created" },
        }).catch((err) =>
          console.warn(
            "[BrowserNotification] Failed to show order created notification:",
            err,
          ),
        );
      }

      // Only navigate if the event is for this user (if payload contains userId)
      if (
        data &&
        data.userId &&
        userId &&
        String(data.userId) === String(userId)
      ) {
        if (onNavigateToOrder && data.orderId)
          onNavigateToOrder(String(data.orderId));
      }
      if (onOrdersRefresh) onOrdersRefresh();
    };
    const orderStatusUpdateHandler = (data: any) => {
      console.log("[Socket] orderStatusUpdate", data);
      if (onOrdersRefresh) onOrdersRefresh();

      // Show browser notification for web users
      if (Platform.OS === "web" && data && data.orderId && data.status) {
        BrowserNotificationService.showOrderStatusNotification(
          data.orderId,
          data.status,
          data.message || `Your order status changed to ${data.status}`,
        ).catch((err) =>
          console.warn(
            "[BrowserNotification] Failed to show status notification:",
            err,
          ),
        );
      }
    };

    (async () => {
      if (!socketBase) return;
      const s = await initSocket(socketBase);
      if (!s) return;
      socketInitialized = true;
      // Register socket listeners
      socketOn("paymentSuccess", paymentSuccessHandler);
      socketOn("paymentFailed", paymentFailedHandler);
      socketOn("orderCreated", orderCreatedHandler);
      socketOn("orderStatusUpdate", orderStatusUpdateHandler);
    })();

    /**
     * FIX: Register push token ONLY after user is authenticated
     * Uses retry logic to handle network failures
     */
    async function registerForPushNotificationsAsync() {
      try {
        // Step 1: Request notification permissions
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          console.warn(
            "[NotificationService] ⚠️ Notification permission not granted",
          );
          return;
        }

        // Step 2: Get push token from Expo
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const expoPushToken = tokenData.data;

        if (!expoPushToken) {
          console.error("[NotificationService] ❌ Failed to get push token");
          return;
        }

        // Step 3: Send token to backend with retry logic
        let lastError: any;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await fetch(
              `${API_URL}/api/push-token/save-token`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId,
                  expoPushToken,
                  deviceInfo: Platform.OS,
                }),
              },
            );

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`,
              );
            }

            console.log(
              `✅ [NotificationService] Push token registered successfully (userId: ${userId})`,
            );
            return; // Success - exit early
          } catch (error) {
            lastError = error;
            console.warn(
              `[NotificationService] Attempt ${attempt}/${maxRetries} failed:`,
              error,
            );

            // Wait before retrying (exponential backoff: 1s, 2s, 4s)
            if (attempt < maxRetries) {
              const delayMs = Math.pow(2, attempt - 1) * 1000;
              await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
          }
        }

        // If we got here, all retries failed
        console.error(
          "[NotificationService] ❌ Failed to register push token after",
          maxRetries,
          "attempts:",
          lastError,
        );
      } catch (error) {
        console.error("[NotificationService] Unexpected error:", error);
      }
    }

    // Only register push token if user is authenticated
    if (userId) {
      console.log(
        "[NotificationService] 🔔 User authenticated, registering push token...",
      );
      registerForPushNotificationsAsync().catch((err) => {
        console.error(
          "[NotificationService] Unhandled error in registration:",
          err,
        );
      });

      // Request browser notification permission for web users
      if (Platform.OS === "web") {
        console.log(
          "[NotificationService] 🌐 Requesting browser notification permission...",
        );
        BrowserNotificationService.requestPermission()
          .then((permission) => {
            console.log(
              `[BrowserNotification] Permission result: ${permission}`,
            );
          })
          .catch((err) => {
            console.warn(
              "[BrowserNotification] Failed to request permission:",
              err,
            );
          });
      }
    } else {
      console.log(
        "[NotificationService] ⏳ Waiting for user authentication before registering push token",
      );
    }

    // Listen for notifications
    const receivedListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log(
          "[Expo] Push notification received and listener is active:",
          notification,
        );
        // Trigger orders refresh if callback is set
        if (onOrdersRefresh) {
          onOrdersRefresh();
        }
      },
    );
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(
          "[Expo] Push notification response received and listener is active:",
          response,
        );

        // Handle notification tap - navigate to order details
        const data = response.notification.request.content.data;
        if (data && data.orderId) {
          const orderId = String(data.orderId);
          console.log("[Expo] Navigating to order:", orderId);

          // Use the navigation callback if set
          if (onNavigateToOrder) {
            onNavigateToOrder(orderId);
          } else {
            console.warn(
              "[Expo] Navigation callback not set for order notifications",
            );
          }
        }

        // Handle notification tap here
      });
    return () => {
      receivedListener.remove();
      responseListener.remove();
      // Clean up socket listeners if we initialized the socket
      try {
        if (socketInitialized) {
          socketOff("paymentSuccess", paymentSuccessHandler);
          socketOff("paymentFailed", paymentFailedHandler);
          socketOff("orderCreated", orderCreatedHandler);
          socketOff("orderStatusUpdate", orderStatusUpdateHandler);
        }
      } catch {
        // ignore cleanup errors
      }
    };
  }, [userId]);
}

export class NotificationService {
  // Schedule an immediate order notification (used for payment success, order created, etc.)
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
      console.log(`✅ Scheduled order notification for order ${orderId}`);
    } catch (error) {
      console.error("Failed to schedule order notification:", error);
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

  static async testInAppBrowser(url: string = "https://www.google.com") {
    try {
      console.log("[Test] Opening in-app browser with URL:", url);
      const result = await WebBrowser.openBrowserAsync(url, {
        dismissButtonStyle: "cancel",
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });
      console.log("[Test] Browser result:", result);
      return result;
    } catch (error) {
      console.error("[Test] Failed to open in-app browser:", error);
      throw error;
    }
  }
}

export { BrowserNotificationService };

// Hook to initialize browser notifications
export function useBrowserNotifications() {
  useEffect(() => {
    if (Platform.OS === "web") {
      // Request permission on mount
      BrowserNotificationService.requestPermission().then((permission) => {
        console.log(
          `[BrowserNotification] Initialized with permission: ${permission}`,
        );
      });
    }
  }, []);
}
