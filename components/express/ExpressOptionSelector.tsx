/**
 * Modern Vehicle and Weight Selection Component for TeranGO Express
 * Replaces the complex price matrix with simple, intuitive selection cards
 */

import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VehicleType, WeightClass } from "@/utils/expressPriceCalculator";

interface ExpressOptionSelectorProps {
  selectedVehicle: VehicleType | null;
  selectedWeight: WeightClass | null;
  onVehicleSelect: (vehicle: VehicleType) => void;
  onWeightSelect: (weight: WeightClass) => void;
  estimatedPrice?: number;
  estimatedTime?: number;
  distanceKm?: number;
}

const VEHICLES: Array<{
  type: VehicleType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}> = [
  {
    type: "BIKE",
    label: "Bike",
    icon: "bicycle",
    description: "Small items, fastest",
  },
  {
    type: "KEKE_CARGO",
    label: "Keke",
    icon: "car-sport-outline",
    description: "Standard delivery",
  },
  {
    type: "CAR",
    label: "Car",
    icon: "car",
    description: "Premium, comfortable",
  },
  {
    type: "VAN",
    label: "Van",
    icon: "bus-outline",
    description: "Large packages",
  },
  {
    type: "LORRY",
    label: "Lorry",
    icon: "trail-sign-outline",
    description: "Heavy cargo",
  },
];

const WEIGHTS: Array<{
  type: WeightClass;
  label: string;
  range: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { type: "LIGHT", label: "Light", range: "Up to 5kg", icon: "cube-outline" },
  {
    type: "MEDIUM",
    label: "Medium",
    range: "5kg - 20kg",
    icon: "cube",
  },
  { type: "HEAVY", label: "Heavy", range: "Over 20kg", icon: "albums" },
];

export const ExpressOptionSelector: React.FC<ExpressOptionSelectorProps> = ({
  selectedVehicle,
  selectedWeight,
  onVehicleSelect,
  onWeightSelect,
  estimatedPrice,
  estimatedTime,
  distanceKm,
}) => {
  return (
    <View style={styles.container}>
      {/* Vehicle Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose Vehicle</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {VEHICLES.map((vehicle) => {
            const isSelected = selectedVehicle === vehicle.type;
            return (
              <TouchableOpacity
                key={vehicle.type}
                style={[
                  styles.vehicleCard,
                  isSelected && styles.vehicleCardSelected,
                ]}
                onPress={() => onVehicleSelect(vehicle.type)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconContainer,
                    isSelected && styles.iconContainerSelected,
                  ]}
                >
                  <Ionicons
                    name={vehicle.icon}
                    size={28}
                    color={isSelected ? "#fff" : "#ff6b00"}
                  />
                </View>
                <Text
                  style={[
                    styles.vehicleLabel,
                    isSelected && styles.labelSelected,
                  ]}
                >
                  {vehicle.label}
                </Text>
                <Text
                  style={[
                    styles.vehicleDescription,
                    isSelected && styles.descriptionSelected,
                  ]}
                >
                  {vehicle.description}
                </Text>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#ff6b00"
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Weight Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Package Weight</Text>
        <View style={styles.weightGrid}>
          {WEIGHTS.map((weight) => {
            const isSelected = selectedWeight === weight.type;
            return (
              <TouchableOpacity
                key={weight.type}
                style={[
                  styles.weightCard,
                  isSelected && styles.weightCardSelected,
                ]}
                onPress={() => onWeightSelect(weight.type)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={weight.icon}
                  size={24}
                  color={isSelected ? "#ff6b00" : "#666"}
                />
                <Text
                  style={[
                    styles.weightLabel,
                    isSelected && styles.labelSelected,
                  ]}
                >
                  {weight.label}
                </Text>
                <Text
                  style={[
                    styles.weightRange,
                    isSelected && styles.rangeSelected,
                  ]}
                >
                  {weight.range}
                </Text>
                {isSelected && (
                  <View style={styles.checkmarkSmall}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#ff6b00"
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Price Summary */}
      {selectedVehicle && selectedWeight && estimatedPrice && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="cash-outline" size={20} color="#ff6b00" />
            </View>
            <View style={styles.summaryDetails}>
              <Text style={styles.summaryLabel}>Estimated Cost</Text>
              <Text style={styles.summaryValue}>
                D{estimatedPrice.toFixed(0)}
              </Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryMeta}>
            {distanceKm && (
              <View style={styles.metaItem}>
                <Ionicons name="navigate-outline" size={14} color="#999" />
                <Text style={styles.metaText}>{distanceKm.toFixed(1)}km</Text>
              </View>
            )}
            {estimatedTime && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color="#999" />
                <Text style={styles.metaText}>
                  {estimatedTime < 60
                    ? `${estimatedTime} min`
                    : `${Math.floor(estimatedTime / 60)}h ${estimatedTime % 60}m`}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  scrollContent: {
    paddingRight: 20,
    gap: 12,
  },
  vehicleCard: {
    width: 120,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E8EAED",
    position: "relative",
  },
  vehicleCardSelected: {
    borderColor: "#ff6b00",
    backgroundColor: "rgba(255,107,0,0.03)",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,107,0,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconContainerSelected: {
    backgroundColor: "#ff6b00",
  },
  vehicleLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  vehicleDescription: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  labelSelected: {
    color: "#ff6b00",
  },
  descriptionSelected: {
    color: "#666",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  weightGrid: {
    flexDirection: "row",
    gap: 12,
  },
  weightCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E8EAED",
    position: "relative",
    minHeight: 100,
    justifyContent: "center",
  },
  weightCardSelected: {
    borderColor: "#ff6b00",
    backgroundColor: "rgba(255,107,0,0.03)",
  },
  weightLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 8,
    marginBottom: 4,
  },
  weightRange: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
  },
  rangeSelected: {
    color: "#666",
  },
  checkmarkSmall: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  summaryCard: {
    backgroundColor: "#FFF5ED",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: "#FFE5CC",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  summaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryDetails: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ff6b00",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#FFE5CC",
    marginVertical: 14,
  },
  summaryMeta: {
    flexDirection: "row",
    gap: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
});
