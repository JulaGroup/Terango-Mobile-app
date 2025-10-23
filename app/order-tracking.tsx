import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Image,
  Linking,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { orderApi, Order } from "../lib/api";
import { PrimaryColor } from "@/constants/Colors";
import { on as socketOn, off as socketOff } from "@/services/SocketService";

const statusColors: { [key: string]: string } = {
  PENDING: "#F39C12",
  ACCEPTED: "#3498DB",
  PREPARING: "#3498DB",
  READY: "#10B981",
  DISPATCHED: "#9B59B6",
  DELIVERED: "#27AE60",
  CANCELLED: "#E74C3C",
};

const statusIcons: { [key: string]: any } = {
  PENDING: "time-outline",
  ACCEPTED: "checkmark-circle-outline",
  PREPARING: "restaurant-outline",
  READY: "checkmark-done-outline",
  DISPATCHED: "car-outline",
  DELIVERED: "home-outline",
  CANCELLED: "close-circle-outline",
};

export default function OrderTrackingPage() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Fetch order details
  const fetchOrderDetails = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);
        setError(null);

        const data = await orderApi.getOrderById(orderId as string);
        setOrder(data);
      } catch (err: any) {
        console.error("Error fetching order details:", err);
        setError(err.message || "Failed to load order details");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId]
  );

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, fetchOrderDetails]);

  // Socket listeners for real-time updates
  useEffect(() => {
    const onOrderStatusUpdate = (data: any) => {
      console.log("[Socket] orderStatusUpdate in order-tracking", data);
      if (data?.orderId === orderId) {
        fetchOrderDetails(true);
      }
    };

    const onDriverLocationUpdate = (data: any) => {
      console.log("[Socket] driverLocationUpdate", data);
      if (
        data?.orderId === orderId &&
        order?.driverId &&
        order?.driverId === data?.driverId
      ) {
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                // Update driver location in real-time
              }
            : null
        );
      }
    };

    socketOn("orderStatusUpdate", onOrderStatusUpdate);
    socketOn("driverLocationUpdate", onDriverLocationUpdate);

    return () => {
      socketOff("orderStatusUpdate", onOrderStatusUpdate);
      socketOff("driverLocationUpdate", onDriverLocationUpdate);
    };
  }, [orderId, order, fetchOrderDetails]);

  const handleCallDriver = () => {
    if (order?.driverPhone) {
      Linking.openURL(`tel:${order.driverPhone}`).catch((err) => {
        Alert.alert("Error", "Could not open phone dialer");
      });
    }
  };

  const handleChatDriver = () => {
    if (order?.driverPhone) {
      // SMS functionality
      Linking.openURL(`sms:${order.driverPhone}?body=Hi%20Driver`).catch(
        (err) => {
          Alert.alert("Error", "Could not open messaging app");
        }
      );
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrderDetails(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{ width: 40, height: 40, justifyContent: "center" }}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="hourglass" size={48} color={PrimaryColor} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{ width: 40, height: 40, justifyContent: "center" }}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color="#E74C3C" />
          <Text style={styles.errorText}>{error || "Order not found"}</Text>
          <TouchableOpacity
            style={[styles.button, { marginTop: 20 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{ width: 40, height: 40, justifyContent: "center" }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <TouchableOpacity
          onPress={onRefresh}
          activeOpacity={0.7}
          style={{ width: 40, height: 40, justifyContent: "center" }}
        >
          <Ionicons name="refresh" size={22} color={PrimaryColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PrimaryColor]}
            tintColor={PrimaryColor}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Current Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColors[order.status] },
              ]}
            >
              <Ionicons
                name={statusIcons[order.status] as any}
                size={18}
                color="#fff"
              />
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
            <Text style={styles.orderTime}>{formatDate(order.createdAt)}</Text>
          </View>
          <Text style={styles.orderNumber}>
            Order #{order.id.slice(-8).toUpperCase()}
          </Text>
        </View>

        {/* Driver Information - Shows when order is DISPATCHED or DELIVERING */}
        {(order.status === "DISPATCHED" || order.status === "DELIVERED") &&
          order.driverName && (
            <View style={styles.driverCard}>
              <Text style={styles.sectionTitle}>Your Driver</Text>

              <View style={styles.driverInfo}>
                {/* Driver Avatar */}
                <View style={styles.driverImageContainer}>
                  {order.driverImage ? (
                    <Image
                      source={{ uri: order.driverImage }}
                      style={styles.driverImage}
                    />
                  ) : (
                    <View style={styles.driverImagePlaceholder}>
                      <Ionicons
                        name="person-circle"
                        size={64}
                        color={PrimaryColor}
                      />
                    </View>
                  )}
                </View>

                {/* Driver Details */}
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{order.driverName}</Text>
                  <Text style={styles.driverPhone}>{order.driverPhone}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.driverActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleCallDriver}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call" size={20} color={PrimaryColor} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleChatDriver}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="chatbubbles"
                      size={20}
                      color={PrimaryColor}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

        {/* Delivery Address */}
        {order.address && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons
                name="location"
                size={20}
                color={PrimaryColor}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.infoTitle}>Delivery Address</Text>
            </View>
            <Text style={styles.infoText}>{order.address}</Text>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>
            Order Items ({order.items.length})
          </Text>

          {order.items.map((item, index) => {
            const itemData = item.menuItem || item.product || item.medicine;
            return (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>
                    {itemData?.name || "Item"}
                  </Text>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              ${(order.subtotalAmount || 0).toFixed(2)}
            </Text>
          </View>

          {order.deliveryFee && order.deliveryFee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>
                ${order.deliveryFee.toFixed(2)}
              </Text>
            </View>
          )}

          {order.discountAmount && order.discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: "#10B981" }]}>
                Discount
              </Text>
              <Text style={[styles.summaryValue, { color: "#10B981" }]}>
                -${order.discountAmount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>
              ${order.totalAmount.toFixed(2)}
            </Text>
          </View>

          {/* Payment Status */}
          <View
            style={[
              styles.paymentStatus,
              {
                backgroundColor:
                  order.paymentStatus === "PAID"
                    ? "#D1FAE5"
                    : order.paymentStatus === "UNPAID"
                    ? "#FEE2E2"
                    : "#F3E8FF",
              },
            ]}
          >
            <Ionicons
              name={
                order.paymentStatus === "PAID"
                  ? "checkmark-circle"
                  : "alert-circle"
              }
              size={16}
              color={order.paymentStatus === "PAID" ? "#059669" : "#DC2626"}
            />
            <Text
              style={[
                styles.paymentStatusText,
                {
                  color: order.paymentStatus === "PAID" ? "#059669" : "#DC2626",
                },
              ]}
            >
              {order.paymentStatus === "PAID"
                ? "Payment Completed"
                : order.paymentStatus === "UNPAID"
                ? "Pending Payment"
                : "Refunded"}
            </Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Timeline</Text>

          <View style={styles.timelineItem}>
            <View style={styles.timelineMarker}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Order Placed</Text>
              <Text style={styles.timelineTime}>
                {formatDate(order.createdAt)}
              </Text>
            </View>
          </View>

          {order.status !== "PENDING" && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineMarker}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Order Accepted</Text>
                <Text style={styles.timelineTime}>
                  {formatDate(order.updatedAt || order.createdAt)}
                </Text>
              </View>
            </View>
          )}

          {(order.status === "READY" ||
            order.status === "DISPATCHED" ||
            order.status === "DELIVERED") && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineMarker}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Ready for Pickup</Text>
                <Text style={styles.timelineTime}>
                  {formatDate(order.updatedAt || order.createdAt)}
                </Text>
              </View>
            </View>
          )}

          {(order.status === "DISPATCHED" || order.status === "DELIVERED") && (
            <View style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineMarker,
                  {
                    backgroundColor:
                      order.status === "DELIVERED" ? "#27AE60" : "#9CA3AF",
                  },
                ]}
              >
                {order.status === "DELIVERED" && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>
                  {order.status === "DELIVERED" ? "Delivered" : "On the Way"}
                </Text>
                <Text style={styles.timelineTime}>
                  {formatDate(order.updatedAt || order.createdAt)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  header: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#E74C3C",
    marginTop: 12,
    textAlign: "center",
  },

  // Status Card
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  orderTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },

  // Driver Card
  driverCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  driverImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  driverImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  driverPhone: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  driverActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  // Info Cards
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  infoText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },

  // Items Card
  itemsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  itemQuantity: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: PrimaryColor,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: PrimaryColor,
  },
  paymentStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Timeline Card
  timelineCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  timelineMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#27AE60",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  timelineTime: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  // Button
  button: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
