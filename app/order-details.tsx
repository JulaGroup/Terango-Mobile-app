import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { orderApi, Order } from "../lib/api";
import { PrimaryColor } from "@/constants/Colors";

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

export default function OrderDetailsPage() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      ])
    );

    if (loading) {
      skeletonAnimation.start();
    } else {
      skeletonAnimation.stop();
    }

    return () => skeletonAnimation.stop();
  }, [loading, skeletonOpacity]);

  const fetchOrderDetails = async (isRefresh = false) => {
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
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrderDetails(true);
  };

  const handleTrackOrder = () => {
    Alert.alert(
      "Track Order",
      "Order tracking feature will be available soon. You'll be able to see real-time updates of your order status and delivery progress.",
      [{ text: "OK" }]
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header Skeleton */}
      <View style={styles.header}>
        <SkeletonBox width={40} height={40} style={{ borderRadius: 12 }} />
        <SkeletonBox width={150} height={24} style={{ borderRadius: 12 }} />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: 20 }}
      >
        {/* Status Card Skeleton */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <SkeletonBox width={120} height={20} />
            <SkeletonBox width={80} height={32} style={{ borderRadius: 16 }} />
          </View>
          <SkeletonBox width="100%" height={16} style={{ marginTop: 12 }} />
        </View>

        {/* Order Info Skeleton */}
        <View style={styles.infoCard}>
          <SkeletonBox width={100} height={20} style={{ marginBottom: 16 }} />
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.infoRow}>
              <SkeletonBox width={80} height={14} />
              <SkeletonBox width={120} height={16} />
            </View>
          ))}
        </View>

        {/* Items Skeleton */}
        <View style={styles.itemsCard}>
          <SkeletonBox width={80} height={20} style={{ marginBottom: 16 }} />
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.itemSkeleton}>
              <SkeletonBox width={60} height={60} style={{ borderRadius: 8 }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <SkeletonBox
                  width="70%"
                  height={16}
                  style={{ marginBottom: 4 }}
                />
                <SkeletonBox
                  width="50%"
                  height={14}
                  style={{ marginBottom: 8 }}
                />
                <SkeletonBox width="40%" height={14} />
              </View>
            </View>
          ))}
        </View>

        {/* Total Skeleton */}
        <View style={styles.totalCard}>
          <SkeletonBox width={120} height={24} />
        </View>

        {/* Track Button Skeleton */}
        <SkeletonBox
          width="100%"
          height={56}
          style={{ borderRadius: 16, marginTop: 20 }}
        />
      </ScrollView>
    </SafeAreaView>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
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

  if (loading) {
    return renderSkeletonLoader();
  }

  if (error || !order) {
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
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <Text style={styles.errorText}>
            {error || "The order you're looking for could not be found."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchOrderDetails()}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Get vendor info
  const vendor = order.restaurant || order.shop || order.pharmacy;
  const vendorType = order.restaurant
    ? "Restaurant"
    : order.shop
    ? "Shop"
    : order.pharmacy
    ? "Pharmacy"
    : "Store";

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
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
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
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.orderNumber}>
                Order #{order.id.slice(-8).toUpperCase()}
              </Text>
              <Text style={styles.orderDate}>
                {formatDate(order.createdAt)}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColors[order.status] },
              ]}
            >
              <Ionicons
                name={statusIcons[order.status] as any}
                size={16}
                color="#fff"
              />
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </View>

          {order.estimatedDeliveryTime && (
            <View style={styles.estimatedTime}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.estimatedTimeText}>
                Estimated delivery: {formatDate(order.estimatedDeliveryTime)}
              </Text>
            </View>
          )}
        </View>

        {/* Vendor Info */}
        {vendor && (
          <View style={styles.vendorCard}>
            <View style={styles.vendorHeader}>
              <View style={styles.vendorIconContainer}>
                <Ionicons
                  name={
                    order.restaurant
                      ? "restaurant-outline"
                      : order.shop
                      ? "storefront-outline"
                      : "medical-outline"
                  }
                  size={24}
                  color={PrimaryColor}
                />
              </View>
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>{vendor.name}</Text>
                <Text style={styles.vendorType}>{vendorType}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Delivery Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="person-outline" size={16} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Customer</Text>
              <Text style={styles.infoValue}>{order.customerName}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={16} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{order.customerPhone}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Delivery Address</Text>
              <Text style={styles.infoValue}>{order.deliveryAddress}</Text>
            </View>
          </View>

          {order.notes && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#6B7280"
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Order Notes</Text>
                <Text style={styles.infoValue}>{order.notes}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>
            Order Items ({order.items.length})
          </Text>

          {order.items.map((item, index) => {
            const itemData = item.menuItem || item.product || item.medicine;
            return (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.itemImageContainer}>
                  {itemData?.imageUrl ? (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons
                        name={
                          item.menuItem
                            ? "restaurant"
                            : item.product
                            ? "cube"
                            : "medical"
                        }
                        size={24}
                        color="#9CA3AF"
                      />
                    </View>
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons
                        name={
                          item.menuItem
                            ? "restaurant"
                            : item.product
                            ? "cube"
                            : "medical"
                        }
                        size={24}
                        color="#9CA3AF"
                      />
                    </View>
                  )}
                </View>

                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>
                    {itemData?.name || "Item"}
                  </Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemQuantity}>
                      Qty: {item.quantity}
                    </Text>
                    <Text style={styles.itemPrice}>
                      {formatAmount(item.price)}
                    </Text>
                  </View>
                  <View style={styles.itemTotal}>
                    <Text style={styles.itemTotalText}>
                      Subtotal: {formatAmount(item.price * item.quantity)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items Total</Text>
            <Text style={styles.summaryValue}>
              {formatAmount(
                order.items.reduce(
                  (sum, item) => sum + item.price * item.quantity,
                  0
                )
              )}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>D 0.00</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total Amount</Text>
            <Text style={styles.summaryTotalValue}>
              {formatAmount(order.totalAmount)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Track Button */}
      <View style={styles.trackButtonContainer}>
        <TouchableOpacity
          style={styles.trackButton}
          onPress={handleTrackOrder}
          activeOpacity={0.8}
        >
          <Ionicons name="location" size={20} color="#fff" />
          <Text style={styles.trackButtonText}>Track Order</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    backgroundColor: "#F1F5F9",
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },

  // Status Card
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  estimatedTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  estimatedTimeText: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Vendor Card
  vendorCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  vendorHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  vendorIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  vendorType: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Info Card
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },

  // Items Card
  itemsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  orderItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemImageContainer: {
    marginRight: 12,
  },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: "#6B7280",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  itemTotal: {
    alignItems: "flex-end",
  },
  itemTotalText: {
    fontSize: 14,
    fontWeight: "600",
    color: PrimaryColor,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1F2937",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: PrimaryColor,
  },

  // Track Button
  trackButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  trackButton: {
    backgroundColor: PrimaryColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  trackButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PrimaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Skeleton Styles
  itemSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  totalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
    justifyContent: "center",
  },
});
