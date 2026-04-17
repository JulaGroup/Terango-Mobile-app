import React, { useState, useRef, useEffect } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { GAMBIAN_TOWNS, GambianTown } from "@/constants/gambianTowns";

interface ModernLocationPickerProps {
  label: string;
  placeholder?: string;
  selectedTown: GambianTown | null;
  onSelect: (town: GambianTown) => void;
  allowGPS?: boolean;
  onGPSLocation?: (lat: number, lon: number, address: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

const GAMBIA_BOUNDS = {
  minLat: 13.0,
  maxLat: 14.0,
  minLng: -17.0,
  maxLng: -13.5,
};

const isWithinGambia = (lat: number, lng: number) => {
  return (
    lat >= GAMBIA_BOUNDS.minLat &&
    lat <= GAMBIA_BOUNDS.maxLat &&
    lng >= GAMBIA_BOUNDS.minLng &&
    lng <= GAMBIA_BOUNDS.maxLng
  );
};

export const ModernLocationPicker: React.FC<ModernLocationPickerProps> = ({
  label,
  placeholder = "Choose location",
  selectedTown,
  onSelect,
  allowGPS = false,
  onGPSLocation,
  icon = "location",
}) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [dropdownHeight] = useState(new Animated.Value(0));
  const [dropdownOpacity] = useState(new Animated.Value(0));
  const inputRef = useRef<TextInput>(null);

  const normalizedSearchQuery =
    typeof searchQuery === "string" ? searchQuery.toLowerCase() : "";

  const filteredTowns = GAMBIAN_TOWNS.filter((town) => {
    const townName = typeof town?.name === "string" ? town.name : "";
    return townName.toLowerCase().includes(normalizedSearchQuery);
  });

  const groupedTowns: Record<string, GambianTown[]> = {};
  filteredTowns.forEach((town) => {
    const areaName =
      typeof town?.area === "string" && town.area.trim() ? town.area : "Other";
    if (!groupedTowns[areaName]) {
      groupedTowns[areaName] = [];
    }
    groupedTowns[areaName].push(town);
  });

  const handleTownSelect = (town: GambianTown) => {
    onSelect(town);
    closeDropdown();
  };

  const openDropdown = () => {
    setDropdownVisible(true);
    setSearchQuery("");

    Animated.parallel([
      Animated.spring(dropdownHeight, {
        toValue: 300,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(dropdownOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();

    // Focus search input after animation
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const closeDropdown = () => {
    Keyboard.dismiss();
    setSearchQuery("");

    Animated.parallel([
      Animated.spring(dropdownHeight, {
        toValue: 0,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(dropdownOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setDropdownVisible(false);
    });
  };

  // Close dropdown when keyboard hides
  useEffect(() => {
    const keyboardListener = Keyboard.addListener("keyboardDidHide", () => {
      if (dropdownVisible && !searchQuery) {
        closeDropdown();
      }
    });

    return () => keyboardListener?.remove();
  }, [dropdownVisible, searchQuery]);
  const handleUseCurrentLocation = async () => {
    if (!onGPSLocation) return;

    try {
      setLoadingGPS(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Access Required",
          "Please enable location services to use your current location.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => Location.requestForegroundPermissionsAsync(),
            },
          ],
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (
        !isWithinGambia(position.coords.latitude, position.coords.longitude)
      ) {
        Alert.alert(
          "Service Area Restriction",
          "TeranGO Express is currently available within The Gambia only. Please select a location within our service area.",
        );
        return;
      }

      // Find nearest town
      let nearestTown: GambianTown | null = null;
      let minDistance = Infinity;

      GAMBIAN_TOWNS.forEach((town) => {
        const distance = Math.sqrt(
          Math.pow(town.latitude - position.coords.latitude, 2) +
            Math.pow(town.longitude - position.coords.longitude, 2),
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestTown = town;
        }
      });

      if (nearestTown) {
        onSelect(nearestTown);
        onGPSLocation(
          position.coords.latitude,
          position.coords.longitude,
          `Near ${nearestTown.name}`,
        );
      }

      closeDropdown();
    } catch (error: any) {
      console.error("Failed to get current location", error);
      Alert.alert(
        "Location Error",
        "Unable to access your location. Please check your settings and try again.",
      );
    } finally {
      setLoadingGPS(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {/* Dropdown Trigger */}
      <TouchableOpacity
        style={[
          styles.inputContainer,
          selectedTown && styles.inputContainerFilled,
          dropdownVisible && styles.inputContainerActive,
        ]}
        onPress={dropdownVisible ? closeDropdown : openDropdown}
        activeOpacity={0.7}
      >
        <View style={styles.inputContent}>
          <View style={styles.iconWrapper}>
            <Ionicons
              name={icon}
              size={20}
              color={selectedTown ? "#059669" : "#6B7280"}
            />
          </View>

          <View style={styles.textContent}>
            <Text
              style={[
                styles.inputText,
                !selectedTown && styles.placeholderText,
              ]}
            >
              {selectedTown ? selectedTown.name : placeholder}
            </Text>
            {selectedTown && selectedTown.area && (
              <Text style={styles.areaText}>{selectedTown.area}</Text>
            )}
          </View>

          <Ionicons
            name={dropdownVisible ? "chevron-up" : "chevron-down"}
            size={20}
            color="#9CA3AF"
          />
        </View>
      </TouchableOpacity>

      {/* Dropdown Content */}
      {dropdownVisible && (
        <Animated.View
          style={[
            styles.dropdownContainer,
            {
              height: dropdownHeight,
              opacity: dropdownOpacity,
            },
          ]}
        >
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search locations..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* GPS Option */}
          {allowGPS && onGPSLocation && (
            <TouchableOpacity
              style={styles.gpsOption}
              onPress={handleUseCurrentLocation}
              disabled={loadingGPS}
              activeOpacity={0.7}
            >
              <View style={styles.gpsIconWrapper}>
                {loadingGPS ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <Ionicons name="navigate" size={18} color="#059669" />
                )}
              </View>
              <View style={styles.gpsTextContent}>
                <Text style={styles.gpsText}>
                  {loadingGPS ? "Getting location..." : "Use current location"}
                </Text>
                <Text style={styles.gpsSubtext}>
                  We&apos;ll find the nearest location
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Towns List */}
          <ScrollView
            style={styles.townsList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {Object.keys(groupedTowns).map((area) => (
              <View key={area} style={styles.areaGroup}>
                <Text style={styles.areaHeader}>{area}</Text>
                {groupedTowns[area].map((town) => (
                  <TouchableOpacity
                    key={town.id}
                    style={[
                      styles.townOption,
                      selectedTown?.id === town.id && styles.selectedTownOption,
                    ]}
                    onPress={() => handleTownSelect(town)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.townContent}>
                      <Text
                        style={[
                          styles.townName,
                          selectedTown?.id === town.id &&
                            styles.selectedTownName,
                        ]}
                      >
                        {town.name}
                      </Text>
                      <Text style={styles.townArea}>{town.area}</Text>
                    </View>
                    {selectedTown?.id === town.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#059669"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {filteredTowns.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color="#E5E7EB" />
                <Text style={styles.emptyTitle}>No locations found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your search terms
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  inputContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputContainerFilled: {
    backgroundColor: "#F0FDF4",
    borderColor: "#10B981",
  },
  inputContainerActive: {
    borderColor: "#059669",
  },
  inputContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContent: {
    flex: 1,
  },
  inputText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 20,
  },
  placeholderText: {
    color: "#9CA3AF",
    fontWeight: "500",
  },
  areaText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  dropdownContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 8,
    overflow: "hidden",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  gpsOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 12,
  },
  gpsIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  gpsTextContent: {
    flex: 1,
  },
  gpsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
  },
  gpsSubtext: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  townsList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  areaGroup: {
    marginBottom: 16,
  },
  areaHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  townOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 6,
  },
  selectedTownOption: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  townContent: {
    flex: 1,
  },
  townName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  selectedTownName: {
    color: "#059669",
  },
  townArea: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.2,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
  },
  clearButton: {
    padding: 4,
  },
  gpsButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  gpsButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  gpsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#059669",
  },
  locationsList: {
    flex: 1,
  },
  locationsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  areaSection: {
    marginBottom: 24,
  },
  areaSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    paddingLeft: 4,
  },
  locationItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  locationItemSelected: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  locationItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 20,
  },
  locationNameSelected: {
    color: "#059669",
  },
  locationArea: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
});
