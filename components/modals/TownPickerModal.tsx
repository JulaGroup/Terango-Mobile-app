/**
 * Town Picker Modal
 * For selecting Gambian towns/areas when ordering for someone else
 * Delivery fees are fetched dynamically from admin panel
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
  Platform,
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
}

export default function TownPickerModal({
  visible,
  onClose,
  onSelectTown,
  selectedTownId,
}: TownPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(
    new Set(["Kanifing", "Banjul"])
  );

  // Fetch dynamic delivery settings from admin panel
  const { loading: settingsLoading, getZoneFee } = useDeliverySettings();

  // Filter towns based on search
  const filteredTowns = useMemo(() => {
    if (searchQuery.trim()) {
      return searchTowns(searchQuery);
    }
    return null; // Return null to show grouped view
  }, [searchQuery]);

  const toggleArea = (area: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(area)) {
      newExpanded.delete(area);
    } else {
      newExpanded.add(area);
    }
    setExpandedAreas(newExpanded);
  };

  const handleSelectTown = (town: GambianTown) => {
    onSelectTown(town);
    onClose();
    setSearchQuery("");
  };

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case "zone1":
        return "#22C55E"; // Green
      case "zone2":
        return "#3B82F6"; // Blue
      case "zone3":
        return "#F59E0B"; // Yellow/Orange
      case "zone4":
        return "#EF4444"; // Red
      default:
        return "#6B7280";
    }
  };

  // Get the delivery fee for a zone - uses dynamic settings or fallback
  const getDeliveryFeeForZone = (zone: "zone1" | "zone2" | "zone3"): number => {
    return getZoneFee(zone);
  };

  const renderTownItem = (town: GambianTown) => {
    const isSelected = town.id === selectedTownId;
    const deliveryFee = getDeliveryFeeForZone(town.deliveryZone);

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
                { backgroundColor: getZoneColor(town.deliveryZone) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.zoneBadgeText,
                  { color: getZoneColor(town.deliveryZone) },
                ]}
              >
                D{deliveryFee}
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

  // Dynamic zone legend using API prices
  const zoneLegendData = useMemo(() => {
    return [
      { key: "zone1", fee: getZoneFee("zone1") },
      { key: "zone2", fee: getZoneFee("zone2") },
      { key: "zone3", fee: getZoneFee("zone3") },
    ];
  }, [getZoneFee]);

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

        {/* Delivery Zone Legend */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Delivery Zones:</Text>
          {settingsLoading ? (
            <ActivityIndicator
              size="small"
              color={PrimaryColor}
              style={{ marginLeft: 8 }}
            />
          ) : (
            <View style={styles.legendItems}>
              {zoneLegendData.map(({ key, fee }) => (
                <View key={key} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: getZoneColor(key) },
                    ]}
                  />
                  <Text style={styles.legendText}>D{fee}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Towns List */}
        {filteredTowns ? (
          // Search results
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
          // Grouped view
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
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
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
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  headerRight: {
    width: 32,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#111827",
  },
  legendContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  listContent: {
    paddingBottom: 24,
  },
  areaSection: {
    backgroundColor: "#fff",
    marginTop: 8,
  },
  areaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  areaHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  areaTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  areaCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  townsList: {
    paddingHorizontal: 16,
  },
  townItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingLeft: 28,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  townItemSelected: {
    backgroundColor: `${PrimaryColor}08`,
  },
  townInfo: {
    flex: 1,
  },
  townName: {
    fontSize: 15,
    color: "#374151",
    marginBottom: 2,
  },
  townNameSelected: {
    color: PrimaryColor,
    fontWeight: "600",
  },
  townMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  townArea: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  zoneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  zoneBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
});
