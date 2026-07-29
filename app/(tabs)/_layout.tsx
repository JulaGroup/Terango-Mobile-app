import { Redirect, Tabs } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { vendorPendingOrders, vendor, vendorRole, isVendorLoading } =
    useVendor();
  const insets = useSafeAreaInsets();
  // Live orders (anything not delivered/cancelled) — badge on Activities tab
  const [liveOrderCount, setLiveOrderCount] = React.useState<number>(0);

  const refreshLiveCount = React.useCallback(async () => {
    try {
      const loggedIn = await SecureStorage.getItem("isLoggedIn");
      if (loggedIn !== "true") {
        setLiveOrderCount(0);
        return;
      }

      // Use lightweight server endpoint that returns grouped counts
      const res = await orderApi.getOrderStatusCounts();
      // Prefer the server-computed live total; fall back to summing statuses
      const live =
        res?.live ??
        Object.entries(res?.byStatus || {}).reduce(
          (sum, [status, count]) =>
            status === "DELIVERED" || status === "CANCELLED"
              ? sum
              : sum + (count || 0),
          0,
        );
      setLiveOrderCount(live);
    } catch (err) {
      console.warn("Failed to refresh live-orders badge:", err);
    }
  }, []);

  // Initial load + subscribe to NotificationService and socket events
  React.useEffect(() => {
    refreshLiveCount();

    const listener = () => refreshLiveCount();
    addOrdersRefreshListener(listener);

    const socketStatusHandler = (data: any) => {
      // Any status/payment change can affect the live-order count
      if (!data) return;
      refreshLiveCount();
    };

    try {
      socketOn("orderStatusUpdate", socketStatusHandler);
      socketOn("paymentSuccess", refreshLiveCount);
      socketOn("orderCreated", refreshLiveCount);
    } catch (e) {
      // socket might not be initialised yet — NotificationService listener covers most cases
    }

    return () => {
      removeOrdersRefreshListener(listener);
      try {
        socketOff("orderStatusUpdate", socketStatusHandler);
        socketOff("paymentSuccess", refreshLiveCount);
        socketOff("orderCreated", refreshLiveCount);
      } catch (e) {
        /* ignore */
      }
    };
  }, [refreshLiveCount]);

  // Cashiers are limited to the vendor dashboard (order management) only —
  // they have no access to the customer side of the app. Once their vendor
  // membership has resolved, bounce any attempt to open the customer tabs
  // straight to the dashboard.
  if (!isVendorLoading && vendor && vendorRole === "CASHIER") {
    return <Redirect href="/vendor/dashboard" />;
  }

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
            height: 75 + insets.bottom, // 👈 grow the bar
            paddingBottom: 10 + insets.bottom, // 👈 push content up
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
          tabBarBadge: liveOrderCount > 0 ? liveOrderCount : undefined,
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
