import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Where a delivery is, at a glance.
 *
 * The tracking sheet previously showed progress only as a "Tracking History"
 * log at the very bottom — a reverse-chronological list you had to read and
 * interpret. That answers "what has happened" when the question a customer
 * actually has is "where is my package now, and how much further".
 *
 * This is the four-beat stepper every delivery app uses for that reason:
 * completed steps fill in, the current one is ringed and labelled, upcoming
 * ones stay muted. The connecting bar fills only up to the current step, so
 * the remaining distance is visible without reading a word.
 */

const T = {
  brand: "#FF6B00",
  brandSoft: "rgba(255,107,0,0.12)",
  surface: "#FFFFFF",
  border: "#E9ECEF",
  textPrimary: "#000000",
  textTertiary: "#6C757D",
  success: "#28A745",
  muted: "#DEE2E6",
};

type StepKey = "CONFIRMED" | "ASSIGNED" | "PICKED_UP" | "DELIVERED";

const STEPS: { key: StepKey; label: string; icon: any }[] = [
  { key: "CONFIRMED", label: "Confirmed", icon: "checkmark-circle-outline" },
  { key: "ASSIGNED", label: "Driver", icon: "person-outline" },
  { key: "PICKED_UP", label: "Picked up", icon: "bag-check-outline" },
  { key: "DELIVERED", label: "Delivered", icon: "flag-outline" },
];

/**
 * Delivery statuses collapse onto the four steps above. ARRIVED sits inside
 * the picked-up leg: the package is still with the rider, so the stepper
 * should not imply it has been handed over.
 */
const STATUS_TO_INDEX: Record<string, number> = {
  PENDING: 0,
  DRIVER_ASSIGNED: 1,
  PICKED_UP: 2,
  IN_TRANSIT: 2,
  ARRIVED: 2,
  DELIVERED: 3,
};

export function DeliveryProgress({
  status,
}: {
  status?: string | null;
}) {
  // Cancelled deliveries have no progress to show — the sheet renders its own
  // cancelled state instead of a stepper frozen partway along.
  if (status === "CANCELLED") return null;

  // An unknown or missing status sits at the first step rather than
  // rendering nothing — the delivery exists, so the stepper should too.
  const current = status ? (STATUS_TO_INDEX[status] ?? 0) : 0;

  return (
    <View style={s.wrap}>
      <View style={s.track}>
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const reached = done || active;

          return (
            <React.Fragment key={step.key}>
              <View style={s.stepCol}>
                <View
                  style={[
                    s.node,
                    done && s.nodeDone,
                    active && s.nodeActive,
                    !reached && s.nodePending,
                  ]}
                >
                  <Ionicons
                    name={done ? "checkmark" : step.icon}
                    size={active ? 16 : 14}
                    color={
                      done ? "#fff" : active ? T.brand : T.textTertiary
                    }
                  />
                </View>
                <Text
                  style={[
                    s.label,
                    active && s.labelActive,
                    !reached && s.labelPending,
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </View>

              {i < STEPS.length - 1 && (
                <View style={s.barWrap}>
                  {/* Filled only as far as progress has actually got. */}
                  <View style={[s.bar, i < current && s.barFilled]} />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  track: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepCol: {
    alignItems: "center",
    width: 62,
  },
  node: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  nodeDone: {
    backgroundColor: T.success,
    borderColor: T.success,
  },
  nodeActive: {
    backgroundColor: T.brandSoft,
    borderColor: T.brand,
  },
  nodePending: {
    backgroundColor: "transparent",
    borderColor: T.muted,
  },
  label: {
    marginTop: 6,
    fontSize: 10.5,
    fontWeight: "600",
    color: T.textPrimary,
    textAlign: "center",
  },
  labelActive: {
    color: T.brand,
    fontWeight: "800",
  },
  labelPending: {
    color: T.textTertiary,
    fontWeight: "500",
  },
  barWrap: {
    flex: 1,
    // Line up with the centre of the 32pt node above.
    marginTop: 15,
  },
  bar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: T.muted,
  },
  barFilled: {
    backgroundColor: T.success,
  },
});

export default DeliveryProgress;
