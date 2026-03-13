/**
 * ActiveOrderBanner — Floating "live order" pill shown on food/mart stack pages.
 * Appears ONLY when the user has at least one active order (Grab-style).
 * Hidden when there are no active orders — zero clutter.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { orderApi } from "@/lib/api";
import {
  addOrdersRefreshListener,
  removeOrdersRefreshListener,
} from "@/services/NotificationService";
import { SecureStorage } from "@/utils/secureStorage";

const LIVE_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "PROCESSING",
  "READY",
  "DISPATCHED",
] as const;

type LiveStatus = (typeof LIVE_STATUSES)[number];

const STATUS_PRIORITY: LiveStatus[] = [
  "DISPATCHED",
  "READY",
  "PREPARING",
  "PROCESSING",
  "ACCEPTED",
  "PENDING",
];

const STATUS_CONFIG: Record<
  LiveStatus,
  { icon: keyof typeof Ionicons.glyphMap; dot: string; text: string }
> = {
  DISPATCHED: {
    icon: "bicycle-outline",
    dot: "#9B59B6",
    text: "Order is on the way",
  },
  READY: {
    icon: "checkmark-circle-outline",
    dot: "#10B981",
    text: "Ready for pickup / delivery",
  },
  PREPARING: {
    icon: "restaurant-outline",
    dot: "#3498DB",
    text: "Being prepared",
  },
  PROCESSING: {
    icon: "restaurant-outline",
    dot: "#3498DB",
    text: "Processing your order",
  },
  ACCEPTED: {
    icon: "card-outline",
    dot: "#ff6b00",
    text: "Accepted — tap to pay",
  },
  PENDING: {
    icon: "time-outline",
    dot: "#F39C12",
    text: "Waiting for confirmation",
  },
};

export default function ActiveOrderBanner() {
  const router = useRouter();
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(80)).current;

  const refresh = useCallback(async () => {
    try {
      const logged = await SecureStorage.getItem("isLoggedIn");
      if (logged !== "true") {
        setIsLoggedIn(false);
        return;
      }
      setIsLoggedIn(true);
      const res = await orderApi.getOrderStatusCounts();
      setByStatus(res?.byStatus || {});
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    refresh();
    addOrdersRefreshListener(refresh);
    return () => removeOrdersRefreshListener(refresh);
  }, [refresh]);

  const totalLive = LIVE_STATUSES.reduce(
    (sum, s) => sum + (byStatus[s] || 0),
    0,
  );

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: totalLive > 0 && isLoggedIn ? 0 : 100,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [totalLive, isLoggedIn, slideAnim]);

  if (!isLoggedIn) return null;

  const topStatus =
    STATUS_PRIORITY.find((s) => (byStatus[s] || 0) > 0) || "PENDING";
  const cfg = STATUS_CONFIG[topStatus];

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 24,
        left: 16,
        right: 16,
        transform: [{ translateY: slideAnim }],
        opacity: slideAnim.interpolate({
          inputRange: [0, 80],
          outputRange: [1, 0],
          extrapolate: "clamp",
        }),
      }}
      pointerEvents={totalLive > 0 ? "auto" : "none"}
    >
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/orders" as any)}
        activeOpacity={0.88}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: "#1a1a1a",
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 13,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 14,
          elevation: 12,
        }}
      >
        {/* Status dot-ring + icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: cfg.dot + "25",
            borderWidth: 2,
            borderColor: cfg.dot + "60",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name={cfg.icon} size={20} color={cfg.dot} />
        </View>

        {/* Text */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13.5 }}>
            {totalLive === 1 ? "1 Active Order" : `${totalLive} Active Orders`}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 11.5,
              marginTop: 1,
            }}
          >
            {cfg.text}
          </Text>
        </View>

        {/* Live dot */}
        <View style={{ alignItems: "center", gap: 4 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: cfg.dot,
            }}
          />
          <Ionicons
            name="chevron-forward"
            size={16}
            color="rgba(255,255,255,0.45)"
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
