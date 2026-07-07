import React, { useState, useEffect } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { GOOGLE_PLACES_API_KEY as FALLBACK_GOOGLE_PLACES_API_KEY } from "@/constants/config";
import {
  GAMBIAN_TOWNS,
  GambianTown,
  DELIVERY_ZONES,
} from "@/constants/gambianTowns";
import { Colors, Radius, Shadows } from "@/constants/DesignTokens";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const PRIMARY = Colors.primary;
const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || FALLBACK_GOOGLE_PLACES_API_KEY;

// const hasValidGooglePlacesKey = (key?: string) => {
//   if (!key) return false;
//   const normalized = key.trim();
//   if (!normalized) return false;
//   if (normalized.includes("YOUR_ACTUAL_API_KEY_HERE")) return false;
//   if (normalized.includes("YOUR_GOOGLE_PLACES_API_KEY_HERE")) return false;
//   return normalized.length > 10;
// };

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (town: GambianTown) => void;
  selectedTown: GambianTown | null;
  title: string;
  allowGPS?: boolean;
  allowGooglePlaces?: boolean;
  groupByZone?: boolean;
  showLocationMeta?: boolean;
  onGPSLocation?: (lat: number, lon: number, address: string) => void;
  // Optional dynamic towns list (e.g. fetched from the admin panel).
  // Falls back to the static GAMBIAN_TOWNS list when not provided.
  towns?: GambianTown[];
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

const findNearestTown = (
  latitude: number,
  longitude: number,
  towns: GambianTown[],
): GambianTown | null => {
  let nearestTown: GambianTown | null = null;
  let minDistance = Infinity;

  towns.forEach((town) => {
    const distance = Math.sqrt(
      Math.pow(town.latitude - latitude, 2) +
        Math.pow(town.longitude - longitude, 2),
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestTown = town;
    }
  });

  return nearestTown;
};

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedTown,
  title,
  allowGPS = false,
  allowGooglePlaces = true,
  groupByZone = false,
  showLocationMeta = true,
  onGPSLocation,
  towns = GAMBIAN_TOWNS,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
  const [backdropOpacity] = useState(new Animated.Value(0));
  // Google Places temporarily disabled: use built-in Gambian towns only.
  // Keep this logic for future re-enable:
  // const placesEnabled =
  //   allowGooglePlaces && hasValidGooglePlacesKey(GOOGLE_PLACES_API_KEY);
  const placesEnabled = false;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  const normalizedSearchQuery =
    typeof searchQuery === "string" ? searchQuery.toLowerCase() : "";

  const filteredTowns = towns.filter((town) => {
    const townName = typeof town?.name === "string" ? town.name : "";
    const townArea = typeof town?.area === "string" ? town.area : "";
    return (
      townName.toLowerCase().includes(normalizedSearchQuery) ||
      townArea.toLowerCase().includes(normalizedSearchQuery)
    );
  });

  const groupedTowns: Record<string, GambianTown[]> = {};
  filteredTowns.forEach((town) => {
    const groupKey = groupByZone
      ? (DELIVERY_ZONES[town.deliveryZone]?.name ?? town.deliveryZone)
      : town.area;

    if (!groupedTowns[groupKey]) {
      groupedTowns[groupKey] = [];
    }
    groupedTowns[groupKey].push(town);
  });

  const groupKeys = Object.keys(groupedTowns);

  if (groupByZone) {
    groupKeys.sort((a, b) => {
      const aZone = Object.values(DELIVERY_ZONES).find((z) => z.name === a);
      const bZone = Object.values(DELIVERY_ZONES).find((z) => z.name === b);
      const aFee = aZone?.baseFee ?? Number.MAX_SAFE_INTEGER;
      const bFee = bZone?.baseFee ?? Number.MAX_SAFE_INTEGER;
      return aFee - bFee;
    });
  }

  const handleSelect = (town: GambianTown) => {
    onSelect(town);
    setSearchQuery("");
    onClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={Colors.inkMid} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchSection}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={Colors.inkLighter} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search locations..."
                placeholderTextColor={Colors.inkLighter}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery("")}
                  activeOpacity={0.6}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.inkLighter} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Places Autocomplete */}
          {placesEnabled && (
            <View style={styles.autocompleteSection}>
              <GooglePlacesAutocomplete
                placeholder="Search detailed addresses"
                fetchDetails
                onPress={(data, details = null) => {
                  const latitude = details?.geometry?.location?.lat;
                  const longitude = details?.geometry?.location?.lng;

                  if (
                    typeof latitude !== "number" ||
                    typeof longitude !== "number"
                  ) {
                    return;
                  }

                  if (!isWithinGambia(latitude, longitude)) {
                    Alert.alert(
                      "Service Area Restriction",
                      "Please choose an address inside The Gambia.",
                    );
                    return;
                  }

                  const nearestTown = findNearestTown(
                    latitude,
                    longitude,
                    towns,
                  );
                  if (!nearestTown) {
                    return;
                  }

                  onSelect(nearestTown);
                  onGPSLocation?.(
                    latitude,
                    longitude,
                    data.description || nearestTown.name,
                  );
                  setSearchQuery(data.description || nearestTown.name);
                  onClose();
                }}
                query={{
                  key: GOOGLE_PLACES_API_KEY,
                  language: "en",
                  components: "country:gm",
                }}
                textInputProps={{
                  placeholderTextColor: Colors.inkLighter,
                }}
                enablePoweredByContainer={false}
                styles={{
                  container: styles.autocompleteContainer,
                  textInputContainer: styles.autocompleteInputContainer,
                  textInput: styles.autocompleteInput,
                  listView: styles.autocompleteList,
                  row: styles.autocompleteRow,
                  description: styles.autocompleteDescription,
                }}
              />
            </View>
          )}

          {/* Locations List */}
          <ScrollView
            style={styles.locationsList}
            contentContainerStyle={styles.locationsListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {groupKeys.length > 0 ? (
              groupKeys.map((group) => (
                <View key={group} style={styles.areaSection}>
                  <Text style={styles.areaSectionTitle}>{group}</Text>
                  {groupedTowns[group].map((town) => {
                    const isSelected = selectedTown?.id === town.id;
                    const zoneInfo = DELIVERY_ZONES[town.deliveryZone];

                    return (
                      <TouchableOpacity
                        key={town.id}
                        style={[
                          styles.locationItem,
                          isSelected && styles.locationItemSelected,
                        ]}
                        onPress={() => handleSelect(town)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.locationItemContent}>
                          <View
                            style={[
                              styles.locationIconContainer,
                              isSelected &&
                                styles.locationIconContainerSelected,
                            ]}
                          >
                            <Ionicons
                              name="location"
                              size={20}
                              color={isSelected ? PRIMARY : Colors.inkMid}
                            />
                          </View>

                          <View style={styles.locationTextContainer}>
                            <Text
                              style={[
                                styles.locationName,
                                isSelected && styles.locationNameSelected,
                              ]}
                            >
                              {town.name}
                            </Text>
                            {showLocationMeta && (
                              <Text style={styles.locationArea}>
                                {town.area} • {zoneInfo.name} (D
                                {zoneInfo.baseFee})
                              </Text>
                            )}
                          </View>

                          {isSelected && (
                            <View style={styles.checkmarkContainer}>
                              <Ionicons
                                name="checkmark-circle"
                                size={24}
                                color={PRIMARY}
                              />
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="search" size={64} color={Colors.divider} />
                </View>
                <Text style={styles.emptyTitle}>No locations found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your search terms or browse all locations
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.black,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    height: SCREEN_HEIGHT * 0.85,
    ...Shadows.xl,
  },
  modalHeader: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.divider,
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
    fontSize: 22,
    fontWeight: "800",
    color: Colors.ink,
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: Colors.bg,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    paddingHorizontal: 16,
    gap: 12,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.ink,
    fontWeight: "500",
  },
  autocompleteSection: {
    marginHorizontal: 20,
    marginBottom: 12,
    zIndex: 10,
  },
  autocompleteContainer: {
    flex: 0,
  },
  autocompleteInputContainer: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  autocompleteInput: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: Colors.ink,
  },
  autocompleteList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginTop: 6,
  },
  autocompleteRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  autocompleteDescription: {
    color: Colors.ink,
    fontSize: 14,
  },
  clearButton: {
    padding: 4,
  },
  locationsList: {
    flex: 1,
  },
  locationsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  areaSection: {
    marginBottom: 28,
  },
  areaSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.inkMid,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    paddingLeft: 4,
  },
  locationItem: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.bg,
    ...Shadows.sm,
  },
  locationItemSelected: {
    backgroundColor: Colors.primaryFaint,
    borderColor: Colors.primaryGlow,
    ...Shadows.md,
  },
  locationItemContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  locationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  locationIconContainerSelected: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primaryGlow,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.ink,
    lineHeight: 22,
    marginBottom: 4,
  },
  locationNameSelected: {
    color: PRIMARY,
  },
  locationArea: {
    fontSize: 14,
    color: Colors.inkMid,
    fontWeight: "500",
    lineHeight: 18,
  },
  checkmarkContainer: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.ink,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.inkMid,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 32,
  },
});
