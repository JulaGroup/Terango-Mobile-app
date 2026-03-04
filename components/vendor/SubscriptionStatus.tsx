import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { SecureStorage } from "@/utils/secureStorage";
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
    null,
  );
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [loading, setLoading] = useState(true);
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
      // Get token from SecureStore (where it's actually stored)
      const token = await SecureStorage.getItem("token");

      console.log("🔍 [SUBSCRIPTION] Token found:", token ? "YES" : "NO");
      console.log(
        "🔍 [SUBSCRIPTION] Token preview:",
        token?.substring(0, 20) + "...",
      );
      console.log(
        "🔍 [SUBSCRIPTION] API URL:",
        `${API_URL}/api/subscriptions/my-subscription`,
      );

      if (!token) {
        setError("Not authenticated");
        return;
      }

      // Use the correct vendor subscription endpoint
      const response = await axios.get(
        `${API_URL}/api/subscriptions/my-subscription`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("🔍 [SUBSCRIPTION] Response:", response.data);

      if (response.data.subscription) {
        setSubscription(response.data.subscription);
      } else {
        setSubscription(null);
      }
    } catch (error: any) {
      console.error(
        "❌ [SUBSCRIPTION] Failed to fetch subscription:",
        error.response?.data || error.message,
      );
      console.error("❌ [SUBSCRIPTION] Status:", error.response?.status);
      // Check if it's a 404 (no subscription) vs actual error
      if (
        error.response?.status === 404 ||
        error.response?.data?.message?.includes("No active subscription")
      ) {
        setSubscription(null);
        setError(null);
      } else {
        setError(
          error.response?.data?.message || "Failed to load subscription",
        );
      }
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <View style={styles.bannerContainer}>
        <ActivityIndicator size="small" color="#ff6b00" />
        <Text style={styles.loadingText}>Loading subscription...</Text>
      </View>
    );
  }

  if (!subscription) {
    return (
      <View style={styles.bannerContainer}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle-outline" size={18} color="#ff6b00" />
        </View>
        <View style={styles.bannerBody}>
          <Text style={styles.bannerTitle}>No Active Subscription</Text>
          <Text style={styles.bannerSub}>Contact admin to subscribe</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#CCCCCC" />
      </View>
    );
  }

  const isExpiringSoon = timeLeft && timeLeft.days < 7;
  const isExpired = timeLeft && timeLeft.days === 0 && timeLeft.hours === 0;

  const timeLabel = isExpired
    ? "Expired"
    : timeLeft
      ? `${timeLeft.days}d ${String(timeLeft.hours).padStart(2, "0")}h ${String(timeLeft.minutes).padStart(2, "0")}m left`
      : "";

  return (
    <View
      style={[styles.bannerContainer, isExpiringSoon && styles.bannerWarning]}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={getPackageIcon(subscription.package.name) as any}
          size={18}
          color="#ff6b00"
        />
      </View>
      <View style={styles.bannerBody}>
        <View style={styles.bannerRow}>
          <Text style={styles.bannerTitle}>
            {subscription.package.displayName}
          </Text>
          {subscription.isTrial && (
            <View style={styles.trialPill}>
              <Text style={styles.trialPillText}>TRIAL</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.bannerSub,
            isExpiringSoon && !isExpired && styles.bannerSubWarning,
            isExpired && styles.bannerSubExpired,
          ]}
        >
          {timeLabel}
        </Text>
      </View>
      <View
        style={[
          styles.statusPill,
          subscription.status === "ACTIVE" || subscription.status === "TRIAL"
            ? styles.statusActive
            : styles.statusInactive,
        ]}
      >
        <Text style={styles.statusPillText}>{subscription.status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  bannerWarning: {
    borderWidth: 1,
    borderColor: "#ff6b00",
    backgroundColor: "#FFF8F4",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#FFF4EC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  bannerBody: {
    flex: 1,
    gap: 2,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  bannerSub: {
    fontSize: 12,
    color: "#999",
  },
  bannerSubWarning: {
    color: "#ff6b00",
    fontWeight: "600",
  },
  bannerSubExpired: {
    color: "#EF4444",
    fontWeight: "600",
  },
  trialPill: {
    backgroundColor: "#FFF4EC",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  trialPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#ff6b00",
    letterSpacing: 0.5,
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  statusActive: {
    backgroundColor: "#ECFDF5",
  },
  statusInactive: {
    backgroundColor: "#FEF2F2",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 13,
    color: "#999",
  },
});
