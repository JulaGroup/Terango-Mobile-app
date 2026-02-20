import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Alert,
  StatusBar,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// AsyncStorage removed - not used in this file
import { useFocusEffect } from "@react-navigation/native";
import { PrimaryColor } from "@/constants/Colors";
import { orderApi, type Order } from "@/lib/api";
import {
  setOrdersRefreshCallback,
  setNavigateToOrderCallback,
  addOrdersRefreshListener,
  removeOrdersRefreshListener,
} from "@/services/NotificationService";
import { useRouter } from "expo-router";
import { SecureStorage } from "@/utils/secureStorage";
import { SafeAreaView } from "react-native-safe-area-context";

const statusColors = {
  PENDING: "#F39C12",
  ACCEPTED: "#3498DB",
  PREPARING: "#3498DB",
  PROCESSING: "#3498DB",
  READY: "#10B981",
  DISPATCHED: "#9B59B6",
  DELIVERED: "#27AE60",
  CANCELLED: "#E74C3C",
};

const statusIcons = {
  PENDING: "time-outline",
  ACCEPTED: "checkmark-outline",
  PREPARING: "restaurant-outline",
  PROCESSING: "restaurant-outline",
  READY: "checkmark-circle-outline",
  DISPATCHED: "car-outline",
  DELIVERED: "checkmark-circle-outline",
  CANCELLED: "close-circle-outline",
};

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "past">("live");
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Server-backed total of live orders for header (null = not loaded yet)
  const [liveCount, setLiveCount] = useState<number | null>(null);

  const refreshLiveCount = useCallback(async () => {
    try {
      const logged = await SecureStorage.getItem("isLoggedIn");
      if (logged !== "true") {
        setLiveCount(0);
        return;
      }

      const res = await orderApi.getOrderStatusCounts();
      const statuses = res?.byStatus || {};
      const liveStatuses = [
        "PENDING",
        "ACCEPTED",
        "PREPARING",
        "PROCESSING",
        "READY",
        "DISPATCHED",
      ];
      const total = liveStatuses.reduce(
        (sum, s) => sum + (statuses[s] || 0),
        0,
      );
      setLiveCount(total);
    } catch (err) {
      console.warn("Failed to load live orders count:", err);
    }
  }, []);

  // Keep the header count in sync with real-time events
  useEffect(() => {
    refreshLiveCount();
    const l = () => refreshLiveCount();
    addOrdersRefreshListener(l);
    return () => removeOrdersRefreshListener(l);
  }, [refreshLiveCount]);

  // Pagination state
  const PAGE_SIZE = 5; // fetch 5 orders per page (lazy load)
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Skeleton animation
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const skeletonAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );

    if (loading) {
      skeletonAnimation.start();
    } else {
      skeletonAnimation.stop();
    }

    return () => skeletonAnimation.stop();
  }, [loading, skeletonOpacity]);

  const fetchOrders = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setError(null);
        if (!append) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const result = await orderApi.getCustomerOrders(page, PAGE_SIZE);

        if (append) {
          setOrders((prev) => [...prev, ...result.orders]);
        } else {
          setOrders(result.orders);
        }

        setHasMore(result.hasMore);
        setCurrentPage(page);
      } catch (error: any) {
        console.error("Failed to fetch orders:", error);
        const errorMessage = error.message || "Failed to load orders";
        setError(errorMessage);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  const checkAuthentication = useCallback(async () => {
    try {
      const storedUserId = await SecureStorage.getItem("userId");
      const loggedInStatus = await SecureStorage.getItem("isLoggedIn");

      if (storedUserId && loggedInStatus === "true") {
        setUserId(storedUserId);
        setIsLoggedIn(true);
        fetchOrders();
        refreshLiveCount();
      } else {
        setIsLoggedIn(false);
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to check authentication:", error);
      setIsLoggedIn(false);
      setLoading(false);
    }
  }, [fetchOrders]);

  // Check for successful order on page load

  const handleNavigateToOrder = useCallback(
    (orderId: string) => {
      console.log("[Orders] Navigating to order:", orderId);
      if (orderId && orderId.trim()) {
        // Navigate to order details page with the orderId
        router.push(`/order-details?orderId=${orderId}`);
      } else {
        // If no orderId provided, just refresh the orders list
        fetchOrders();
      }
    },
    [router, fetchOrders],
  );

  useEffect(() => {
    checkAuthentication();
    // Register callback to refresh orders on push notification
    setOrdersRefreshCallback(fetchOrders);
    // Register callback to navigate to order on notification tap
    setNavigateToOrderCallback(handleNavigateToOrder);
    return () => {
      setOrdersRefreshCallback(() => {});
      setNavigateToOrderCallback(() => {});
    };
  }, [checkAuthentication, fetchOrders, handleNavigateToOrder]);

  // Check for successful order after authentication is complete

  // Refresh orders when page comes into focus (e.g., returning from payment)
  useFocusEffect(
    useCallback(() => {
      if (userId && isLoggedIn) {
        console.log("[Orders] Page focused, refreshing orders");
        fetchOrders();
        refreshLiveCount();
      }
    }, [userId, isLoggedIn, fetchOrders, refreshLiveCount]),
  );

  const onRefresh = () => {
    if (userId) {
      setRefreshing(true);
      setCurrentPage(1);
      setHasMore(true);
      fetchOrders(1, false);
      refreshLiveCount();
    }
  };

  const loadMoreOrders = () => {
    if (!loadingMore && hasMore && !loading) {
      console.log(`[Orders] Loading more orders, page ${currentPage + 1}`);
      fetchOrders(currentPage + 1, true);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await orderApi.cancelOrder(orderId, "Cancelled by customer");
            fetchOrders();
            Alert.alert("Success", "Order has been cancelled");
          } catch {
            Alert.alert("Error", "Failed to cancel order");
          }
        },
      },
    ]);
  };

  // Pay from orders list (confirmation + native handling similar to order-details)
  const handlePayFromList = async (orderId: string, amount: number) => {
    Alert.alert(
      "Confirm Payment",
      `Proceed with payment of ${formatAmount(amount)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay Now",
          onPress: async () => {
            try {
              setLoading(true);

              // Get preferred payment method
              let network = "wave";
              try {
                const stored = await SecureStorage.getItem("paymentMethods");
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (parsed?.default) network = parsed.default;
                }
              } catch {
                console.warn("Using default payment method: wave");
              }

              console.log("💳 Initiating payment...");
              const result: any = await orderApi.payForOrder(
                orderId,
                network,
                "teranggo://payment-success",
                "teranggo://payment-cancel",
              );

              // Get Wave launch URL
              const launchUrl =
                result?.wave_launch_url || result?.session?.wave_launch_url;

              if (!launchUrl) {
                throw new Error("No Wave launch URL received");
              }

              console.log("💳 Opening Wave URL:", launchUrl);

              // ✅ SIMPLIFIED: Direct opening on all platforms
              await Linking.openURL(launchUrl);

              console.log("[Orders] Wave opened — awaiting deep-link callback");
            } catch (error: any) {
              console.error("❌ Payment error:", error);

              let errorMessage =
                "Failed to open Wave payment. Please ensure Wave app is installed or try again.";

              if (error.message?.includes("Network")) {
                errorMessage =
                  "Network error. Please check your connection and try again.";
              } else if (error.message) {
                errorMessage = error.message;
              }

              Alert.alert("Payment Failed", errorMessage, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Retry",
                  onPress: () => handlePayFromList(orderId, amount),
                },
              ]);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const SkeletonBox = ({
    width,
    height,
    style,
  }: {
    width: number | string;
    height: number;
    style?: any;
  }) => (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: "#E5E7EB",
          borderRadius: 8,
          opacity: skeletonOpacity,
        },
        style,
      ]}
    />
  );

  const renderSkeletonLoader = () => (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4, 5].map((item) => (
        <View
          key={item}
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <SkeletonBox width={120} height={16} />
            <SkeletonBox width={80} height={20} style={{ borderRadius: 10 }} />
          </View>
          <SkeletonBox width="100%" height={12} style={{ marginBottom: 8 }} />
          <SkeletonBox width="60%" height={12} style={{ marginBottom: 12 }} />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <SkeletonBox width={80} height={12} />
            <SkeletonBox width={60} height={12} />
          </View>
        </View>
      ))}
    </View>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number) => {
    return `D ${amount.toFixed(2)}`;
  };

  const getFilteredOrders = () => {
    if (activeTab === "live") {
      return orders.filter((order) =>
        [
          "PENDING",
          "ACCEPTED",
          "PREPARING",
          "PROCESSING",
          "READY",
          "DISPATCHED",
        ].includes(order.status),
      );
    } else {
      return orders.filter((order) =>
        ["DELIVERED", "CANCELLED"].includes(order.status),
      );
    }
  };

  const renderOrderCard = (order: Order) => (
    <TouchableOpacity
      key={order.id}
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderLeftWidth: 4,
        borderLeftColor: statusColors[order.status],
      }}
      activeOpacity={0.8}
      onPress={() =>
        router.push({
          pathname: "/order-details",
          params: { orderId: order.id },
        })
      }
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: "#333" }}>
            Order #{order.id.slice(-8).toUpperCase()}
          </Text>
          {/* 🎁 Gift Order Badge */}
          {order.isGiftOrder && (
            <View
              style={{
                backgroundColor: "#FFF5EE",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#FFD4A3",
              }}
            >
              <Ionicons name="gift" size={12} color="#ff6b00" />
            </View>
          )}
        </View>
        <View
          style={{
            backgroundColor: statusColors[order.status],
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Ionicons
            name={statusIcons[order.status] as any}
            size={12}
            color="#fff"
          />
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
            {order.status}
          </Text>
        </View>
      </View>

      {/* Restaurant */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Ionicons
          name={
            order.restaurant
              ? "restaurant-outline"
              : order["shop"]
                ? "cart-outline"
                : order["pharmacy"]
                  ? "medkit-outline"
                  : "storefront-outline"
          }
          size={16}
          color="#666"
        />
        <Text
          style={{ marginLeft: 8, color: "#666", flex: 1, fontWeight: "500" }}
          numberOfLines={1}
        >
          {order.restaurant?.name ||
            order["shop"]?.name ||
            order["pharmacy"]?.name ||
            "Vendor"}
        </Text>
      </View>

      {/* Address / Pickup info */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Ionicons name="location-outline" size={16} color="#666" />
        <Text
          style={{ marginLeft: 8, color: "#666", flex: 1 }}
          numberOfLines={2}
        >
          {order.orderType === "PICKUP"
            ? order.pickupInstructions ||
              order.address ||
              order.deliveryAddress ||
              "Pickup"
            : order.deliveryAddress ||
              order.address ||
              "Delivery address not set"}
        </Text>
      </View>

      {/* Items Preview */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Ionicons name="fast-food-outline" size={16} color="#666" />
        <Text
          style={{ marginLeft: 8, color: "#666", flex: 1 }}
          numberOfLines={1}
        >
          {order.items.length} item{order.items.length > 1 ? "s" : ""} •{" "}
          {order.items
            .slice(0, 2)
            .map(
              (item) =>
                item.menuItem?.name ||
                item.product?.name ||
                item.medicine?.name ||
                "Item",
            )
            .join(", ")}
          {order.items.length > 2 ? ` +${order.items.length - 2} more` : null}
        </Text>
      </View>

      {/* Amount */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
      >
        <Ionicons name="wallet-outline" size={16} color="#666" />
        <Text
          style={{
            marginLeft: 8,
            fontSize: 18,
            fontWeight: "bold",
            color: PrimaryColor,
          }}
        >
          {formatAmount(order.totalAmount)}
        </Text>
      </View>

      {/* Footer */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
        }}
      >
        <Text style={{ fontSize: 12, color: "#999" }}>
          {formatDate(order.createdAt)}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {["PENDING", "ACCEPTED", "PREPARING"].includes(order.status) && (
            <TouchableOpacity
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: "#FEF2F2",
                borderWidth: 1,
                borderColor: "#FEE2E2",
              }}
              onPress={() => handleCancelOrder(order.id)}
            >
              <Text
                style={{ fontSize: 12, color: "#EF4444", fontWeight: "600" }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          )}
          {/* Pay button for accepted + unpaid orders */}
          {order.status === "ACCEPTED" && order.paymentStatus !== "PAID" ? (
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: PrimaryColor,
                borderWidth: 1,
                borderColor: PrimaryColor,
              }}
              onPress={() => handlePayFromList(order.id, order.totalAmount)}
            >
              <Text style={{ fontSize: 12, color: "#fff", fontWeight: "700" }}>
                Pay
              </Text>
              <Ionicons name="card-outline" size={12} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: "#F0F9FF",
                borderWidth: 1,
                borderColor: "#E0F2FE",
              }}
              onPress={() =>
                router.push({
                  pathname: "/order-tracking",
                  params: { orderId: order?.id },
                })
              }
            >
              <Text
                style={{ fontSize: 12, color: PrimaryColor, fontWeight: "600" }}
              >
                Track
              </Text>
              <Ionicons name="chevron-forward" size={12} color={PrimaryColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // If user is not logged in, show login prompt
  if (isLoggedIn === false) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Login Prompt Card */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 30,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 8,
            }}
          >
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: "#FFF0E6",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Ionicons name="receipt-outline" size={50} color={PrimaryColor} />
            </View>

            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#333",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Track Your Orders
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: "#666",
                textAlign: "center",
                lineHeight: 24,
                marginBottom: 30,
              }}
            >
              Sign in to view your order history, track deliveries, and manage
              your purchases.
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: PrimaryColor,
                paddingVertical: 16,
                paddingHorizontal: 32,
                borderRadius: 12,
                width: "100%",
                alignItems: "center",
                marginBottom: 16,
              }}
              onPress={() => router.push("/auth")}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
              }}
              onPress={() => router.push("/auth")}
            >
              <Text
                style={{
                  color: PrimaryColor,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                Don&apos;t have an account? Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Features Preview */}
          <View
            style={{
              marginTop: 40,
              padding: 20,
              backgroundColor: "#fff",
              borderRadius: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#333",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              What you can do with orders:
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons name="time-outline" size={20} color={PrimaryColor} />
              <Text style={{ marginLeft: 12, fontSize: 14, color: "#666" }}>
                Track orders in real-time
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons name="receipt-outline" size={20} color={PrimaryColor} />
              <Text style={{ marginLeft: 12, fontSize: 14, color: "#666" }}>
                View order history and receipts
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="repeat-outline" size={20} color={PrimaryColor} />
              <Text style={{ marginLeft: 12, fontSize: 14, color: "#666" }}>
                Reorder your favorites easily
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
        {/* Header */}
        <View style={{ padding: 16, backgroundColor: "#fff" }}>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#333" }}>
            My Orders
          </Text>
        </View>
        {renderSkeletonLoader()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      {/* Header */}
      <View style={{ padding: 16, backgroundColor: "#fff" }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "#333",
            marginBottom: 16,
          }}
        >
          My Orders
        </Text>

        {/* Tab Selector */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#F1F5F9",
            borderRadius: 25,
            padding: 4,
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 20,
              backgroundColor:
                activeTab === "live" ? PrimaryColor : "transparent",
              alignItems: "center",
            }}
            onPress={() => setActiveTab("live")}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: activeTab === "live" ? "#fff" : "#666",
              }}
            >
              Live Orders (
              {liveCount !== null
                ? liveCount
                : orders.filter((o) =>
                    [
                      "PENDING",
                      "ACCEPTED",
                      "PREPARING",
                      "PROCESSING",
                      "READY",
                      "DISPATCHED",
                    ].includes(o.status),
                  ).length}
              )
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 20,
              backgroundColor:
                activeTab === "past" ? PrimaryColor : "transparent",
              alignItems: "center",
            }}
            onPress={() => setActiveTab("past")}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: activeTab === "past" ? "#fff" : "#666",
              }}
            >
              Past Orders (
              {
                orders.filter((o) =>
                  ["DELIVERED", "CANCELLED"].includes(o.status),
                ).length
              }
              )
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={getFilteredOrders()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderOrderCard(item)}
        contentContainerStyle={{ padding: 16 }}
        onEndReached={loadMoreOrders}
        onEndReachedThreshold={0.5}
        initialNumToRender={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PrimaryColor]}
            tintColor={PrimaryColor}
          />
        }
        ListFooterComponent={() =>
          loadingMore ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <ActivityIndicator color={PrimaryColor} />
            </View>
          ) : !hasMore ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: "#999" }}>No more orders</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={() =>
          error ? (
            <View
              style={{
                alignItems: "center",
                backgroundColor: "#FFF5EE",
                padding: 20,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: PrimaryColor,
              }}
            >
              <Ionicons name="warning-outline" size={32} color={PrimaryColor} />
              <Text
                style={{
                  fontSize: 14,
                  color: PrimaryColor,
                  marginTop: 8,
                  textAlign: "center",
                  fontWeight: "500",
                }}
              >
                {error}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: PrimaryColor,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  marginTop: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
                onPress={() => fetchOrders()}
              >
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text
                  style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                >
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Ionicons
                name={
                  activeTab === "live" ? "receipt-outline" : "archive-outline"
                }
                size={64}
                color="#D1D5DB"
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#9CA3AF",
                  marginTop: 16,
                }}
              >
                No {activeTab} orders
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#9CA3AF",
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                {activeTab === "live"
                  ? "When you place an order, it will appear here"
                  : "Your completed orders will be shown here"}
              </Text>
              {activeTab === "live" && (
                <TouchableOpacity
                  style={{
                    backgroundColor: PrimaryColor,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 12,
                    marginTop: 16,
                  }}
                  onPress={() => router.push("/" as any)}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}
                  >
                    Start Shopping
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
