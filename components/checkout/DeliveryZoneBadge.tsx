import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import type { DeliveryZoneResult } from "@/hooks/useDeliveryZone";
import { DELIVERY_HUB, MAX_DELIVERY_RADIUS_KM } from "@/hooks/useDeliveryZone";

interface Props {
  zone: DeliveryZoneResult;
  /** Called when user taps "Try a different address" */
  onChangeAddress?: () => void;
}

export default function DeliveryZoneBadge({ zone, onChangeAddress }: Props) {
  const slideAnim = useRef(new Animated.Value(-8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Animate in whenever status changes from idle
  useEffect(() => {
    if (zone.status === "idle") return;
    slideAnim.setValue(-8);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [zone.status, zone.distanceFromHubKm]);

  if (zone.status === "idle") return null;

  // ── OK state – slim green bar ───────────────────────────────────────────
  if (zone.status === "ok") {
    return (
      <Animated.View
        style={[
          styles.okBar,
          { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Ionicons name="checkmark-circle" size={15} color="#059669" />
        <Text style={styles.okText}>{zone.message}</Text>
      </Animated.View>
    );
  }

  // ── ERROR state – prominent card ────────────────────────────────────────
  return (
    <Animated.View
      style={[
        styles.errorCard,
        { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Header row */}
      <View style={styles.errorHeader}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="location-outline" size={22} color="#C2410C" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.errorTitle}>Outside delivery zone</Text>
          <Text style={styles.errorSub}>
            Currently serving within {MAX_DELIVERY_RADIUS_KM} km of{" "}
            {DELIVERY_HUB.label}
          </Text>
        </View>
      </View>

      {/* Distance detail */}
      <View style={styles.distanceRow}>
        <View style={styles.distancePill}>
          <Ionicons name="navigate" size={12} color="#EA580C" />
          <Text style={styles.distancePillText}>
            {zone.distanceFromHubKm} km away
          </Text>
        </View>
        <View style={[styles.distancePill, styles.distancePillMuted]}>
          <Ionicons name="radio-button-on" size={12} color="#9CA3AF" />
          <Text style={[styles.distancePillText, { color: "#6B7280" }]}>
            Zone limit: {MAX_DELIVERY_RADIUS_KM} km
          </Text>
        </View>
      </View>

      {/* Visual range bar */}
      <View style={styles.rangeBarWrap}>
        <View style={styles.rangeBarTrack}>
          <View
            style={[
              styles.rangeBarFill,
              {
                width: `${Math.min(
                  100,
                  ((zone.distanceFromHubKm ?? 0) /
                    (MAX_DELIVERY_RADIUS_KM * 1.4)) *
                    100,
                )}%`,
              },
            ]}
          />
          {/* Zone boundary marker */}
          <View
            style={[
              styles.rangeBarMarker,
              {
                left: `${(MAX_DELIVERY_RADIUS_KM / (MAX_DELIVERY_RADIUS_KM * 1.4)) * 100}%`,
              },
            ]}
          />
        </View>
        <View style={styles.rangeBarLabels}>
          <Text style={styles.rangeBarLabelLeft}>Hub</Text>
          <Text style={styles.rangeBarLabelRight}>
            {MAX_DELIVERY_RADIUS_KM} km limit
          </Text>
        </View>
      </View>

      {/* Body copy */}
      <Text style={styles.errorBody}>
        We&apos;re actively expanding our delivery zone. Try an address in
        <Text style={styles.errorBodyBold}>
          Fajara, Kotu, Kololi, Senegambia, Pipeline, Kairaba Avenue, Bijilo,
          Brufut, Brusubi, Sukuta, etc.
        </Text>
        or nearby areas.
      </Text>

      {/* CTA */}
      {onChangeAddress && (
        <TouchableOpacity
          style={styles.changeBtn}
          onPress={onChangeAddress}
          activeOpacity={0.75}
        >
          <Ionicons name="swap-horizontal" size={16} color={PrimaryColor} />
          <Text style={styles.changeBtnText}>Try a different address</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // OK bar
  okBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  okText: {
    fontSize: 12,
    color: "#047857",
    fontWeight: "500",
    flex: 1,
  },

  // Error card
  errorCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FED7AA",
    padding: 16,
    marginTop: 8,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  errorIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#9A3412",
    marginBottom: 2,
  },
  errorSub: {
    fontSize: 12,
    color: "#C2410C",
  },

  // Distance pills
  distanceRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFEDD5",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  distancePillMuted: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  distancePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EA580C",
  },

  // Range bar
  rangeBarWrap: {
    marginBottom: 14,
  },
  rangeBarTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "visible",
    position: "relative",
  },
  rangeBarFill: {
    height: "100%",
    backgroundColor: "#F97316",
    borderRadius: 3,
  },
  rangeBarMarker: {
    position: "absolute",
    top: -3,
    width: 2,
    height: 12,
    backgroundColor: "#6B7280",
    borderRadius: 1,
  },
  rangeBarLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  rangeBarLabelLeft: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  rangeBarLabelRight: {
    fontSize: 10,
    color: "#9CA3AF",
  },

  // Body copy
  errorBody: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 20,
    marginBottom: 14,
  },
  errorBodyBold: {
    fontWeight: "700",
    color: "#92400E",
  },

  // CTA button
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: PrimaryColor,
    borderRadius: 10,
    paddingVertical: 10,
  },
  changeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: PrimaryColor,
  },
});
