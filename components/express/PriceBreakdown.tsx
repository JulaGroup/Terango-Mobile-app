import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, Radius } from "@/constants/DesignTokens";

interface PriceBreakdownProps {
  baseFee: number;
  distanceFee: number;
  serviceFee: number;
  bookingFee?: number;
  totalFee: number;
  deliveryDistance: number;
  estimatedTime: number;
  vehicleType: string;
  showPickupNote?: boolean;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  baseFee,
  distanceFee,
  serviceFee,
  bookingFee = 0,
  totalFee,
  deliveryDistance,
  estimatedTime,
  vehicleType,
  showPickupNote = true,
}) => {
  const formatPrice = (amount: number) => `D${amount.toFixed(2)}`;
  const formatDistance = (km: number) => `${km.toFixed(1)} km`;
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Price Breakdown</Text>
        <View style={styles.estimateTag}>
          <Ionicons name="time-outline" size={14} color={Colors.info} />
          <Text style={styles.estimateText}>{formatTime(estimatedTime)}</Text>
        </View>
      </View>

      {/* Distance Info */}
      {showPickupNote && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={16} color={Colors.info} />
          <Text style={styles.infoText}>
            Price includes driver's pickup journey ({formatDistance(deliveryDistance)} delivery distance)
          </Text>
        </View>
      )}

      {/* Price Items */}
      <View style={styles.priceList}>
        <PriceRow label="Base Fee" value={baseFee} icon="cube-outline" />
        <PriceRow
          label={`Distance Fee (${formatDistance(deliveryDistance)} × 1.3)`}
          value={distanceFee}
          icon="speedometer-outline"
          helpText="Includes driver pickup journey"
        />
        {bookingFee > 0 && (
          <PriceRow label="Booking Fee" value={bookingFee} icon="receipt-outline" />
        )}
        <View style={styles.divider} />
        <PriceRow
          label={`Service Fee (5%)`}
          value={serviceFee}
          icon="shield-checkmark-outline"
        />
      </View>

      {/* Total */}
      <View style={styles.totalContainer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>{formatPrice(totalFee)}</Text>
        </View>
        <Text style={styles.vehicleNote}>For {vehicleType.replace("_", " ")}</Text>
      </View>
    </View>
  );
};

interface PriceRowProps {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  helpText?: string;
}

const PriceRow: React.FC<PriceRowProps> = ({ label, value, icon, helpText }) => (
  <View style={styles.priceRow}>
    <View style={styles.priceRowLeft}>
      <Ionicons name={icon} size={18} color={Colors.inkLight} />
      <View style={styles.priceRowText}>
        <Text style={styles.priceLabel}>{label}</Text>
        {helpText && <Text style={styles.helpText}>{helpText}</Text>}
      </View>
    </View>
    <Text style={styles.priceValue}>D{value.toFixed(2)}</Text>
  </View>
);

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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.ink,
  },
  estimateTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.infoBg,
    borderRadius: Radius.sm,
  },
  estimateText: {
    ...Typography.captionMedium,
    color: Colors.info,
  },
  infoBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.infoBg,
    borderRadius: Radius.md,
    marginBottom: Spacing.base,
  },
  infoText: {
    ...Typography.footnote,
    color: Colors.infoDark,
    flex: 1,
  },
  priceList: {
    gap: Spacing.md,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  priceRowLeft: {
    flexDirection: "row",
    gap: Spacing.sm,
    flex: 1,
  },
  priceRowText: {
    flex: 1,
  },
  priceLabel: {
    ...Typography.subheadline,
    color: Colors.inkMid,
  },
  helpText: {
    ...Typography.caption,
    color: Colors.inkLight,
    marginTop: 2,
  },
  priceValue: {
    ...Typography.bodyMedium,
    color: Colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.xs,
  },
  totalContainer: {
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 2,
    borderTopColor: Colors.divider,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    ...Typography.h3,
    color: Colors.ink,
  },
  totalValue: {
    ...Typography.h2,
    color: Colors.primary,
  },
  vehicleNote: {
    ...Typography.caption,
    color: Colors.inkLight,
    marginTop: Spacing.xs,
    textAlign: "right",
  },
});
