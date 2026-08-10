import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";
import { vendorApi, VendorStats } from "@/lib/api";
import { useVendor } from "@/context/VendorContext";

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: "#10B981",
  PENDING: "#F59E0B",
  ACCEPTED: "#3B82F6",
  PREPARING: "#3B82F6",
  DISPATCHED: "#8B5CF6",
  CANCELLED: "#EF4444",
  // Booking statuses
  CONFIRMED: "#10B981",
  CHECKED_IN: "#3B82F6",
  COMPLETED: "#10B981",
};

export default function VendorEarningsScreen() {
  const router = useRouter();
  const { currentBusiness, vendor } = useVendor();
  // Providers sell bookings, not orders — relabel the same figures for them.
  const isExperience =
    (currentBusiness?.type as string) === "EXPERIENCE" ||
    !!vendor?.businessType?.includes("EXPERIENCE" as any);
  const unit = isExperience ? "booking" : "order";
  const units = isExperience ? "bookings" : "orders";
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const data = await vendorApi.getVendorStats();
      setStats(data);
    } catch (err: any) {
      console.error("Failed to load vendor stats:", err);
      setError(err?.message || "Failed to load earnings data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats(true);
  };

  const fmt = (amount: number) => `D ${amount.toFixed(2)}`;

  // Compute max revenue for chart scaling
  const maxDailyRevenue =
    stats?.dailyStats && stats.dailyStats.length > 0
      ? Math.max(...stats.dailyStats.map((d) => d.revenue), 1)
      : 1;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColor} />
          <Text style={styles.loadingText}>Loading earnings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Earnings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
          <Text style={styles.errorTitle}>Could not load earnings</Text>
          <Text style={styles.errorSubtitle}>
            {error || "Please try again."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadStats()}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

      {/* Header */}
      <LinearGradient
        colors={[PrimaryColor, "#FF8F65"]}
        style={styles.gradientHeader}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: "#fff" }]}>
          Earnings & Analytics
        </Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        {/* Revenue Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: PrimaryColor }]}>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryAmount}>{fmt(stats.totalRevenue)}</Text>
            <Text style={styles.summarySubLabel}>All time</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: "#10B981" }]}>
            <Text style={styles.summaryLabel}>Today</Text>
            <Text style={[styles.summaryAmount, { color: "#10B981" }]}>
              {fmt(stats.todayRevenue)}
            </Text>
            <Text style={styles.summarySubLabel}>
              {stats.todayOrders} {units}
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: "#3B82F6" }]}>
            <Text style={styles.summaryLabel}>
              {isExperience ? "Avg. Booking Value" : "Avg. Order Value"}
            </Text>
            <Text style={[styles.summaryAmount, { color: "#3B82F6" }]}>
              {fmt(stats.averageOrderValue)}
            </Text>
            <Text style={styles.summarySubLabel}>Per {unit}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: "#8B5CF6" }]}>
            <Text style={styles.summaryLabel}>
              {isExperience ? "Total Bookings" : "Total Orders"}
            </Text>
            <Text style={[styles.summaryAmount, { color: "#8B5CF6" }]}>
              {stats.totalOrders}
            </Text>
            <Text style={styles.summarySubLabel}>
              {stats.completedOrders} completed
            </Text>
          </View>
        </View>

        {/* 7-Day Revenue Chart */}
        {stats.dailyStats && stats.dailyStats.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>7-Day Revenue</Text>
            <View style={styles.chartContainer}>
              {stats.dailyStats.map((day, idx) => {
                const barHeight = Math.max(
                  8,
                  (day.revenue / maxDailyRevenue) * 120,
                );
                const date = new Date(day.date);
                const label = date.toLocaleDateString("en-GB", {
                  weekday: "short",
                });
                return (
                  <View key={idx} style={styles.barWrapper}>
                    <Text style={styles.barAmountLabel}>
                      {day.revenue > 0
                        ? `D${(day.revenue / 1000).toFixed(0)}k`
                        : ""}
                    </Text>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor:
                            idx === stats.dailyStats!.length - 1
                              ? PrimaryColor
                              : "#E5E7EB",
                        },
                      ]}
                    />
                    <Text style={styles.barLabel}>{label}</Text>
                    <Text style={styles.barOrderLabel}>{day.orders}x</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Top Selling Items */}
        {stats.topSellingItems && stats.topSellingItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top Selling Items</Text>
            {stats.topSellingItems.slice(0, 8).map((item, idx) => (
              <View key={item.id} style={styles.topItemRow}>
                <View style={styles.topItemRank}>
                  <Text style={styles.topItemRankText}>{idx + 1}</Text>
                </View>
                <View style={styles.topItemInfo}>
                  <Text style={styles.topItemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.topItemSales}>
                    {item.sales} sold · {fmt(item.revenue)} revenue
                  </Text>
                </View>
                <Text style={styles.topItemRevenue}>{fmt(item.revenue)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Orders */}
        {stats.recentOrders && stats.recentOrders.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {isExperience ? "Recent Bookings" : "Recent Orders"}
            </Text>
            {stats.recentOrders.slice(0, 10).map((order) => {
              const statusColor = STATUS_COLORS[order.status] || "#6B7280";
              const orderDate = new Date(order.createdAt).toLocaleDateString(
                "en-GB",
                {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              );
              return (
                <View key={order.id} style={styles.recentOrderRow}>
                  <View style={styles.recentOrderLeft}>
                    <Text style={styles.recentOrderCustomer} numberOfLines={1}>
                      {order.customerName || "Customer"}
                    </Text>
                    <Text style={styles.recentOrderDate}>{orderDate}</Text>
                    <Text style={styles.recentOrderItems}>
                      {order.itemCount}{" "}
                      {isExperience
                        ? order.itemCount === 1
                          ? "guest"
                          : "guests"
                        : order.itemCount === 1
                          ? "item"
                          : "items"}
                    </Text>
                  </View>
                  <View style={styles.recentOrderRight}>
                    <Text style={styles.recentOrderAmount}>
                      {fmt(order.totalAmount)}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColor + "20" },
                      ]}
                    >
                      <Text
                        style={[styles.statusBadgeText, { color: statusColor }]}
                      >
                        {order.status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty states */}
        {(!stats.topSellingItems || stats.topSellingItems.length === 0) &&
          (!stats.recentOrders || stats.recentOrders.length === 0) && (
            <View style={styles.emptyContainer}>
              <Ionicons name="bar-chart-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No detailed data yet</Text>
              <Text style={styles.emptySubtitle}>
                Order statistics will appear here once you start receiving
                orders.
              </Text>
            </View>
          )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#6B7280",
    fontSize: 14,
  },
  gradientHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  scrollContent: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  summarySubLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  // Chart
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 160,
    paddingBottom: 4,
  },
  barWrapper: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  barAmountLabel: {
    fontSize: 8,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  bar: {
    width: 28,
    borderRadius: 4,
    minHeight: 8,
  },
  barLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 4,
  },
  barOrderLabel: {
    fontSize: 9,
    color: "#9CA3AF",
  },
  // Top items
  topItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  topItemRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  topItemRankText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  topItemInfo: {
    flex: 1,
  },
  topItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  topItemSales: {
    fontSize: 12,
    color: "#6B7280",
  },
  topItemRevenue: {
    fontSize: 14,
    fontWeight: "700",
    color: PrimaryColor,
  },
  // Recent orders
  recentOrderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  recentOrderLeft: {
    flex: 1,
  },
  recentOrderCustomer: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  recentOrderDate: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 1,
  },
  recentOrderItems: {
    fontSize: 11,
    color: "#6B7280",
  },
  recentOrderRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  recentOrderAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  // Error / empty
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PrimaryColor,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
});
