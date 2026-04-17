import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Order, orderApi } from "../lib/api";
import {
  ExpressBadge,
  getExpressPriority,
  isExpressEligible,
} from "./ExpressBadge";

interface AdminConfirmationSystemProps {
  order?: Order;
  driverInfo?: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
  };
  mode: "admin" | "operator";
  onConfirmDelivery: (orderId: string, notes?: string) => void;
  onRejectDelivery: (orderId: string, reason: string) => void;
}

interface PendingConfirmation {
  id: string;
  orderId: string;
  driverName: string;
  driverPhone: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  requestedAt: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "EXPRESS";
  notes?: string;
}

export const AdminConfirmationSystem: React.FC<
  AdminConfirmationSystemProps
> = ({ order, driverInfo, mode, onConfirmDelivery, onRejectDelivery }) => {
  const [pendingConfirmations, setPendingConfirmations] = useState<
    PendingConfirmation[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [selectedConfirmation, setSelectedConfirmation] = useState<
    string | null
  >(null);

  useEffect(() => {
    loadPendingConfirmations();

    // Set up real-time updates
    const interval = setInterval(loadPendingConfirmations, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadPendingConfirmations = async () => {
    try {
      setLoading(true);
      const response = await orderApi.getPendingConfirmations();
      if (response.success) {
        setPendingConfirmations(response.data || []);
      }
    } catch (error) {
      console.error("Failed to load pending confirmations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (
    confirmationId: string,
    orderId: string,
  ) => {
    try {
      setSelectedConfirmation(confirmationId);

      Alert.alert(
        "Confirm Delivery",
        "Are you sure you want to confirm this delivery? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            style: "default",
            onPress: async () => {
              try {
                const response = await orderApi.adminConfirmDelivery(orderId, {
                  confirmationId,
                  adminId:
                    mode === "admin" ? "current_admin" : "current_operator",
                  confirmedAt: new Date().toISOString(),
                  notes: "Manual confirmation by admin due to QR scan failure",
                });

                if (response.success) {
                  onConfirmDelivery(orderId, "Manual admin confirmation");
                  await loadPendingConfirmations();
                  Alert.alert("Success", "Delivery confirmed successfully");
                } else {
                  Alert.alert(
                    "Error",
                    response.message || "Failed to confirm delivery",
                  );
                }
              } catch (error) {
                console.error("Confirmation error:", error);
                Alert.alert("Error", "Failed to confirm delivery");
              } finally {
                setSelectedConfirmation(null);
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error("Confirmation error:", error);
      setSelectedConfirmation(null);
    }
  };

  const handleRejectDelivery = (confirmationId: string, orderId: string) => {
    Alert.prompt(
      "Reject Delivery",
      "Please provide a reason for rejecting this delivery confirmation:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async (reason) => {
            if (!reason || reason.trim().length === 0) {
              Alert.alert("Error", "Please provide a reason for rejection");
              return;
            }

            try {
              setSelectedConfirmation(confirmationId);

              const response = await orderApi.adminRejectDelivery(orderId, {
                confirmationId,
                adminId:
                  mode === "admin" ? "current_admin" : "current_operator",
                rejectedAt: new Date().toISOString(),
                reason: reason.trim(),
              });

              if (response.success) {
                onRejectDelivery(orderId, reason.trim());
                await loadPendingConfirmations();
                Alert.alert("Success", "Delivery confirmation rejected");
              } else {
                Alert.alert(
                  "Error",
                  response.message || "Failed to reject delivery",
                );
              }
            } catch (error) {
              console.error("Rejection error:", error);
              Alert.alert("Error", "Failed to reject delivery");
            } finally {
              setSelectedConfirmation(null);
            }
          },
        },
      ],
      "plain-text",
      "",
      "default",
    );
  };

  const callDriver = async (name: string, phone: string) => {
    try {
      const phoneNumber = phone.replace(/[^\d+]/g, "");
      const url = `tel:${phoneNumber}`;

      const canCall = await Linking.canOpenURL(url);
      if (canCall) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot make phone calls on this device");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to make phone call");
    }
  };

  const callCustomer = async (name: string, phone: string) => {
    try {
      const phoneNumber = phone.replace(/[^\d+]/g, "");
      const url = `tel:${phoneNumber}`;

      const canCall = await Linking.canOpenURL(url);
      if (canCall) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot make phone calls on this device");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to make phone call");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "EXPRESS":
        return "#dc3545";
      case "HIGH":
        return "#fd7e14";
      case "MEDIUM":
        return "#ffc107";
      default:
        return "#6c757d";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "EXPRESS":
        return "zap";
      case "HIGH":
        return "alert-triangle";
      case "MEDIUM":
        return "clock";
      default:
        return "info";
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (diffMins < 1) {
        return "Just now";
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else {
        const diffHours = Math.floor(diffMins / 60);
        return `${diffHours}h ago`;
      }
    } catch {
      return "Unknown";
    }
  };

  const renderConfirmationCard = (confirmation: PendingConfirmation) => {
    const isProcessing = selectedConfirmation === confirmation.id;

    return (
      <View key={confirmation.id} style={styles.confirmationCard}>
        <View style={styles.cardHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>Order #{confirmation.orderId}</Text>
            <View style={styles.priorityBadge}>
              <Feather
                name={getPriorityIcon(confirmation.priority)}
                size={12}
                color={getPriorityColor(confirmation.priority)}
              />
              <Text
                style={[
                  styles.priorityText,
                  { color: getPriorityColor(confirmation.priority) },
                ]}
              >
                {confirmation.priority}
              </Text>
            </View>
          </View>
          <Text style={styles.timeAgo}>
            {formatTime(confirmation.requestedAt)}
          </Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Driver</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{confirmation.driverName}</Text>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() =>
                  callDriver(confirmation.driverName, confirmation.driverPhone)
                }
              >
                <Feather name="phone" size={14} color="#007bff" />
                <Text style={styles.callText}>{confirmation.driverPhone}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>
                {confirmation.customerName}
              </Text>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() =>
                  callCustomer(
                    confirmation.customerName,
                    confirmation.customerPhone,
                  )
                }
              >
                <Feather name="phone" size={14} color="#007bff" />
                <Text style={styles.callText}>
                  {confirmation.customerPhone}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.addressSection}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <Text style={styles.addressText}>
              {confirmation.deliveryAddress}
            </Text>
          </View>

          {confirmation.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{confirmation.notes}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() =>
              handleRejectDelivery(confirmation.id, confirmation.orderId)
            }
            disabled={isProcessing}
          >
            <Feather name="x-circle" size={16} color="#dc3545" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() =>
              handleConfirmDelivery(confirmation.id, confirmation.orderId)
            }
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Feather name="check-circle" size={16} color="white" />
            )}
            <Text style={styles.confirmButtonText}>
              {isProcessing ? "Processing..." : "Confirm"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {mode === "admin" ? "Admin" : "Operations"} Confirmation System
        </Text>
        <Text style={styles.headerSubtitle}>
          Manual delivery confirmations required
        </Text>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadPendingConfirmations}
          disabled={loading}
        >
          <Feather
            name={loading ? "loader" : "refresh-cw"}
            size={16}
            color="#FF6B35"
          />
          <Text style={styles.refreshButtonText}>
            {loading ? "Loading..." : "Refresh"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading && pendingConfirmations.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Loading confirmations...</Text>
          </View>
        ) : pendingConfirmations.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={48} color="#28a745" />
            <Text style={styles.emptyStateTitle}>No Pending Confirmations</Text>
            <Text style={styles.emptyStateSubtitle}>
              All deliveries are verified. Great work!
            </Text>
          </View>
        ) : (
          <View style={styles.confirmationsList}>
            {pendingConfirmations
              .sort((a, b) => {
                // Sort by priority first, then by time
                const priorityOrder = {
                  EXPRESS: 4,
                  HIGH: 3,
                  MEDIUM: 2,
                  LOW: 1,
                };
                const aPriority =
                  priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
                const bPriority =
                  priorityOrder[b.priority as keyof typeof priorityOrder] || 0;

                if (aPriority !== bPriority) {
                  return bPriority - aPriority;
                }

                return (
                  new Date(b.requestedAt).getTime() -
                  new Date(a.requestedAt).getTime()
                );
              })
              .map(renderConfirmationCard)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "white",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#666",
    position: "absolute",
    bottom: 8,
    left: 20,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff2ee",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF6B35",
    gap: 6,
  },
  refreshButtonText: {
    fontSize: 12,
    color: "#FF6B35",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },

  // Loading and Empty States
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },

  // Confirmation Card Styles
  confirmationsList: {
    padding: 16,
  },
  confirmationCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  orderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "white",
    borderRadius: 12,
    gap: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  timeAgo: {
    fontSize: 12,
    color: "#666",
  },

  cardContent: {
    padding: 16,
  },
  contactSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  contactInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  callText: {
    fontSize: 12,
    color: "#007bff",
    fontWeight: "500",
  },

  addressSection: {
    marginBottom: 16,
  },
  addressText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
  },

  notesSection: {
    padding: 12,
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffeaa7",
  },
  notesText: {
    fontSize: 12,
    color: "#856404",
    lineHeight: 16,
  },

  // Card Actions
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: "#fff5f5",
    borderRightWidth: 1,
    borderRightColor: "#e9ecef",
  },
  rejectButtonText: {
    color: "#dc3545",
    fontSize: 14,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#FF6B35",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AdminConfirmationSystem;
