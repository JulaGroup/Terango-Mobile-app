import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export type VehicleType = "BIKE" | "KEKE_CARGO" | "CAR" | "VAN" | "LORRY";
export type WeightClass = "LIGHT" | "MEDIUM" | "HEAVY";

// Weight-based vehicle availability
// LIGHT (0-25kg): BIKE, KEKE_CARGO only (small/light vehicles)
// MEDIUM (25-250kg): BIKE, KEKE_CARGO, CAR (add CAR for medium loads)
// HEAVY (250kg+): CAR, VAN, LORRY (large vehicles only)
export const WEIGHT_VEHICLE_MAP: Record<WeightClass, VehicleType[]> = {
  LIGHT: ["BIKE", "KEKE_CARGO"],
  MEDIUM: ["BIKE", "KEKE_CARGO", "CAR"],
  HEAVY: ["CAR", "VAN", "LORRY"],
};

// Helper function to check if vehicle supports weight class
export function vehicleSupportsWeight(
  vehicleType: VehicleType,
  weightClass: WeightClass,
): boolean {
  return WEIGHT_VEHICLE_MAP[weightClass].includes(vehicleType);
}

// Get available vehicles for weight class
export function getAvailableVehicles(weightClass: WeightClass): VehicleType[] {
  return WEIGHT_VEHICLE_MAP[weightClass];
}

// Admin panel vehicle icons and styling
export const VEHICLE_CONFIG: Record<
  VehicleType,
  {
    emoji: string;
    iconName: string;
    label: string;
    description: string;
    weightRange: string;
    backgroundColor: string;
    borderColor: string;
  }
> = {
  BIKE: {
    emoji: "🏍️",
    iconName: "bicycle-outline",
    label: "Motorbike",
    description: "Fast food delivery",
    weightRange: "0-25kg",
    backgroundColor: "#E7F7ED",
    borderColor: "#22C55E",
  },
  KEKE_CARGO: {
    emoji: "🛺",
    iconName: "car-outline",
    label: "Keke Cargo",
    description: "Perfect for rice bags",
    weightRange: "25-250kg",
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  CAR: {
    emoji: "🚗",
    iconName: "car-sport-outline",
    label: "Car",
    description: "Medium to heavy loads",
    weightRange: "25-500kg",
    backgroundColor: "#FFF7ED",
    borderColor: "#F97316",
  },
  VAN: {
    emoji: "🚐",
    iconName: "bus-outline",
    label: "Van",
    description: "Heavy cargo",
    weightRange: "250-1000kg",
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
  },
  LORRY: {
    emoji: "🚚",
    iconName: "cube-outline",
    label: "Mini Truck",
    description: "Industrial freight",
    weightRange: "500kg+",
    backgroundColor: "#F9FAFB",
    borderColor: "#6B7280",
  },
};

export interface VehicleOption {
  key: VehicleType;
  label: string;
  description: string;
  iconName: string;
  estimatedPrice?: number | null;
  estimatedTime?: string;
  weightRange?: string;
  backgroundColor?: string;
  borderColor?: string;
}

interface ExpressVehicleCardProps {
  vehicle: VehicleOption;
  selected: boolean;
  onPress: () => void;
  showPrice?: boolean;
}

export const ExpressVehicleCard: React.FC<ExpressVehicleCardProps> = ({
  vehicle,
  selected,
  onPress,
  showPrice = false,
}) => {
  const config = VEHICLE_CONFIG[vehicle.key];

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: selected ? config.backgroundColor : "#FFFFFF",
          borderColor: selected ? config.borderColor : "#E5E7EB",
        },
      ]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.header}>
        {/* Vehicle Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: selected ? "rgba(255,255,255,0.9)" : "#F9FAFB",
            },
          ]}
        >
          <Ionicons
            name={config.iconName as any}
            size={26}
            color={selected ? config.borderColor : "#6B7280"}
          />
        </View>

        {/* Selection Checkmark */}
        {selected && (
          <View style={styles.checkmarkContainer}>
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={config.borderColor}
            />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, selected && { color: config.borderColor }]}>
          {config.label}
        </Text>
        <Text style={styles.description}>{config.description}</Text>
        <Text style={styles.weightRange}>{config.weightRange}</Text>

        {vehicle.estimatedTime && (
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text style={styles.estimatedTime}>{vehicle.estimatedTime}</Text>
          </View>
        )}
      </View>

      {showPrice &&
        vehicle.estimatedPrice !== null &&
        vehicle.estimatedPrice !== undefined && (
          <View style={styles.priceContainer}>
            <Text
              style={[styles.price, selected && { color: config.borderColor }]}
            >
              D{vehicle.estimatedPrice.toFixed(0)}
            </Text>
          </View>
        )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  vehicleEmoji: {
    fontSize: 24,
    lineHeight: 28,
  },
  checkmarkContainer: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    alignItems: "flex-start",
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 16,
    marginBottom: 6,
  },
  weightRange: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  estimatedTime: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  priceContainer: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
});
