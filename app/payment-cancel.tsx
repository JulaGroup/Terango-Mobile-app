import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatExpressDeliveryId } from "@/utils/formatExpressDeliveryId";

export default function PaymentCancelledScreen() {
  const router = useRouter();
  const { orderId, deliveryId, paymentId } = useLocalSearchParams();

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

  const [countdown, setCountdown] = useState(5);

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

  const handleTryAgain = () => {
    goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle" size={100} color="#F59E0B" />
        </View>

        <Text style={styles.title}>Payment Cancelled</Text>
        <Text style={styles.message}>
          Your payment was not completed. You can try again or use a different
          payment method.
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

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleTryAgain}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              deliveryId
                ? router.replace("/custom-delivery" as any)
                : router.replace("/(tabs)/orders")
            }
          >
            <Text style={styles.secondaryButtonText}>
              {deliveryId ? "View Deliveries" : "View Orders"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.countdown}>
          Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 8,
  },
  orderId: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 32,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 300,
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: PrimaryColor,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  countdown: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
