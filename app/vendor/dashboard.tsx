import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useVendor } from "@/context/VendorContext";
import { vendorApi, userApi, VendorStats } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";

const { width } = Dimensions.get("window");

export default function VendorDashboard() {
  const router = useRouter();
  const { vendor, currentBusiness, isVendorLoading, refreshVendorData } =
    useVendor();
  const [metrics, setMetrics] = useState<VendorStats>({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    todayOrders: 0,
    activeBusinesses: 0,
    totalBusinesses: 0,
    totalMenuItems: 0,
    averageOrderValue: 0,
  });
  const [isLoading, setIsLoading] = useState(true); // Start as true
  const [refreshing, setRefreshing] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  // Get business name for header
  const getBusinessName = () => {
    if (currentBusiness?.name) {
      return currentBusiness.name;
    }
    if (vendor?.businessName && vendor.businessName !== "My Business") {
      return vendor.businessName;
    }
    if (vendor?.businesses && vendor.businesses.length > 0) {
      return vendor.businesses[0].name;
    }
    // Default based on business type
    const businessType = currentBusiness?.type || vendor?.businessType?.[0];
    switch (businessType) {
      case "RESTAURANT":
        return "My Restaurant";
      case "SHOP":
        return "My Shop";
      case "PHARMACY":
        return "My Pharmacy";
      default:
        return "My Business";
    }
  };

  const fetchDashboardData = useCallback(async () => {
    if (!vendor) {
      console.log("⏳ No vendor data available yet, waiting...");
      return;
    }

    try {
      setIsLoading(true);
      console.log("📊 Fetching vendor stats for vendor:", vendor.id);

      // Get vendor stats from server - UPDATED to use server endpoint
      const vendorStats = await vendorApi.getVendorStats();
      console.log("✅ Vendor stats received:", vendorStats);
      setMetrics(vendorStats);
      setHasAttemptedLoad(true);
    } catch (error) {
      console.error("⚠️ Error fetching dashboard data:", error);

      // Fallback to client-side calculation if server fails
      console.log(
        "🔄 Server failed, using fallback calculation with businesses:",
        vendor.businesses
      );

      try {
        const vendorStats = vendorApi.calculateVendorStats(vendor.businesses);
        console.log("📊 Fallback stats calculated:", vendorStats);
        setMetrics(vendorStats);
        setHasAttemptedLoad(true);
      } catch (fallbackError) {
        console.error("❌ Fallback calculation also failed:", fallbackError);
        // Set default empty metrics
        setMetrics({
          totalOrders: 0,
          completedOrders: 0,
          pendingOrders: 0,
          totalRevenue: 0,
          todayRevenue: 0,
          todayOrders: 0,
          activeBusinesses:
            vendor.businesses?.filter((b) => b.isActive).length || 0,
          totalBusinesses: vendor.businesses?.length || 0,
          totalMenuItems: 0,
          averageOrderValue: 0,
        });
        setHasAttemptedLoad(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [vendor]);

  useEffect(() => {
    if (vendor) {
      fetchDashboardData();
    }
  }, [vendor, fetchDashboardData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshVendorData(), fetchDashboardData()]);
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "GMD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const MetricCard = ({
    title,
    value,
    icon,
    color = PrimaryColor,
    onPress,
  }: {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.metricCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.metricHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </TouchableOpacity>
  );

  // Navigation cards for main features
  const NavigationCard = ({
    title,
    subtitle,
    icon,
    color,
    onPress,
    badge,
  }: {
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
    badge?: number;
  }) => (
    <TouchableOpacity style={styles.navCard} onPress={onPress}>
      <LinearGradient
        colors={[color, `${color}CC`]}
        style={styles.navCardGradient}
      >
        <View style={styles.navCardContent}>
          <View style={styles.navCardIcon}>
            <Ionicons name={icon} size={28} color="white" />
            {badge !== undefined && badge > 0 && (
              <View style={styles.navCardBadge}>
                <Text style={styles.navCardBadgeText}>{badge}</Text>
              </View>
            )}
          </View>
          <View style={styles.navCardText}>
            <Text style={styles.navCardTitle}>{title}</Text>
            <Text style={styles.navCardSubtitle}>{subtitle}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="rgba(255,255,255,0.8)"
          />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Show loading spinner while vendor data is being fetched OR hasn't attempted to load yet
  if (isVendorLoading || isLoading || !hasAttemptedLoad) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <LinearGradient
            colors={[PrimaryColor, "#1976D2"]}
            style={styles.loadingSpinner}
          >
            <Ionicons name="storefront" size={40} color="white" />
          </LinearGradient>
          <ActivityIndicator
            size="large"
            color={PrimaryColor}
            style={styles.activityIndicator}
          />
          <Text style={styles.loadingTitle}>Loading Vendor Dashboard...</Text>
          <Text style={styles.loadingSubtitle}>Please wait a moment</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Only show error if vendor data failed to load AND we've attempted to load
  if (!vendor && !isVendorLoading && hasAttemptedLoad) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
          </View>
          <Text style={styles.errorTitle}>No Vendor Data Found</Text>
          <Text style={styles.errorSubtitle}>
            Unable to load vendor information. Please try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={refreshVendorData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

      {/* Modern Header with Business Name */}
      <LinearGradient colors={[PrimaryColor, "#1976D2"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backToAppButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>{getBusinessName()}</Text>
                <Text style={styles.headerSubtitle}>
                  {currentBusiness?.type?.toLowerCase().replace("_", " ") ||
                    "Business"}{" "}
                  Dashboard
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{metrics.todayOrders}</Text>
              <Text style={styles.statLabel}>Today&apos;s Orders</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatCurrency(metrics.todayRevenue)}
              </Text>
              <Text style={styles.statLabel}>Today&apos;s Revenue</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{metrics.pendingOrders}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Cards */}
        <View style={styles.navigationSection}>
          <Text style={styles.sectionTitle}>Manage Your Business</Text>

          <NavigationCard
            title="Orders"
            subtitle="Manage incoming orders"
            icon="receipt"
            color="#FF6B35"
            onPress={() => router.push("/vendor/orders")}
            badge={metrics.pendingOrders}
          />

          {(currentBusiness?.type === "RESTAURANT" ||
            vendor?.businessType?.includes("RESTAURANT")) && (
            <NavigationCard
              title="Menu"
              subtitle="Manage your menu items"
              icon="restaurant"
              color="#28A745"
              onPress={() => router.push("/vendor/menu")}
            />
          )}

          {(currentBusiness?.type === "SHOP" ||
            vendor?.businessType?.includes("SHOP")) && (
            <NavigationCard
              title="Products"
              subtitle="Manage your products"
              icon="storefront"
              color="#6F42C1"
              onPress={() => router.push("/vendor/products")}
            />
          )}

          <NavigationCard
            title="Analytics"
            subtitle="View detailed reports"
            icon="analytics"
            color="#20C997"
            onPress={() => {}} // TODO: Add analytics screen
          />

          <NavigationCard
            title="Settings"
            subtitle="Business settings"
            icon="settings"
            color="#6C757D"
            onPress={() => router.push("/vendor/profile")}
          />
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Business Overview</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Orders"
              value={metrics.totalOrders}
              icon="receipt-outline"
              color="#007BFF"
            />
            <MetricCard
              title="Completed Orders"
              value={metrics.completedOrders}
              icon="checkmark-circle-outline"
              color="#28A745"
            />
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(metrics.totalRevenue)}
              icon="cash-outline"
              color="#FFC107"
            />
            <MetricCard
              title="Average Order"
              value={formatCurrency(metrics.averageOrderValue)}
              icon="trending-up-outline"
              color="#6F42C1"
            />
            <MetricCard
              title="Active Businesses"
              value={metrics.activeBusinesses}
              icon="business-outline"
              color="#20C997"
            />
            <MetricCard
              title="Menu Items"
              value={metrics.totalMenuItems}
              icon="list-outline"
              color="#FD7E14"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  activityIndicator: {
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  loadingSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  errorIcon: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    marginTop: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backToAppButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  backToAppText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "capitalize",
  },
  profileButton: {
    padding: 4,
  },
  quickStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  navigationSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  navCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  navCardGradient: {
    padding: 16,
  },
  navCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  navCardIcon: {
    position: "relative",
    marginRight: 16,
  },
  navCardBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  navCardBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  navCardText: {
    flex: 1,
  },
  navCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  navCardSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  metricsSection: {
    padding: 20,
    paddingTop: 0,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  metricCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    margin: 6,
    width: (width - 52) / 2,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
});
