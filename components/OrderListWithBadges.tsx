import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Order } from "../lib/api";
import {
  ExpressBadge,
  getExpressPriority,
  isExpressEligible,
} from "./ExpressBadge";
import { QRCodeDisplay } from "./QRCodeDisplay";

interface OrderListWithBadgesProps {
  orders: Order[];
  onRefresh?: () => void;
  refreshing?: boolean;
  showQRCodes?: boolean;
  onOrderPress?: (order: Order) => void;
  onQRPress?: (order: Order) => void;
  filterType?: "all" | "express" | "regular";
  title?: string;
  emptyMessage?: string;
}

export const OrderListWithBadges: React.FC<OrderListWithBadgesProps> = ({
  orders,
  onRefresh,
  refreshing = false,
  showQRCodes = false,
  onOrderPress,
  onQRPress,
  filterType = "all",
  title = "Orders",
  emptyMessage = "No orders found",
}) => {
  // Filter orders based on filter type
  const filteredOrders = React.useMemo(() => {
    switch (filterType) {
      case "express":
        return orders.filter((order) => isExpressEligible(order));
      case "regular":
        return orders.filter((order) => !isExpressEligible(order));
      default:
        return orders;
    }
  }, [orders, filterType]);

  // Sort orders: Express first, then by creation time
  const sortedOrders = React.useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const aIsExpress = isExpressEligible(a);
      const bIsExpress = isExpressEligible(b);

      if (aIsExpress && !bIsExpress) return -1;
      if (!aIsExpress && bIsExpress) return 1;

      // If both are express, sort by priority
      if (aIsExpress && bIsExpress) {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const aPriority = priorityOrder[getExpressPriority(a)];
        const bPriority = priorityOrder[getExpressPriority(b)];
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
      }

      // Sort by creation time (newest first)
      return (
        new Date(b.createdAt || "").getTime() -
        new Date(a.createdAt || "").getTime()
      );
    });
  }, [filteredOrders]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "#ffc107";
      case "accepted":
        return "#17a2b8";
      case "picked_up":
        return "#fd7e14";
      case "in_transit":
        return "#007bff";
      case "delivered":
        return "#28a745";
      case "cancelled":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "clock";
      case "accepted":
        return "check-circle";
      case "picked_up":
        return "package";
      case "in_transit":
        return "truck";
      case "delivered":
        return "check-square";
      case "cancelled":
        return "x-circle";
      default:
        return "info";
    }
  };

  const formatDeliveryInfo = (order: Order) => {
    const parts = [];

    if (order.deliveryAddress) {
      parts.push(order.deliveryAddress);
    }

    if (order.receiverName && order.receiverName !== order.customerName) {
      parts.push(`To: ${order.receiverName}`);
    }

    return parts.join(" • ");
  };

  const formatPrice = (price: number) => {
    return `D${price.toFixed(2)}`;
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => {
    const isExpress = isExpressEligible(order);
    const statusColor = getStatusColor(order.status);
    const statusIcon = getStatusIcon(order.status);

    return (
      <TouchableOpacity
        style={[styles.orderCard, isExpress && styles.expressOrderCard]}
        onPress={() => onOrderPress?.(order)}
        activeOpacity={0.8}
      >
        {isExpress && (
          <LinearGradient
            colors={["#FF6B35", "rgba(255, 107, 53, 0.1)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.expressGradient}
          />
        )}

        <View style={styles.orderHeader}>
          <View style={styles.orderMainInfo}>
            <Text style={styles.orderNumber}>#{order.id}</Text>
            <View style={styles.badgeContainer}>
              {isExpress && (
                <ExpressBadge
                  variant="compact"
                  priority={getExpressPriority(order)}
                  estimatedTime={order.expressDeliveryTime}
                />
              )}
              <View
                style={[styles.statusBadge, { backgroundColor: statusColor }]}
              >
                <Feather name={statusIcon} size={10} color="white" />
                <Text style={styles.statusText}>{order.status}</Text>
              </View>
            </View>
          </View>

          <View style={styles.orderActions}>
            <Text style={styles.orderPrice}>
              {formatPrice(order.totalPrice)}
            </Text>
            {showQRCodes && order.qrCode && (
              <TouchableOpacity
                style={styles.qrButton}
                onPress={() => onQRPress?.(order)}
              >
                <Feather name="camera" size={16} color="#FF6B35" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Feather name="user" size={14} color="#666" />
            <Text style={styles.customerName}>{order.customerName}</Text>
            {order.customerPhone && (
              <Text style={styles.customerPhone}>{order.customerPhone}</Text>
            )}
          </View>

          {formatDeliveryInfo(order) && (
            <View style={styles.detailRow}>
              <Feather name="map-pin" size={14} color="#666" />
              <Text style={styles.deliveryInfo}>
                {formatDeliveryInfo(order)}
              </Text>
            </View>
          )}

          {order.notes && (
            <View style={styles.detailRow}>
              <Feather name="message-circle" size={14} color="#666" />
              <Text style={styles.orderNotes} numberOfLines={2}>
                {order.notes}
              </Text>
            </View>
          )}
        </View>

        {isExpress && order.expressDeliveryTime && (
          <View style={styles.expressFooter}>
            <Feather name="zap" size={12} color="#FF6B35" />
            <Text style={styles.expressTimeText}>
              Est. {order.expressDeliveryTime}min delivery
            </Text>
          </View>
        )}

        {order.qrCode && showQRCodes && (
          <View style={styles.qrSection}>
            <QRCodeDisplay order={order} size="small" showActions={false} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather
        name={filterType === "express" ? "zap" : "inbox"}
        size={48}
        color="#ccc"
      />
      <Text style={styles.emptyTitle}>{emptyMessage}</Text>
      {filterType === "express" && (
        <Text style={styles.emptySubtitle}>
          Express orders appear here when they qualify for fast delivery
        </Text>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.listTitle}>{title}</Text>
      <View style={styles.orderCount}>
        <Text style={styles.countText}>
          {sortedOrders.length} order{sortedOrders.length !== 1 ? "s" : ""}
        </Text>
        {filterType === "express" && (
          <Feather name="zap" size={14} color="#FF6B35" />
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#FF6B35"]}
              tintColor="#FF6B35"
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  orderCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },

  // Order Card Styles
  orderCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    position: "relative",
    overflow: "hidden",
  },
  expressOrderCard: {
    borderColor: "#FF6B35",
    borderWidth: 1.5,
  },
  expressGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },

  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderMainInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  orderActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  qrButton: {
    width: 32,
    height: 32,
    backgroundColor: "#fff2ee",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FF6B35",
  },

  // Order Details
  orderDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customerName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    flex: 1,
  },
  customerPhone: {
    fontSize: 12,
    color: "#007bff",
  },
  deliveryInfo: {
    fontSize: 13,
    color: "#666",
    flex: 1,
    lineHeight: 18,
  },
  orderNotes: {
    fontSize: 12,
    color: "#666",
    flex: 1,
    fontStyle: "italic",
    lineHeight: 16,
  },

  // Express Footer
  expressFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ffe5d6",
    gap: 6,
  },
  expressTimeText: {
    fontSize: 12,
    color: "#FF6B35",
    fontWeight: "bold",
  },

  // QR Section
  qrSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    alignItems: "center",
  },

  // List Elements
  separator: {
    height: 12,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default OrderListWithBadges;
