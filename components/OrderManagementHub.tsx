import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Order, orderApi } from "../lib/api";
import { UnifiedLocationPicker } from "./UnifiedLocationPicker";
import { OrderListWithBadges } from "./OrderListWithBadges";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { DriverVerificationScreen } from "./DriverVerificationScreen";
import { AdminConfirmationSystem } from "./AdminConfirmationSystem";

interface OrderManagementHubProps {
  userType: "customer" | "driver" | "admin" | "operator";
  userId: string;
}

export const OrderManagementHub: React.FC<OrderManagementHubProps> = ({
  userType,
  userId,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "express" | "regular">(
    "all",
  );

  // Mock driver info - in real app this would come from auth context
  const driverInfo = {
    id: userId,
    name: "Driver Name",
    phone: "+220 123 4567",
    vehicleType: "MOTORCYCLE",
    vehicleNumber: "BJL-456",
  };

  useEffect(() => {
    loadOrders();
  }, [userType, userId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      let response;

      switch (userType) {
        case "customer":
          response = await orderApi.getOrders();
          break;
        case "driver":
          response = await orderApi.getDriverOrders();
          break;
        case "admin":
        case "operator":
          response = await orderApi.getAllOrders();
          break;
        default:
          response = [];
      }

      if (Array.isArray(response)) {
        setOrders(response);
      } else if (response.orders) {
        setOrders(response.orders);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleCreateOrder = async (orderData: any) => {
    try {
      setLoading(true);
      const response = await orderApi.createOrder(orderData);

      if (response.id) {
        // Order created successfully
        setShowCreateOrder(false);
        await loadOrders();
        Alert.alert("Success", "Order created successfully!");

        // Show QR code if applicable
        if (response.qrCode) {
          setSelectedOrder(response);
          setShowQRModal(true);
        }
      }
    } catch (error) {
      console.error("Failed to create order:", error);
      Alert.alert("Error", "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderPress = (order: Order) => {
    setSelectedOrder(order);

    if (userType === "driver") {
      setShowVerificationModal(true);
    } else if (userType === "customer" && order.qrCode) {
      setShowQRModal(true);
    } else {
      // Show order details or other actions
      Alert.alert(
        `Order #${order.id}`,
        `Status: ${order.status}\nCustomer: ${order.customerName}\nTotal: D${order.totalPrice.toFixed(2)}`,
        [
          { text: "Close", style: "cancel" },
          {
            text: "View Details",
            onPress: () => {
              /* Navigate to detail screen */
            },
          },
        ],
      );
    }
  };

  const handleQRPress = (order: Order) => {
    setSelectedOrder(order);
    setShowQRModal(true);
  };

  const handleVerificationComplete = async (result: any) => {
    if (result.success) {
      setShowVerificationModal(false);
      await loadOrders();
      Alert.alert("Success", "Delivery verified successfully!");
    }
  };

  const handleRequestAdminConfirmation = async () => {
    if (!selectedOrder) return;

    try {
      const response = await orderApi.requestAdminConfirmation(
        selectedOrder.id,
        userId,
        "QR scan failed - customer unable to show code",
      );

      if (response.success) {
        setShowVerificationModal(false);
        Alert.alert(
          "Request Sent",
          "Admin confirmation request sent. You will be notified once confirmed.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to request admin confirmation");
    }
  };

  const handleAdminConfirmDelivery = async (
    orderId: string,
    notes?: string,
  ) => {
    try {
      await orderApi.adminConfirmDelivery(orderId, userId, {
        reason: "QR_FAILED",
        notes: notes || "Manual confirmation by admin",
        verificationMethod: "PHONE_CALL",
        customerConfirmed: true,
      });

      await loadOrders();
    } catch (error) {
      console.error("Admin confirmation error:", error);
    }
  };

  const handleAdminRejectDelivery = async (orderId: string, reason: string) => {
    try {
      await orderApi.adminRejectDelivery(orderId, {
        confirmationId: `conf_${orderId}_${Date.now()}`,
        adminId: userId,
        rejectedAt: new Date().toISOString(),
        reason,
      });

      await loadOrders();
    } catch (error) {
      console.error("Admin rejection error:", error);
    }
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {["all", "express", "regular"].map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterButton,
            filterType === filter && styles.activeFilterButton,
          ]}
          onPress={() => setFilterType(filter as any)}
        >
          {filter === "express" && (
            <Feather
              name="zap"
              size={14}
              color={filterType === filter ? "white" : "#FF6B35"}
            />
          )}
          <Text
            style={[
              styles.filterButtonText,
              filterType === filter && styles.activeFilterButtonText,
            ]}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderActionButton = () => {
    if (userType === "customer") {
      return (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateOrder(true)}
        >
          <Feather name="plus" size={24} color="white" />
        </TouchableOpacity>
      );
    }

    if (userType === "admin" || userType === "operator") {
      return (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAdminPanel(true)}
        >
          <Feather name="settings" size={24} color="white" />
        </TouchableOpacity>
      );
    }

    return null;
  };

  const getTitle = () => {
    switch (userType) {
      case "customer":
        return "My Orders";
      case "driver":
        return "Delivery Orders";
      case "admin":
        return "Admin Dashboard";
      case "operator":
        return "Operations Center";
      default:
        return "Orders";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        {(userType === "admin" || userType === "operator") && (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => setShowAdminPanel(true)}
          >
            <Feather name="shield" size={20} color="#FF6B35" />
            <Text style={styles.adminButtonText}>Admin Panel</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderFilterButtons()}

      <OrderListWithBadges
        orders={orders}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showQRCodes={userType === "customer"}
        onOrderPress={handleOrderPress}
        onQRPress={handleQRPress}
        filterType={filterType}
        title=""
        emptyMessage={
          filterType === "express"
            ? "No Express orders found"
            : "No orders found"
        }
      />

      {renderActionButton()}

      {/* Create Order Modal */}
      <Modal
        visible={showCreateOrder}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Order</Text>
            <TouchableOpacity onPress={() => setShowCreateOrder(false)}>
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <UnifiedLocationPicker
            onSubmit={handleCreateOrder}
            onCancel={() => setShowCreateOrder(false)}
            loading={loading}
          />
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal visible={showQRModal} animationType="slide" transparent={true}>
        <View style={styles.qrModalContainer}>
          <View style={styles.qrModalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowQRModal(false)}
            >
              <Feather name="x" size={24} color="white" />
            </TouchableOpacity>
            {selectedOrder && (
              <QRCodeDisplay
                order={selectedOrder}
                size="large"
                showActions={true}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Driver Verification Modal */}
      <Modal
        visible={showVerificationModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {selectedOrder && (
          <DriverVerificationScreen
            order={selectedOrder}
            driverInfo={driverInfo}
            onVerificationComplete={handleVerificationComplete}
            onRequestAdminConfirmation={handleRequestAdminConfirmation}
          />
        )}
      </Modal>

      {/* Admin Panel Modal */}
      <Modal
        visible={showAdminPanel}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.adminPanelContainer}>
          <View style={styles.adminPanelHeader}>
            <Text style={styles.adminPanelTitle}>
              Admin Confirmation System
            </Text>
            <TouchableOpacity onPress={() => setShowAdminPanel(false)}>
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <AdminConfirmationSystem
            mode={userType as "admin" | "operator"}
            onConfirmDelivery={handleAdminConfirmDelivery}
            onRejectDelivery={handleAdminRejectDelivery}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  adminButton: {
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
  adminButtonText: {
    fontSize: 12,
    color: "#FF6B35",
    fontWeight: "600",
  },

  // Filter Buttons
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    gap: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "transparent",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e9ecef",
    gap: 6,
  },
  activeFilterButton: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeFilterButtonText: {
    color: "white",
    fontWeight: "600",
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: "#FF6B35",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  // QR Modal
  qrModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  qrModalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxWidth: 350,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: -10,
    right: -10,
    width: 32,
    height: 32,
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  // Admin Panel
  adminPanelContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  adminPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  adminPanelTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
});

export default OrderManagementHub;
