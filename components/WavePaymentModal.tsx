import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  Platform,
} from "react-native";
import { API_URL } from "@/constants/config";
import { SecureStorage } from "@/utils/secureStorage";

// Minimal uuidv4 generator (no deps)
const uuidv4 = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

type OrderData = {
  customerName: string;
  customerPhone: string;
  address: string;
  totalAmount: number;
  currency?: string;
  userProfileId?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  orderData: OrderData;
  onStarted: (orderId: string) => void;
};

export default function WavePaymentModal({
  visible,
  onClose,
  orderData,
  onStarted,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<{
    network: string;
    accountNumber: string;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      loadPaymentMethod();
    }
  }, [visible]);

  const loadPaymentMethod = async () => {
    try {
      const paymentMethods = await SecureStorage.getItem("paymentMethods");
      if (paymentMethods) {
        const data = JSON.parse(paymentMethods);
        const defaultMethod = data.default;
        const accountNumber = data.methods[defaultMethod];
        if (accountNumber) {
          setPaymentMethod({
            network: defaultMethod,
            accountNumber,
          });
        }
      }
    } catch (e) {
      console.log("Failed to load payment method:", e);
    }
  };

  const persistIdempotency = async (key: string, payload: any) => {
    const storageKey = `checkout.idempotency.${key}`;
    try {
      await SecureStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.log("SecureStore persist idempotency failed, falling back:", e);
      try {
        // @ts-ignore
        const AS = (await import("@react-native-async-storage/async-storage"))
          .default;
        await AS.setItem(storageKey, JSON.stringify(payload));
      } catch (err) {
        console.log("Failed to persist idempotencyKey to AsyncStorage:", err);
      }
    }
  };

  const handlePay = async () => {
    if (!paymentMethod) {
      Alert.alert(
        "No Payment Method",
        "Please set up a payment method in your profile.",
      );
      return;
    }

    setLoading(true);
    const idempotencyKey = uuidv4();

    try {
      const token = await SecureStorage.getItem("token");
      if (!token) {
        Alert.alert("Unauthorized", "Please log in and try again.");
        setLoading(false);
        return;
      }

      const body = {
        orderData: {
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          address: orderData.address,
          totalAmount: orderData.totalAmount,
          currency: orderData.currency || "GMD",
          userProfileId: orderData.userProfileId,
        },
        payment: {
          network: paymentMethod.network,
          account_number: paymentMethod.accountNumber,
        },
        idempotencyKey,
      };

      // Persist the idempotency attempt until final confirmation
      await persistIdempotency(idempotencyKey, {
        orderData: body.orderData,
        status: "initiated",
        createdAt: new Date().toISOString(),
      });

      const res = await fetch(`${API_URL}/api/checkout/direct-charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 201 || res.status === 202) {
        const data = await res.json();
        const { orderId, paymentId, paymentLink } = data;

        // Save mapping so retries reuse the same idempotencyKey if needed
        await persistIdempotency(idempotencyKey, {
          orderId,
          paymentId,
          createdAt: new Date().toISOString(),
        });

        // Notify parent
        if (orderId) onStarted(orderId);

        // If paymentLink is present (legacy), open it. For instant checkout, there won't be one.
        if (paymentLink) {
          try {
            if (Platform.OS === "web") {
              // On web, open payment link in new window
              window.open(paymentLink, "_blank");
            } else {
              // On mobile, use deep link
              await Linking.openURL(paymentLink);
            }
          } catch (e) {
            console.log("Failed to open payment link:", e);
          }
        }

        // Close modal; UI will show order-created state
        onClose();
      } else if (res.status === 400) {
        const err = await res.json();
        Alert.alert("Payment Error", err.error || "Invalid request");
      } else if (res.status === 401) {
        Alert.alert("Unauthorized", "Please log in and try again.");
      } else {
        // 500 or other
        const text = await res.text();
        console.log("Server error response:", text);
        Alert.alert("Server error", "Server error — try again.");
      }
    } catch (err: any) {
      console.error("Wave payment error:", err);
      Alert.alert(
        "Network error",
        "Failed to contact server. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.centered}>
        <View style={styles.container}>
          <Text style={styles.title}>Confirm Payment</Text>
          <Text style={styles.subtitle}>Review your payment details</Text>

          {paymentMethod ? (
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Payment Method:</Text>
              <Text style={styles.paymentValue}>
                {paymentMethod.network.toUpperCase()}
              </Text>
              <Text style={styles.paymentLabel}>Account:</Text>
              <Text style={styles.paymentValue}>
                {paymentMethod.accountNumber}
              </Text>
            </View>
          ) : (
            <Text style={styles.errorText}>
              No payment method configured. Please set up in profile.
            </Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancel}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pay,
                (!paymentMethod || loading) && styles.payDisabled,
              ]}
              onPress={handlePay}
              disabled={!paymentMethod || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payText}>
                  Pay with{" "}
                  {paymentMethod
                    ? paymentMethod.network.toUpperCase()
                    : "Mobile"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  container: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#6B7280", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  cancel: { padding: 12 },
  cancelText: { color: "#6B7280", fontWeight: "600" },
  pay: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  payDisabled: {
    backgroundColor: "#D1D5DB",
  },
  payText: { color: "#fff", fontWeight: "700" },
  paymentInfo: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  paymentLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  errorText: {
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 16,
  },
});
