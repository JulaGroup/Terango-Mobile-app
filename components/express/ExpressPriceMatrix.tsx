import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  VehicleType,
  WeightClass,
  PriceCalculation,
  formatEstimatedTime,
} from "@/utils/expressPriceCalculator";

interface ExpressPriceMatrixProps {
  prices: PriceCalculation[];
  selectedVehicle: VehicleType | null;
  selectedWeight: WeightClass | null;
  onSelect: (vehicle: VehicleType, weight: WeightClass) => void;
  loading?: boolean;
  distanceKm?: number;
}

const VEHICLE_LABELS: Record<VehicleType, string> = {
  BIKE: "Bike",
  KEKE_CARGO: "Keke",
  CAR: "Car",
  VAN: "Van",
  LORRY: "Lorry",
};

const WEIGHT_LABELS: Record<WeightClass, string> = {
  LIGHT: "Light",
  MEDIUM: "Medium",
  HEAVY: "Heavy",
};

const VEHICLE_ICONS: Record<VehicleType, keyof typeof Ionicons.glyphMap> = {
  BIKE: "bicycle",
  KEKE_CARGO: "car-sport-outline",
  CAR: "car",
  VAN: "bus-outline",
  LORRY: "trail-sign-outline",
};

export const ExpressPriceMatrix: React.FC<ExpressPriceMatrixProps> = ({
  prices,
  selectedVehicle,
  selectedWeight,
  onSelect,
  loading = false,
  distanceKm,
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Calculating prices...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6b00" />
          <Text style={styles.loadingText}>Getting the best rates for you</Text>
        </View>
      </View>
    );
  }

  if (prices.length === 0) {
    return null;
  }

  const vehicles: VehicleType[] = ["BIKE", "KEKE_CARGO", "CAR", "VAN", "LORRY"];
  const weights: WeightClass[] = ["LIGHT", "MEDIUM", "HEAVY"];

  const getPrice = (
    vehicle: VehicleType,
    weight: WeightClass,
  ): PriceCalculation | undefined => {
    return prices.find(
      (p) => p.vehicleType === vehicle && p.weightClass === weight,
    );
  };

  // Find cheapest option
  const cheapestPrice = Math.min(...prices.map((p) => p.estimatedPrice));
  const cheapestOption = prices.find((p) => p.estimatedPrice === cheapestPrice);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Select Vehicle & Weight</Text>
          {distanceKm && (
            <Text style={styles.subtitle}>
              {distanceKm.toFixed(1)} km • Tap any option to book
            </Text>
          )}
        </View>
        {cheapestOption && (
          <View style={styles.cheapestBadge}>
            <Text style={styles.cheapestText}>From D{cheapestPrice}</Text>
          </View>
        )}
      </View>

      {/* Weight Class Headers */}
      <View style={styles.weightHeader}>
        <View style={styles.vehicleLabelSpace} />
        {weights.map((weight) => (
          <View key={weight} style={styles.weightColumn}>
            <Text style={styles.weightLabel}>{WEIGHT_LABELS[weight]}</Text>
            <Text style={styles.weightSubLabel}>
              {weight === "LIGHT" && "≤5kg"}
              {weight === "MEDIUM" && "≤20kg"}
              {weight === "HEAVY" && "Bulky"}
            </Text>
          </View>
        ))}
      </View>

      {/* Price Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gridScroll}
      >
        <View style={styles.grid}>
          {vehicles.map((vehicle) => (
            <View key={vehicle} style={styles.vehicleRow}>
              {/* Vehicle Label */}
              <View style={styles.vehicleLabel}>
                <View style={styles.vehicleIconContainer}>
                  <Ionicons
                    name={VEHICLE_ICONS[vehicle]}
                    size={18}
                    color="#666"
                  />
                </View>
                <Text style={styles.vehicleLabelText}>
                  {VEHICLE_LABELS[vehicle]}
                </Text>
              </View>

              {/* Price Cells */}
              {weights.map((weight) => {
                const priceCalc = getPrice(vehicle, weight);
                const isSelected =
                  selectedVehicle === vehicle && selectedWeight === weight;
                const isCheapest = priceCalc?.estimatedPrice === cheapestPrice;

                return (
                  <TouchableOpacity
                    key={`${vehicle}-${weight}`}
                    style={[
                      styles.priceCell,
                      isSelected && styles.priceCellSelected,
                      isCheapest && !isSelected && styles.priceCellCheapest,
                    ]}
                    onPress={() => onSelect(vehicle, weight)}
                    activeOpacity={0.7}
                  >
                    {priceCalc ? (
                      <>
                        <Text
                          style={[
                            styles.priceAmount,
                            isSelected && styles.priceAmountSelected,
                          ]}
                        >
                          D{priceCalc.estimatedPrice}
                        </Text>
                        <Text
                          style={[
                            styles.priceETA,
                            isSelected && styles.priceETASelected,
                          ]}
                        >
                          {formatEstimatedTime(priceCalc.estimatedTimeMinutes)}
                        </Text>
                        {isCheapest && !isSelected && (
                          <View style={styles.cheapLabel}>
                            <Text style={styles.cheapLabelText}>BEST</Text>
                          </View>
                        )}
                        {isSelected && (
                          <View style={styles.selectedCheckmark}>
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color="#ff6b00"
                            />
                          </View>
                        )}
                      </>
                    ) : (
                      <Text style={styles.priceNA}>—</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Ionicons name="flash" size={14} color="#10B981" />
          <Text style={styles.legendText}>Best value highlighted</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="time-outline" size={14} color="#999" />
          <Text style={styles.legendText}>Estimated delivery time</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 0,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  cheapestBadge: {
    backgroundColor: "rgba(16,185,129,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cheapestText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#10B981",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
  },
  weightHeader: {
    flexDirection: "row",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  vehicleLabelSpace: {
    width: 90,
  },
  weightColumn: {
    width: 90,
    alignItems: "center",
  },
  weightLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  weightSubLabel: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  gridScroll: {
    paddingBottom: 4,
  },
  grid: {
    gap: 10,
  },
  vehicleRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  vehicleLabel: {
    width: 90,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  vehicleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleLabelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  priceCell: {
    width: 90,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    borderWidth: 2,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  priceCellSelected: {
    backgroundColor: "rgba(255,107,0,0.1)",
    borderColor: "#ff6b00",
    borderWidth: 2,
  },
  priceCellCheapest: {
    backgroundColor: "rgba(16,185,129,0.06)",
    borderColor: "#10B981",
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  priceAmountSelected: {
    color: "#ff6b00",
  },
  priceETA: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  priceETASelected: {
    color: "#ff8e3c",
  },
  priceNA: {
    fontSize: 14,
    color: "#CCC",
  },
  cheapLabel: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#10B981",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cheapLabelText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  selectedCheckmark: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#fff",
    borderRadius: 999,
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#999",
  },
});
