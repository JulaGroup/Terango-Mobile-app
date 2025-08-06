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
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { vendorApi, Business } from "@/lib/api";
import { fetchVendorStats, VendorStats } from "@/lib/vendorStatsAPI";

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

export default function VendorManagement() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<VendorStats>({
    totalRevenue: 0,
    todayRevenue: 0,
    totalOrders: 0,
    todayOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalMenuItems: 0,
    activeBusinesses: 0,
    totalBusinesses: 0,
    averageOrderValue: 0,
    topSellingItems: [],
    recentOrders: [],
    dailyStats: [],
  });
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [primaryBusiness, setPrimaryBusiness] = useState<Business | null>(null);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    await fetchUserData();
    await fetchVendorData();
  };

  const fetchUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        const userInfo = parsedUser.user || parsedUser;
        setUser(userInfo);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchVendorData = async () => {
    try {
      setLoading(true);

      console.log("Fetching vendor stats...");

      // Fetch real vendor stats from the API
      const vendorStats = await fetchVendorStats();
      console.log("Fetched vendor stats:", vendorStats);

      setStats(vendorStats);

      // Also fetch vendor data for business list
      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        const userInfo = parsedUser.user || parsedUser;
        const userId = userInfo.id;

        try {
          const vendorData = await vendorApi.getVendorByUserId(userId);

          if (
            vendorData &&
            (vendorData.restaurants ||
              vendorData.shops ||
              vendorData.pharmacies)
          ) {
            // Transform the data to match our Business interface
            const transformedBusinesses: Business[] = [
              ...(vendorData.restaurants?.map((r: any) => ({
                id: r.id,
                name: r.name,
                type: "RESTAURANT" as const,
                isActive: true,
                todayOrders: vendorStats.todayOrders,
                revenue: vendorStats.todayRevenue,
                address: `${r.service?.name} Location`,
                phone: userInfo.phone || "+220 555 0123",
                description: `${r.service?.name} - ${r.service?.type} service`,
                createdAt: r.createdAt || new Date().toISOString(),
                updatedAt: r.updatedAt || new Date().toISOString(),
              })) || []),
              ...(vendorData.shops?.map((s: any) => ({
                id: s.id,
                name: s.name,
                type: "SHOP" as const,
                isActive: true,
                todayOrders: Math.floor(vendorStats.todayOrders * 0.3),
                revenue: Math.floor(vendorStats.todayRevenue * 0.3),
                address: `${s.service?.name} Location`,
                phone: userInfo.phone || "+220 555 0456",
                description: `${s.service?.name} - ${s.service?.type} service`,
                createdAt: s.createdAt || new Date().toISOString(),
                updatedAt: s.updatedAt || new Date().toISOString(),
              })) || []),
              ...(vendorData.pharmacies?.map((p: any) => ({
                id: p.id,
                name: p.name,
                type: "PHARMACY" as const,
                isActive: true,
                todayOrders: Math.floor(vendorStats.todayOrders * 0.2),
                revenue: Math.floor(vendorStats.todayRevenue * 0.2),
                address: `${p.service?.name} Location`,
                phone: userInfo.phone || "+220 555 0789",
                description: `${p.service?.name} - ${p.service?.type} service`,
                createdAt: p.createdAt || new Date().toISOString(),
                updatedAt: p.updatedAt || new Date().toISOString(),
              })) || []),
            ];

            setBusinesses(transformedBusinesses);
            setPrimaryBusiness(transformedBusinesses[0] || null);
          }
        } catch (businessError) {
          console.log("Could not fetch business data, using stats only");
        }
      }
    } catch (error) {
      console.error("Error fetching vendor stats:", error);
      Alert.alert(
        "Error",
        "Failed to load vendor statistics. Please try again."
      );

      // Fallback to mock data if API fails
      await loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = async () => {
    // Realistic restaurant data based on actual business operations
    const mockBusiness: Business = {
      id: "1",
      name: "Taste of Gambia Restaurant",
      type: "RESTAURANT",
      isActive: true,
      todayOrders: 47, // Realistic daily orders for a medium restaurant
      revenue: 24680, // Daily revenue in Dalasi
      address: "Westfield Junction, Serekunda",
      phone: "+220 555 0123",
      description: "Authentic Gambian cuisine with modern twist",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setBusinesses([mockBusiness]);
    setPrimaryBusiness(mockBusiness);

    // Realistic restaurant statistics with full VendorStats interface
    setStats({
      totalRevenue: 740400, // Monthly revenue (24680 * 30)
      todayRevenue: 24680, // Today's revenue
      totalOrders: 1410, // Monthly total (47 * 30)
      todayOrders: 47, // Today's orders
      pendingOrders: 8, // Orders being prepared
      completedOrders: 39, // Completed today
      totalMenuItems: 45, // Total menu items
      activeBusinesses: 1,
      totalBusinesses: 1,
      averageOrderValue: 525, // 24680 / 47
      topSellingItems: [
        { id: "1", name: "Benachin (Jollof Rice)", sales: 15, revenue: 4500 },
        { id: "2", name: "Domoda (Peanut Stew)", sales: 12, revenue: 3600 },
        { id: "3", name: "Yassa Chicken", sales: 10, revenue: 3000 },
        { id: "4", name: "Attaya (Green Tea)", sales: 25, revenue: 1250 },
        { id: "5", name: "Tapalapa Bread", sales: 20, revenue: 1000 },
      ],
      recentOrders: [
        {
          id: "1",
          totalAmount: 750,
          status: "DELIVERED",
          createdAt: new Date().toISOString(),
          customerName: "Fatou Ceesay",
          itemCount: 3,
        },
        {
          id: "2",
          totalAmount: 450,
          status: "PROCESSING",
          createdAt: new Date().toISOString(),
          customerName: "Lamin Jatta",
          itemCount: 2,
        },
        {
          id: "3",
          totalAmount: 920,
          status: "DELIVERED",
          createdAt: new Date().toISOString(),
          customerName: "Awa Saine",
          itemCount: 4,
        },
        {
          id: "4",
          totalAmount: 320,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          customerName: "Omar Bah",
          itemCount: 1,
        },
        {
          id: "5",
          totalAmount: 680,
          status: "DELIVERED",
          createdAt: new Date().toISOString(),
          customerName: "Mariama Faal",
          itemCount: 3,
        },
      ],
      dailyStats: [
        {
          date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          orders: 42,
          revenue: 22100,
        },
        {
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          orders: 38,
          revenue: 20150,
        },
        {
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          orders: 45,
          revenue: 23750,
        },
        {
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          orders: 52,
          revenue: 27300,
        },
        {
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          orders: 41,
          revenue: 21800,
        },
        {
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          orders: 49,
          revenue: 25900,
        },
        {
          date: new Date().toISOString().split("T")[0],
          orders: 47,
          revenue: 24680,
        },
      ],
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVendorData();
    setRefreshing(false);
  };

  const getBusinessIcon = (type: string) => {
    switch (type) {
      case "RESTAURANT":
        return "restaurant-outline";
      case "SHOP":
        return "storefront-outline";
      case "PHARMACY":
        return "medical-outline";
      default:
        return "business-outline";
    }
  };

  const getBusinessColor = (type: string): [string, string] => {
    switch (type) {
      case "RESTAURANT":
        return ["#F97316", "#EA580C"];
      case "SHOP":
        return ["#3B82F6", "#2563EB"];
      case "PHARMACY":
        return ["#10B981", "#059669"];
      default:
        return ["#6B7280", "#4B5563"];
    }
  };

  const getManagementOptions = () => {
    if (!primaryBusiness) return [];

    const businessType = primaryBusiness.type;

    if (businessType === "RESTAURANT") {
      return [
        {
          title: "View Menu",
          subtitle: "Browse your menu items",
          icon: "restaurant-outline",
          colors: ["#F97316", "#EA580C"] as [string, string],
          route: "view-menu-item",
          count: stats.totalMenuItems, // Use real menu items count
          hasAccess: true,
        },
        {
          title: "Live Orders",
          subtitle: "Kitchen orders & status",
          icon: "receipt-outline",
          colors: ["#EF4444", "#DC2626"] as [string, string],
          route: "orders",
          count: stats.pendingOrders,
          hasAccess: true,
        },
        {
          title: "Daily Analytics",
          subtitle: "Sales & customer insights",
          icon: "analytics-outline",
          colors: ["#8B5CF6", "#7C3AED"] as [string, string],
          route: "analytics",
          count: null,
          hasAccess: true,
        },
        {
          title: "Restaurant Settings",
          subtitle: "Update image & profile",
          icon: "settings-outline",
          colors: ["#6B7280", "#4B5563"] as [string, string],
          route: "vendor-management/restaurants",
          count: null,
          hasAccess: true,
        },
      ];
    }

    if (businessType === "SHOP") {
      return [
        {
          title: "View Products",
          subtitle: "Browse your inventory",
          icon: "storefront-outline",
          colors: ["#3B82F6", "#2563EB"] as [string, string],
          route: "shops-view",
          count: null,
          hasAccess: true,
        },
        {
          title: "Orders & Shipping",
          subtitle: "Process customer orders",
          icon: "receipt-outline",
          colors: ["#8B5CF6", "#7C3AED"] as [string, string],
          route: "orders",
          count: stats.pendingOrders,
          hasAccess: true,
        },
        {
          title: "Sales Analytics",
          subtitle: "Track performance",
          icon: "analytics-outline",
          colors: ["#EC4899", "#DB2777"] as [string, string],
          route: "analytics",
          count: null,
          hasAccess: true,
        },
        {
          title: "Shop Settings",
          subtitle: "Manage shop details",
          icon: "settings-outline",
          colors: ["#6B7280", "#4B5563"] as [string, string],
          route: "settings",
          count: null,
          hasAccess: true,
        },
      ];
    }

    if (businessType === "PHARMACY") {
      return [
        {
          title: "View Medicine Inventory",
          subtitle: "Browse stock & prescriptions",
          icon: "medical-outline",
          colors: ["#10B981", "#059669"] as [string, string],
          route: "pharmacies-view",
          count: null,
          hasAccess: true,
        },
        {
          title: "Prescription Orders",
          subtitle: "Manage patient orders",
          icon: "receipt-outline",
          colors: ["#8B5CF6", "#7C3AED"] as [string, string],
          route: "orders",
          count: stats.pendingOrders,
          hasAccess: true,
        },
        {
          title: "Pharmacy Reports",
          subtitle: "Sales & compliance",
          icon: "analytics-outline",
          colors: ["#EC4899", "#DB2777"] as [string, string],
          route: "analytics",
          count: null,
          hasAccess: true,
        },
        {
          title: "Pharmacy Settings",
          subtitle: "License & operations",
          icon: "settings-outline",
          colors: ["#6B7280", "#4B5563"] as [string, string],
          route: "settings",
          count: null,
          hasAccess: true,
        },
      ];
    }

    // Fallback for unknown business types
    return [];
  };

  const BusinessCard = ({ business }: { business: Business }) => (
    <View style={styles.businessCard}>
      <LinearGradient
        colors={getBusinessColor(business.type)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.businessGradient}
      >
        <View style={styles.businessHeader}>
          <View style={styles.businessIconContainer}>
            <Ionicons
              name={getBusinessIcon(business.type)}
              size={28}
              color="#fff"
            />
          </View>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{business.name}</Text>
            <Text style={styles.businessType}>{business.type}</Text>
            {business.address && (
              <Text style={styles.businessAddress}>{business.address}</Text>
            )}
          </View>
          <View
            style={[
              styles.statusDot,
              business.isActive ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        </View>

        <View style={styles.businessStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{business.todayOrders}</Text>
            <Text style={styles.statLabel}>Today Orders</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              D{business.revenue.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {business.isActive ? "Active" : "Inactive"}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {business.description && (
          <Text style={styles.businessDescription}>{business.description}</Text>
        )}
      </LinearGradient>
    </View>
  );

  const ManagementCard = ({
    option,
    index,
  }: {
    option: any;
    index: number;
  }) => (
    <TouchableOpacity
      style={styles.managementCard}
      onPress={() => {
        if (option.route === "view-menu-item" && primaryBusiness) {
          router.push({
            pathname: "/vendor-management/view-menu-item",
            params: {
              vendorType: primaryBusiness.type,
              vendorId: primaryBusiness.id,
            },
          });
        } else {
          router.push(`./${option.route}`);
        }
      }}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={option.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.managementGradient}
      >
        <View style={styles.managementHeader}>
          <View style={styles.managementIconContainer}>
            <Ionicons name={option.icon} size={28} color="#fff" />
          </View>
          {option.count !== null && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{option.count}</Text>
            </View>
          )}
        </View>
        <Text style={styles.managementTitle}>{option.title}</Text>
        <Text style={styles.managementSubtitle}>{option.subtitle}</Text>
        <View style={styles.managementFooter}>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="rgba(255,255,255,0.8)"
          />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>
            Loading your business dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.welcomeText}>
            {primaryBusiness?.type === "RESTAURANT"
              ? "Chef Dashboard"
              : primaryBusiness?.type === "SHOP"
              ? "Store Manager"
              : primaryBusiness?.type === "PHARMACY"
              ? "Pharmacy Admin"
              : "Business Dashboard"}
          </Text>
          <Text style={styles.userName}>
            {primaryBusiness?.name || user?.fullName}
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.appButton}
            onPress={() => router.push("/(tabs)")}
          >
            <Ionicons name="storefront" size={20} color="#10B981" />
            <Text style={styles.appButtonText}>View App</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() =>
              Alert.alert("Notifications", "You have no new notifications")
            }
          >
            <Ionicons name="notifications-outline" size={24} color="#10B981" />
            {stats.pendingOrders > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>
                  {stats.pendingOrders}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#10B981"
            colors={["#10B981"]}
          />
        }
      >
        {/* Business Information Section */}
        {primaryBusiness && (
          <View style={styles.businessSection}>
            <Text style={styles.sectionTitle}>Your Business</Text>
            <BusinessCard business={primaryBusiness} />
          </View>
        )}

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>
            {primaryBusiness?.type === "RESTAURANT"
              ? "Today's Kitchen Performance"
              : primaryBusiness?.type === "SHOP"
              ? "Today's Sales Overview"
              : primaryBusiness?.type === "PHARMACY"
              ? "Today's Pharmacy Stats"
              : "Today's Overview"}
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.statGradient}
              >
                <Ionicons name="cash" size={20} color="#fff" />
                <Text style={styles.statNumber}>
                  D{stats.todayRevenue.toLocaleString()}
                </Text>
                <Text style={styles.statTitle}>Today Revenue</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={["#3B82F6", "#2563EB"]}
                style={styles.statGradient}
              >
                <Ionicons name="receipt" size={20} color="#fff" />
                <Text style={styles.statNumber}>{stats.todayOrders}</Text>
                <Text style={styles.statTitle}>Today Orders</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={["#F59E0B", "#D97706"]}
                style={styles.statGradient}
              >
                <Ionicons name="timer" size={20} color="#fff" />
                <Text style={styles.statNumber}>{stats.pendingOrders}</Text>
                <Text style={styles.statTitle}>Pending Orders</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={["#8B5CF6", "#7C3AED"]}
                style={styles.statGradient}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.statNumber}>{stats.completedOrders}</Text>
                <Text style={styles.statTitle}>Completed</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Additional Business Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Business Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={["#EC4899", "#DB2777"]}
                style={styles.statGradient}
              >
                <Ionicons name="trending-up" size={20} color="#fff" />
                <Text style={styles.statNumber}>
                  D{stats.totalRevenue.toLocaleString()}
                </Text>
                <Text style={styles.statTitle}>Total Revenue</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={["#06B6D4", "#0891B2"]}
                style={styles.statGradient}
              >
                <Ionicons name="list" size={20} color="#fff" />
                <Text style={styles.statNumber}>{stats.totalOrders}</Text>
                <Text style={styles.statTitle}>Total Orders</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={["#84CC16", "#65A30D"]}
                style={styles.statGradient}
              >
                <Ionicons
                  name={
                    primaryBusiness?.type === "RESTAURANT"
                      ? "restaurant"
                      : "storefront"
                  }
                  size={20}
                  color="#fff"
                />
                <Text style={styles.statNumber}>{stats.totalMenuItems}</Text>
                <Text style={styles.statTitle}>
                  {primaryBusiness?.type === "RESTAURANT"
                    ? "Menu Items"
                    : "Products"}
                </Text>
              </LinearGradient>
            </View>
            <View style={styles.statCard}>
              <LinearGradient
                colors={["#8B5CF6", "#7C3AED"]}
                style={styles.statGradient}
              >
                <Ionicons name="star" size={20} color="#fff" />
                <Text style={styles.statNumber}>
                  {stats.topSellingItems.length}
                </Text>
                <Text style={styles.statTitle}>Top Items</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Management Options */}
        <View style={styles.managementSection}>
          <Text style={styles.sectionTitle}>Business Management</Text>
          <View style={styles.managementGrid}>
            {getManagementOptions().map((option, index) => (
              <ManagementCard key={index} option={option} index={index} />
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("./orders")}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="add" size={24} color="#10B981" />
              </View>
              <Text style={styles.quickActionText}>New Order</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("./analytics")}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="analytics" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.quickActionText}>View Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() =>
                Alert.alert("Coming Soon", "Support feature coming soon!")
              }
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="help-circle" size={24} color="#EC4899" />
              </View>
              <Text style={styles.quickActionText}>Get Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 16,
    textAlign: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  topBarLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: "#6b7280",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 2,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  appButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  appButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  businessSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  businessCard: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
  },
  businessGradient: {
    borderRadius: 16,
    padding: 20,
  },
  businessHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  businessIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  businessType: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  businessAddress: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 2,
  },
  businessPhone: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  activeDot: {
    backgroundColor: "#10B981",
  },
  inactiveDot: {
    backgroundColor: "#EF4444",
  },
  businessStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  businessDescription: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },
  statTitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    textAlign: "center",
  },
  managementSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  managementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  managementCard: {
    flex: 1,
    minWidth: "47%",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  managementGradient: {
    padding: 20,
    borderRadius: 16,
    minHeight: 120,
  },
  managementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  managementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 16,
  },
  quickActionButton: {
    alignItems: "center",
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1f2937",
    textAlign: "center",
  },
  managementTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  managementSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  },
  managementFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
  },
});
