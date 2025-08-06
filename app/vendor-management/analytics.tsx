import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

interface AnalyticsData {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  orders: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    growth: number;
  };
  businessPerformance: {
    name: string;
    type: string;
    revenue: number;
    orders: number;
    rating: number;
  }[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month"
  >("week");
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    revenue: {
      today: 1240,
      thisWeek: 8650,
      thisMonth: 32400,
      growth: 15.2,
    },
    orders: {
      today: 23,
      thisWeek: 156,
      thisMonth: 642,
      growth: 8.7,
    },
    customers: {
      total: 1247,
      new: 89,
      returning: 546,
      growth: 12.3,
    },
    businessPerformance: [
      {
        name: "Taste of Gambia",
        type: "RESTAURANT",
        revenue: 18500,
        orders: 312,
        rating: 4.8,
      },
      {
        name: "Tech Hub Store",
        type: "SHOP",
        revenue: 9200,
        orders: 186,
        rating: 4.6,
      },
      {
        name: "HealthCare Plus",
        type: "PHARMACY",
        revenue: 4700,
        orders: 144,
        rating: 4.9,
      },
    ],
  });

  const periods = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
  ];

  const getRevenueForPeriod = () => {
    switch (selectedPeriod) {
      case "today":
        return analytics.revenue.today;
      case "week":
        return analytics.revenue.thisWeek;
      case "month":
        return analytics.revenue.thisMonth;
      default:
        return analytics.revenue.thisWeek;
    }
  };

  const getOrdersForPeriod = () => {
    switch (selectedPeriod) {
      case "today":
        return analytics.orders.today;
      case "week":
        return analytics.orders.thisWeek;
      case "month":
        return analytics.orders.thisMonth;
      default:
        return analytics.orders.thisWeek;
    }
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
          <Text style={styles.headerTitle}>Analytics & Reports</Text>
          <Text style={styles.headerSubtitle}>
            Track your business performance
          </Text>
        </View>

        <TouchableOpacity style={styles.exportButton}>
          <Ionicons name="download-outline" size={24} color="#10B981" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        <View style={styles.periodSection}>
          <View style={styles.periodSelector}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.key && styles.activePeriodButton,
                ]}
                onPress={() => setSelectedPeriod(period.key as any)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period.key &&
                      styles.activePeriodButtonText,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>

          <View style={styles.metricsGrid}>
            {/* Revenue Card */}
            <View style={styles.metricCard}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.metricGradient}
              >
                <View style={styles.metricHeader}>
                  <Ionicons name="trending-up" size={24} color="#fff" />
                  <View style={styles.growthBadge}>
                    <Ionicons name="arrow-up" size={12} color="#10B981" />
                    <Text style={styles.growthText}>
                      +{analytics.revenue.growth}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.metricValue}>
                  D{getRevenueForPeriod().toLocaleString()}
                </Text>
                <Text style={styles.metricLabel}>Revenue</Text>
              </LinearGradient>
            </View>

            {/* Orders Card */}
            <View style={styles.metricCard}>
              <LinearGradient
                colors={["#3B82F6", "#2563EB"]}
                style={styles.metricGradient}
              >
                <View style={styles.metricHeader}>
                  <Ionicons name="receipt" size={24} color="#fff" />
                  <View style={styles.growthBadge}>
                    <Ionicons name="arrow-up" size={12} color="#10B981" />
                    <Text style={styles.growthText}>
                      +{analytics.orders.growth}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.metricValue}>{getOrdersForPeriod()}</Text>
                <Text style={styles.metricLabel}>Orders</Text>
              </LinearGradient>
            </View>

            {/* Customers Card */}
            <View style={styles.metricCard}>
              <LinearGradient
                colors={["#8B5CF6", "#7C3AED"]}
                style={styles.metricGradient}
              >
                <View style={styles.metricHeader}>
                  <Ionicons name="people" size={24} color="#fff" />
                  <View style={styles.growthBadge}>
                    <Ionicons name="arrow-up" size={12} color="#10B981" />
                    <Text style={styles.growthText}>
                      +{analytics.customers.growth}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.metricValue}>
                  {analytics.customers.total}
                </Text>
                <Text style={styles.metricLabel}>Total Customers</Text>
              </LinearGradient>
            </View>

            {/* Average Order Value */}
            <View style={styles.metricCard}>
              <LinearGradient
                colors={["#F59E0B", "#D97706"]}
                style={styles.metricGradient}
              >
                <View style={styles.metricHeader}>
                  <Ionicons name="calculator" size={24} color="#fff" />
                  <View style={styles.growthBadge}>
                    <Ionicons name="arrow-up" size={12} color="#10B981" />
                    <Text style={styles.growthText}>+5.4%</Text>
                  </View>
                </View>
                <Text style={styles.metricValue}>
                  D{Math.round(getRevenueForPeriod() / getOrdersForPeriod())}
                </Text>
                <Text style={styles.metricLabel}>Avg Order Value</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Customer Insights */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Customer Insights</Text>

          <View style={styles.insightsCard}>
            <View style={styles.insightRow}>
              <View style={styles.insightItem}>
                <Text style={styles.insightValue}>
                  {analytics.customers.new}
                </Text>
                <Text style={styles.insightLabel}>New Customers</Text>
                <View style={styles.insightBar}>
                  <View style={[styles.insightProgress, { width: "65%" }]} />
                </View>
              </View>

              <View style={styles.insightItem}>
                <Text style={styles.insightValue}>
                  {analytics.customers.returning}
                </Text>
                <Text style={styles.insightLabel}>Returning Customers</Text>
                <View style={styles.insightBar}>
                  <View style={[styles.insightProgress, { width: "85%" }]} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Business Performance */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionTitle}>Business Performance</Text>

          {analytics.businessPerformance.map((business, index) => (
            <View key={index} style={styles.businessCard}>
              <LinearGradient
                colors={getBusinessColor(business.type)}
                style={styles.businessGradient}
              >
                <View style={styles.businessHeader}>
                  <View style={styles.businessIconContainer}>
                    <Ionicons
                      name={getBusinessIcon(business.type)}
                      size={24}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.businessInfo}>
                    <Text style={styles.businessName}>{business.name}</Text>
                    <Text style={styles.businessType}>{business.type}</Text>
                  </View>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>{business.rating}</Text>
                  </View>
                </View>

                <View style={styles.businessMetrics}>
                  <View style={styles.businessMetric}>
                    <Text style={styles.businessMetricValue}>
                      D{business.revenue.toLocaleString()}
                    </Text>
                    <Text style={styles.businessMetricLabel}>Revenue</Text>
                  </View>
                  <View style={styles.businessMetric}>
                    <Text style={styles.businessMetricValue}>
                      {business.orders}
                    </Text>
                    <Text style={styles.businessMetricLabel}>Orders</Text>
                  </View>
                  <View style={styles.businessMetric}>
                    <Text style={styles.businessMetricValue}>
                      D{Math.round(business.revenue / business.orders)}
                    </Text>
                    <Text style={styles.businessMetricLabel}>Avg Value</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          ))}
        </View>

        {/* Coming Soon Features */}
        <View style={styles.comingSoonSection}>
          <Text style={styles.sectionTitle}>More Analytics Coming Soon</Text>
          <View style={styles.comingSoonGrid}>
            <View style={styles.comingSoonCard}>
              <Ionicons name="bar-chart-outline" size={32} color="#9CA3AF" />
              <Text style={styles.comingSoonTitle}>Sales Charts</Text>
              <Text style={styles.comingSoonDescription}>
                Detailed revenue & sales trends
              </Text>
            </View>

            <View style={styles.comingSoonCard}>
              <Ionicons name="pie-chart-outline" size={32} color="#9CA3AF" />
              <Text style={styles.comingSoonTitle}>Category Breakdown</Text>
              <Text style={styles.comingSoonDescription}>
                Performance by product category
              </Text>
            </View>

            <View style={styles.comingSoonCard}>
              <Ionicons name="location-outline" size={32} color="#9CA3AF" />
              <Text style={styles.comingSoonTitle}>Delivery Analytics</Text>
              <Text style={styles.comingSoonDescription}>
                Delivery performance metrics
              </Text>
            </View>

            <View style={styles.comingSoonCard}>
              <Ionicons name="time-outline" size={32} color="#9CA3AF" />
              <Text style={styles.comingSoonTitle}>Time Insights</Text>
              <Text style={styles.comingSoonDescription}>
                Peak hours & trends
              </Text>
            </View>
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
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  periodSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  activePeriodButton: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  activePeriodButtonText: {
    color: "#1f2937",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  metricsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: "47%",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  metricGradient: {
    padding: 16,
    borderRadius: 16,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  growthBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  growthText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  insightsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  insightsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  insightRow: {
    flexDirection: "row",
    gap: 20,
  },
  insightItem: {
    flex: 1,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  insightBar: {
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
  },
  insightProgress: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 2,
  },
  performanceSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  businessCard: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  businessGradient: {
    padding: 20,
    borderRadius: 16,
  },
  businessHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  businessIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  businessType: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  businessMetrics: {
    flexDirection: "row",
    gap: 20,
  },
  businessMetric: {
    alignItems: "center",
  },
  businessMetricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  businessMetricLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  comingSoonSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  comingSoonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  comingSoonCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  comingSoonTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
  },
  comingSoonDescription: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
});
