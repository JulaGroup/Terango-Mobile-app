import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStorage from "expo-secure-store";

export default function PaymentSuccess() {
  const router = useRouter();
  const { orderId, paymentId } = useLocalSearchParams();
  const [countdown, setCountdown] = useState(3);
  const [isConfirming, setIsConfirming] = useState(true);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);

  useEffect(() => {
    // Confirm payment success with backend
    const confirmPayment = async () => {
      if (!orderId) {
        setConfirmationError("Order ID is missing");
        setIsConfirming(false);
        return;
      }

      try {
        const token = await SecureStorage.getItem("token");
        if (!token) {
          console.warn("No auth token found, proceeding without authentication");
        }

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/orders/${orderId}/confirm-payment`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({ paymentId }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to confirm payment");
        }

        const data = await response.json();
        console.log("Payment confirmed successfully:", data);
        setIsConfirming(false);
      } catch (error: any) {
        console.error("Payment confirmation failed:", error);
        setConfirmationError(error.message || "Failed to confirm payment");
        setIsConfirming(false);
        // Still proceed with redirect even if confirmation fails
      }
    };

    confirmPayment();
  }, [orderId, paymentId]);

  useEffect(() => {
    // Countdown and redirect to order details (only after confirmation attempt)
    if (isConfirming) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (orderId) {
            router.replace(`/order-details?orderId=${orderId}`);
          } else {
            router.replace("/(tabs)/orders");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderId, router, isConfirming]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={100} color="#10B981" />
        </View>

        <Text style={styles.title}>Payment Successful! 🎉</Text>
        <Text style={styles.message}>
          Your payment has been processed successfully.
        </Text>

        {orderId && (
          <Text style={styles.orderId}>Order #{String(orderId).slice(-6)}</Text>
        )}

        {isConfirming && (
          <View style={styles.confirmationContainer}>
            <ActivityIndicator size="small" color={PrimaryColor} />
            <Text style={styles.confirmationText}>Confirming payment...</Text>
          </View>
        )}

        {confirmationError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              ⚠️ Payment confirmation delayed: {confirmationError}
            </Text>
            <Text style={styles.errorSubtext}>
              Your order will still be processed. Check your orders page for updates.
            </Text>
          </View>
        )}

        {!isConfirming && !confirmationError && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={PrimaryColor} />
            <Text style={styles.redirectText}>
              Redirecting in {countdown} seconds...
            </Text>
          </View>
        )}
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
    color: PrimaryColor,
    marginBottom: 30,
  },
  confirmationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  confirmationText: {
    fontSize: 14,
    color: "#6B7280",
  },
  errorContainer: {
    backgroundColor: "#FEF3C7",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  errorText: {
    fontSize: 14,
    color: "#92400E",
    fontWeight: "500",
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 12,
    color: "#78350F",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
  },
  redirectText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
