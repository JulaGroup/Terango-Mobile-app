import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/constants/config";
import { useOrderPolling } from "@/hooks/useOrderPolling";

export default function OrderPending() {
  const [localOrderId, setLocalOrderId] = useState<string | undefined>(
    undefined
  );
  const router = useRouter();
  // try to obtain orderId from expo-router hooks if available, else fall back to router params
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // dynamic attempt to useLocalSearchParams if present
        const maybe = await import("expo-router");
        const fn = (maybe as any).useLocalSearchParams;
        if (typeof fn === "function") {
          const params = fn();
          if (mounted && params?.orderId)
            setLocalOrderId(params.orderId as string);
        }
      } catch {
        // ignore dynamic import errors
      }

      // fallback: router params
      if (mounted && !localOrderId) {
        const rp = (router as any).params || (router as any).query || {};
        if (rp?.orderId) setLocalOrderId(rp.orderId as string);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, localOrderId]);
  const [order, setOrder] = useState<any>(null);

  const onUpdate = useCallback(
    (o: any) => {
      setOrder(o);
      if (o.status === "PROCESSING") {
        // navigate to order details / success
        router.replace({
          pathname: "/order-details",
          params: { orderId: o.id },
        });
      }
      if (o.status === "CANCELLED") {
        Alert.alert(
          "Payment Cancelled",
          "Your payment was cancelled. You can retry."
        );
      }
    },
    [router]
  );

  const { stop, loading } = useOrderPolling(localOrderId as string, onUpdate);

  useEffect(() => {
    // Save viewed order id locally
    if (localOrderId) {
      SecureStore.setItemAsync("lastOrderId", localOrderId as string).catch(
        async () => {
          try {
            // @ts-ignore
            const AS = (
              await import("@react-native-async-storage/async-storage")
            ).default;
            await AS.setItem("lastOrderId", localOrderId as string);
          } catch {}
        }
      );
    }
  }, [localOrderId]);

  const checkNow = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) return;
      const res = await fetch(`${API_URL}/api/orders/${localOrderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrder(data);
      if (data.status === "PROCESSING") {
        router.replace({
          pathname: "/order-details",
          params: { orderId: data.id },
        });
      }
    } catch (err) {
      console.error("Check now error", err);
      Alert.alert("Error", "Failed to check order status. Try again.");
    }
  };

  if (!localOrderId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No order specified</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Pending</Text>
      <Text style={styles.subtitle}>Order ID: {localOrderId}</Text>
      <Text style={styles.amount}>
        Status: {order?.status || "PENDING"} {loading ? "(checking...)" : ""}
      </Text>

      <TouchableOpacity style={styles.button} onPress={checkNow}>
        <Text style={styles.buttonText}>Check status</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondary]}
        onPress={() => {
          stop();
          router.replace("/");
        }}
      >
        <Text style={styles.buttonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F8F9FA",
  },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: "#6B7280", marginBottom: 12 },
  amount: { fontSize: 18, fontWeight: "600", marginBottom: 24 },
  button: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  secondary: { backgroundColor: "#6B7280" },
});
