import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { orderApi } from "@/lib/api";

/**
 * Minimal fallback screen — only reached on cold-launch or if the deep-link
 * bypasses _layout.tsx (rare). Just confirms payment with the server (idempotent)
 * then routes to Home. The toast in _layout.tsx fires via the deep-link handler;
 * order creation (checkout) is confirmed by order-details, not by this.
 */
export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { orderId, paymentId, error } = useLocalSearchParams<{
    orderId?: string;
    paymentId?: string;
    error?: string;
  }>();

  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      if (error) {
        router.replace({
          pathname: "/payment-cancel",
          params: { orderId: orderId || "", reason: "payment_error" },
        });
        return;
      }

      // Idempotent confirm — backend already updated DB via redirect route
      if (orderId) {
        try {
          await orderApi.confirmPaymentSuccess(
            orderId,
            (paymentId as string) || undefined,
          );
          console.log("[PaymentSuccess] confirmed (fallback)");
        } catch {
          console.warn("[PaymentSuccess] confirm failed (non-fatal)");
        }
      }

      // Go home — _layout deep-link handler already fired the toast
      router.replace({ pathname: "/" });
    })();
  }, [error, orderId, paymentId, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={80} color="#10B981" />
        <Text style={styles.title}>Payment Confirmed</Text>
        <ActivityIndicator
          size="small"
          color={PrimaryColor}
          style={styles.spinner}
        />
        <Text style={styles.subtitle}>Returning to TeranGO…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
  spinner: { marginTop: 24 },
});
