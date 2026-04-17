import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

export type ExpressBadgeVariant = "standard" | "compact" | "minimal";
export type ExpressPriority = "HIGH" | "MEDIUM" | "LOW";

interface ExpressBadgeProps {
  variant?: ExpressBadgeVariant;
  priority?: ExpressPriority;
  estimatedTime?: number; // in minutes
  showTime?: boolean;
  showIcon?: boolean;
  customLabel?: string;
  style?: ViewStyle;
  animated?: boolean;
}

export const ExpressBadge: React.FC<ExpressBadgeProps> = ({
  variant = "standard",
  priority = "MEDIUM",
  estimatedTime,
  showTime = true,
  showIcon = true,
  customLabel,
  style,
  animated = false,
}) => {
  const getBadgeColors = (): [string, string] => {
    switch (priority) {
      case "HIGH":
        return ["#FF4444", "#CC0000"]; // Red gradient for urgent
      case "MEDIUM":
        return ["#FF6B35", "#E55B2B"]; // Orange gradient for normal express
      case "LOW":
        return ["#28A745", "#1E7E34"]; // Green gradient for low priority
      default:
        return ["#FF6B35", "#E55B2B"];
    }
  };

  const getTimeColor = (): string => {
    if (!estimatedTime) return "#FFF";
    if (estimatedTime <= 15) return "#FFE4E1"; // Light red for very fast
    if (estimatedTime <= 30) return "#FFF8DC"; // Light yellow for fast
    return "#E8F5E8"; // Light green for standard
  };

  const formatEstimatedTime = (): string => {
    if (!estimatedTime) return "";
    if (estimatedTime < 60) {
      return `${estimatedTime}min`;
    }
    const hours = Math.floor(estimatedTime / 60);
    const minutes = estimatedTime % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const getIconName = (): keyof typeof Feather.glyphMap => {
    switch (priority) {
      case "HIGH":
        return "zap";
      case "MEDIUM":
        return "clock";
      case "LOW":
        return "truck";
      default:
        return "zap";
    }
  };

  const renderMinimalBadge = () => (
    <View style={[styles.minimalBadge, style]}>
      <LinearGradient
        colors={getBadgeColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.minimalGradient}
      >
        {showIcon && <Feather name={getIconName()} size={12} color="white" />}
        <Text style={styles.minimalText}>{customLabel || "EXPRESS"}</Text>
      </LinearGradient>
    </View>
  );

  const renderCompactBadge = () => (
    <View style={[styles.compactBadge, style]}>
      <LinearGradient
        colors={getBadgeColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.compactGradient}
      >
        <View style={styles.compactContent}>
          {showIcon && (
            <Feather
              name={getIconName()}
              size={14}
              color="white"
              style={styles.compactIcon}
            />
          )}
          <Text style={styles.compactLabel}>{customLabel || "EXPRESS"}</Text>
        </View>
        {showTime && estimatedTime && (
          <Text style={[styles.compactTime, { color: getTimeColor() }]}>
            {formatEstimatedTime()}
          </Text>
        )}
      </LinearGradient>
    </View>
  );

  const renderStandardBadge = () => (
    <View style={[styles.standardBadge, style]}>
      <LinearGradient
        colors={getBadgeColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.standardGradient}
      >
        {/* Priority indicator */}
        {priority === "HIGH" && (
          <View style={styles.priorityIndicator}>
            <Text style={styles.priorityText}>🔥</Text>
          </View>
        )}

        {/* Main content */}
        <View style={styles.standardContent}>
          <View style={styles.standardHeader}>
            {showIcon && (
              <Feather
                name={getIconName()}
                size={16}
                color="white"
                style={styles.standardIcon}
              />
            )}
            <Text style={styles.standardLabel}>
              {customLabel || "EXPRESS DELIVERY"}
            </Text>
          </View>

          {showTime && estimatedTime && (
            <View style={styles.timeContainer}>
              <Text style={styles.timeLabel}>ETA:</Text>
              <Text style={[styles.timeValue, { color: getTimeColor() }]}>
                {formatEstimatedTime()}
              </Text>
            </View>
          )}
        </View>

        {/* Express indicator dots */}
        <View style={styles.indicatorDots}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={[styles.dot, styles.activeDot]} />
          <View style={[styles.dot, styles.activeDot]} />
        </View>
      </LinearGradient>
    </View>
  );

  switch (variant) {
    case "minimal":
      return renderMinimalBadge();
    case "compact":
      return renderCompactBadge();
    case "standard":
    default:
      return renderStandardBadge();
  }
};

// Utility function to determine if order qualifies for Express badge
export const isExpressEligible = (order: any): boolean => {
  // Check if order has Express delivery type
  if (order.deliveryType === "EXPRESS") return true;

  // Check if estimated delivery time is within Express range (< 45 minutes)
  if (order.expressDeliveryTime && order.expressDeliveryTime < 45) return true;

  // Check if order has express-eligible properties
  if (order.isBadgeEligible) return true;

  // Check if order is in express delivery zones (zones 1 and 2)
  const expressZones = ["zone1", "zone2"];
  if (order.deliveryZone && expressZones.includes(order.deliveryZone))
    return true;

  return false;
};

// Utility function to determine Express priority based on order details
export const getExpressPriority = (order: any): ExpressPriority => {
  const estimatedTime =
    order.expressDeliveryTime || order.estimatedDeliveryTime;

  // High priority: Very fast delivery (< 20 minutes) or urgent orders
  if (estimatedTime && estimatedTime < 20) return "HIGH";
  if (order.isUrgent || order.priority === "HIGH") return "HIGH";

  // Medium priority: Standard express delivery (20-45 minutes)
  if (estimatedTime && estimatedTime <= 45) return "MEDIUM";
  if (order.deliveryType === "EXPRESS") return "MEDIUM";

  // Low priority: Faster than normal but not express (45+ minutes)
  return "LOW";
};

const styles = StyleSheet.create({
  // Minimal badge styles
  minimalBadge: {
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  minimalGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  minimalText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  // Compact badge styles
  compactBadge: {
    borderRadius: 16,
    overflow: "hidden",
    alignSelf: "flex-start",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  compactGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  compactContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  compactIcon: {
    marginRight: 6,
  },
  compactLabel: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  compactTime: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },

  // Standard badge styles
  standardBadge: {
    borderRadius: 20,
    overflow: "hidden",
    alignSelf: "flex-start",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxWidth: 140,
  },
  standardGradient: {
    padding: 12,
    position: "relative",
  },
  priorityIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  priorityText: {
    fontSize: 8,
  },
  standardContent: {
    alignItems: "center",
  },
  standardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  standardIcon: {
    marginRight: 6,
  },
  standardLabel: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  timeLabel: {
    color: "white",
    fontSize: 9,
    fontWeight: "600",
    opacity: 0.8,
  },
  timeValue: {
    fontSize: 10,
    fontWeight: "bold",
  },
  indicatorDots: {
    position: "absolute",
    bottom: 4,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 3,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  activeDot: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
});

export default ExpressBadge;
