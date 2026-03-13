import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors, PrimaryColor } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useVendor } from "@/context/VendorContext";
import { orderApi } from "@/lib/api";
import {
  addOrdersRefreshListener,
  removeOrdersRefreshListener,
} from "@/services/NotificationService";
import { on as socketOn, off as socketOff } from "@/services/SocketService";
import { SecureStorage } from "@/utils/secureStorage";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { vendorPendingOrders } = useVendor();

  // Accepted orders that still need payment (badge on Orders tab)
  const [acceptedPaymentCount, setAcceptedPaymentCount] =
    React.useState<number>(0);

  const refreshAcceptedCount = React.useCallback(async () => {
    try {
      const loggedIn = await SecureStorage.getItem("isLoggedIn");
      if (loggedIn !== "true") {
        setAcceptedPaymentCount(0);
        return;
      }

      // Use lightweight server endpoint that returns grouped counts
      const res = await orderApi.getOrderStatusCounts();
      const count = res?.acceptedUnpaid || 0;
      setAcceptedPaymentCount(count);
    } catch (err) {
      console.warn("Failed to refresh accepted-orders badge:", err);
    }
  }, []);

  // Initial load + subscribe to NotificationService and socket events
  React.useEffect(() => {
    refreshAcceptedCount();

    const listener = () => refreshAcceptedCount();
    addOrdersRefreshListener(listener);

    const socketStatusHandler = (data: any) => {
      // If an order becomes ACCEPTED or payment changes, refresh the badge
      if (!data) return;
      if (data.status === "ACCEPTED" || data.paymentStatus || data.orderId) {
        refreshAcceptedCount();
      }
    };

    try {
      socketOn("orderStatusUpdate", socketStatusHandler);
      socketOn("paymentSuccess", refreshAcceptedCount);
      socketOn("orderCreated", refreshAcceptedCount);
    } catch (e) {
      // socket might not be initialised yet — NotificationService listener covers most cases
    }

    return () => {
      removeOrdersRefreshListener(listener);
      try {
        socketOff("orderStatusUpdate", socketStatusHandler);
        socketOff("paymentSuccess", refreshAcceptedCount);
        socketOff("orderCreated", refreshAcceptedCount);
      } catch (e) {
        /* ignore */
      }
    };
  }, [refreshAcceptedCount]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PrimaryColor,
        tabBarInactiveTintColor: "#9CA3AF",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: "absolute",
          },
          web: {
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            height: 75,
            paddingBottom: 10,
            paddingTop: 5,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          },
          default: {
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            height: 75,
            paddingBottom: 10,
            paddingTop: 5,
          },
        }),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="square.grid.2x2" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Activities",
          tabBarBadge:
            acceptedPaymentCount > 0 ? acceptedPaymentCount : undefined,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="list.bullet.rectangle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarBadge:
            vendorPendingOrders > 0 ? vendorPendingOrders : undefined,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
