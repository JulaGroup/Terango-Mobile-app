/**
 * Example: How to Integrate Modern Components into Express Page
 * 
 * This shows how to update your app/custom-delivery/index.tsx
 * to use the new modern components
 */

import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// NEW: Import modern components
import { SavedLocationDropdown } from "@/components/express/SavedLocationDropdown";
import { PriceBreakdown } from "@/components/express/PriceBreakdown";
import { ModernInput } from "@/components/common/ModernInput";
import { ModernBottomSheet } from "@/components/common/ModernBottomSheet";
import { Colors, Typography, Spacing, Radius, Shadows } from "@/constants/DesignTokens";

// Existing imports
import { useAddress } from "@/context/AddressContext";
import { calculateDeliveryPrice } from "@/utils/expressPriceCalculator";
import { ExpressVehicleCard } from "@/components/express/ExpressVehicleCard";
import { ExpressWeightClassCard } from "@/components/express/ExpressWeightClassCard";

export default function ModernExpressPage() {
  const { addresses, defaultAddress, addAddress } = useAddress();
  
  // State
  const [pickupAddress, setPickupAddress] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState("BIKE");
  const [selectedWeight, setSelectedWeight] = useState("LIGHT");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [priceCalculation, setPriceCalculation] = useState(null);

  // Calculate price when locations/vehicle/weight change
  useEffect(() => {
    if (pickupAddress && deliveryAddress) {
      const calc = calculateDeliveryPrice(
        pickupAddress.latitude,
        pickupAddress.longitude,
        deliveryAddress.latitude,
        deliveryAddress.longitude,
        selectedVehicle,
        selectedWeight
      );
      setPriceCalculation(calc);
    }
  }, [pickupAddress, deliveryAddress, selectedVehicle, selectedWeight]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>TeranGO Express</Text>
            <Text style={styles.subtitle}>Fast & Reliable Delivery</Text>
          </View>
          <View style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={24} color={Colors.primary} />
          </View>
        </View>

        {/* Step 1: Locations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Pickup & Delivery</Text>
          </View>

          {/* NEW: Modern Location Dropdowns */}
          <SavedLocationDropdown
            label="Pickup From"
            selectedAddress={pickupAddress}
            onSelectAddress={setPickupAddress}
            addresses={addresses}
            onAddNew={() => setShowAddressModal(true)}
            placeholder="Where should we pick up?"
          />

          <SavedLocationDropdown
            label="Deliver To"
            selectedAddress={deliveryAddress}
            onSelectAddress={setDeliveryAddress}
            addresses={addresses}
            onAddNew={() => setShowAddressModal(true)}
            placeholder="Where should we deliver?"
          />
        </View>

        {/* Step 2: Package Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Package Details</Text>
          </View>

          {/* Weight Selection */}
          <Text style={styles.label}>Package Weight</Text>
          <View style={styles.weightGrid}>
            <ExpressWeightClassCard
              weight="LIGHT"
              selected={selectedWeight === "LIGHT"}
              onSelect={() => setSelectedWeight("LIGHT")}
            />
            <ExpressWeightClassCard
              weight="MEDIUM"
              selected={selectedWeight === "MEDIUM"}
              onSelect={() => setSelectedWeight("MEDIUM")}
            />
            <ExpressWeightClassCard
              weight="HEAVY"
              selected={selectedWeight === "HEAVY"}
              onSelect={() => setSelectedWeight("HEAVY")}
            />
          </View>

          {/* Notes */}
          <ModernInput
            label="Delivery Instructions (Optional)"
            value={notes}
            onChangeText={setNotes}
            leftIcon="document-text-outline"
            placeholder="E.g., Fragile, Handle with care"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Step 3: Vehicle Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={styles.sectionTitle}>Choose Vehicle</Text>
          </View>

          <View style={styles.vehicleGrid}>
            {["BIKE", "KEKE_CARGO", "CAR", "VAN", "LORRY"].map((vehicle) => (
              <ExpressVehicleCard
                key={vehicle}
                vehicle={vehicle}
                selected={selectedVehicle === vehicle}
                onSelect={() => setSelectedVehicle(vehicle)}
                priceHint={priceCalculation ? `D${priceCalculation.estimatedPrice}` : undefined}
              />
            ))}
          </View>
        </View>

        {/* Step 4: Recipient Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>4</Text>
            </View>
            <Text style={styles.sectionTitle}>Recipient Details</Text>
          </View>

          {/* NEW: Modern Inputs */}
          <ModernInput
            label="Recipient Name"
            value={recipientName}
            onChangeText={setRecipientName}
            leftIcon="person-outline"
            placeholder="Enter recipient name"
          />

          <ModernInput
            label="Recipient Phone"
            value={recipientPhone}
            onChangeText={setRecipientPhone}
            leftIcon="call-outline"
            keyboardType="phone-pad"
            placeholder="+220 XXX XXXX"
          />
        </View>

        {/* Price Breakdown */}
        {priceCalculation && (
          <View style={styles.section}>
            <PriceBreakdown
              baseFee={priceCalculation.breakdown.baseFee}
              distanceFee={priceCalculation.breakdown.distanceFee}
              serviceFee={0} // Calculate if needed
              totalFee={priceCalculation.estimatedPrice}
              deliveryDistance={priceCalculation.distanceKm}
              estimatedTime={priceCalculation.estimatedTimeMinutes}
              vehicleType={priceCalculation.vehicleType}
              showPickupNote
            />
          </View>
        )}

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating CTA Button */}
      {priceCalculation && (
        <View style={styles.floatingFooter}>
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.8}
            onPress={() => {
              // Handle booking
              console.log("Book delivery");
            }}
          >
            <View style={styles.ctaContent}>
              <Text style={styles.ctaLabel}>Book Now</Text>
              <Text style={styles.ctaPrice}>D{priceCalculation.estimatedPrice}</Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={Colors.surface} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  title: {
    ...Typography.h1,
    color: Colors.ink,
  },
  subtitle: {
    ...Typography.subheadline,
    color: Colors.inkLight,
    marginTop: 2,
  },
  helpButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryFaint,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    padding: Spacing.lg,
    gap: Spacing.base,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    ...Typography.bodyBold,
    color: Colors.surface,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.ink,
  },
  label: {
    ...Typography.subheadlineMedium,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  weightGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  vehicleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  floatingFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    ...Shadows.xl,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    ...Shadows.lg,
  },
  ctaContent: {
    flex: 1,
  },
  ctaLabel: {
    ...Typography.bodyMedium,
    color: Colors.surface,
    marginBottom: 2,
  },
  ctaPrice: {
    ...Typography.h2,
    color: Colors.surface,
  },
});
