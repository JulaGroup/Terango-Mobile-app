import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const { vendor, currentBusiness } = useVendor();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<OrderTab>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const orderStatuses = [
    {
      value: "PENDING",
      label: "Pending",
      color: "#FF9800",
      icon: "time-outline",
    },
    {
      value: "ACCEPTED",
      label: "Accepted",
      color: "#2196F3",
      icon: "checkmark-circle-outline",
    },
    {
      value: "PREPARING",
      label: "Preparing",
      color: "#9C27B0",
      icon: "restaurant-outline",
    },
    { value: "READY", label: "Ready", color: "#4CAF50", icon: "cube-outline" },
    {
      value: "DISPATCHED",
      label: "Dispatched",
      color: "#FF5722",
      icon: "car-outline",
    },
    {
      value: "DELIVERED",
      label: "Delivered",
      color: "#4CAF50",
      icon: "checkmark-done-outline",
    },
    {
      value: "CANCELLED",
      label: "Cancelled",
      color: "#F44336",
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
      console.log("🔄 Order status changed:", orderData);
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
      currentBusiness?.id
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
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setFilteredOrders(filtered);
  }, [orders, activeTab]);

  const getOrderStats = useCallback((): OrderStats => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "PENDING").length,
      preparing: orders.filter((o) => o.status === "PREPARING").length,
      ready: orders.filter((o) => o.status === "READY").length,
      delivered: orders.filter((o) => o.status === "DELIVERED").length,
      totalRevenue: orders.reduce(
        (sum, order) => sum + (order.subtotalAmount || order.totalAmount || 0),
        0
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

    // PENDING: Vendor can Accept or Cancel
    if (order.status === "PENDING") {
      actions.push({ label: "Accept", status: "ACCEPTED", color: "#2196F3" });
      actions.push({ label: "Cancel", status: "CANCELLED", color: "#F44336" });
    }
    // ACCEPTED: Shows "Waiting for Payment" - no action button, automatic transition after payment
    // Payment happens on customer side, then automatically becomes PREPARING
    else if (order.status === "ACCEPTED") {
      // No actions - waiting for customer payment
      // The system will auto-update to PREPARING once paid
    }
    // PREPARING: Vendor can mark as Ready
    else if (order.status === "PREPARING") {
      actions.push({ label: "Mark Ready", status: "READY", color: "#4CAF50" });
    }
    // READY: Only drivers can dispatch (handled in driver app)
    else if (order.status === "READY") {
      // No dispatch action for vendor - only drivers can dispatch
    }

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
      | "CANCELLED"
  ) => {
    try {
      await orderApi.updateOrderStatus(orderId, newStatus);
      await fetchOrders();
      Alert.alert("Success", "Order status updated successfully");
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Failed to update order status");
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
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Ionicons name="receipt-outline" size={16} color="#666" />
            <Text style={styles.orderId}>#{item.id.substring(0, 8)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons name={statusIcon as any} size={14} color="white" />
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.orderBody}>
          <View style={styles.orderInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                {item.customerName || "Guest"}
              </Text>
            </View>
            {item.customerPhone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color="#666" />
                <Text style={styles.infoText}>{item.customerPhone}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                {date} at {time}
              </Text>
            </View>
            {item.orderType && (
              <View style={styles.infoRow}>
                <Ionicons
                  name={
                    item.orderType === "DELIVERY"
                      ? "bicycle-outline"
                      : "bag-outline"
                  }
                  size={16}
                  color="#666"
                />
                <Text style={styles.infoText}>{item.orderType}</Text>
              </View>
            )}
          </View>

          <View style={styles.orderSummary}>
            <Text style={styles.itemCount}>
              {item.items?.length || 0}{" "}
              {item.items?.length === 1 ? "item" : "items"}
            </Text>
            <Text style={styles.totalAmount}>
              GMD {(item.subtotalAmount || item.totalAmount)?.toLocaleString()}
            </Text>
            <Text style={styles.vendorNote}>Items only</Text>
          </View>
        </View>

        {/* Show "Waiting for Payment" message for ACCEPTED orders */}
        {item.status === "ACCEPTED" && (
          <View style={styles.waitingPaymentContainer}>
            <Ionicons name="card-outline" size={18} color="#FF9800" />
            <Text style={styles.waitingPaymentText}>
              Waiting for customer payment...
            </Text>
          </View>
        )}

        {getAvailableActions(item).length > 0 && (
          <View style={styles.orderActions}>
            {getAvailableActions(item).map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.actionButton, { borderColor: action.color }]}
                onPress={() => {
                  Alert.alert(
                    "Update Order Status",
                    `Change status to ${action.label}?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Confirm",
                        onPress: () =>
                          handleUpdateStatus(item.id, action.status),
                      },
                    ]
                  );
                }}
              >
                <Text
                  style={[styles.actionButtonText, { color: action.color }]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderStatsCard = (
    title: string,
    value: number | string,
    icon: string,
    color: string
  ) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View
        style={[styles.statsIconContainer, { backgroundColor: `${color}15` }]}
      >
        <Ionicons name={icon as any} size={20} color={color} />
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
      <LinearGradient colors={[PrimaryColor, "#1976D2"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Order Management</Text>
              {/* Real-time connection indicator */}
              <View
                style={[
                  styles.connectionDot,
                  { backgroundColor: isConnected ? "#4CAF50" : "#FFA726" },
                ]}
              />
            </View>
            <Text style={styles.headerSubtitle}>
              {currentBusiness?.name || "Your Business"}{" "}
              {isConnected && "• Live"}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={24} color="white" />
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
            {renderStatsCard(
              "Total",
              stats.total,
              "receipt-outline",
              "#2196F3"
            )}
            {renderStatsCard(
              "Pending",
              stats.pending,
              "time-outline",
              "#FF9800"
            )}
            {renderStatsCard(
              "Preparing",
              stats.preparing,
              "restaurant-outline",
              "#9C27B0"
            )}
            {renderStatsCard(
              "Revenue",
              `${(stats.totalRevenue / 1000).toFixed(0)}K`,
              "cash-outline",
              "#4CAF50"
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
                    (o) => !["DELIVERED", "CANCELLED"].includes(o.status)
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
                    ["DELIVERED", "CANCELLED"].includes(o.status)
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

      {/* Order Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[PrimaryColor, "#1976D2"]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            {selectedOrder && (
              <ScrollView style={styles.modalBody}>
                {/* Order Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Order Information
                  </Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order ID:</Text>
                    <Text style={styles.detailValue}>
                      #{selectedOrder.id.substring(0, 12)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: getStatusColor(selectedOrder.status),
                        },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {selectedOrder.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order Type:</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.orderType || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created:</Text>
                    <Text style={styles.detailValue}>
                      {formatDateTime(selectedOrder.createdAt).date}{" "}
                      {formatDateTime(selectedOrder.createdAt).time}
                    </Text>
                  </View>
                </View>

                {/* Customer Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Customer Information
                  </Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.customerName || "Guest"}
                    </Text>
                  </View>
                  {selectedOrder.customerPhone && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone:</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.customerPhone}
                      </Text>
                    </View>
                  )}
                  {selectedOrder.deliveryAddress && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Address:</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.deliveryAddress}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Order Items */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Order Items</Text>
                  {selectedOrder.items?.map((item, index) => (
                    <View key={index} style={styles.orderItem}>
                      <View style={styles.orderItemInfo}>
                        <Text style={styles.orderItemName}>
                          {item.menuItem?.name || "Unknown Item"}
                        </Text>
                        <Text style={styles.orderItemQuantity}>
                          x{item.quantity}
                        </Text>
                      </View>
                      <Text style={styles.orderItemPrice}>
                        GMD {(item.price * item.quantity).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Total */}
                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>
                    Order Subtotal (Your Earnings)
                  </Text>
                  <Text style={styles.totalValue}>
                    GMD{" "}
                    {(
                      selectedOrder.subtotalAmount || selectedOrder.totalAmount
                    )?.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.vendorNote}>
                  💡 Delivery & service fees go to platform
                </Text>
                {/* Payment Status Message for ACCEPTED orders */}
                {selectedOrder.status === "ACCEPTED" && (
                  <View style={styles.waitingPaymentContainer}>
                    <Ionicons name="card-outline" size={20} color="#F57C00" />
                    <Text style={styles.waitingPaymentText}>
                      Waiting for customer payment...
                    </Text>
                  </View>
                )}

                {/* Track Order Button - Only show when DISPATCHED */}
                {selectedOrder.status === "DISPATCHED" && (
                  <TouchableOpacity
                    style={[
                      styles.modalActionButton,
                      { backgroundColor: "#2196F3", marginBottom: 10 },
                    ]}
                    onPress={() => {
                      Alert.alert(
                        "Track Order",
                        "Tracking feature coming soon!",
                        [{ text: "OK" }]
                      );
                    }}
                  >
                    <Ionicons
                      name="navigate-outline"
                      size={20}
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.modalActionButtonText}>
                      Track Order
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Show disabled tracking for PENDING orders */}
                {selectedOrder.status === "PENDING" && (
                  <View
                    style={[
                      styles.modalActionButton,
                      {
                        backgroundColor: "#BDBDBD",
                        opacity: 0.6,
                        marginBottom: 10,
                      },
                    ]}
                  >
                    <Ionicons
                      name="navigate-outline"
                      size={20}
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.modalActionButtonText}>
                      Track Order (Available after dispatch)
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                {getAvailableActions(selectedOrder).length > 0 && (
                  <View style={styles.modalActions}>
                    {getAvailableActions(selectedOrder).map((action, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.modalActionButton,
                          { backgroundColor: action.color },
                        ]}
                        onPress={() => {
                          setDetailsModalVisible(false);
                          setTimeout(() => {
                            handleUpdateStatus(selectedOrder.id, action.status);
                          }, 300);
                        }}
                      >
                        <Text style={styles.modalActionButtonText}>
                          {action.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
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
    padding: 8,
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
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    backgroundColor: "white",
    maxHeight: 94, // 70px card + 12px top + 12px for breathing room
  },
  statsContent: {
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    marginRight: 12,
    minWidth: 20,
    height: 70,
    borderLeftWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  statsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  statsInfo: {
    flex: 1,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 1,
  },
  statsLabel: {
    fontSize: 11,
    color: "#666",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: `${PrimaryColor}15`,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginLeft: 6,
  },
  activeTabText: {
    color: PrimaryColor,
  },
  ordersList: {
    padding: 15,
  },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
    marginLeft: 4,
  },
  orderBody: {
    marginBottom: 12,
  },
  orderInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  orderSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  itemCount: {
    fontSize: 14,
    color: "#666",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: PrimaryColor,
  },
  orderActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  orderItemInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  orderItemName: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  orderItemQuantity: {
    fontSize: 14,
    color: "#666",
    marginLeft: 10,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 15,
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: PrimaryColor,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalActionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  waitingPaymentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E0",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  waitingPaymentText: {
    fontSize: 14,
    color: "#F57C00",
    fontWeight: "600",
  },
  vendorNote: {
    fontSize: 11,
    color: "#999",
    fontStyle: "italic",
    marginTop: 4,
  },
});
