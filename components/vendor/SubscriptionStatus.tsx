import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/constants/config";

interface SubscriptionPackage {
  id: string;
  name: string;
  displayName: string;
  price: number;
  currency: string;
  maxProducts: number | null;
  priorityListing: boolean;
  featuredBadge: boolean;
  topPlacement: boolean;
  supportLevel: string;
}

interface VendorSubscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  isTrial: boolean;
  package: SubscriptionPackage;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<VendorSubscription | null>(
    null
  );
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  useEffect(() => {
    if (!subscription) return;

    const calculateTimeLeft = () => {
      const endDate = new Date(subscription.endDate);
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [subscription]);

  const fetchSubscription = async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await axios.get(`${API_URL}/api/subscriptions/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.subscription) {
        setSubscription(response.data.subscription);
      } else {
        setSubscription(null);
      }
    } catch (error: any) {
      console.error(
        "Failed to fetch subscription:",
        error.response?.data || error.message
      );
      // Check if it's a 404 (no subscription) vs actual error
      if (
        error.response?.status === 404 ||
        error.response?.data?.message?.includes("No active subscription")
      ) {
        setSubscription(null);
        setError(null);
      } else {
        setError(
          error.response?.data?.message || "Failed to load subscription"
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscription();
  };

  const getPackageColor = (packageName: string) => {
    switch (packageName) {
      case "Bantaba":
        return "#3B82F6"; // Blue
      case "Kaira":
        return "#10B981"; // Green
      case "Jollof":
        return "#F59E0B"; // Orange
      case "Premium":
        return "#8B5CF6"; // Purple
      default:
        return "#6B7280"; // Gray
    }
  };

  const getPackageIcon = (packageName: string) => {
    switch (packageName) {
      case "Bantaba":
        return "cube-outline";
      case "Kaira":
        return "trending-up-outline";
      case "Jollof":
        return "ribbon-outline";
      case "Premium":
        return "crown-outline";
      default:
        return "cube-outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "TRIAL":
        return "#10B981"; // Green
      case "EXPIRED":
        return "#EF4444"; // Red
      case "CANCELLED":
        return "#6B7280"; // Gray
      case "PAST_DUE":
        return "#F59E0B"; // Orange
      default:
        return "#6B7280";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading subscription...</Text>
      </View>
    );
  }

  if (!subscription) {
    return (
      <View style={styles.centerContainer}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.centerContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.noSubscriptionCard}>
            <Ionicons name="alert-circle-outline" size={64} color="#F59E0B" />
            <Text style={styles.noSubscriptionTitle}>
              No Active Subscription
            </Text>
            <Text style={styles.noSubscriptionText}>
              Subscribe to a plan to unlock premium features and grow your
              business
            </Text>
            <TouchableOpacity style={styles.subscribeButton}>
              <Text style={styles.subscribeButtonText}>
                Contact Admin for Subscription
              </Text>
              <Ionicons name="mail-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const packageColor = getPackageColor(subscription.package.name);
  const statusColor = getStatusColor(subscription.status);
  const isExpiringSoon = timeLeft && timeLeft.days < 7;
  const isExpired = timeLeft && timeLeft.days === 0 && timeLeft.hours === 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Main Subscription Card */}
      <View
        style={[styles.card, { borderColor: packageColor, borderWidth: 2 }]}
      >
        <View style={[styles.cardHeader, { backgroundColor: packageColor }]}>
          <View style={styles.headerLeft}>
            <Ionicons
              name={getPackageIcon(subscription.package.name) as any}
              size={32}
              color="white"
            />
            <View style={styles.headerTextContainer}>
              <Text style={styles.packageName}>
                {subscription.package.displayName}
              </Text>
              {subscription.isTrial && (
                <View style={styles.trialBadge}>
                  <Ionicons name="gift" size={12} color="white" />
                  <Text style={styles.trialBadgeText}>FREE TRIAL</Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{subscription.status}</Text>
          </View>
        </View>

        {/* Countdown Timer */}
        {timeLeft && !isExpired && (
          <View
            style={[
              styles.timerContainer,
              isExpiringSoon && styles.timerExpiring,
            ]}
          >
            <Text
              style={[
                styles.timerLabel,
                isExpiringSoon && styles.timerLabelExpiring,
              ]}
            >
              {isExpiringSoon
                ? "⚠️ Subscription expires in:"
                : "Time remaining:"}
            </Text>
            <View style={styles.timerRow}>
              <View style={styles.timerBox}>
                <Text
                  style={[
                    styles.timerValue,
                    isExpiringSoon && styles.timerValueExpiring,
                  ]}
                >
                  {timeLeft.days}
                </Text>
                <Text
                  style={[
                    styles.timerUnit,
                    isExpiringSoon && styles.timerUnitExpiring,
                  ]}
                >
                  Days
                </Text>
              </View>
              <Text
                style={[
                  styles.timerColon,
                  isExpiringSoon && styles.timerColonExpiring,
                ]}
              >
                :
              </Text>
              <View style={styles.timerBox}>
                <Text
                  style={[
                    styles.timerValue,
                    isExpiringSoon && styles.timerValueExpiring,
                  ]}
                >
                  {String(timeLeft.hours).padStart(2, "0")}
                </Text>
                <Text
                  style={[
                    styles.timerUnit,
                    isExpiringSoon && styles.timerUnitExpiring,
                  ]}
                >
                  Hours
                </Text>
              </View>
              <Text
                style={[
                  styles.timerColon,
                  isExpiringSoon && styles.timerColonExpiring,
                ]}
              >
                :
              </Text>
              <View style={styles.timerBox}>
                <Text
                  style={[
                    styles.timerValue,
                    isExpiringSoon && styles.timerValueExpiring,
                  ]}
                >
                  {String(timeLeft.minutes).padStart(2, "0")}
                </Text>
                <Text
                  style={[
                    styles.timerUnit,
                    isExpiringSoon && styles.timerUnitExpiring,
                  ]}
                >
                  Mins
                </Text>
              </View>
              <Text
                style={[
                  styles.timerColon,
                  isExpiringSoon && styles.timerColonExpiring,
                ]}
              >
                :
              </Text>
              <View style={styles.timerBox}>
                <Text
                  style={[
                    styles.timerValue,
                    isExpiringSoon && styles.timerValueExpiring,
                  ]}
                >
                  {String(timeLeft.seconds).padStart(2, "0")}
                </Text>
                <Text
                  style={[
                    styles.timerUnit,
                    isExpiringSoon && styles.timerUnitExpiring,
                  ]}
                >
                  Secs
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Subscription Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Start Date</Text>
              <Text style={styles.detailValue}>
                {new Date(subscription.startDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>End Date</Text>
              <Text style={styles.detailValue}>
                {new Date(subscription.endDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={20} color="#6B7280" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>
                {subscription.package.currency}{" "}
                {subscription.package.price.toLocaleString()}/month
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Features Card */}
      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>Your Plan Features</Text>
        <View style={styles.featuresGrid}>
          {subscription.package.maxProducts && (
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>
                {subscription.package.maxProducts === null
                  ? "Unlimited products"
                  : `${subscription.package.maxProducts} products`}
              </Text>
            </View>
          )}
          {subscription.package.priorityListing && (
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Priority listing</Text>
            </View>
          )}
          {subscription.package.featuredBadge && (
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Featured badge</Text>
            </View>
          )}
          {subscription.package.topPlacement && (
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Top placement</Text>
            </View>
          )}
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.featureText}>
              {subscription.package.supportLevel} support
            </Text>
          </View>
        </View>
      </View>

      {/* Renew/Upgrade Buttons */}
      {isExpiringSoon && (
        <View style={styles.actionContainer}>
          <TouchableOpacity style={[styles.actionButton, styles.renewButton]}>
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.actionButtonText}>Renew Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.upgradeButton]}>
            <Ionicons name="arrow-up-circle" size={20} color="white" />
            <Text style={styles.actionButtonText}>Upgrade Plan</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  noSubscriptionCard: {
    margin: 16,
    padding: 32,
    backgroundColor: "white",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 400,
    width: "90%",
    alignSelf: "center",
  },
  noSubscriptionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  noSubscriptionText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  subscribeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  card: {
    margin: 16,
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTextContainer: {
    gap: 6,
  },
  packageName: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  trialBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "white",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
  },
  timerContainer: {
    padding: 20,
    backgroundColor: "#F3F4F6",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  timerExpiring: {
    backgroundColor: "#FEF3C7",
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
  },
  timerLabelExpiring: {
    color: "#D97706",
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  timerBox: {
    alignItems: "center",
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 70,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  timerValueExpiring: {
    color: "#D97706",
  },
  timerUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 2,
  },
  timerUnitExpiring: {
    color: "#92400E",
  },
  timerColon: {
    fontSize: 24,
    fontWeight: "700",
    color: "#6B7280",
  },
  timerColonExpiring: {
    color: "#D97706",
  },
  detailsContainer: {
    padding: 20,
    gap: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  featuresCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  featuresGrid: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 15,
    color: "#374151",
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
    margin: 16,
    marginTop: 0,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  renewButton: {
    backgroundColor: "#10B981",
  },
  upgradeButton: {
    backgroundColor: "#8B5CF6",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "white",
  },
});
