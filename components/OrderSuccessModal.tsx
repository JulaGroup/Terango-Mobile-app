import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { useRouter } from "expo-router";

type OrderSuccessModalProps = {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  orderData?: any;
};

export default function OrderSuccessModal({
  visible,
  onClose,
  orderId,
  orderData,
}: OrderSuccessModalProps) {
  console.log(
    "[OrderSuccessModal] Rendered with visible:",
    visible,
    "orderId:",
    orderId
  );

  const router = useRouter();

  const handleViewOrder = () => {
    onClose();
    router.push(`/order-details?orderId=${orderId}`);
  };

  const handleViewOrders = () => {
    onClose();
    // Don't navigate if already on orders page
    // Just close the modal
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Ionicons name="checkmark-circle" size={60} color="#10B981" />
            <Text style={styles.title}>Order Placed Successfully! 🎉</Text>
            <Text style={styles.subtitle}>
              Your order has been confirmed and is being prepared.
            </Text>
          </View>

          <View style={styles.content}>
            {orderData && (
              <View style={styles.orderInfo}>
                <Text style={styles.orderId}>Order #{orderId.slice(-8)}</Text>
                {orderData.totalAmount && (
                  <Text style={styles.amount}>
                    Total: ₦{orderData.totalAmount.toLocaleString()}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleViewOrders}
            >
              <Text style={styles.secondaryButtonText}>View All Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleViewOrder}
            >
              <Text style={styles.primaryButtonText}>View Order Details</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: "90%",
    maxWidth: 400,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  content: {
    marginBottom: 24,
  },
  orderInfo: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  orderId: {
    fontSize: 18,
    fontWeight: "600",
    color: PrimaryColor,
    marginBottom: 4,
  },
  amount: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: PrimaryColor,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: PrimaryColor,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: PrimaryColor,
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
  },
});
