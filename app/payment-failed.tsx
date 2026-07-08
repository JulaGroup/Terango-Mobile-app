import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatExpressDeliveryId } from "@/utils/formatExpressDeliveryId";

export default function PaymentFailedScreen() {
  const router = useRouter();
  const { orderId, deliveryId, paymentId, reason } = useLocalSearchParams();
  const [countdown, setCountdown] = useState(5);

  const goBack = () => {
    if (deliveryId) {
      router.replace({
        pathname: "/custom-delivery/[deliveryId]" as any,
        params: { deliveryId: String(deliveryId) },
      });
    } else if (orderId) {
      router.replace(`/order-details?orderId=${orderId}`);
    } else {
      router.replace("/(tabs)/orders");
    }
  };

  useEffect(() => {
    // Countdown and redirect back
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          goBack();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, deliveryId, router]);

  const handleRetryNow = () => {
    goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle" size={100} color="#EF4444" />
        </View>

        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.message}>
          {reason || "We couldn't process your payment. Please try again."}
        </Text>

        {orderId && (
          <Text style={styles.orderId}>
            Order TG{String(orderId).slice(-4).toUpperCase()}
          </Text>
        )}
        {deliveryId && (
          <Text style={styles.orderId}>
            {formatExpressDeliveryId(String(deliveryId))}
          </Text>
        )}

        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetryNow}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>

        <Text style={styles.redirectText}>
          Auto-redirecting in {countdown} seconds...
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  orderId: {
    fontSize: 18,
    fontWeight: "600",
    color: "#EF4444",
    marginBottom: 30,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PrimaryColor,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    gap: 10,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  redirectText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 10,
  },
});
