import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { orderApi, type Order } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";

const statusColors = {
  PENDING: "#F59E0B",
  ACCEPTED: "#3B82F6",
  PREPARING: "#3B82F6",
  PROCESSING: "#3B82F6",
  READY: "#10B981",
  DISPATCHED: "#8B5CF6",
  DELIVERED: "#059669",
  CANCELLED: "#EF4444",
};

const statusIcons = {
  PENDING: "time-outline",
  ACCEPTED: "checkmark-outline",
  PREPARING: "restaurant-outline",
  PROCESSING: "restaurant-outline",
  READY: "checkmark-circle-outline",
  DISPATCHED: "car-outline",
  DELIVERED: "checkmark-done-outline",
  CANCELLED: "close-circle-outline",
};

const statusLabels = {
  PENDING: "New Order",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  PROCESSING: "Preparing",
  READY: "Ready",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const nextStatusMap = {
  PENDING: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "READY",
  // READY orders cannot be advanced by vendors - drivers handle DISPATCHED and DELIVERED
  // DISPATCHED and DELIVERED are not included here intentionally
};

export default function VendorOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderTicket, setShowOrderTicket] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      // Get all vendor orders (across all restaurants for this vendor)
      const ordersData = await orderApi.getAllVendorOrders();
      setOrders(ordersData);
    } catch (error: any) {
      console.error("Error loading vendor orders:", error);
      setError(error.message || "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    loadOrders();
  }, [fadeAnim, slideAnim, loadOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: string
  ) => {
    try {
      await orderApi.updateOrderStatus(orderId, newStatus as any);
      loadOrders(); // Refresh orders
      Alert.alert(
        "Success",
        `Order status updated to ${
          statusLabels[newStatus as keyof typeof statusLabels]
        }`
      );
    } catch {
      Alert.alert("Error", "Failed to update order status");
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await orderApi.cancelOrder(orderId, "Cancelled by restaurant");
              loadOrders();
              Alert.alert("Success", "Order has been cancelled");
            } catch {
              Alert.alert("Error", "Failed to cancel order");
            }
          },
        },
      ]
    );
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === "ALL") return true;
    return order.status === filter;
  });

  // Order Ticket Modal Component
  const OrderTicketModal = () => {
    if (!selectedOrder) return null;

    const order = selectedOrder;
    const statusColor = statusColors[order.status];

    return (
      <Modal
        visible={showOrderTicket}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOrderTicket(false)}
      >
        <SafeAreaView style={styles.ticketContainer}>
          {/* Header */}
          <View style={styles.ticketHeader}>
            <TouchableOpacity
              style={styles.ticketBackButton}
              onPress={() => setShowOrderTicket(false)}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.ticketHeaderTitle}>Order Details</Text>
            <TouchableOpacity style={styles.ticketPrintButton}>
              <Ionicons name="print-outline" size={24} color={PrimaryColor} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.ticketContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Order Summary Card */}
            <View style={styles.ticketCard}>
              <View
                style={[
                  styles.ticketStatusStrip,
                  { backgroundColor: statusColor },
                ]}
              />

              {/* Status Badge at Top */}
              <View style={styles.ticketStatusContainer}>
                <View
                  style={[
                    styles.ticketStatusBadge,
                    { backgroundColor: statusColor },
                  ]}
                >
                  <Ionicons
                    name={statusIcons[order.status] as any}
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.ticketStatusText}>
                    {statusLabels[order.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.ticketOrderHeader}>
                <View>
                  <Text style={styles.ticketOrderNumber}>
                    ORDER #{order.id.slice(-8).toUpperCase()}
                  </Text>
                  <Text style={styles.ticketOrderDate}>
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.ticketTotalAmount}>
                <Text style={styles.ticketTotalLabel}>Total Amount</Text>
                <Text style={styles.ticketTotalValue}>
                  D{order.totalAmount.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Customer Information */}
            <View style={styles.ticketCard}>
              <Text style={styles.ticketSectionTitle}>
                Customer Information
              </Text>

              <View style={styles.ticketInfoRow}>
                <Ionicons name="person" size={20} color="#6B7280" />
                <View style={styles.ticketInfoContent}>
                  <Text style={styles.ticketInfoLabel}>Customer Name</Text>
                  <Text style={styles.ticketInfoValue}>
                    {order.customerName || "Not provided"}
                  </Text>
                </View>
              </View>

              <View style={styles.ticketInfoRow}>
                <Ionicons name="call" size={20} color="#6B7280" />
                <View style={styles.ticketInfoContent}>
                  <Text style={styles.ticketInfoLabel}>Phone Number</Text>
                  <Text style={styles.ticketInfoValue}>
                    {order.customerPhone || "Not provided"}
                  </Text>
                </View>
              </View>

              <View style={styles.ticketInfoRow}>
                <Ionicons name="location" size={20} color="#6B7280" />
                <View style={styles.ticketInfoContent}>
                  <Text style={styles.ticketInfoLabel}>Delivery Address</Text>
                  <Text style={styles.ticketInfoValue}>
                    {order.deliveryAddress || "Not provided"}
                  </Text>
                </View>
              </View>

              {order.notes && (
                <View style={styles.ticketInfoRow}>
                  <Ionicons name="chatbubble" size={20} color="#6B7280" />
                  <View style={styles.ticketInfoContent}>
                    <Text style={styles.ticketInfoLabel}>Special Notes</Text>
                    <Text style={styles.ticketInfoValue}>{order.notes}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Order Items */}
            <View style={styles.ticketCard}>
              <Text style={styles.ticketSectionTitle}>
                Order Items ({order.items.length})
              </Text>

              {order.items.map((item) => (
                <View key={item.id} style={styles.ticketItemRow}>
                  {item.menuItem.imageUrl ? (
                    <Image
                      source={{ uri: item.menuItem.imageUrl }}
                      style={styles.ticketItemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.ticketItemPlaceholder}>
                      <Ionicons name="restaurant" size={24} color="#9CA3AF" />
                    </View>
                  )}

                  <View style={styles.ticketItemInfo}>
                    <Text style={styles.ticketItemName}>
                      {item.menuItem.name}
                    </Text>
                    {item.menuItem.description && (
                      <Text
                        style={styles.ticketItemDescription}
                        numberOfLines={2}
                      >
                        {item.menuItem.description}
                      </Text>
                    )}
                    <Text style={styles.ticketItemPrice}>
                      D{item.price.toFixed(2)} × {item.quantity}
                    </Text>
                  </View>

                  <View style={styles.ticketItemTotal}>
                    <Text style={styles.ticketItemTotalAmount}>
                      D{(item.price * item.quantity).toFixed(2)}
                    </Text>
                    <View style={styles.ticketQuantityBadge}>
                      <Text style={styles.ticketQuantityText}>
                        {item.quantity}x
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Order Summary */}
              <View style={styles.ticketSummary}>
                <View style={styles.ticketSummaryRow}>
                  <Text style={styles.ticketSummaryLabel}>Subtotal</Text>
                  <Text style={styles.ticketSummaryValue}>
                    D{order.totalAmount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.ticketSummaryRow}>
                  <Text style={styles.ticketSummaryLabel}>Delivery Fee</Text>
                  <Text style={styles.ticketSummaryValue}>D0.00</Text>
                </View>
                <View style={[styles.ticketSummaryRow, styles.ticketTotalRow]}>
                  <Text style={styles.ticketTotalLabel}>Total</Text>
                  <Text style={styles.ticketTotalValue}>
                    D{order.totalAmount.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Restaurant Information */}
            <View style={styles.ticketCard}>
              <Text style={styles.ticketSectionTitle}>Restaurant Details</Text>

              <View style={styles.ticketInfoRow}>
                <Ionicons name="storefront" size={20} color="#6B7280" />
                <View style={styles.ticketInfoContent}>
                  <Text style={styles.ticketInfoLabel}>Restaurant</Text>
                  <Text style={styles.ticketInfoValue}>
                    {order.restaurant?.name || "Unknown"}
                  </Text>
                </View>
              </View>

              <View style={styles.ticketInfoRow}>
                <Ionicons name="location" size={20} color="#6B7280" />
                <View style={styles.ticketInfoContent}>
                  <Text style={styles.ticketInfoLabel}>Address</Text>
                  <Text style={styles.ticketInfoValue}>
                    {order.restaurant?.address || "Not provided"}
                  </Text>
                </View>
              </View>

              <View style={styles.ticketInfoRow}>
                <Ionicons name="call" size={20} color="#6B7280" />
                <View style={styles.ticketInfoContent}>
                  <Text style={styles.ticketInfoLabel}>Phone</Text>
                  <Text style={styles.ticketInfoValue}>
                    {order.restaurant?.phone || "Not provided"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons for Ticket */}
            <View style={styles.ticketActions}>
              {order.status === "PENDING" && (
                <TouchableOpacity
                  style={styles.ticketAcceptButton}
                  onPress={() => {
                    setShowOrderTicket(false);
                    handleUpdateOrderStatus(order.id, "ACCEPTED");
                  }}
                >
                  <LinearGradient
                    colors={["#22C55E", "#16A34A"]}
                    style={styles.ticketActionGradient}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.ticketActionText}>Accept Order</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {(order.status === "ACCEPTED" ||
                order.status === "PREPARING") && (
                <TouchableOpacity
                  style={styles.ticketAdvanceButton}
                  onPress={() => {
                    const nextStatus =
                      nextStatusMap[order.status as keyof typeof nextStatusMap];
                    if (nextStatus) {
                      setShowOrderTicket(false);
                      handleUpdateOrderStatus(order.id, nextStatus);
                    }
                  }}
                >
                  <LinearGradient
                    colors={[PrimaryColor, "#FF8F65"]}
                    style={styles.ticketActionGradient}
                  >
                    <Ionicons
                      name="arrow-forward-circle"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.ticketActionText}>
                      Mark{" "}
                      {
                        statusLabels[
                          nextStatusMap[
                            order.status as keyof typeof nextStatusMap
                          ] as keyof typeof statusLabels
                        ]
                      }
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {(order.status === "PENDING" ||
                order.status === "ACCEPTED" ||
                order.status === "PREPARING") && (
                <TouchableOpacity
                  style={styles.ticketCancelButton}
                  onPress={() => {
                    setShowOrderTicket(false);
                    handleCancelOrder(order.id);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                  <Text style={styles.ticketCancelText}>Cancel Order</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const OrderCard = ({ order, index }: { order: Order; index: number }) => {
    const itemSlideAnim = useRef(new Animated.Value(50)).current;
    const itemFadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(itemFadeAnim, {
          toValue: 1,
          duration: 600,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(itemSlideAnim, {
          toValue: 0,
          duration: 600,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          delay: index * 100,
          useNativeDriver: true,
        }),
      ]).start();
    }, [itemFadeAnim, itemSlideAnim, scaleAnim, index]);

    const statusColor = statusColors[order.status];
    const nextStatus =
      nextStatusMap[order.status as keyof typeof nextStatusMap];
    const canAdvance = !!nextStatus;
    const canCancel =
      order.status === "PENDING" ||
      order.status === "ACCEPTED" ||
      order.status === "PREPARING";

    return (
      <Animated.View
        style={[
          styles.orderCard,
          {
            opacity: itemFadeAnim,
            transform: [{ translateY: itemSlideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Status Indicator Strip */}
        <View style={[styles.statusStrip, { backgroundColor: statusColor }]} />

        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.orderHeaderLeft}>
            <View style={styles.orderIdContainer}>
              <Text style={styles.orderIdLabel}>ORDER</Text>
              <Text style={styles.modernOrderId}>
                #{order.id.slice(-6).toUpperCase()}
              </Text>
            </View>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text style={styles.orderTime}>
                {new Date(order.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>

          <View style={styles.orderHeaderRight}>
            <View
              style={[
                styles.modernStatusBadge,
                { backgroundColor: statusColor },
              ]}
            >
              <Ionicons
                name={statusIcons[order.status] as any}
                size={12}
                color="#fff"
              />
              <Text style={styles.modernStatusText}>
                {statusLabels[order.status]}
              </Text>
            </View>
            <Text style={styles.modernTotalAmount}>
              D{order.totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Customer Details Section */}
        <View style={styles.customerSection}>
          <View style={styles.customerHeader}>
            <View style={styles.customerAvatar}>
              <Ionicons name="person" size={20} color={PrimaryColor} />
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.modernCustomerName}>
                {order.customerName || "Customer"}
              </Text>
              <Text style={styles.customerPhone}>
                {order.customerPhone || "No phone"}
              </Text>
            </View>
          </View>

          <View style={styles.addressContainer}>
            <View style={styles.addressIcon}>
              <Ionicons name="location" size={16} color="#EF4444" />
            </View>
            <Text style={styles.deliveryAddress} numberOfLines={2}>
              {order.deliveryAddress || "No address provided"}
            </Text>
          </View>

          {order.notes && (
            <View style={styles.notesContainer}>
              <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" />
              <Text style={styles.orderNotes} numberOfLines={2}>
                {order.notes}
              </Text>
            </View>
          )}
        </View>

        {/* Special status indicator for READY orders */}
        {order.status === "READY" && (
          <View style={styles.readyStatusIndicator}>
            <View style={styles.readyStatusContent}>
              <Ionicons name="car-outline" size={20} color="#22C55E" />
              <Text style={styles.readyStatusText}>
                Order ready for pickup - Waiting for driver assignment
              </Text>
            </View>
          </View>
        )}

        {/* Order Items Preview */}
        <View style={styles.itemsPreview}>
          <View style={styles.modernItemsHeader}>
            <Text style={styles.itemsCount}>{order.items.length} Items</Text>
            <TouchableOpacity style={styles.expandButton}>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <View style={styles.itemsList}>
            {order.items.slice(0, 2).map((item, itemIndex) => (
              <View key={item.id} style={styles.modernItemRow}>
                {item.menuItem.imageUrl ? (
                  <Image
                    source={{ uri: item.menuItem.imageUrl }}
                    style={styles.modernItemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.modernItemPlaceholder}>
                    <Ionicons name="restaurant" size={20} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.modernItemInfo}>
                  <Text style={styles.modernItemName} numberOfLines={1}>
                    {item.menuItem.name}
                  </Text>
                  <Text style={styles.modernItemPrice}>
                    D{item.price.toFixed(2)} × {item.quantity}
                  </Text>
                </View>
                <Text style={styles.modernItemTotal}>
                  D{(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}

            {order.items.length > 2 && (
              <View style={styles.moreItemsIndicator}>
                <Text style={styles.moreItemsText}>
                  +{order.items.length - 2} more items
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.modernActions}>
          {canCancel && (
            <TouchableOpacity
              style={styles.modernCancelButton}
              onPress={() => handleCancelOrder(order.id)}
            >
              <Ionicons name="close-circle" size={18} color="#EF4444" />
              <Text style={styles.modernCancelText}>Cancel</Text>
            </TouchableOpacity>
          )}

          {canAdvance && (
            <TouchableOpacity
              style={styles.modernAdvanceButton}
              onPress={() => handleUpdateOrderStatus(order.id, nextStatus)}
            >
              <LinearGradient
                colors={[PrimaryColor, "#FF8F65"]}
                style={styles.modernAdvanceGradient}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.modernAdvanceText}>
                  Mark {statusLabels[nextStatus as keyof typeof statusLabels]}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.modernDetailsButton}
            onPress={() => {
              setSelectedOrder(order);
              setShowOrderTicket(true);
            }}
          >
            <Ionicons name="eye" size={18} color={PrimaryColor} />
            <Text style={styles.modernDetailsText}>View</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Orders Management</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColor} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Orders Management</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOrders}>
            <LinearGradient
              colors={[PrimaryColor, "#FF8F65"]}
              style={styles.retryButtonGradient}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders Management</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh"
            size={24}
            color={refreshing ? "#9CA3AF" : PrimaryColor}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Filter Tabs */}
      <Animated.View
        style={[
          styles.filterContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabs}
        >
          {[
            "ALL",
            "PENDING",
            "ACCEPTED",
            "PREPARING",
            "READY",
            "DISPATCHED",
            "DELIVERED",
          ].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterTab,
                filter === status && styles.activeFilterTab,
              ]}
              onPress={() => setFilter(status)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === status && styles.activeFilterTabText,
                ]}
              >
                {status === "ALL"
                  ? "All Orders"
                  : statusLabels[status as keyof typeof statusLabels]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {filteredOrders.length === 0 ? (
        <Animated.View
          style={[
            styles.emptyState,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.emptyIconContainer}>
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>
            {filter === "ALL"
              ? "No orders yet"
              : `No ${filter.toLowerCase()} orders`}
          </Text>
          <Text style={styles.emptyDescription}>
            {filter === "ALL"
              ? "When customers place orders, they will appear here."
              : `There are no orders with ${filter.toLowerCase()} status at the moment.`}
          </Text>
        </Animated.View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <Animated.View
            style={[
              styles.ordersContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.ordersCount}>
              {filteredOrders.length} order
              {filteredOrders.length > 1 ? "s" : ""} found
            </Text>

            {filteredOrders.map((order, index) => (
              <OrderCard key={order.id} order={order} index={index} />
            ))}
          </Animated.View>
        </ScrollView>
      )}

      {/* Order Ticket Modal */}
      <OrderTicketModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  refreshButton: {
    padding: 8,
  },
  filterContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterTabs: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeFilterTab: {
    backgroundColor: PrimaryColor,
    borderColor: PrimaryColor,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeFilterTabText: {
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    marginTop: 24,
  },
  retryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  ordersContainer: {
    padding: 20,
  },
  ordersCount: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  orderInfo: {
    flex: 1,
  },
  orderIdRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  customerName: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  orderSummary: {
    alignItems: "flex-end",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: PrimaryColor,
  },
  itemCount: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  customerInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  itemsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemsHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  itemImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 12,
    color: "#6B7280",
  },
  quantityBadge: {
    backgroundColor: PrimaryColor,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  orderActions: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flex: 1,
    justifyContent: "center",
  },
  advanceButton: {
    backgroundColor: PrimaryColor,
    borderColor: PrimaryColor,
  },
  advanceButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  cancelButton: {
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
  },
  detailsButton: {
    borderColor: "#DBEAFE",
    backgroundColor: "#EFF6FF",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Modern OrderCard Styles
  statusStrip: {
    height: 4,
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingBottom: 16,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderIdContainer: {
    marginBottom: 8,
  },
  orderIdLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1,
    marginBottom: 2,
  },
  modernOrderId: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.5,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderTime: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  orderHeaderRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  modernStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  modernStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modernTotalAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  customerSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F9FF",
    justifyContent: "center",
    alignItems: "center",
  },
  customerDetails: {
    flex: 1,
  },
  modernCustomerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
    marginBottom: 8,
  },
  addressIcon: {
    marginTop: 1,
  },
  deliveryAddress: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    lineHeight: 20,
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  orderNotes: {
    flex: 1,
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  readyStatusIndicator: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  readyStatusContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#22C55E",
  },
  readyStatusText: {
    flex: 1,
    fontSize: 13,
    color: "#16A34A",
    fontWeight: "600",
  },
  itemsPreview: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modernItemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemsCount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  expandButton: {
    padding: 4,
  },
  itemsList: {
    gap: 8,
  },
  modernItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
  },
  modernItemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  modernItemPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  modernItemInfo: {
    flex: 1,
  },
  modernItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  modernItemPrice: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  modernItemTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  moreItemsIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  moreItemsText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  modernActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  modernCancelButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 6,
  },
  modernCancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },
  modernAdvanceButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  modernAdvanceGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  modernAdvanceText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  modernDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    gap: 6,
  },
  modernDetailsText: {
    fontSize: 13,
    fontWeight: "600",
    color: PrimaryColor,
  },

  // Order Ticket Modal Styles
  ticketContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  ticketBackButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  ticketHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  ticketPrintButton: {
    padding: 8,
  },
  ticketContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  ticketCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  ticketStatusStrip: {
    height: 4,
    width: "100%",
  },
  ticketStatusContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: "flex-start",
  },
  ticketOrderHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  ticketOrderNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  ticketOrderDate: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  ticketStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  ticketStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
  },
  ticketTotalAmount: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  ticketTotalLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: "500",
  },
  ticketTotalValue: {
    fontSize: 28,
    fontWeight: "800",
    color: PrimaryColor,
  },
  ticketSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    padding: 20,
    paddingBottom: 16,
  },
  ticketInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  ticketInfoContent: {
    flex: 1,
  },
  ticketInfoLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ticketInfoValue: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "600",
    lineHeight: 20,
  },
  ticketItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 16,
  },
  ticketItemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  ticketItemPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  ticketItemInfo: {
    flex: 1,
  },
  ticketItemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  ticketItemDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
    lineHeight: 18,
  },
  ticketItemPrice: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  ticketItemTotal: {
    alignItems: "flex-end",
    gap: 6,
  },
  ticketItemTotalAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  ticketQuantityBadge: {
    backgroundColor: PrimaryColor,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ticketQuantityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  ticketSummary: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 2,
    borderTopColor: "#F3F4F6",
    gap: 8,
  },
  ticketSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketSummaryLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  ticketSummaryValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  ticketTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
    marginTop: 8,
  },
  ticketActions: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
  },
  ticketAcceptButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  ticketAdvanceButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  ticketActionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  ticketActionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  ticketCancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 2,
    borderColor: "#FECACA",
    gap: 8,
  },
  ticketCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
});
