import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
// Use dynamic import for camera to avoid native module load errors
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useVendor } from "@/context/VendorContext";
import { vendorApi, orderApi, Order } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";
import { useRealTime } from "@/hooks/useRealTime";
import * as Haptics from "expo-haptics";

type OrderTab = "active" | "completed";

interface OrderStats {
  total: number;
  pending: number;
  preparing: number;
  ready: number;
  delivered: number;
  totalRevenue: number;
}

export default function VendorOrdersEnhanced() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { vendor, currentBusiness } = useVendor();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<OrderTab>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  // Add this state near the top with your other states
  const [scanSuccess, setScanSuccess] = useState(false);
  const successScaleAnim = useRef(new Animated.Value(0)).current;
  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [scanned, setScanned] = useState(false);
  const [CameraComponent, setCameraComponent] = useState<any>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scannerVisible) {
      scanLineAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [scannerVisible]);

  const orderStatuses = [
    {
      value: "PENDING",
      label: "Pending",
      color: PrimaryColor,
      icon: "time-outline",
    },
    {
      value: "ACCEPTED",
      label: "Accepted",
      color: "#1A1A1A",
      icon: "checkmark-circle-outline",
    },
    {
      value: "PREPARING",
      label: "Preparing",
      color: PrimaryColor,
      icon: "restaurant-outline",
    },
    {
      value: "PROCESSING",
      label: "Processing",
      color: PrimaryColor,
      icon: "restaurant-outline",
    },
    { value: "READY", label: "Ready", color: "#1A1A1A", icon: "cube-outline" },
    {
      value: "DISPATCHED",
      label: "Dispatched",
      color: "#1A1A1A",
      icon: "car-outline",
    },
    {
      value: "DELIVERED",
      label: "Delivered",
      color: "#888",
      icon: "checkmark-done-outline",
    },
    {
      value: "CANCELLED",
      label: "Cancelled",
      color: "#888",
      icon: "close-circle-outline",
    },
  ];

  // 🔥 Real-time integration
  const { isConnected } = useRealTime({
    enablePushNotifications: true,
    enableWebSocket: true,
    enablePolling: true,
    pollingInterval: 30000,
    onNewOrder: async (orderData) => {
      console.log("🔔 New order received in orders screen:", orderData);

      // Play haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Refresh orders
      if (!orderData._polling) {
        await fetchOrders();
      }
    },
    onOrderStatusChange: async (orderData) => {
      console.log("🔄 Order status changed:", {
        orderId: orderData.orderId || "unknown",
        newStatus: orderData.status || orderData.newStatus,
        orderType: orderData.orderType,
        message: orderData.message,
        source: "real-time-system",
      });

      // Check if this is a READY status change notification
      if (orderData.status === "READY" || orderData.newStatus === "READY") {
        console.log("⚠️ READY notification detected from real-time system");
        console.log(
          "🔍 This might be the source of the generic pickup message",
        );
      }

      await fetchOrders();
    },
  });

  const fetchOrders = useCallback(async () => {
    if (!vendor || !currentBusiness) {
      console.log("⚠️ No vendor or business, skipping fetch");
      return;
    }

    try {
      setIsLoading(true);
      console.log("📥 Fetching vendor orders for:", {
        vendorId: vendor.id,
        businessId: currentBusiness.id,
        businessName: currentBusiness.name,
      });

      // Server gets vendor from auth token, no need to pass vendor.id
      const response = await vendorApi.getVendorOrders();
      console.log("📦 Orders response:", response);

      // Server returns array directly, not wrapped in {orders: [...]}
      if (Array.isArray(response)) {
        console.log(`✅ Found ${response.length} orders`);
        setOrders(response);
      } else if (response && response.orders) {
        // Fallback for wrapped response
        console.log(`✅ Found ${response.orders.length} orders (wrapped)`);
        setOrders(response.orders);
      } else if (response && response.data) {
        // Another possible format
        console.log(`✅ Found orders in response.data`);
        setOrders(Array.isArray(response.data) ? response.data : []);
      } else {
        console.log("⚠️ No orders found in response");
        setOrders([]);
      }
    } catch (error) {
      console.error("❌ Error fetching orders:", error);
      Alert.alert("Error", "Failed to fetch orders");
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [vendor, currentBusiness]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  // Fetch orders when component mounts or when vendor/currentBusiness changes
  useEffect(() => {
    console.log(
      "🔄 Orders effect triggered - vendor:",
      vendor?.id,
      "business:",
      currentBusiness?.id,
    );
    fetchOrders();
  }, [fetchOrders]); // fetchOrders already depends on vendor and currentBusiness

  useEffect(() => {
    const filtered = orders.filter((order) => {
      if (activeTab === "active") {
        return !["DELIVERED", "CANCELLED"].includes(order.status);
      } else {
        return ["DELIVERED", "CANCELLED"].includes(order.status);
      }
    });

    // Sort by creation date (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    setFilteredOrders(filtered);
  }, [orders, activeTab]);
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find((o) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    }
  }, [orders]);
  const getOrderStats = useCallback((): OrderStats => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "PENDING").length,
      preparing: orders.filter((o) => o.status === "PREPARING").length,
      ready: orders.filter((o) => o.status === "READY").length,
      delivered: orders.filter((o) => o.status === "DELIVERED").length,
      totalRevenue: orders.reduce(
        (sum, order) => sum + (order.subtotalAmount || order.totalAmount || 0),
        0,
      ),
    };
  }, [orders]);

  const stats = getOrderStats();

  const getStatusColor = (status: string) => {
    const statusInfo = orderStatuses.find((s) => s.value === status);
    return statusInfo?.color || "#666";
  };

  const getStatusIcon = (status: string) => {
    const statusInfo = orderStatuses.find((s) => s.value === status);
    return statusInfo?.icon || "help-circle-outline";
  };

  const getAvailableActions = (order: Order) => {
    const actions: {
      label: string;
      status:
        | "PENDING"
        | "ACCEPTED"
        | "PREPARING"
        | "READY"
        | "DISPATCHED"
        | "DELIVERED"
        | "CANCELLED";
      color: string;
    }[] = [];

    console.log("🔍 Getting available actions for order:", {
      orderId: order.id,
      currentStatus: order.status,
      orderType: order.orderType,
    });

    // PENDING: Vendor can Accept or Cancel
    if (order.status === "PENDING") {
      actions.push({
        label: "Accept",
        status: "ACCEPTED",
        color: PrimaryColor,
      });
      actions.push({ label: "Decline", status: "CANCELLED", color: "#1A1A1A" });
    }
    // ACCEPTED: Shows "Waiting for Payment" - no action button, automatic transition after payment
    // Payment happens on customer side, then automatically becomes PREPARING
    else if (order.status === "ACCEPTED") {
      // No actions - waiting for customer payment
      // The system will auto-update to PREPARING once paid
    }
    // PROCESSING: Vendor can start preparing (explicit step)
    else if (order.status === "PROCESSING") {
      actions.push({
        label: "Start Preparing",
        status: "PREPARING",
        color: PrimaryColor,
      });
      console.log("✅ Added 'Start Preparing' action for order", order.id);
    }
    // PREPARING: Vendor can mark as Ready
    else if (order.status === "PREPARING") {
      actions.push({
        label: "Mark Ready",
        status: "READY",
        color: PrimaryColor,
      });
      console.log("✅ Added 'Mark Ready' action for order", order.id);
    }
    // READY: Only drivers can dispatch (handled in driver app)
    else if (order.status === "READY") {
      // No dispatch action for vendor - only drivers can dispatch
      console.log("ℹ️ Order is READY - waiting for driver dispatch");
    }

    console.log(
      "📋 Available actions:",
      actions.map((a) => a.label),
    );
    return actions;
  };

  const handleUpdateStatus = async (
    orderId: string,
    newStatus:
      | "PENDING"
      | "ACCEPTED"
      | "PREPARING"
      | "READY"
      | "DISPATCHED"
      | "DELIVERED"
      | "CANCELLED",
  ) => {
    console.log("🔄 Updating order status:", {
      orderId: orderId.substring(0, 8),
      newStatus,
      timestamp: new Date().toISOString(),
    });

    try {
      // Show loading state
      const currentOrder = orders.find((o) => o.id === orderId);
      if (currentOrder) {
        console.log("📊 Current order details:", {
          currentStatus: currentOrder.status,
          newStatus,
          customerName: currentOrder.customerName,
        });
      }

      const response = await orderApi.updateOrderStatus(orderId, newStatus);
      console.log("✅ Update response:", response);

      await fetchOrders();

      // Show success with haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Create appropriate success message based on order type and status
      let successMessage = `Order status updated to ${newStatus.toLowerCase()}`;

      console.log("🎯 Creating success message for:", {
        orderId: orderId.substring(0, 8),
        newStatus,
        orderType: currentOrder?.orderType,
        customerName: currentOrder?.customerName,
      });

      if (newStatus === "READY" && currentOrder) {
        if (currentOrder.orderType === "PICKUP") {
          successMessage = `✅ Order is ready for pickup!\n\nCustomer ${currentOrder.customerName || "Guest"} can now come to collect their order.`;
          console.log("📱 Created PICKUP ready message");
        } else if (currentOrder.orderType === "DELIVERY") {
          successMessage = `🚚 Order is ready for delivery!\n\nWaiting for a driver to pick up and deliver to ${currentOrder.customerName || "the customer"}.`;
          console.log("📱 Created DELIVERY ready message");
        } else {
          console.log(
            "⚠️ Unknown or missing orderType:",
            currentOrder.orderType,
          );
          successMessage = `✅ Order is ready!\n\nOrder type: ${currentOrder.orderType || "Unknown"}`;
        }
      } else if (newStatus === "ACCEPTED") {
        successMessage = `✅ Order accepted!\n\nWaiting for customer payment to start preparation.`;
      } else if (newStatus === "PREPARING") {
        successMessage = `👨‍🍳 Started preparing order!\n\nMark as ready when food is prepared.`;
      }

      console.log("📲 Showing success alert:", successMessage);
      Alert.alert("Status Updated", successMessage, [{ text: "OK" }]);

      // Warning about potential duplicate notifications
      if (newStatus === "READY") {
        console.log(
          "⚠️⚠️⚠️ IMPORTANT: If you see ANOTHER notification after this one,",
        );
        console.log(
          "it is likely coming from your server-side push notification system.",
        );
        console.log(
          "Check your server notification templates for order status changes.",
        );
      }
    } catch (error) {
      console.error("❌ Error updating status:", {
        orderId: orderId.substring(0, 8),
        newStatus,
        error: error instanceof Error ? error.message : error,
      });

      // Show error with haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        `Failed to update order status. Please try again.\n\nError: ${error instanceof Error ? error.message : "Unknown error"}`,
        [{ text: "OK" }],
      );
    }
  };

  const requestCameraPermission = async () => {
    try {
      const cam = await import("expo-camera");
      // SDK 50+: CameraView is the new component; fall back to Camera for older versions
      const CameraView = cam.CameraView ?? cam.Camera;
      setCameraComponent(() => CameraView); // ← wrap in arrow fn so React doesn't call it as initializer
      const result = await cam.Camera.requestCameraPermissionsAsync();
      const granted =
        result.status === "granted" || (result as any).granted === true;
      setHasCameraPermission(granted);
    } catch (err) {
      console.warn("Camera permission request failed", err);
      setHasCameraPermission(false);
    }
  };

  const openScanner = async () => {
    let hasPermission = hasCameraPermission;

    if (hasPermission === null) {
      // requestCameraPermission sets state but we also need the value NOW
      try {
        const cam = await import("expo-camera");
        const CameraView = cam.CameraView ?? cam.Camera;
        setCameraComponent(() => CameraView);
        const result = await cam.Camera.requestCameraPermissionsAsync();
        hasPermission =
          result.status === "granted" || (result as any).granted === true;
        setHasCameraPermission(hasPermission);
      } catch {
        hasPermission = false;
        setHasCameraPermission(false);
      }
    }

    if (!hasPermission) {
      Alert.alert(
        "Camera Permission",
        "Camera permission is required to scan customer QR codes.",
      );
      return;
    }

    setScanned(false);
    setScannerVisible(true);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const expected = selectedOrder?.id;
    const normalized = (data || "").trim();

    const matchesOrder =
      expected &&
      (normalized === expected ||
        normalized.includes(expected) ||
        normalized === `TG${expected.slice(-4).toUpperCase()}`);

    if (matchesOrder && selectedOrder) {
      // Show success animation
      setScanSuccess(true);
      successScaleAnim.setValue(0);
      Animated.spring(successScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      try {
        // Use the dedicated vendorScanPickup endpoint — triggers both notifications
        await orderApi.vendorScanPickup(selectedOrder.id);
      } catch {
        // Fallback to regular status update
        await handleUpdateStatus(selectedOrder.id, "DELIVERED");
      }

      // Refresh orders AND update selectedOrder
      await fetchOrders();
      setSelectedOrder((prev) =>
        prev ? { ...prev, status: "DELIVERED" } : prev,
      );

      setTimeout(() => {
        setScanSuccess(false);
        setScannerVisible(false);
      }, 2000);
    } else {
      Alert.alert("Invalid QR", "Scanned QR does not match this order.", [
        { text: "Try again", onPress: () => setScanned(false) },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setScannerVisible(false),
        },
      ]);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const renderOrderCard = ({ item }: { item: Order }) => {
    const { date, time } = formatDateTime(item.createdAt);
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => {
          setSelectedOrder(item);
          setDetailsModalVisible(true);
        }}
      >
        {/* Card top row: ID + status */}
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderId}>
              TG{item.id.slice(-4).toUpperCase()}
            </Text>
            {item.orderType && (
              <View style={styles.orderTypePill}>
                <Ionicons
                  name={
                    item.orderType === "DELIVERY"
                      ? "bicycle-outline"
                      : "bag-outline"
                  }
                  size={11}
                  color="#999"
                />
                <Text style={styles.orderTypePillText}>{item.orderType}</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons name={statusIcon as any} size={12} color="white" />
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {/* Customer + time row */}
        <View style={styles.orderMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={13} color="#999" />
            <Text style={styles.metaText}>{item.customerName || "Guest"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color="#999" />
            <Text style={styles.metaText}>
              {time} · {date}
            </Text>
          </View>
        </View>

        {/* Items preview */}
        {item.items && item.items.length > 0 && (
          <View style={styles.itemsPreview}>
            {item.items.slice(0, 2).map((orderItem, index) => (
              <Text
                key={index}
                style={styles.orderItemPreview}
                numberOfLines={1}
              >
                {orderItem.menuItem?.name || orderItem.product?.name || "Item"}{" "}
                ×{orderItem.quantity}
              </Text>
            ))}
            {item.items.length > 2 && (
              <Text style={styles.orderItemPreview}>
                +{item.items.length - 2} more
              </Text>
            )}
          </View>
        )}

        {/* Footer row: amount + actions */}
        <View style={styles.orderFooter}>
          <Text style={styles.totalAmount}>
            GMD {(item.subtotalAmount || item.totalAmount)?.toLocaleString()}
          </Text>
          {getAvailableActions(item).length > 0 && (
            <View style={styles.orderActions}>
              {getAvailableActions(item).map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.actionButton,
                    index === 0
                      ? styles.actionButtonPrimary
                      : styles.actionButtonSecondary,
                  ]}
                  onPress={() => {
                    Alert.alert(
                      "Update Order",
                      `${action.label} order TG${item.id.slice(-4).toUpperCase()}?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Confirm",
                          onPress: () =>
                            handleUpdateStatus(item.id, action.status),
                        },
                      ],
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      index !== 0 && styles.actionButtonTextSecondary,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Waiting for payment */}
        {item.status === "ACCEPTED" && (
          <View style={styles.waitingPaymentContainer}>
            <Ionicons name="card-outline" size={14} color={PrimaryColor} />
            <Text style={styles.waitingPaymentText}>
              Awaiting customer payment
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderStatsCard = (
    title: string,
    value: number | string,
    icon: string,
  ) => (
    <View style={styles.statsCard}>
      <View style={styles.statsIconContainer}>
        <Ionicons name={icon as any} size={18} color={PrimaryColor} />
      </View>
      <View style={styles.statsInfo}>
        <Text style={styles.statsValue}>{value}</Text>
        <Text style={styles.statsLabel}>{title}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

      {/* Header */}
      <LinearGradient colors={["#1A1A1A", "#2D2D2D"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Orders</Text>
              <View
                style={[
                  styles.connectionDot,
                  { backgroundColor: isConnected ? "#4CAF50" : "#FFA726" },
                ]}
              />
            </View>
            <Text style={styles.headerSubtitle}>
              {currentBusiness?.name || "Your Business"}
              {isConnected && " · Live"}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColor} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Stats Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statsContainer}
            contentContainerStyle={styles.statsContent}
            bounces={false}
            scrollEnabled={true}
          >
            {renderStatsCard("Total", stats.total, "receipt-outline")}
            {renderStatsCard("Pending", stats.pending, "time-outline")}
            {renderStatsCard(
              "Preparing",
              stats.preparing,
              "restaurant-outline",
            )}
            {renderStatsCard(
              "Revenue",
              `GMD ${(stats.totalRevenue / 1000).toFixed(1)}K`,
              "cash-outline",
            )}
          </ScrollView>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "active" && styles.activeTab]}
              onPress={() => setActiveTab("active")}
            >
              <Ionicons
                name="play-circle-outline"
                size={18}
                color={activeTab === "active" ? PrimaryColor : "#666"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "active" && styles.activeTabText,
                ]}
              >
                Active (
                {
                  orders.filter(
                    (o) => !["DELIVERED", "CANCELLED"].includes(o.status),
                  ).length
                }
                )
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "completed" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("completed")}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={18}
                color={activeTab === "completed" ? PrimaryColor : "#666"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "completed" && styles.activeTabText,
                ]}
              >
                Completed (
                {
                  orders.filter((o) =>
                    ["DELIVERED", "CANCELLED"].includes(o.status),
                  ).length
                }
                )
              </Text>
            </TouchableOpacity>
          </View>

          {/* Orders List */}
          {filteredOrders.length > 0 ? (
            <FlatList
              data={filteredOrders}
              renderItem={renderOrderCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.ordersList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[PrimaryColor]}
                />
              }
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>No {activeTab} orders</Text>
              <Text style={styles.emptyDescription}>
                {activeTab === "active"
                  ? "You have no active orders at the moment"
                  : "No completed orders yet"}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Order Details — full screen */}
      <Modal
        visible={detailsModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <SafeAreaView style={styles.detailScreen} edges={["bottom"]}>
          {/* Detail Header */}
          <LinearGradient
            colors={["#1A1A1A", "#2D2D2D"]}
            style={[styles.detailHeader, { paddingTop: insets.top + 10 }]}
          >
            <TouchableOpacity
              style={styles.detailBackButton}
              onPress={() => setDetailsModalVisible(false)}
            >
              <Ionicons name="arrow-back" size={22} color="white" />
            </TouchableOpacity>
            <View style={styles.detailHeaderTitle}>
              <Text style={styles.detailHeaderText}>Order Details</Text>
              {selectedOrder && (
                <Text style={styles.detailHeaderSub}>
                  TG{selectedOrder.id.slice(-4).toUpperCase()}
                </Text>
              )}
            </View>
            {selectedOrder && (
              <View
                style={[
                  styles.detailStatusBadge,
                  { backgroundColor: getStatusColor(selectedOrder.status) },
                ]}
              >
                <Text style={styles.detailStatusText}>
                  {selectedOrder.status}
                </Text>
              </View>
            )}
          </LinearGradient>

          {selectedOrder && (
            <ScrollView
              style={styles.detailBody}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            >
              {/* Payment waiting banner */}
              {selectedOrder.status === "ACCEPTED" && (
                <View style={styles.waitingPaymentBanner}>
                  <Ionicons
                    name="card-outline"
                    size={16}
                    color={PrimaryColor}
                  />
                  <Text style={styles.waitingPaymentText}>
                    Awaiting customer payment
                  </Text>
                </View>
              )}

              {/* Order Info */}
              <Text style={styles.detailSectionTitle}>Order Information</Text>
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order ID</Text>
                  <Text style={styles.detailValue}>
                    TG{selectedOrder.id.slice(-4).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order Type</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.orderType || "N/A"}
                  </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Placed At</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(selectedOrder.createdAt).date}{" "}
                    {formatDateTime(selectedOrder.createdAt).time}
                  </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: 7,
                      backgroundColor:
                        selectedOrder.paymentStatus === "PAID"
                          ? "#E8F5E9"
                          : selectedOrder.paymentStatus === "REFUNDED"
                            ? "#E3F2FD"
                            : selectedOrder.paymentStatus === "FAILED"
                              ? "#FFEBEE"
                              : "#FFF4EC",
                    }}
                  >
                    <Ionicons
                      name={
                        selectedOrder.paymentStatus === "PAID"
                          ? "checkmark-circle"
                          : selectedOrder.paymentStatus === "REFUNDED"
                            ? "return-down-back"
                            : selectedOrder.paymentStatus === "FAILED"
                              ? "close-circle"
                              : "card-outline"
                      }
                      size={13}
                      color={
                        selectedOrder.paymentStatus === "PAID"
                          ? "#2E7D32"
                          : selectedOrder.paymentStatus === "REFUNDED"
                            ? "#1565C0"
                            : selectedOrder.paymentStatus === "FAILED"
                              ? "#C62828"
                              : PrimaryColor
                      }
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color:
                          selectedOrder.paymentStatus === "PAID"
                            ? "#2E7D32"
                            : selectedOrder.paymentStatus === "REFUNDED"
                              ? "#1565C0"
                              : selectedOrder.paymentStatus === "FAILED"
                                ? "#C62828"
                                : PrimaryColor,
                      }}
                    >
                      {selectedOrder.paymentStatus || "UNPAID"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Customer */}
              <Text style={styles.detailSectionTitle}>Customer</Text>
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.customerName || "Guest"}
                  </Text>
                </View>
                {selectedOrder.customerPhone && (
                  <>
                    <View style={styles.detailDivider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.customerPhone}
                      </Text>
                    </View>
                  </>
                )}
                {selectedOrder.deliveryAddress && (
                  <>
                    <View style={styles.detailDivider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Address</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.deliveryAddress}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Items */}
              <Text style={styles.detailSectionTitle}>Items</Text>
              <View style={styles.detailCard}>
                {selectedOrder.items?.map((item, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <View style={styles.detailDivider} />}
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { flex: 1 }]}>
                        {item.menuItem?.name ||
                          item.product?.name ||
                          "Unknown Item"}
                      </Text>
                      <Text style={styles.itemQty}>×{item.quantity}</Text>
                      <Text style={[styles.detailValue, { width: 90 }]}>
                        GMD {(item.price * item.quantity).toLocaleString()}
                      </Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>

              {/* Total */}
              <View style={styles.detailTotalRow}>
                <Text style={styles.detailTotalLabel}>Your Earnings</Text>
                <Text style={styles.detailTotalValue}>
                  GMD{" "}
                  {(
                    selectedOrder.subtotalAmount || selectedOrder.totalAmount
                  )?.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.vendorNote}>
                Delivery & service fees go to the platform
              </Text>

              {/* Actions */}
              {getAvailableActions(selectedOrder).length > 0 && (
                <View style={styles.detailActions}>
                  {getAvailableActions(selectedOrder).map((action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.detailActionBtn,
                        index === 0
                          ? styles.detailActionBtnPrimary
                          : styles.detailActionBtnSecondary,
                      ]}
                      onPress={() => {
                        setDetailsModalVisible(false);
                        setTimeout(() => {
                          handleUpdateStatus(selectedOrder.id, action.status);
                        }, 300);
                      }}
                    >
                      <Text
                        style={[
                          styles.detailActionBtnText,
                          index !== 0 && styles.detailActionBtnTextSecondary,
                        ]}
                      >
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Pickup QR scan action */}
              {selectedOrder.orderType === "PICKUP" &&
                selectedOrder.status === "READY" && (
                  <View style={{ marginTop: 12 }}>
                    <TouchableOpacity
                      style={styles.scanButton}
                      onPress={() => openScanner()}
                    >
                      <Text style={styles.scanButtonText}>
                        Scan Customer QR
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
            </ScrollView>
          )}
          {/* Scanner overlay — lives inside the detail Modal, no nesting needed */}
          {scannerVisible && (
            <View style={styles.scannerOverlay}>
              {/* Header */}
              <View
                style={[styles.scannerHeader, { paddingTop: insets.top + 14 }]}
              >
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setScannerVisible(false)}
                >
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: "white", fontSize: 15, fontWeight: "700" }}
                  >
                    Verify Pickup
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 11,
                      marginTop: 1,
                    }}
                  >
                    TG{selectedOrder?.id.slice(-4).toUpperCase()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: PrimaryColor },
                  ]}
                >
                  <Ionicons name="scan-outline" size={12} color="white" />
                  <Text style={styles.statusText}>PICKUP</Text>
                </View>
              </View>

              {/* Camera or fallback */}
              <View style={styles.scannerViewfinder}>
                {CameraComponent ? (
                  <CameraComponent
                    onBarcodeScanned={
                      scanned ? undefined : handleBarCodeScanned
                    }
                    style={StyleSheet.absoluteFillObject}
                    // CameraView uses `barcodeScannerSettings`, Camera uses `barCodeScannerSettings`
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  />
                ) : (
                  <View style={{ alignItems: "center", gap: 12 }}>
                    <Text
                      style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}
                    >
                      Camera unavailable
                    </Text>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonPrimary]}
                      onPress={requestCameraPermission}
                    >
                      <Text style={styles.actionButtonText}>
                        Retry Permission
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Viewfinder frame */}
                <View style={styles.scannerFrame} pointerEvents="none">
                  {/* Corners */}
                  <View
                    style={[
                      styles.scannerCorner,
                      {
                        top: 0,
                        left: 0,
                        borderBottomWidth: 0,
                        borderRightWidth: 0,
                        borderTopLeftRadius: 6,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.scannerCorner,
                      {
                        top: 0,
                        right: 0,
                        borderBottomWidth: 0,
                        borderLeftWidth: 0,
                        borderTopRightRadius: 6,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.scannerCorner,
                      {
                        bottom: 0,
                        left: 0,
                        borderTopWidth: 0,
                        borderRightWidth: 0,
                        borderBottomLeftRadius: 6,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.scannerCorner,
                      {
                        bottom: 0,
                        right: 0,
                        borderTopWidth: 0,
                        borderLeftWidth: 0,
                        borderBottomRightRadius: 6,
                      },
                    ]}
                  />

                  {/* Animated scan line */}
                  <Animated.View
                    style={{
                      position: "absolute",
                      left: 10,
                      right: 10,
                      height: 1.5,
                      backgroundColor: PrimaryColor,
                      opacity: 0.7,
                      borderRadius: 2,
                      transform: [
                        {
                          translateY: scanLineAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 200],
                          }),
                        },
                      ],
                    }}
                  />
                </View>
              </View>

              {/* Footer */}
              <View style={styles.scannerFooter}>
                {/* Status hint */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: PrimaryColor,
                    }}
                  />
                  <Text
                    style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}
                  >
                    {scanned
                      ? "Processing..."
                      : "Scanning for customer QR code..."}
                  </Text>
                </View>

                {/* Customer info */}
                {selectedOrder && (
                  <View style={styles.scannerOrderInfo}>
                    <View style={styles.scannerOrderAvatar}>
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color={PrimaryColor}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scannerOrderName}>
                        {selectedOrder.customerName || "Guest"}
                      </Text>
                      <Text style={styles.scannerOrderSub}>
                        Order TG{selectedOrder.id.slice(-4).toUpperCase()} ·
                        PICKUP
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: PrimaryColor,
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      GMD{" "}
                      {(
                        selectedOrder.subtotalAmount ||
                        selectedOrder.totalAmount
                      )?.toLocaleString()}
                    </Text>
                  </View>
                )}

                {/* Cancel */}
                <TouchableOpacity
                  style={styles.scannerCancelBtn}
                  onPress={() => setScannerVisible(false)}
                >
                  <Text style={styles.scannerCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              {/* Success animation overlay */}
              {scanSuccess && (
                <View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: "rgba(0,0,0,0.85)",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 200,
                  }}
                >
                  <Animated.View
                    style={{
                      transform: [{ scale: successScaleAnim }],
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <View
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        backgroundColor: "#4CAF50",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="checkmark" size={56} color="white" />
                    </View>
                    <Text
                      style={{
                        color: "white",
                        fontSize: 22,
                        fontWeight: "700",
                      }}
                    >
                      Pickup Confirmed!
                    </Text>
                    <Text
                      style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}
                    >
                      {selectedOrder?.customerName || "Customer"} has collected
                      their order
                    </Text>
                  </Animated.View>
                </View>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Screen ──────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  // ── Header ──────────────────────────────────────────────
  header: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  // ── Loading ──────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#888",
  },
  content: {
    flex: 1,
  },
  // ── Stats row ────────────────────────────────────────────
  statsContainer: {
    backgroundColor: "#F8F8F8",
    flexGrow: 0, // ← prevents it from expanding
    flexShrink: 0,
  },
  statsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12, // ← replaces paddingTop/paddingBottom
    gap: 10,
    alignItems: "center",
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    height: 80,
  },
  statsIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#FFF4EC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  statsInfo: {
    minWidth: 48,
  },
  statsValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 1,
  },
  statsLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  // ── Tabs ─────────────────────────────────────────────────
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: "#FFF4EC",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
  },
  activeTabText: {
    color: PrimaryColor,
  },
  // ── Orders list ──────────────────────────────────────────
  ordersList: {
    padding: 14,
    paddingBottom: 24,
  },
  // ── Order card ───────────────────────────────────────────
  orderCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  orderTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderTypePillText: {
    fontSize: 10,
    color: "#888",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "white",
    letterSpacing: 0.3,
  },
  orderMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#888",
  },
  itemsPreview: {
    marginBottom: 10,
    gap: 3,
  },
  orderItemPreview: {
    fontSize: 12,
    color: "#666",
  },
  orderFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  orderActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonPrimary: {
    backgroundColor: PrimaryColor,
  },
  actionButtonSecondary: {
    backgroundColor: "#1A1A1A",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
  },
  actionButtonTextSecondary: {
    color: "white",
  },
  waitingPaymentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4EC",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  waitingPaymentBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4EC",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFE0CC",
  },
  waitingPaymentText: {
    fontSize: 13,
    color: PrimaryColor,
    fontWeight: "600",
  },
  // ── Empty state ──────────────────────────────────────────
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 16,
    marginBottom: 6,
    textTransform: "capitalize",
  },
  emptyDescription: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  // ── Detail screen ─────────────────────────────────────────
  detailScreen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  detailBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  detailHeaderTitle: {
    flex: 1,
  },
  detailHeaderText: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  detailHeaderSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  detailStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  detailStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "white",
    letterSpacing: 0.3,
  },
  detailBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  detailCard: {
    backgroundColor: "white",
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#F2F2F2",
  },
  detailLabel: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13,
    color: "#1A1A1A",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },
  itemQty: {
    fontSize: 13,
    color: "#888",
    marginHorizontal: 8,
  },
  detailTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  detailTotalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  detailTotalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: PrimaryColor,
  },
  detailActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  detailActionBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  detailActionBtnPrimary: {
    backgroundColor: PrimaryColor,
  },
  detailActionBtnSecondary: {
    backgroundColor: "#1A1A1A",
  },
  detailActionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
  detailActionBtnTextSecondary: {
    color: "white",
  },
  scanButton: {
    backgroundColor: "#FF8C00",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "black",
    zIndex: 100,
  },
  scannerHeader: {
    backgroundColor: "rgba(26,26,26,0.95)",
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  scannerViewfinder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerFrame: {
    width: 220,
    height: 220,
    position: "relative",
  },
  scannerCorner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: PrimaryColor,
    borderWidth: 2.5,
  },
  scannerFooter: {
    backgroundColor: "rgba(26,26,26,0.95)",
    paddingTop: 14,
    paddingBottom: 24,
    paddingHorizontal: 16,
    gap: 10,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  scannerOrderInfo: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
  },
  scannerOrderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,107,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerOrderName: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  scannerOrderSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
  },
  scannerCancelBtn: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  scannerCancelText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  // ── Shared ───────────────────────────────────────────────
  vendorNote: {
    fontSize: 11,
    color: "#BBB",
    textAlign: "center",
    marginBottom: 8,
  },
});
