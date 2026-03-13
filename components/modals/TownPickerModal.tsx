/**
 * Town Picker Modal
 * For selecting Gambian towns/areas when ordering for someone else
 * Shows actual vehicle-based delivery fee per town when pricing info is available.
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import {
  TOWNS_BY_AREA,
  GambianTown,
  searchTowns,
} from "@/constants/gambianTowns";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";

interface TownPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTown: (town: GambianTown) => void;
  selectedTownId?: string;
  // Vehicle-based pricing info (from delivery estimate)
  vehicleType?: string; // e.g. "KEKE_CARGO"
  vehicleBaseFee?: number; // e.g. 100
  vehiclePerKmFee?: number; // e.g. 15
  vendorLatitude?: number;
  vendorLongitude?: number;
}

// Haversine formula â€“ returns km between two lat/lng points
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const VEHICLE_EMOJI: Record<string, string> = {
  BIKE: "\u{1F3CD}",
  KEKE_CARGO: "\u{1F6FA}",
  CAR: "\u{1F697}",
  VAN: "\u{1F690}",
  LORRY: "\u{1F69A}",
};

export default function TownPickerModal({
  visible,
  onClose,
  onSelectTown,
  selectedTownId,
  vehicleType,
  vehicleBaseFee,
  vehiclePerKmFee,
  vendorLatitude,
  vendorLongitude,
}: TownPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(
    new Set(["Kanifing", "Banjul"]),
  );

  const { loading: settingsLoading, getZoneFee } = useDeliverySettings();

  // Whether we can show precise vehicle-based fees per town
  const hasVehiclePricing =
    vehicleBaseFee !== undefined &&
    vehiclePerKmFee !== undefined &&
    vendorLatitude !== undefined &&
    vendorLongitude !== undefined;

  /** Compute actual fee for a town: base + distance * perKm */
  const getActualFee = (town: GambianTown): number => {
    if (!hasVehiclePricing) return getZoneFee(town.deliveryZone);
    const km = haversineKm(
      vendorLatitude!,
      vendorLongitude!,
      town.latitude,
      town.longitude,
    );
    return Math.round(vehicleBaseFee! + km * vehiclePerKmFee!);
  };

  const filteredTowns = useMemo(() => {
    if (searchQuery.trim()) return searchTowns(searchQuery);
    return null;
  }, [searchQuery]);

  const toggleArea = (area: string) => {
    const next = new Set(expandedAreas);
    if (next.has(area)) next.delete(area);
    else next.add(area);
    setExpandedAreas(next);
  };

  const handleSelectTown = (town: GambianTown) => {
    onSelectTown(town);
    onClose();
    setSearchQuery("");
  };

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case "zone1":
        return "#22C55E";
      case "zone2":
        return "#3B82F6";
      case "zone3":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const renderTownItem = (town: GambianTown) => {
    const isSelected = town.id === selectedTownId;
    const fee = getActualFee(town);
    const emoji = vehicleType
      ? (VEHICLE_EMOJI[vehicleType] ?? "\u{1F69B}")
      : null;

    return (
      <TouchableOpacity
        key={town.id}
        style={[styles.townItem, isSelected && styles.townItemSelected]}
        onPress={() => handleSelectTown(town)}
        activeOpacity={0.7}
      >
        <View style={styles.townInfo}>
          <Text
            style={[styles.townName, isSelected && styles.townNameSelected]}
          >
            {town.name}
          </Text>
          <View style={styles.townMeta}>
            <Text style={styles.townArea}>{town.area}</Text>
            <View
              style={[
                styles.zoneBadge,
                hasVehiclePricing
                  ? styles.zoneBadgeVehicle
                  : { backgroundColor: getZoneColor(town.deliveryZone) + "20" },
              ]}
            >
              {emoji && <Text style={styles.zoneBadgeEmoji}>{emoji}</Text>}
              <Text
                style={[
                  styles.zoneBadgeText,
                  hasVehiclePricing
                    ? styles.zoneBadgeTextVehicle
                    : { color: getZoneColor(town.deliveryZone) },
                ]}
              >
                D{fee}
              </Text>
            </View>
          </View>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={PrimaryColor} />
        )}
      </TouchableOpacity>
    );
  };

  const renderAreaSection = (area: string, towns: GambianTown[]) => {
    const isExpanded = expandedAreas.has(area);
    return (
      <View key={area} style={styles.areaSection}>
        <TouchableOpacity
          style={styles.areaHeader}
          onPress={() => toggleArea(area)}
          activeOpacity={0.7}
        >
          <View style={styles.areaHeaderLeft}>
            <Ionicons
              name={isExpanded ? "chevron-down" : "chevron-forward"}
              size={20}
              color="#6B7280"
            />
            <Text style={styles.areaTitle}>{area}</Text>
          </View>
          <Text style={styles.areaCount}>{towns.length} locations</Text>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.townsList}>{towns.map(renderTownItem)}</View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Town/Area</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Pricing context banner */}
        <View
          style={[
            styles.pricingBanner,
            hasVehiclePricing
              ? styles.pricingBannerVehicle
              : styles.pricingBannerFallback,
          ]}
        >
          {settingsLoading && !hasVehiclePricing ? (
            <ActivityIndicator size="small" color={PrimaryColor} />
          ) : hasVehiclePricing ? (
            <>
              <Text style={styles.pricingBannerEmoji}>
                {VEHICLE_EMOJI[vehicleType!] ?? "\u{1F69B}"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pricingBannerTitle}>
                  {vehicleType?.replace("_", " ")} pricing
                </Text>
                <Text style={styles.pricingBannerSub}>
                  D{vehicleBaseFee} base + D{vehiclePerKmFee}/km Â· prices
                  update per town
                </Text>
              </View>
            </>
          ) : (
            <>
              <Ionicons name="pricetag-outline" size={16} color="#92400E" />
              <Text
                style={[
                  styles.pricingBannerSub,
                  { color: "#92400E", marginLeft: 6 },
                ]}
              >
                Add items to cart for vehicle-based pricing
              </Text>
            </>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search towns or areas..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Towns List */}
        {filteredTowns ? (
          <FlatList
            data={filteredTowns}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderTownItem(item)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No towns found</Text>
                <Text style={styles.emptySubtext}>
                  Try a different search term
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={Object.entries(TOWNS_BY_AREA)}
            keyExtractor={([area]) => area}
            renderItem={({ item: [area, towns] }) =>
              renderAreaSection(area, towns)
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  closeButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  headerRight: { width: 32 },

  /* Pricing banner */
  pricingBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pricingBannerVehicle: {
    backgroundColor: "#EFF6FF",
    borderBottomWidth: 1,
    borderBottomColor: "#BFDBFE",
  },
  pricingBannerFallback: {
    backgroundColor: "#FFFBEB",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  pricingBannerEmoji: { fontSize: 22 },
  pricingBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
    textTransform: "capitalize",
  },
  pricingBannerSub: {
    fontSize: 11,
    color: "#3B82F6",
    marginTop: 1,
  },

  /* Search */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111827" },

  /* List */
  listContent: { paddingBottom: 24 },
  areaSection: { backgroundColor: "#fff", marginTop: 8 },
  areaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  areaHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  areaTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  areaCount: { fontSize: 12, color: "#9CA3AF" },
  townsList: { paddingHorizontal: 16 },
  townItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingLeft: 28,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  townItemSelected: { backgroundColor: `${PrimaryColor}08` },
  townInfo: { flex: 1 },
  townName: { fontSize: 15, color: "#374151", marginBottom: 2 },
  townNameSelected: { color: PrimaryColor, fontWeight: "600" },
  townMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  townArea: { fontSize: 12, color: "#9CA3AF" },
  zoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  zoneBadgeVehicle: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  zoneBadgeEmoji: { fontSize: 12 },
  zoneBadgeText: { fontSize: 11, fontWeight: "700" },
  zoneBadgeTextVehicle: { color: "#1E40AF" },

  /* Empty */
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 12,
  },
  emptySubtext: { fontSize: 14, color: "#9CA3AF", marginTop: 4 },
});
