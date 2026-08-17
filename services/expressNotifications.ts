/**
 * Express delivery push notifications.
 *
 * Written to the conventions transactional delivery push follows:
 *
 * - Sentence case, no exclamation marks, no marketing voice. "Great news!"
 *   and "Thank you for using TeranGO Express!" read as promotional, and
 *   promotional-sounding transactional push is what gets an app muted.
 * - Every message carries the delivery reference. A customer with two
 *   deliveries running could not previously tell which one a notification
 *   was about.
 * - The title carries the substance where there is any, because on a lock
 *   screen the title is often all that is read: the rider's name when one is
 *   assigned, the ETA while in transit.
 * - No emoji. Titles led with one before; Uber, Bolt and Grab all ship plain
 *   text, and an emoji costs characters the title needs on a narrow screen.
 */

import * as Notifications from "expo-notifications";
import { formatExpressDeliveryId } from "@/utils/formatExpressDeliveryId";

// ─── Express Delivery Status Messages ────────────────────────────────────────
export const EXPRESS_NOTIFICATION_MESSAGES = {
  PENDING: {
    title: "Delivery request received",
    body: "{{ref}} · We're reviewing your request and will confirm shortly.",
    sound: "default",
    priority: "default" as const,
  },

  CONFIRMED: {
    title: "Delivery confirmed",
    body: "{{ref}} · We're finding a rider for your package.",
    sound: "default",
    priority: "high" as const,
  },

  ADMIN_APPROVED: {
    title: "Ready for payment",
    body: "{{ref}} · Your request is approved. Pay now to book your rider.",
    sound: "default",
    priority: "high" as const,
  },

  // Same moment as ADMIN_APPROVED — the request cleared review and payment is
  // the next step. The old copy read "Payment Approved / Your payment has been
  // approved. You can now complete the payment", which told customers they had
  // paid and then asked them to pay.
  PAYMENT_APPROVED: {
    title: "Ready for payment",
    body: "{{ref}} · Your request is approved. Pay now to book your rider.",
    sound: "default",
    priority: "high" as const,
  },

  DRIVER_ASSIGNED: {
    title: "{{driverName}} is your rider",
    body: "{{ref}} · On the way to collect your package.",
    sound: "default",
    priority: "high" as const,
  },

  DRIVER_ARRIVED: {
    title: "Your rider has arrived",
    body: "{{ref}} · {{driverName}} is at the pickup point.",
    sound: "default",
    priority: "max" as const,
  },

  PICKED_UP: {
    title: "Package collected",
    body: "{{ref}} · {{driverName}} is heading to the drop-off.",
    sound: "default",
    priority: "high" as const,
  },

  IN_TRANSIT: {
    title: "Arriving in {{eta}} min",
    body: "{{ref}} · Your package is on its way to the drop-off.",
    sound: "default",
    priority: "high" as const,
  },

  NEAR_DELIVERY: {
    title: "Your rider is nearly there",
    body: "{{ref}} · Arriving shortly — please keep your phone reachable.",
    sound: "default",
    priority: "max" as const,
  },

  DELIVERED: {
    title: "Delivered",
    body: "{{ref}} · Your package has been delivered.",
    sound: "success",
    priority: "high" as const,
  },

  DELAYED: {
    title: "Your delivery is running late",
    body: "{{ref}} · New estimate: {{eta}} min. Sorry for the wait.",
    sound: "default",
    priority: "default" as const,
  },

  CANCELLED: {
    title: "Delivery cancelled",
    body: "{{ref}} · {{reason}}",
    sound: "default",
    priority: "default" as const,
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

  const fill = (text: string) =>
    text
      .replace(/\{\{ref\}\}/g, formatExpressDeliveryId(data.deliveryId))
      .replace(/\{\{driverName\}\}/g, data.driverName || "Your rider")
      .replace(/\{\{eta\}\}/g, data.eta != null ? String(data.eta) : "")
      .replace(/\{\{reason\}\}/g, data.reason || "No reason was given.");

  // Every placeholder gets a fallback above, but a template could still be
  // edited to use one this function does not know. Strip any survivors rather
  // than pushing a literal "{{eta}}" to a customer's lock screen, and tidy the
  // separator and spacing an emptied placeholder leaves behind.
  const clean = (text: string) =>
    fill(text)
      .replace(/\{\{[^}]*\}\}/g, "")
      .replace(/\s+/g, " ")
      .replace(/\s+·\s*$/, "")
      .replace(/^\s*·\s+/, "")
      .trim();

  const title = clean(template.title);
  const body = clean(template.body);

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        ...data,
        type: "express_delivery",
        status,
      },
      // Only notification.mp3 is bundled (see the expo-notifications plugin
      // config in app.json). This previously asked for "success.wav", which
      // does not exist in assets/sounds — a missing sound resource is not
      // something the OS reports, it just does not play.
      sound: template.sound === "success" ? "notification.mp3" : "default",
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
