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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { orderApi, Order } from "../lib/api";
import { PrimaryColor } from "@/constants/Colors";

export default function OrderTrackingWeb() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const response = await orderApi.getOrderById(orderId as string);
        setOrder(response.data);
      } catch (error) {
        console.error("Error fetching order:", error);
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
    Linking.openURL("tel:+2203839999"); // TeranGO support number
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={PrimaryColor} />
      </View>
    );
  }

  return (
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
            name="phone-portrait-outline"
            size={48}
            color={PrimaryColor}
          />
        </View>
        <Text style={styles.noticeTitle}>Real-Time Tracking on Mobile</Text>
        <Text style={styles.noticeText}>
          Live map tracking with driver location is available exclusively on our
          iOS and Android apps.
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
        {order?.estimatedDeliveryTime && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Delivery</Text>
            <Text style={styles.detailValue}>
              {order.estimatedDeliveryTime}
            </Text>
          </View>
        )}
        {order?.deliveryAddress && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery Address</Text>
            <Text style={[styles.detailValue, styles.addressText]}>
              {order.deliveryAddress}
            </Text>
          </View>
        )}
      </View>

      {/* Contact Options */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Need Help?</Text>
        <Text style={styles.contactSubtext}>
          Our team is here to ensure smooth delivery
        </Text>

        {order?.driverPhone && (
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactDriver}
          >
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>Contact Driver</Text>
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
});
