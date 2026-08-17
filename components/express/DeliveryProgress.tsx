import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Status header and progress bar for the Express tracking sheet.
 *
 * Deliberately the same shape as the ordinary order tracking sheet
 * (app/order-tracking.tsx): a 48pt tinted status circle, an 18/700 label with
 * a muted line beneath, and a single 4pt continuous progress bar. Express and
 * ordinary tracking are the same job from a customer's point of view, so they
 * should not look like two different products.
 *
 * An earlier version used a four-step stepper. It carried more detail but
 * matched nothing else in the app.
 */

const C = {
  text: "#1F2937",
  muted: "#6B7280",
  faint: "#9CA3AF",
  track: "#E5E7EB",
  badgeBg: "#F3F4F6",
};

/** How far along the bar sits for each status. */
const STATUS_PROGRESS: Record<string, number> = {
  PENDING: 0.12,
  DRIVER_ASSIGNED: 0.4,
  PICKED_UP: 0.62,
  IN_TRANSIT: 0.78,
  ARRIVED: 0.92,
  DELIVERED: 1,
  CANCELLED: 0,
};

export function DeliveryProgress({
  status,
  label,
  message,
  color,
  icon,
  reference,
  distanceKm,
}: {
  status?: string | null;
  label: string;
  message?: string;
  color: string;
  icon: string;
  reference?: string;
  distanceKm?: number | null;
}) {
  const progress = status ? (STATUS_PROGRESS[status] ?? 0.12) : 0.12;
  const isCancelled = status === "CANCELLED";

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <View style={s.left}>
          <View style={[s.iconCircle, { backgroundColor: color + "15" }]}>
            <Ionicons name={icon as any} size={24} color={color} />
          </View>
          <View style={s.info}>
            <Text style={s.label} numberOfLines={1}>
              {label}
            </Text>
            {!!message && (
              <Text style={s.message} numberOfLines={2}>
                {message}
              </Text>
            )}
            {!!reference && <Text style={s.reference}>{reference}</Text>}
          </View>
        </View>

        {distanceKm != null && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{distanceKm.toFixed(1)} km</Text>
          </View>
        )}
      </View>

      {/* A cancelled delivery has no progress to show. */}
      {!isCancelled && (
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                { width: `${progress * 100}%`, backgroundColor: color },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 4 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  info: { flex: 1 },
  label: { fontSize: 18, fontWeight: "700", color: C.text },
  message: { fontSize: 14, color: C.muted, marginTop: 2 },
  reference: { fontSize: 13, color: C.faint, marginTop: 2 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: C.badgeBg,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: C.muted },
  progressWrap: { marginBottom: 20 },
  progressTrack: {
    height: 4,
    backgroundColor: C.track,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
});

export default DeliveryProgress;
