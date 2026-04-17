/**
 * ENHANCED EXPRESS DELIVERY NOTIFICATIONS
 * Industry-standard messages with emojis and better UX
 */

import * as Notifications from "expo-notifications";

// ─── Express Delivery Status Messages ────────────────────────────────────────
export const EXPRESS_NOTIFICATION_MESSAGES = {
  PENDING: {
    emoji: "⏳",
    title: "Order Received",
    body: "Your express delivery request is being reviewed by our team",
    sound: "default",
    priority: "default" as const,
  },
  
  CONFIRMED: {
    emoji: "✅",
    title: "Order Confirmed",
    body: "Great news! Your express delivery has been confirmed. Looking for a driver...",
    sound: "default",
    priority: "high" as const,
  },
  
  DRIVER_ASSIGNED: {
    emoji: "🚗",
    title: "Driver Assigned",
    body: "{{driverName}} is on the way to pick up your package",
    sound: "default",
    priority: "high" as const,
  },
  
  PICKED_UP: {
    emoji: "📦",
    title: "Package Picked Up",
    body: "Your package is now with the driver. Delivery in progress!",
    sound: "default",
    priority: "high" as const,
  },
  
  IN_TRANSIT: {
    emoji: "🚀",
    title: "On The Way",
    body: "Your package is moving! ETA: {{eta}} minutes",
    sound: "default",
    priority: "high" as const,
  },
  
  NEAR_DELIVERY: {
    emoji: "📍",
    title: "Almost There",
    body: "Driver is 5 minutes away from your delivery location",
    sound: "default",
    priority: "max" as const,
  },
  
  DELIVERED: {
    emoji: "🎉",
    title: "Delivered Successfully",
    body: "Your package has been delivered. Thank you for using TeranGO Express!",
    sound: "success",
    priority: "high" as const,
  },
  
  CANCELLED: {
    emoji: "❌",
    title: "Delivery Cancelled",
    body: "Your express delivery has been cancelled. Reason: {{reason}}",
    sound: "default",
    priority: "default" as const,
  },
  
  DELAYED: {
    emoji: "⚠️",
    title: "Slight Delay",
    body: "Your delivery is experiencing a minor delay. New ETA: {{eta}} minutes",
    sound: "default",
    priority: "default" as const,
  },
  
  PAYMENT_APPROVED: {
    emoji: "💳",
    title: "Payment Approved",
    body: "Your payment has been approved. You can now complete the payment.",
    sound: "default",
    priority: "high" as const,
  },
  
  DRIVER_ARRIVED: {
    emoji: "🎯",
    title: "Driver Has Arrived",
    body: "Your driver has arrived at the pickup location",
    sound: "default",
    priority: "max" as const,
  },
  
  ADMIN_APPROVED: {
    emoji: "👍",
    title: "Admin Approved",
    body: "Your delivery request has been approved! Proceed to payment.",
    sound: "default",
    priority: "high" as const,
  },
} as const;

// ─── Regular Order Status Messages ───────────────────────────────────────────
export const ORDER_NOTIFICATION_MESSAGES = {
  pending: {
    emoji: "🔄",
    title: "Order Placed",
    body: "Your order #{{orderNumber}} has been received",
  },
  
  confirmed: {
    emoji: "✅",
    title: "Order Confirmed",
    body: "{{vendorName}} is preparing your order",
  },
  
  preparing: {
    emoji: "👨‍🍳",
    title: "Preparing Your Order",
    body: "Your delicious meal is being prepared with care",
  },
  
  ready: {
    emoji: "🎉",
    title: "Order Ready",
    body: "Your order is ready! Driver will pick it up soon",
  },
  
  dispatched: {
    emoji: "🚗",
    title: "On The Way",
    body: "{{driverName}} is delivering your order. ETA: {{eta}} min",
  },
  
  inTransit: {
    emoji: "🚀",
    title: "Almost There",
    body: "Your order is {{distance}}km away",
  },
  
  delivered: {
    emoji: "🎊",
    title: "Delivered",
    body: "Enjoy your meal! Please rate your experience",
  },
  
  cancelled: {
    emoji: "❌",
    title: "Order Cancelled",
    body: "Your order has been cancelled. Refund processing...",
  },
} as const;

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Show express delivery notification
 */
export async function showExpressDeliveryNotification(
  status: keyof typeof EXPRESS_NOTIFICATION_MESSAGES,
  data: {
    deliveryId: string;
    driverName?: string;
    eta?: number;
    reason?: string;
  }
) {
  const template = EXPRESS_NOTIFICATION_MESSAGES[status];
  if (!template) {
    console.warn(`Unknown status: ${status}`);
    return;
  }

  // Replace placeholders
  let body = template.body;
  if (data.driverName) {
    body = body.replace("{{driverName}}", data.driverName);
  }
  if (data.eta) {
    body = body.replace("{{eta}}", data.eta.toString());
  }
  if (data.reason) {
    body = body.replace("{{reason}}", data.reason);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${template.emoji} ${template.title}`,
      body,
      data: {
        type: "express_delivery",
        deliveryId: data.deliveryId,
        status,
        ...data,
      },
      sound: template.sound === "success" ? "success.wav" : "default",
      priority:
        template.priority === "max"
          ? Notifications.AndroidNotificationPriority.MAX
          : template.priority === "high"
          ? Notifications.AndroidNotificationPriority.HIGH
          : Notifications.AndroidNotificationPriority.DEFAULT,
      categoryIdentifier: "express_delivery",
      badge: 1,
    },
    trigger: null,
  });
}

/**
 * Show regular order notification
 */
export async function showOrderNotification(
  status: keyof typeof ORDER_NOTIFICATION_MESSAGES,
  data: {
    orderId: string;
    orderNumber?: string;
    vendorName?: string;
    driverName?: string;
    eta?: number;
    distance?: number;
  }
) {
  const template = ORDER_NOTIFICATION_MESSAGES[status];
  if (!template) {
    console.warn(`Unknown order status: ${status}`);
    return;
  }

  // Replace placeholders
  let body = template.body;
  if (data.orderNumber) {
    body = body.replace("{{orderNumber}}", data.orderNumber);
  }
  if (data.vendorName) {
    body = body.replace("{{vendorName}}", data.vendorName);
  }
  if (data.driverName) {
    body = body.replace("{{driverName}}", data.driverName);
  }
  if (data.eta) {
    body = body.replace("{{eta}}", data.eta.toString());
  }
  if (data.distance) {
    body = body.replace("{{distance}}", data.distance.toFixed(1));
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${template.emoji} ${template.title}`,
      body,
      data: {
        type: "order",
        orderId: data.orderId,
        status,
        ...data,
      },
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.HIGH,
      categoryIdentifier: "orders",
      badge: 1,
    },
    trigger: null,
  });
}

/**
 * Show generic notification
 */
export async function showGenericNotification(
  title: string,
  body: string,
  data?: Record<string, any>
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
    },
    trigger: null,
  });
}

/**
 * Format notification data for display
 */
export function getNotificationInfo(notification: Notifications.Notification) {
  const data = notification.request.content.data;
  const type = data?.type as string;
  
  return {
    type,
    isExpressDelivery: type === "express_delivery",
    isOrder: type === "order",
    deliveryId: data?.deliveryId as string | undefined,
    orderId: data?.orderId as string | undefined,
    status: data?.status as string | undefined,
    ...data,
  };
}
