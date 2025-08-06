import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";
import {
  VendorApplicationAPI,
  VendorApplication,
} from "@/lib/vendorApplicationAPI";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface VendorStats {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  activeProducts: number;
  rating: number;
}

export default function VendorDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<VendorStats>({
    totalOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    activeProducts: 0,
    rating: 0,
  });
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [applicationsStats, setApplicationsStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    waitingList: 0,
  });

  useEffect(() => {
    // TODO: Fetch real vendor stats from API
    setStats({
      totalOrders: 156,
      todayOrders: 8,
      totalRevenue: 12500,
      todayRevenue: 350,
      activeProducts: 25,
      rating: 4.6,
    });

    // Check user data and fetch vendor applications
    checkUserRoleAndFetchApplications();
  }, []);

  const checkUserRoleAndFetchApplications = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");

      console.log("User ID:", userId);
      console.log("Token exists:", !!token);

      // For now, let's try to fetch applications and see what happens
      fetchVendorApplications();
    } catch (error) {
      console.error("Error checking user role:", error);
    }
  };

  const fetchVendorApplications = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log("No token found");
        return;
      }

      console.log("Fetching vendor applications...");

      const [applicationsResponse, statsResponse] = await Promise.all([
        VendorApplicationAPI.getAllApplications(token, { limit: 10 }),
        VendorApplicationAPI.getApplicationStats(token),
      ]);

      console.log("Applications response:", applicationsResponse);
      console.log("Stats response:", statsResponse);

      setApplications(applicationsResponse.applications || []);
      setApplicationsStats(statsResponse);
      setIsAdmin(true); // User is admin if API calls succeed
    } catch (error: any) {
      console.error("Error fetching vendor applications:", error);

      // If it's a 403 error (not admin), don't show error alert
      if (
        error.message?.includes("Admin access required") ||
        error.message?.includes("Forbidden")
      ) {
        console.log("User is not admin - hiding vendor applications section");
        setIsAdmin(false);
        // Set empty data for non-admin users
        setApplications([]);
        setApplicationsStats({
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          waitingList: 0,
        });
      } else {
        Alert.alert("Error", "Failed to load vendor applications");
      }
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleApplicationStatusUpdate = async (
    applicationId: string,
    status: "APPROVED" | "REJECTED" | "WAITING_LIST",
    reviewNotes?: string
  ) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      await VendorApplicationAPI.updateApplicationStatus(
        applicationId,
        { status, reviewNotes },
        token
      );

      // Refresh the applications list
      fetchVendorApplications();

      Alert.alert(
        "Success",
        `Application ${status.toLowerCase()} successfully`
      );
    } catch (error) {
      console.error("Error updating application status:", error);
      Alert.alert("Error", "Failed to update application status");
    }
  };

  const showApplicationsModal = () => {
    if (applications.length === 0) {
      Alert.alert(
        "No Applications",
        "There are no vendor applications at the moment."
      );
      return;
    }

    const applicationsList = applications
      .slice(0, 5)
      .map((app) => `• ${app.businessName} (${app.status})`)
      .join("\n");

    Alert.alert(
      "Recent Vendor Applications",
      `${applicationsList}\n\nTotal: ${applicationsStats.total} applications\nPending: ${applicationsStats.pending}\nApproved: ${applicationsStats.approved}\nRejected: ${applicationsStats.rejected}`,
      [
        { text: "Close" },
        {
          text: "View All",
          onPress: () =>
            Alert.alert(
              "Coming Soon",
              "Full applications management coming soon!"
            ),
        },
      ]
    );
  };

  const dashboardItems = [
    // Only show vendor applications for admins
    ...(isAdmin
      ? [
          {
            icon: "people-outline",
            title: "Vendor Applications",
            subtitle: `Review ${applicationsStats.pending} pending applications`,
            onPress: () => {
              // Show applications modal or navigate to applications page
              showApplicationsModal();
            },
            color: "#F59E0B",
            badge:
              applicationsStats.pending > 0
                ? applicationsStats.pending
                : undefined,
          },
        ]
      : []),
    {
      icon: "restaurant-outline",
      title: "View Restaurants",
      subtitle: "View your restaurant listings and menu",
      onPress: () => router.push("/vendor-management/restaurants"),
      color: "#FF6B35",
    },
    {
      icon: "storefront-outline",
      title: "View Shops",
      subtitle: "View your shop listings and products",
      onPress: () => router.push("/vendor-management/shops"),
      color: "#8B5CF6",
    },
    {
      icon: "medical-outline",
      title: "View Pharmacies",
      subtitle: "View your pharmacy listings and items",
      onPress: () => router.push("/vendor-management/pharmacies"),
      color: "#10B981",
    },
    {
      icon: "receipt-outline",
      title: "Orders",
      subtitle: "View and manage incoming orders",
      onPress: () => router.push("/vendor-management/orders"),
      color: "#22C55E",
    },
    {
      icon: "analytics-outline",
      title: "Analytics",
      subtitle: "Track your sales and performance",
      onPress: () => router.push("/vendor-management/analytics"),
      color: "#3B82F6",
    },
    {
      icon: "settings-outline",
      title: "Settings",
      subtitle: "Update your business information",
      onPress: () => router.push("/vendor-management/settings"),
      color: "#8B5CF6",
    },
    {
      icon: "wallet-outline",
      title: "Payments",
      subtitle: "Manage earnings and payouts",
      onPress: () =>
        Alert.alert("Coming Soon", "Payments feature coming soon!"),
      color: "#F59E0B",
    },
    {
      icon: "help-circle-outline",
      title: "Support",
      subtitle: "Get help and contact support",
      onPress: () => Alert.alert("Coming Soon", "Support feature coming soon!"),
      color: "#EF4444",
    },
  ];

  const StatCard = ({ title, value, subtitle, icon, color }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
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
          <Text style={styles.headerTitle}>Vendor Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome back!</Text>
        </View>

        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#1F2937" />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Overview</Text>

          <View style={styles.statsGrid}>
            <StatCard
              title="Today's Orders"
              value={stats.todayOrders}
              subtitle="orders received"
              icon="receipt-outline"
              color="#22C55E"
            />
            <StatCard
              title="Today's Revenue"
              value={`D${stats.todayRevenue}`}
              subtitle="total earnings"
              icon="wallet-outline"
              color="#F59E0B"
            />
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              title="Total Orders"
              value={stats.totalOrders}
              subtitle="all time"
              icon="trending-up-outline"
              color="#3B82F6"
            />
            <StatCard
              title="Store Rating"
              value={`${stats.rating}★`}
              subtitle="customer rating"
              icon="star-outline"
              color="#FF6B35"
            />
          </View>

          {/* Vendor Applications Stats - Only show for admins */}
          {isAdmin && (
            <View style={styles.statsGrid}>
              <StatCard
                title="Pending Applications"
                value={applicationsStats.pending}
                subtitle="awaiting review"
                icon="time-outline"
                color="#F59E0B"
              />
              <StatCard
                title="Total Applications"
                value={applicationsStats.total}
                subtitle="all applications"
                icon="people-outline"
                color="#8B5CF6"
              />
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionsGrid}>
            {dashboardItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={item.onPress}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: `${item.color}15` },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={28}
                    color={item.color}
                  />
                  {item.badge && (
                    <View style={styles.actionBadge}>
                      <Text style={styles.actionBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionTitle}>{item.title}</Text>
                <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
                <View style={styles.actionArrow}>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* MVP Notice */}
        <View style={styles.mvpNotice}>
          <View style={styles.mvpIcon}>
            <Ionicons name="construct-outline" size={32} color={PrimaryColor} />
          </View>
          <Text style={styles.mvpTitle}>MVP Dashboard</Text>
          <Text style={styles.mvpText}>
            This is a basic vendor dashboard. More features and functionalities
            will be added in future updates. Thank you for being part of the
            TeranGo vendor community!
          </Text>
        </View>
      </ScrollView>
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1F2937",
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    position: "relative",
  },
  actionBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  actionBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  actionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  actionSubtitle: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
  },
  actionArrow: {
    marginLeft: 8,
  },
  mvpNotice: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: `${PrimaryColor}20`,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  mvpIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${PrimaryColor}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  mvpTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 8,
  },
  mvpText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
