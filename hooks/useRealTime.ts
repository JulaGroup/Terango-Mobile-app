import { useEffect, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import NotificationService from "@/services/notification.service";
import WebSocketService from "@/services/websocket.service";
import { useVendor } from "@/context/VendorContext";

interface UseRealTimeOptions {
  enablePushNotifications?: boolean;
  enableWebSocket?: boolean;
  enablePolling?: boolean;
  pollingInterval?: number;
  onNewOrder?: (orderData: any) => void;
  onOrderStatusChange?: (orderData: any) => void;
  onMenuUpdate?: (menuData: any) => void;
}

export function useRealTime(options: UseRealTimeOptions = {}) {
  const {
    // TEMPORARILY DISABLED by default: push token registration was
    // retrying repeatedly on poor connections and slowing the app down.
    // WebSocket (real-time order updates) is unaffected.
    enablePushNotifications = false,
    enableWebSocket = true,
    enablePolling = true,
    pollingInterval = 30000,
    onNewOrder,
    onOrderStatusChange,
    onMenuUpdate,
  } = options;

  const { vendor } = useVendor();
  const [isConnected, setIsConnected] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);

  /**
   * Setup push notifications
   */
  const setupPushNotifications = useCallback(async () => {
    if (!enablePushNotifications || !vendor?.id) return;

    try {
      const token = await NotificationService.registerForPushNotifications();

      if (token) {
        setPushToken(token);
        // Use vendor.id as userId for now
        await NotificationService.savePushTokenToServer(vendor.id, token);
        console.log("✅ Push notifications setup complete");
      }
    } catch (error) {
      console.error("❌ Error setting up push notifications:", error);
    }
  }, [enablePushNotifications, vendor?.id]);

  /**
   * Setup WebSocket connection
   */
  const setupWebSocket = useCallback(async () => {
    if (!enableWebSocket || !vendor?.id) return;

    try {
      const connected = await WebSocketService.connect(vendor.id);
      setIsConnected(connected);

      if (connected) {
        WebSocketService.joinVendorRoom(vendor.id);
        console.log("✅ WebSocket setup complete");
      }
    } catch (error) {
      console.error("❌ Error setting up WebSocket:", error);
    }
  }, [enableWebSocket, vendor?.id]);

  /**
   * Setup WebSocket event listeners
   */
  useEffect(() => {
    if (!enableWebSocket) return;

    const handleNewOrder = (orderData: any) => {
      console.log("📦 Real-time: New order received", orderData);

      // Show notification
      NotificationService.showNewOrderNotification({
        orderId: orderData.id,
        customerName: orderData.customer?.name || "Customer",
        totalAmount: orderData.totalAmount,
        itemCount: orderData.items?.length || 0,
      });

      // Call custom handler
      onNewOrder?.(orderData);
    };

    const handleOrderStatusChange = (orderData: any) => {
      console.log("🔄 Real-time: Order status changed", orderData);
      onOrderStatusChange?.(orderData);
    };

    const handleMenuUpdate = (menuData: any) => {
      console.log("🍔 Real-time: Menu updated", menuData);
      onMenuUpdate?.(menuData);
    };

    const handleConnectionStatus = (connected: boolean) => {
      console.log(`🔌 WebSocket ${connected ? "connected" : "disconnected"}`);
      setIsConnected(connected);
    };

    WebSocketService.on("new_order", handleNewOrder);
    WebSocketService.on("order_status_changed", handleOrderStatusChange);
    WebSocketService.on("menu_item_updated", handleMenuUpdate);
    WebSocketService.onConnectionStatus(handleConnectionStatus);

    return () => {
      WebSocketService.off("new_order", handleNewOrder);
      WebSocketService.off("order_status_changed", handleOrderStatusChange);
      WebSocketService.off("menu_item_updated", handleMenuUpdate);
      WebSocketService.offConnectionStatus(handleConnectionStatus);
    };
  }, [enableWebSocket, onNewOrder, onOrderStatusChange, onMenuUpdate]);

  /**
   * Setup notification listeners
   */
  useEffect(() => {
    if (!enablePushNotifications) return;

    // Listen for notifications received while app is in foreground
    const receivedSubscription =
      NotificationService.addNotificationReceivedListener((notification) => {
        console.log("🔔 Notification received:", notification);
      });

    // Listen for user tapping on notification
    const responseSubscription =
      NotificationService.addNotificationResponseListener((response) => {
        console.log("👆 Notification tapped:", response);

        const data = response.notification.request.content.data;

        // Handle navigation based on notification data
        if (data.type === "new_order" && data.orderId) {
          // Navigate to order details
          console.log("Navigate to order:", data.orderId);
        }
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [enablePushNotifications]);

  /**
   * Setup polling fallback
   */
  useEffect(() => {
    if (!enablePolling || !vendor?.id) return;

    let intervalId: ReturnType<typeof setInterval>;

    const startPolling = () => {
      intervalId = setInterval(() => {
        // Only poll if WebSocket is not connected
        if (!WebSocketService.isConnected()) {
          console.log("🔄 Polling for updates (WebSocket disconnected)");
          // Trigger refresh callbacks
          onNewOrder?.({ _polling: true });
        }
      }, pollingInterval);
    };

    startPolling();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [enablePolling, vendor?.id, pollingInterval, onNewOrder]);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        // App came to foreground
        if (
          appState.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          console.log("📱 App came to foreground");

          // Reconnect WebSocket if needed
          if (enableWebSocket && !WebSocketService.isConnected()) {
            setupWebSocket();
          }

          // Clear badge
          NotificationService.setBadgeCount(0);
        }

        // App going to background
        if (
          appState === "active" &&
          nextAppState.match(/inactive|background/)
        ) {
          console.log("📱 App going to background");
        }

        setAppState(nextAppState);
      }
    );

    return () => {
      subscription.remove();
    };
  }, [appState, enableWebSocket, setupWebSocket]);

  /**
   * Initial setup
   */
  useEffect(() => {
    const initialize = async () => {
      await setupPushNotifications();
      await setupWebSocket();
    };

    initialize();

    return () => {
      // Cleanup on unmount
      if (vendor?.id) {
        WebSocketService.leaveVendorRoom(vendor.id);
      }
    };
  }, [setupPushNotifications, setupWebSocket, vendor?.id]);

  /**
   * Send test notification
   */
  const sendTestNotification = useCallback(async () => {
    await NotificationService.showLocalNotification(
      "Test Notification",
      "This is a test notification from Teranggo"
    );
  }, []);

  /**
   * Manually trigger reconnect
   */
  const reconnect = useCallback(async () => {
    if (enableWebSocket) {
      const connected = await WebSocketService.reconnect();
      setIsConnected(connected);

      if (connected && vendor?.id) {
        WebSocketService.joinVendorRoom(vendor.id);
      }

      return connected;
    }
    return false;
  }, [enableWebSocket, vendor?.id]);

  return {
    isConnected,
    pushToken,
    sendTestNotification,
    reconnect,
    notificationService: NotificationService,
    websocketService: WebSocketService,
  };
}
