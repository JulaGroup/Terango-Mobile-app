import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  on as socketOn,
  off as socketOff,
  isSocketConnected,
} from "@/services/SocketService";
import { orderApi } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";

/**
 * Global listener that pops a "Pay Now" prompt the moment a vendor ACCEPTS an
 * unpaid order — wherever the customer is in the app. This complements the push
 * notification: users who have the app open (but never see the push) still get
 * a clear, in-app nudge that it's time to pay.
 */
export default function PaymentPromptListener() {
  const [prompt, setPrompt] = useState<{
    visible: boolean;
    orderId: string | null;
    vendorName: string;
  }>({ visible: false, orderId: null, vendorName: "" });

  // Orders we've already prompted for this session, so we never nag twice.
  const promptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let attached = false;

    const handler = async (data: any) => {
      const orderId = data?.orderId ? String(data.orderId) : null;
      const status = String(data?.status || data?.newStatus || "").toUpperCase();
      // Only fire the moment the vendor accepts.
      if (!orderId || status !== "ACCEPTED") return;
      if (promptedRef.current.has(orderId)) return;

      try {
        // Confirm it's genuinely accepted-and-unpaid before nudging.
        const order: any = await orderApi.getOrderById(orderId);
        const orderStatus = String(order?.status || "").toUpperCase();
        const payStatus = String(order?.paymentStatus || "").toUpperCase();
        if (orderStatus !== "ACCEPTED") return; // status already moved on
        if (payStatus === "PAID" || payStatus === "SUCCEEDED") return; // already paid

        promptedRef.current.add(orderId);
        const vendorName =
          order?.restaurant?.name ||
          order?.shop?.name ||
          order?.pharmacy?.name ||
          "The vendor";
        setPrompt({ visible: true, orderId, vendorName });
      } catch {
        /* ignore — order-details is still authoritative if they open it */
      }
    };

    const trySubscribe = () => {
      if (attached || !isSocketConnected()) return;
      socketOn("orderStatusUpdate", handler);
      socketOn("order:statusUpdated", handler);
      attached = true;
    };

    trySubscribe();
    // The socket may connect slightly after this mounts, so keep trying until it does.
    const iv = setInterval(trySubscribe, 3000);

    return () => {
      clearInterval(iv);
      if (attached) {
        socketOff("orderStatusUpdate", handler);
        socketOff("order:statusUpdated", handler);
      }
    };
  }, []);

  const dismiss = () =>
    setPrompt({ visible: false, orderId: null, vendorName: "" });

  const goPay = () => {
    const id = prompt.orderId;
    dismiss();
    if (id) {
      router.push({
        pathname: "/order-details",
        params: { orderId: id, from: "acceptance" },
      });
    }
  };

  return (
    <Modal
      visible={prompt.visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={44} color="#10B981" />
          </View>
          <Text style={styles.title}>Order accepted 🎉</Text>
          <Text style={styles.message}>
            {prompt.vendorName} accepted your order. Pay now so they can start
            preparing it.
          </Text>
          <TouchableOpacity style={styles.payButton} onPress={goPay}>
            <Ionicons name="card-outline" size={18} color="#fff" />
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.laterButton} onPress={dismiss}>
            <Text style={styles.laterButtonText}>Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: { marginBottom: 8 },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PrimaryColor,
    borderRadius: 14,
    paddingVertical: 14,
    width: "100%",
  },
  payButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  laterButton: { paddingVertical: 12, marginTop: 4 },
  laterButtonText: { color: "#9CA3AF", fontSize: 14, fontWeight: "600" },
});
