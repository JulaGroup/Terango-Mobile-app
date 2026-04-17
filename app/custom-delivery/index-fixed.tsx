import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { customDeliveryApi, expressDeliveryApi } from "@/lib/api";
import { useAddress } from "@/context/AddressContext";
import { Address } from "@/services/AddressService";
import {
  VehicleType,
  WeightClass,
  calculateDeliveryPrice,
} from "@/utils/expressPriceCalculator";

// Modern Components
import { SavedLocationDropdown } from "@/components/express/SavedLocationDropdown";
import { PriceBreakdown } from "@/components/express/PriceBreakdown";
import { ModernInput } from "@/components/common/ModernInput";
import LocationModal from "@/components/common/LocationModal";
import {
  ExpressVehicleCard,
  VEHICLE_CONFIG,
} from "@/components/express/ExpressVehicleCard";
import {
  ExpressWeightClassCard,
  WEIGHT_CONFIG,
} from "@/components/express/ExpressWeightClassCard";

const PrimaryColor = "#ff6b00";

export default function ExpressDeliveryPage() {
  const router = useRouter();
  const { addresses, defaultAddress, addAddress } = useAddress();

  // Location states
  const [pickupLocation, setPickupLocation] = useState<Address | null>(defaultAddress);
  const [deliveryLocation, setDeliveryLocation] = useState<Address | null>(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  // Form states
  const [selectedWeight, setSelectedWeight] = useState<WeightClass>("LIGHT");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>("BIKE");
  const [packageDescription, setPackageDescription] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Calculate price
  const priceCalculation = useMemo(() => {
    if (!pickupLocation || !deliveryLocation) return null;

    return calculateDeliveryPrice(
      pickupLocation.latitude || 0,
      pickupLocation.longitude || 0,
      deliveryLocation.latitude || 0,
      deliveryLocation.longitude || 0,
      selectedVehicle,
      selectedWeight
    );
  }, [pickupLocation, deliveryLocation, selectedVehicle, selectedWeight]);

  // Handle location selection
  const handlePickupSelect = (address: Address) => {
    setPickupLocation(address);
    setShowPickupModal(false);
  };

  const handleDeliverySelect = (address: Address) => {
    setDeliveryLocation(address);
    setShowDeliveryModal(false);
  };

  // Handle order creation
  const handleCreateOrder = async () => {
    if (!pickupLocation || !deliveryLocation) {
      Alert.alert("Missing Information", "Please select pickup and delivery locations");
      return;
    }

    if (!recipientName.trim()) {
      Alert.alert("Missing Information", "Please enter recipient name");
      return;
    }

    if (!recipientPhone.trim()) {
      Alert.alert("Missing Information", "Please enter recipient phone number");
      return;
    }

    if (!priceCalculation) {
      Alert.alert("Error", "Unable to calculate price. Please check locations.");
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        pickupAddress: pickupLocation.addressLine,
        pickupCity: pickupLocation.city,
        pickupLatitude: pickupLocation.latitude,
        pickupLongitude: pickupLocation.longitude,
        dropoffAddress: deliveryLocation.addressLine,
        dropoffCity: deliveryLocation.city,
        dropoffLatitude: deliveryLocation.latitude,
        dropoffLongitude: deliveryLocation.longitude,
        weightClass: selectedWeight,
        vehicleType: selectedVehicle,
        packageDescription: packageDescription.trim() || null,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        specialInstructions: specialInstructions.trim() || null,
        estimatedFee: priceCalculation.totalPrice,
        estimatedDistanceKm: priceCalculation.totalDistance,
      };

      const response = await expressDeliveryApi.createDelivery(orderData);
      
      if (response.success) {
        Alert.alert(
          "Order Created! 🎉",
          `Your delivery request has been submitted.\n\nOrder ID: ${response.delivery?.id}\nEstimated Fee: D${priceCalculation.totalPrice}\n\nA driver will be assigned shortly.`,
          [
            {
              text: "Track Order",
              onPress: () => router.push(`/custom-delivery/${response.delivery?.id}`),
            },
            {
              text: "Create Another",
              style: "cancel",
            },
          ]
        );

        // Reset form
        setDeliveryLocation(null);
        setPackageDescription("");
        setRecipientName("");
        setRecipientPhone("");
        setSpecialInstructions("");
        setSelectedWeight("LIGHT");
        setSelectedVehicle("BIKE");
      } else {
        Alert.alert("Error", response.message || "Failed to create delivery");
      }
    } catch (error) {
      console.error("Create delivery error:", error);
      Alert.alert("Error", "Failed to create delivery. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getLocationDisplayText = (location: Address | null, placeholder: string) => {
    if (!location) return placeholder;
    const parts = [location.addressLine, location.city].filter(Boolean);
    const full = parts.join(", ");
    return full.length > 35 ? `${full.substring(0, 35)}...` : full;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Express Delivery</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {}} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Location Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          
          {/* Pickup Location */}
          <View style={styles.locationSection}>
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, { backgroundColor: "#3B82F6" }]} />
              <Text style={styles.locationLabel}>Pickup Location</Text>
            </View>
            
            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => setShowPickupModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.locationButtonContent}>
                <Ionicons name="location" size={20} color="#3B82F6" />
                <Text style={[styles.locationButtonText, !pickupLocation && { color: "#9CA3AF" }]}>
                  {getLocationDisplayText(pickupLocation, "Select pickup location")}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Delivery Location */}
          <View style={styles.locationSection}>
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, { backgroundColor: "#10B981" }]} />
              <Text style={styles.locationLabel}>Delivery Location</Text>
            </View>
            
            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => setShowDeliveryModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.locationButtonContent}>
                <Ionicons name="location" size={20} color="#10B981" />
                <Text style={[styles.locationButtonText, !deliveryLocation && { color: "#9CA3AF" }]}>
                  {getLocationDisplayText(deliveryLocation, "Select delivery location")}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Package Weight */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Package Weight</Text>
          <View style={styles.weightGrid}>
            {(["LIGHT", "MEDIUM", "HEAVY"] as WeightClass[]).map((weight) => {
              const config = WEIGHT_CONFIG[weight];
              return (
                <ExpressWeightClassCard
                  key={weight}
                  weightClass={{
                    key: weight,
                    label: config.label,
                    description: config.description,
                    emoji: config.emoji,
                    weightRange: config.weightRange,
                    backgroundColor: config.backgroundColor,
                    borderColor: config.borderColor,
                  }}
                  selected={selectedWeight === weight}
                  onPress={() => setSelectedWeight(weight)}
                />
              );
            })}
          </View>
        </View>

        {/* Vehicle Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Type</Text>
          <View style={styles.vehicleGrid}>
            {(["BIKE", "KEKE_CARGO", "CAR", "VAN", "LORRY"] as VehicleType[]).map((vehicle) => {
              const config = VEHICLE_CONFIG[vehicle];
              return (
                <ExpressVehicleCard
                  key={vehicle}
                  vehicle={{
                    key: vehicle,
                    label: config.label,
                    description: config.description,
                    emoji: config.emoji,
                    weightRange: config.weightRange,
                    backgroundColor: config.backgroundColor,
                    borderColor: config.borderColor,
                  }}
                  selected={selectedVehicle === vehicle}
                  onPress={() => setSelectedVehicle(vehicle)}
                />
              );
            })}
          </View>
        </View>

        {/* Package Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Package Details</Text>
          
          <ModernInput
            label="Package Description (Optional)"
            value={packageDescription}
            onChangeText={setPackageDescription}
            placeholder="e.g., Documents, Food, Electronics"
            multiline
            numberOfLines={2}
          />

          <ModernInput
            label="Recipient Name"
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="Full name of recipient"
            required
          />

          <ModernInput
            label="Recipient Phone"
            value={recipientPhone}
            onChangeText={setRecipientPhone}
            placeholder="+220 XXX XXXX"
            keyboardType="phone-pad"
            required
          />

          <ModernInput
            label="Special Instructions (Optional)"
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            placeholder="Any special delivery instructions"
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Price Breakdown */}
        {priceCalculation && (
          <View style={styles.section}>
            <PriceBreakdown
              calculation={priceCalculation}
              vehicleType={selectedVehicle}
              weightClass={selectedWeight}
            />
          </View>
        )}
      </ScrollView>

      {/* Create Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, (!priceCalculation || loading) && styles.createButtonDisabled]}
          onPress={handleCreateOrder}
          disabled={!priceCalculation || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.createButtonText}>Create Delivery</Text>
              {priceCalculation && (
                <Text style={styles.createButtonPrice}>
                  D{priceCalculation.totalPrice}
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Location Modals */}
      <LocationModal
        visible={showPickupModal}
        onClose={() => setShowPickupModal(false)}
        onSelectAddress={handlePickupSelect}
        title="Select Pickup Location"
      />

      <LocationModal
        visible={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        onSelectAddress={handleDeliverySelect}
        title="Select Delivery Location"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  header: {
    backgroundColor: PrimaryColor,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  backButton: {
    padding: 8,
    marginLeft: -8,
  },

  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginLeft: -32, // Compensate for back button
  },

  headerSpacer: {
    width: 32,
  },

  scrollContainer: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 100,
  },

  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },

  locationSection: {
    marginBottom: 20,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },

  locationLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  locationButton: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FAFBFC",
    minHeight: 56,
  },

  locationButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  locationButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    marginLeft: 12,
  },

  weightGrid: {
    flexDirection: "row",
    gap: 12,
  },

  vehicleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  createButton: {
    backgroundColor: PrimaryColor,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: PrimaryColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  createButtonDisabled: {
    backgroundColor: "#9CA3AF",
    ...Platform.select({
      ios: {
        shadowOpacity: 0.1,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  createButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginRight: 8,
  },

  createButtonPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});