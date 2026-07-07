import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  ComponentSizes,
  Shadows,
} from "@/constants/DesignTokens";
import { ModernBottomSheet } from "../common/ModernBottomSheet";
import { Address } from "@/services/AddressService";
import { haversineDistance } from "@/utils/expressPriceCalculator";
import * as Location from "expo-location";

interface SavedLocationDropdownProps {
  selectedAddress: Address | null;
  onSelectAddress: (address: Address) => void;
  addresses: Address[];
  onAddNew: () => void;
  label: string;
  placeholder?: string;
  // Hide the internal label when the parent already renders its own
  // heading above this component (avoids a duplicate label).
  hideLabel?: boolean;
}

export const SavedLocationDropdown: React.FC<SavedLocationDropdownProps> = ({
  selectedAddress,
  onSelectAddress,
  addresses,
  onAddNew,
  label,
  placeholder = "Select location",
  hideLabel = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.log("Error getting location:", error);
    }
  };

  const calculateDistance = (address: Address): number | null => {
    if (!currentLocation || !address.latitude || !address.longitude)
      return null;

    return haversineDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      address.latitude,
      address.longitude,
    );
  };

  const getAddressTypeIcon = (label?: string) => {
    const labelLower = label?.toLowerCase() || "";
    if (labelLower.includes("home")) return "home";
    if (labelLower.includes("work") || labelLower.includes("office"))
      return "briefcase";
    if (labelLower.includes("school")) return "school";
    return "location";
  };

  const renderQuickActions = () => {
    const quickLocations = addresses
      .filter(
        (addr) =>
          addr.label?.toLowerCase().includes("home") ||
          addr.label?.toLowerCase().includes("work"),
      )
      .slice(0, 2);

    if (quickLocations.length === 0) return null;

    return (
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Select</Text>
        <View style={styles.quickActions}>
          {quickLocations.map((addr) => (
            <TouchableOpacity
              key={addr.id}
              style={styles.quickChip}
              onPress={() => {
                onSelectAddress(addr);
                setShowPicker(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={getAddressTypeIcon(addr.label)}
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.quickChipText}>{addr.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderAddressItem = ({ item }: { item: Address }) => {
    const distance = calculateDistance(item);
    const isSelected = selectedAddress?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.addressItem, isSelected && styles.addressItemSelected]}
        onPress={() => {
          onSelectAddress(item);
          setShowPicker(false);
        }}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            isSelected && styles.iconContainerSelected,
          ]}
        >
          <Ionicons
            name={getAddressTypeIcon(item.label)}
            size={20}
            color={isSelected ? Colors.primary : Colors.inkMid}
          />
        </View>

        <View style={styles.addressInfo}>
          <View style={styles.addressHeader}>
            <Text
              style={[styles.addressLabel, isSelected && styles.textSelected]}
            >
              {item.label || "Saved Location"}
            </Text>
            {distance !== null && (
              <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
            )}
          </View>
          <Text style={styles.addressText} numberOfLines={2}>
            {item.addressLine}
          </Text>
          {item.city && <Text style={styles.townText}>{item.city}</Text>}
        </View>

        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {!hideLabel && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.selector, selectedAddress && styles.selectorFilled]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.selectorIconWrapper,
            selectedAddress && styles.selectorIconWrapperFilled,
          ]}
        >
          <Ionicons
            name={getAddressTypeIcon(selectedAddress?.label)}
            size={20}
            color={selectedAddress ? Colors.primary : Colors.inkMid}
          />
        </View>
        <View style={styles.selectorText}>
          {selectedAddress ? (
            <>
              <Text style={styles.selectedLabel} numberOfLines={1}>
                {selectedAddress.label || "Location"}
              </Text>
              <Text style={styles.selectedAddress} numberOfLines={1}>
                {selectedAddress.addressLine}
              </Text>
            </>
          ) : (
            <Text style={styles.placeholder}>{placeholder}</Text>
          )}
        </View>
        <Ionicons name="chevron-down" size={20} color={Colors.inkLighter} />
      </TouchableOpacity>

      <ModernBottomSheet
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        size="large"
        enableDrag
        showHandle
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Select {label}</Text>

          {renderQuickActions()}

          <View style={styles.savedSection}>
            <Text style={styles.sectionTitle}>Saved Locations</Text>
            <FlatList
              data={addresses}
              renderItem={renderAddressItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>

          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              style={styles.addNewButton}
              onPress={() => {
                setShowPicker(false);
                onAddNew();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={24} color={Colors.primary} />
              <Text style={styles.addNewText}>Add New Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ModernBottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  label: {
    ...Typography.subheadlineMedium,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },

  // ── Trigger (restyled to match locationButton pattern) ──
  selector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  selectorFilled: {
    backgroundColor: Colors.primaryFaint,
    borderColor: Colors.primaryGlow,
    ...Shadows.md,
  },
  selectorIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  selectorIconWrapperFilled: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primaryGlow,
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  selectorText: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.ink,
    lineHeight: 22,
    marginBottom: 3,
  },
  selectedAddress: {
    ...Typography.footnote,
    color: Colors.inkMid,
  },
  placeholder: {
    fontSize: 12,
    color: Colors.inkLight,
    fontWeight: "500",
    lineHeight: 16,
  },

  // ── Bottom sheet content (unchanged) ──
  sheetContent: {
    flex: 1,
  },
  sheetTitle: {
    ...Typography.h2,
    color: Colors.ink,
    marginBottom: Spacing.lg,
  },
  quickActionsContainer: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.subheadlineMedium,
    color: Colors.inkMid,
    marginBottom: Spacing.sm,
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
  },
  quickChipText: {
    ...Typography.subheadlineMedium,
    color: Colors.primary,
  },
  savedSection: {
    flex: 1,
    marginBottom: Spacing.base,
  },
  listContent: {
    paddingBottom: Spacing.base,
  },
  addressItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  addressItemSelected: {
    backgroundColor: Colors.primaryFaint,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerSelected: {
    backgroundColor: Colors.primaryGlow,
  },
  addressInfo: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  addressLabel: {
    ...Typography.bodyMedium,
    color: Colors.ink,
  },
  textSelected: {
    color: Colors.primary,
  },
  distanceText: {
    ...Typography.caption,
    color: Colors.inkLight,
  },
  addressText: {
    ...Typography.caption,
    color: Colors.inkMid,
    marginBottom: 2,
  },
  townText: {
    ...Typography.caption,
    color: Colors.inkLight,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.xs,
  },
  bottomButtonContainer: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.base,
  },
  addNewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: "dashed",
  },
  addNewText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },
});
