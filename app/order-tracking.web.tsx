/**
 * Web version of Order Tracking (no maps)
 * Shows order details without native map component
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { orderApi, Order } from "../lib/api";
import { PrimaryColor } from "@/constants/Colors";
import { LegalConfig } from "@/constants/legal";
export default function OrderTrackingWeb() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state for contact support options
  const [contactModalVisible, setContactModalVisible] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        setError(null);
        const response = await orderApi.getOrderById(orderId as string);
        setOrder(response);
      } catch (error: any) {
        console.error("Error fetching order:", error);
        setError(error.message || "Failed to load order details");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleContactDriver = () => {
    if (order?.driverPhone) {
      Linking.openURL(`tel:${order.driverPhone}`);
    }
  };

  const handleContactSupport = () => {
    if (Platform.OS === "web") {
      setContactModalVisible(true);
    } else {
      Alert.alert("Contact Support", "How would you like to contact support?", [
        {
          text: "Call Support",
          onPress: () => {
            Linking.openURL(`tel:${LegalConfig.SUPPORT_PHONE}`);
          },
        },
        {
          text: "Email Support",
          onPress: () => {
            const subject = `Support Request - Order ${order?.id || "Unknown"}`;
            const body = `Hello TeranGO Support,\n\nI need help with my order ${order?.id || "Unknown"}.\n\nPlease assist me.\n\nThank you.`;
            const mailtoUrl = `mailto:${LegalConfig.SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            Linking.openURL(mailtoUrl);
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]);
    }
  };

  const isPickup = order?.orderType === "PICKUP";

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={PrimaryColor} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.errorContainer}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error || "Order not found"}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => window.location.reload()}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
        </View>

        {/* Mobile App Notice */}
        <View style={styles.mobileNotice}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={isPickup ? "storefront-outline" : "phone-portrait-outline"}
              size={48}
              color={PrimaryColor}
            />
          </View>
          <Text style={styles.noticeTitle}>
            {isPickup
              ? "Pickup Tracking on Mobile"
              : "Real-Time Tracking on Mobile"}
          </Text>
          <Text style={styles.noticeText}>
            {isPickup
              ? "Track your pickup order status and see the restaurant location on our iOS and Android apps."
              : "Live map tracking with driver location is available exclusively on our iOS and Android apps."}
          </Text>
          <Text style={styles.noticeSubtext}>
            Download TeranGO app for the full tracking experience!
          </Text>
        </View>

        {/* Order Status */}
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <Ionicons name="checkmark-circle" size={32} color={PrimaryColor} />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Order Status</Text>
              <Text style={styles.statusValue}>
                {order?.status || "Processing"}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order ID</Text>
            <Text style={styles.detailValue}>#{orderId}</Text>
          </View>
          {order?.estimatedDeliveryTime && !isPickup && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Estimated Delivery</Text>
              <Text style={styles.detailValue}>
                {order.estimatedDeliveryTime}
              </Text>
            </View>
          )}
          {order?.deliveryAddress && !isPickup && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivery Address</Text>
              <Text style={[styles.detailValue, styles.addressText]}>
                {order.deliveryAddress}
              </Text>
            </View>
          )}
          {isPickup && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pickup Location</Text>
              <Text style={[styles.detailValue, styles.addressText]}>
                {order?.restaurant?.name ||
                  order?.shop?.name ||
                  order?.pharmacy?.name ||
                  "Restaurant"}
              </Text>
            </View>
          )}
          {isPickup && order?.pickupInstructions && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pickup Instructions</Text>
              <Text style={[styles.detailValue, styles.addressText]}>
                {order.pickupInstructions}
              </Text>
            </View>
          )}
        </View>

        {/* Contact Options */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Need Help?</Text>
          <Text style={styles.contactSubtext}>
            {isPickup
              ? "Contact the restaurant if you have questions about your pickup order"
              : "Our team is here to ensure smooth delivery"}
          </Text>

          {order?.driverPhone && !isPickup && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContactDriver}
            >
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.contactButtonText}>Contact Driver</Text>
            </TouchableOpacity>
          )}

          {isPickup && order?.restaurant?.phone && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => Linking.openURL(`tel:${order.restaurant.phone}`)}
            >
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.contactButtonText}>Contact Restaurant</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.contactButton, styles.supportButton]}
            onPress={handleContactSupport}
          >
            <Ionicons name="headset" size={20} color={PrimaryColor} />
            <Text style={[styles.contactButtonText, styles.supportButtonText]}>
              Contact Support
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Download */}
        <View style={styles.downloadCard}>
          <Ionicons name="download" size={24} color={PrimaryColor} />
          <Text style={styles.downloadTitle}>Get the Mobile App</Text>
          <Text style={styles.downloadText}>
            Track deliveries in real-time, chat with drivers, and enjoy the full
            TeranGO experience.
          </Text>
          <View style={styles.downloadButtons}>
            <TouchableOpacity style={styles.storeButton}>
              <Ionicons name="logo-apple" size={20} color="#333" />
              <Text style={styles.storeButtonText}>App Store</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.storeButton}>
              <Ionicons name="logo-google-playstore" size={20} color="#333" />
              <Text style={styles.storeButtonText}>Play Store</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Contact Support Modal for Web */}
      {Platform.OS === "web" && contactModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contact Support</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setContactModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalMessage}>
              How would you like to contact support?
            </Text>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setContactModalVisible(false);
                  Linking.openURL(`tel:${LegalConfig.SUPPORT_PHONE}`);
                }}
              >
                <Ionicons name="call" size={20} color="#666" />
                <Text style={styles.modalButtonTextSecondary}>
                  Call Support
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  setContactModalVisible(false);
                  const subject = `Support Request - Order ${order?.id || "Unknown"}`;
                  const body = `Hello TeranGO Support,\n\nI need help with my order ${order?.id || "Unknown"}.\n\nPlease assist me.\n\nThank you.`;
                  const mailtoUrl = `mailto:${LegalConfig.SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  Linking.openURL(mailtoUrl);
                }}
              >
                <Ionicons name="mail" size={20} color="#fff" />
                <Text style={styles.modalButtonTextPrimary}>Email Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  mobileNotice: {
    margin: 16,
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${PrimaryColor}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  noticeText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 24,
  },
  noticeSubtext: {
    fontSize: 14,
    color: PrimaryColor,
    fontWeight: "600",
    textAlign: "center",
  },
  card: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusInfo: {
    marginLeft: 16,
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: PrimaryColor,
    textTransform: "capitalize",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  addressText: {
    textAlign: "left",
  },
  contactSubtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PrimaryColor,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  supportButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: PrimaryColor,
  },
  supportButtonText: {
    color: PrimaryColor,
  },
  downloadCard: {
    margin: 16,
    marginTop: 0,
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  downloadTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
    marginBottom: 8,
  },
  downloadText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  downloadButtons: {
    flexDirection: "row",
    gap: 12,
  },
  storeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  storeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#EF4444",
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    position: "fixed" as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 0,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalMessage: {
    fontSize: 16,
    color: "#666",
    padding: 20,
    paddingTop: 0,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  modalButtonPrimary: {
    backgroundColor: PrimaryColor,
  },
  modalButtonSecondary: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalButtonTextPrimary: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonTextSecondary: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
