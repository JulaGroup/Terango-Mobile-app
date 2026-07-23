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
import SubscriptionStatus from "@/components/vendor/SubscriptionStatus";

const { width } = Dimensions.get("window");

export default function VendorDashboard() {
  const router = useRouter();
  const { vendor, currentBusiness, isVendorLoading, refreshVendorData, isVendorAdmin } =
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
      setIsLoading(false);
      setHasAttemptedLoad(true);
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
        vendor.businesses,
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
    // Only fetch dashboard data if vendor exists and we haven't loaded yet
    if (vendor && !hasAttemptedLoad) {
      console.log("🚀 Initial dashboard data fetch");
      fetchDashboardData();
    } else if (!vendor && !isVendorLoading) {
      // If no vendor and not loading, mark as attempted
      console.log("⚠️ No vendor and not loading, marking as attempted");
      setHasAttemptedLoad(true);
      setIsLoading(false);
    }
  }, [vendor, isVendorLoading, hasAttemptedLoad]);

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
    onPress,
  }: {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={styles.metricCard}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.metricIconWrap}>
        <Ionicons name={icon} size={20} color={PrimaryColor} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </TouchableOpacity>
  );

  // Navigation cards for main features
  const NavigationCard = ({
    title,
    subtitle,
    icon,
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
      <View style={styles.navCardContent}>
        <View style={styles.navCardIcon}>
          <Ionicons name={icon} size={22} color={PrimaryColor} />
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
        <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
      </View>
    </TouchableOpacity>
  );

  // Show loading spinner while vendor data is being fetched AND hasn't attempted to load yet
  if ((isVendorLoading || isLoading) && !hasAttemptedLoad) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <LinearGradient
            colors={["#1A1A1A", "#2D2D2D"]}
            style={styles.loadingSpinner}
          >
            <Ionicons name="storefront" size={40} color={PrimaryColor} />
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

  // Only show error if vendor data failed to load AND we've attempted to load AND not actively refreshing
  if (!vendor && !isVendorLoading && !refreshing && hasAttemptedLoad) {
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
      <LinearGradient colors={["#1A1A1A", "#2D2D2D"]} style={styles.header}>
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

          {/* Quick Stats — cashiers don't see revenue */}
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{metrics.todayOrders}</Text>
              <Text style={styles.statLabel}>Today&apos;s Orders</Text>
            </View>
            {isVendorAdmin && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatCurrency(metrics.todayRevenue)}
                </Text>
                <Text style={styles.statLabel}>Today&apos;s Revenue</Text>
              </View>
            )}
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
        {/* Subscription Status Section */}
        {/* <View style={styles.subscriptionSection}>
          <SubscriptionStatus />
        </View> */}

        {/* Navigation Cards */}
        <View style={styles.navigationSection}>
          <Text style={styles.sectionTitle}>Manage Your Business</Text>
          <NavigationCard
            title="Orders"
            subtitle="Manage incoming orders"
            icon="receipt-outline"
            color={PrimaryColor}
            onPress={() => router.push("/vendor/orders")}
            badge={metrics.pendingOrders}
          />
          Product & Menu management are now handled in the Complete Admin Panel.
          Hiding these navigation cards in the mobile vendor dashboard to avoid
          duplicate editing surfaces. Re-enable here if you want in-app editing.
          {/* {(currentBusiness?.type === "RESTAURANT" ||
            vendor?.businessType?.includes("RESTAURANT")) && (
            <NavigationCard
              title="Menu"
              subtitle="Manage your menu items"
              icon="restaurant-outline"
              color={PrimaryColor}
              onPress={() => router.push("/vendor/menu")}
            />
          )} */}
          {/* {(currentBusiness?.type === "SHOP" ||
            vendor?.businessType?.includes("SHOP")) && (
            <NavigationCard
              title="Products"
              subtitle="Manage your products"
              icon="storefront-outline"
              color={PrimaryColor}
              onPress={() => router.push("/vendor/products")}
            />
          )} */}
          {/* <NavigationCard
            title="Analytics"
            subtitle="View detailed reports"
            icon="bar-chart-outline"
            color={PrimaryColor}
            onPress={() => router.push("/vendor/earnings")}
          /> */}
          {/* Business settings should be managed from the Complete Admin Panel.
            Commented out in the mobile vendor dashboard to centralize management. */}
          {/* <NavigationCard
            title="Settings"
            subtitle="Business settings"
            icon="settings-outline"
            color={PrimaryColor}
            onPress={() => router.push("/vendor/profile")}
          /> */}
        </View>

        {/* Metrics Grid — business overview is admin-only; cashiers do orders only */}
        {isVendorAdmin && (
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Business Overview</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Orders"
              value={metrics.totalOrders}
              icon="receipt-outline"
            />
            <MetricCard
              title="Completed"
              value={metrics.completedOrders}
              icon="checkmark-circle-outline"
            />
            {/* <MetricCard
              title="Total Revenue"
              value={formatCurrency(metrics.totalRevenue)}
              icon="cash-outline"
            />
            <MetricCard
              title="Avg. Order"
              value={formatCurrency(metrics.averageOrderValue)}
              icon="trending-up-outline"
            />
            <MetricCard
              title="Businesses"
              value={metrics.activeBusinesses}
              icon="business-outline"
            />
            <MetricCard
              title="Menu Items"
              value={metrics.totalMenuItems}
              icon="list-outline"
            /> */}
          </View>
        </View>
        )}
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
    backgroundColor: "#1A1A1A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
    color: "#888",
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
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
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
    fontSize: 22,
    fontWeight: "700",
    color: "white",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.55)",
    textTransform: "capitalize",
    letterSpacing: 0.3,
  },
  profileButton: {
    padding: 4,
  },
  quickStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: PrimaryColor,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  scrollContainer: {
    flex: 1,
  },
  navigationSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#999",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subscriptionSection: {
    paddingTop: 12,
    paddingBottom: 0,
  },
  navCard: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  navCardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  navCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFF4EC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    position: "relative",
  },
  navCardBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: PrimaryColor,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  navCardBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
  navCardText: {
    flex: 1,
  },
  navCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  navCardSubtitle: {
    fontSize: 12,
    color: "#999",
  },
  metricsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  metricCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    margin: 5,
    width: (width - 52) / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    alignItems: "flex-start",
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#FFF4EC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
});
