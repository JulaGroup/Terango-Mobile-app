import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, Radius } from "@/constants/DesignTokens";

// Simple time formatting (fallback if date-fns not installed)
const formatTimeAgo = (timestamp: string): string => {
  try {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "";
  }
};

interface TrackingUpdate {
  id: string;
  status: string;
  message?: string | null;
  createdAt: string;
  location?: {
    latitude?: number;
    longitude?: number;
  } | null;
}

interface TrackingTimelineProps {
  updates: TrackingUpdate[];
  currentStatus: string;
}

const STATUS_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  PENDING: { icon: "time-outline", color: Colors.warning, label: "Order Placed" },
  ACCEPTED: { icon: "checkmark-circle", color: Colors.info, label: "Accepted" },
  PICKED_UP: { icon: "cube", color: Colors.info, label: "Package Picked Up" },
  IN_TRANSIT: { icon: "bicycle", color: Colors.info, label: "On the Way" },
  ARRIVED: { icon: "location", color: Colors.success, label: "Driver Arrived" },
  DELIVERED: { icon: "checkmark-done-circle", color: Colors.success, label: "Delivered" },
  CANCELLED: { icon: "close-circle", color: Colors.error, label: "Cancelled" },
};

export const TrackingTimeline: React.FC<TrackingTimelineProps> = ({
  updates,
  currentStatus,
}) => {
  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || {
      icon: "ellipse" as keyof typeof Ionicons.glyphMap,
      color: Colors.inkLight,
      label: status,
    };
  };

  const formatTimestamp = (dateString: string): string => {
    try {
      return formatTimeAgo(dateString);
    } catch {
      return "";
    }
  };

  const cleanMessage = (message?: string | null): string | null => {
    if (!message) return null;
    
    // Clean up admin approval messages
    if (message.startsWith("[ADMIN_APPROVED_FOR_PAYMENT]")) {
      const cleanedMessage = message.replace("[ADMIN_APPROVED_FOR_PAYMENT]", "").trim();
      return cleanedMessage || "Order Approved";
    }
    
    // Clean up other messages
    if (message.includes("Order Approved:")) {
      return message; // Keep as-is since it's already clean
    }
    
    return message;
  };

  const renderTimelineItem = (update: TrackingUpdate, index: number) => {
    const config = getStatusConfig(update.status);
    const isLast = index === updates.length - 1;
    const isCurrent = update.status === currentStatus;
    const cleanedMessage = cleanMessage(update.message);

    return (
      <View key={update.id} style={styles.timelineItem}>
        {/* Left Side: Icon & Line */}
        <View style={styles.timelineLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${config.color}15` },
              isCurrent && styles.iconContainerActive,
            ]}
          >
            <Ionicons name={config.icon} size={20} color={config.color} />
          </View>
          {!isLast && <View style={[styles.timelineLine, { backgroundColor: config.color }]} />}
        </View>

        {/* Right Side: Content */}
        <View style={[styles.timelineContent, isLast && styles.timelineContentLast]}>
          <View style={styles.contentHeader}>
            <Text style={[styles.statusLabel, isCurrent && styles.statusLabelActive]}>
              {config.label}
            </Text>
            <Text style={styles.timestamp}>{formatTimestamp(update.createdAt)}</Text>
          </View>

          {cleanedMessage && (
            <Text style={styles.message} numberOfLines={3}>
              {cleanedMessage}
            </Text>
          )}

          {isCurrent && (
            <View style={styles.currentBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.currentText}>Current Status</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (!updates || updates.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="information-circle-outline" size={48} color={Colors.inkLight} />
        <Text style={styles.emptyText}>No tracking updates yet</Text>
      </View>
    );
  }

  // Reverse to show latest first
  const sortedUpdates = [...updates].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="navigate-circle" size={24} color={Colors.primary} />
        <Text style={styles.title}>Tracking Timeline</Text>
      </View>

      <View style={styles.timeline}>{sortedUpdates.map(renderTimelineItem)}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h3,
    color: Colors.ink,
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: "row",
    gap: Spacing.base,
  },
  timelineLeft: {
    alignItems: "center",
    width: 44,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.round,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  iconContainerActive: {
    borderColor: Colors.primary,
    transform: [{ scale: 1.1 }],
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    opacity: 0.3,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.lg,
  },
  timelineContentLast: {
    paddingBottom: 0,
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  statusLabel: {
    ...Typography.bodyMedium,
    color: Colors.ink,
  },
  statusLabelActive: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  timestamp: {
    ...Typography.caption,
    color: Colors.inkLight,
  },
  message: {
    ...Typography.footnote,
    color: Colors.inkMid,
    marginBottom: Spacing.sm,
  },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.sm,
    alignSelf: "flex-start",
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  currentText: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxxl,
    gap: Spacing.base,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.inkLight,
  },
});
