import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PrimaryColor } from "@/constants/Colors";
import { Order } from "@/lib/api";

type OrderStatus = Order["status"];

type TimelineStep = {
  key: OrderStatus;
  label: string;
};

interface StatusTimelineProps {
  status: OrderStatus;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { key: "PENDING", label: "Received" },
  { key: "ACCEPTED", label: "Confirmed" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY", label: "Ready" },
  { key: "DISPATCHED", label: "On the Way" },
  { key: "DELIVERED", label: "Delivered" },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  PENDING: 0,
  PROCESSING: 1,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  DISPATCHED: 4,
  DELIVERED: 5,
  CANCELLED: -1,
};

const StatusTimeline: React.FC<StatusTimelineProps> = ({ status }) => {
  const currentRank = STATUS_ORDER[status] ?? 0;

  return (
    <View style={styles.container}>
      {TIMELINE_STEPS.map((step, index) => {
        const stepRank = STATUS_ORDER[step.key];
        const isCancelled = status === "CANCELLED";
        const isCancelledStep = isCancelled && index === 0;
        const isComplete =
          !isCancelled && stepRank <= currentRank && currentRank > 0;
        const isActive = !isCancelled && stepRank === currentRank;
        const isLast = index === TIMELINE_STEPS.length - 1;

        return (
          <View key={step.key} style={styles.step}>
            <View style={styles.indicatorRow}>
              <View
                style={[
                  styles.dot,
                  isComplete && styles.dotComplete,
                  isActive && !isComplete && styles.dotActive,
                  isCancelledStep && styles.dotCancelled,
                ]}
              />
              {!isLast && (
                <View
                  style={[
                    styles.connector,
                    isComplete && styles.connectorComplete,
                    isCancelled && index === 0 && styles.connectorCancelled,
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.label,
                isComplete && styles.labelComplete,
                isActive && !isComplete && styles.labelActive,
                isCancelledStep && styles.labelCancelled,
              ]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 6,
  },
  step: {
    flex: 1,
    alignItems: "center",
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  dotActive: {
    borderColor: PrimaryColor,
  },
  dotComplete: {
    borderColor: PrimaryColor,
    backgroundColor: PrimaryColor,
  },
  dotCancelled: {
    borderColor: "#EF4444",
    backgroundColor: "#FEE2E2",
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 2,
  },
  connectorComplete: {
    backgroundColor: PrimaryColor,
  },
  connectorCancelled: {
    backgroundColor: "#FECACA",
  },
  label: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    textAlign: "center",
    flexShrink: 1,
    paddingHorizontal: 2,
  },
  labelActive: {
    color: PrimaryColor,
  },
  labelComplete: {
    color: "#111827",
  },
  labelCancelled: {
    color: "#EF4444",
  },
});

export default StatusTimeline;
