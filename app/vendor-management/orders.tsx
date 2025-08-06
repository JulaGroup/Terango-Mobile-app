import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { orderApi } from "@/lib/api";

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes?: string;
  totalAmount: number;
  status:
    | "PENDING"
    | "ACCEPTED"
    | "PREPARING"
    | "READY"
    | "DISPATCHED"
    | "DELIVERED"
    | "CANCELLED";
  items: OrderItem[];
  restaurantId: string;
  restaurant: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  createdAt: string;
  estimatedDeliveryTime?: string;
}

interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  menuItem: {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
  };
}

export default function OrderManagement() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      console.log("Loading vendor orders...");

      // Fetch real orders from API
      const vendorOrders = await orderApi.getAllVendorOrders();
      console.log("Received vendor orders:", vendorOrders);

      setOrders(vendorOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
      // If API fails, show empty state
      setOrders([]);
      Alert.alert("Error", "Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusColor = (status: string): [string, string] => {
    switch (status) {
      case "PENDING":
        return ["#F59E0B", "#FBBF24"];
      case "ACCEPTED":
        return ["#3B82F6", "#60A5FA"];
      case "PREPARING":
        return ["#8B5CF6", "#A78BFA"];
      case "READY":
        return ["#10B981", "#34D399"];
      case "DISPATCHED":
        return ["#059669", "#10B981"];
      case "DELIVERED":
        return ["#22C55E", "#4ADE80"];
      case "CANCELLED":
        return ["#EF4444", "#F87171"];
      default:
        return ["#6B7280", "#9CA3AF"];
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    try {
      // Update order status via API
      await orderApi.updateOrderStatus(orderId, newStatus);

      // Update local state
      setOrders(
        orders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      Alert.alert(
        "Success",
        `Order status updated to ${newStatus.toLowerCase()}`
      );
    } catch (error) {
      console.error("Error updating order status:", error);
      Alert.alert("Error", "Failed to update order status. Please try again.");
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    return order.status.toLowerCase() === activeTab;
  });

  const orderCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    accepted: orders.filter((o) => o.status === "ACCEPTED").length,
    preparing: orders.filter((o) => o.status === "PREPARING").length,
    ready: orders.filter((o) => o.status === "READY").length,
    dispatched: orders.filter((o) => o.status === "DISPATCHED").length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
  };

  const OrderCard = ({ order }: { order: Order }) => (
    <View style={styles.orderCard}>
      <LinearGradient
        colors={getStatusColor(order.status)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.orderHeader}
      >
        <View style={styles.orderHeaderContent}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>#{order.id.slice(-8)}</Text>
            <View style={styles.businessInfo}>
              <Ionicons name="restaurant-outline" size={16} color="#fff" />
              <Text style={styles.businessName}>{order.restaurant.name}</Text>
            </View>
          </View>
          <View style={styles.orderMeta}>
            <Text style={styles.orderAmount}>
              D{order.totalAmount.toFixed(2)}
            </Text>
            <Text style={styles.orderTime}>
              {new Date(order.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.orderContent}>
        <View style={styles.customerInfo}>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{order.customerName}</Text>
            <Text style={styles.customerPhone}>{order.customerPhone}</Text>
            <Text style={styles.deliveryAddress}>{order.deliveryAddress}</Text>
            {order.notes && (
              <Text style={styles.customerPhone}>Note: {order.notes}</Text>
            )}
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentMethod}>
              {new Date(order.createdAt).toLocaleDateString()}
            </Text>
            {order.estimatedDeliveryTime && (
              <Text style={styles.paymentMethod}>
                ETA:{" "}
                {new Date(order.estimatedDeliveryTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.itemsList}>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.quantity}x {item.menuItem.name}
              </Text>
              <Text style={styles.itemPrice}>
                D{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.orderActions}>
          {order.status === "PENDING" && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => updateOrderStatus(order.id, "ACCEPTED")}
              >
                <Ionicons name="checkmark-outline" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => updateOrderStatus(order.id, "CANCELLED")}
              >
                <Ionicons name="close-outline" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
          {order.status === "ACCEPTED" && (
            <TouchableOpacity
              style={[styles.actionButton, styles.prepareButton]}
              onPress={() => updateOrderStatus(order.id, "PREPARING")}
            >
              <Ionicons name="timer-outline" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Start Preparing</Text>
            </TouchableOpacity>
          )}
          {order.status === "PREPARING" && (
            <TouchableOpacity
              style={[styles.actionButton, styles.readyButton]}
              onPress={() => updateOrderStatus(order.id, "READY")}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#fff"
              />
              <Text style={styles.actionButtonText}>Mark Ready</Text>
            </TouchableOpacity>
          )}
          {order.status === "READY" && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deliveredButton]}
              onPress={() => updateOrderStatus(order.id, "DISPATCHED")}
            >
              <Ionicons name="car-outline" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Dispatch</Text>
            </TouchableOpacity>
          )}
          {order.status === "DISPATCHED" && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deliveredButton]}
              onPress={() => updateOrderStatus(order.id, "DELIVERED")}
            >
              <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Mark Delivered</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Order Management</Text>
          <Text style={styles.headerSubtitle}>
            {orders.length} total orders
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={24} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {/* Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {Object.entries(orderCounts).map(([status, count]) => (
          <TouchableOpacity
            key={status}
            style={[styles.tab, activeTab === status && styles.activeTab]}
            onPress={() => setActiveTab(status)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === status && styles.activeTabText,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderCard order={item} />}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptyDescription}>
                {activeTab === "all"
                  ? "No orders have been placed yet."
                  : `No ${activeTab} orders found.`}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f0ff",
    justifyContent: "center",
    alignItems: "center",
  },
  tabsContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    maxHeight: 60,
  },
  tabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#8B5CF6",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  activeTabText: {
    color: "#fff",
  },
  ordersList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  orderHeader: {
    padding: 16,
  },
  orderHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  businessInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  businessName: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  orderMeta: {
    alignItems: "flex-end",
  },
  orderAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  orderTime: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  orderContent: {
    padding: 16,
  },
  customerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  deliveryAddress: {
    fontSize: 13,
    color: "#9ca3af",
  },
  paymentInfo: {
    alignItems: "flex-end",
  },
  paymentMethod: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  paymentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  paymentPaid: {
    backgroundColor: "#d1fae5",
  },
  paymentPending: {
    backgroundColor: "#fef3c7",
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  paymentPaidText: {
    color: "#065f46",
  },
  paymentPendingText: {
    color: "#92400e",
  },
  itemsList: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  orderActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  confirmButton: {
    backgroundColor: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  prepareButton: {
    backgroundColor: "#8B5CF6",
  },
  readyButton: {
    backgroundColor: "#F59E0B",
  },
  deliveredButton: {
    backgroundColor: "#22C55E",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: "#8B5CF6",
    marginTop: 16,
    fontWeight: "500",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
