import React, { useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import {
  GAMBIAN_TOWNS,
  GambianTown,
  TOWNS_BY_AREA,
} from "@/constants/gambianTowns";

interface ExpressLocationPickerProps {
  label: string;
  selectedTown: GambianTown | null;
  onSelect: (town: GambianTown) => void;
  allowGPS?: boolean;
  onGPSLocation?: (lat: number, lon: number, address: string) => void;
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

export const ExpressLocationPicker: React.FC<ExpressLocationPickerProps> = ({
  label,
  selectedTown,
  onSelect,
  allowGPS = false,
  onGPSLocation,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingGPS, setLoadingGPS] = useState(false);

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
    setModalVisible(false);
    setSearchQuery("");
  };

  const handleUseCurrentLocation = async () => {
    if (!onGPSLocation) return;

    try {
      setLoadingGPS(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission needed",
          "Please allow location access to use your current location.",
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
          "Gambia only",
          "TeranGO Express is currently available within The Gambia only.",
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

      setModalVisible(false);
    } catch (error: any) {
      console.error("Failed to get current location", error);
      Alert.alert(
        "Could not get location",
        error?.message || "Please try again or select a town manually.",
      );
    } finally {
      setLoadingGPS(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.picker}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="location" size={20} color="#ff6b00" />
        <Text style={[styles.pickerText, !selectedTown && styles.placeholder]}>
          {selectedTown ? selectedTown.name : "Select location"}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#999" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery("");
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search towns..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* GPS Button */}
            {allowGPS && onGPSLocation && (
              <TouchableOpacity
                style={styles.gpsButton}
                onPress={handleUseCurrentLocation}
                disabled={loadingGPS}
                activeOpacity={0.7}
              >
                {loadingGPS ? (
                  <ActivityIndicator size="small" color="#ff6b00" />
                ) : (
                  <Ionicons name="locate" size={20} color="#ff6b00" />
                )}
                <Text style={styles.gpsButtonText}>
                  {loadingGPS ? "Getting location..." : "Use current location"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Towns List */}
            <ScrollView
              style={styles.townsList}
              showsVerticalScrollIndicator={false}
            >
              {Object.keys(groupedTowns).map((area) => (
                <View key={area} style={styles.areaGroup}>
                  <Text style={styles.areaLabel}>{area}</Text>
                  {groupedTowns[area].map((town, index) => (
                    <TouchableOpacity
                      key={town.id || `${area}-${index}`}
                      style={[
                        styles.townItem,
                        selectedTown?.id === town.id && styles.townItemSelected,
                      ]}
                      onPress={() => handleTownSelect(town)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.townItemLeft}>
                        <Ionicons
                          name="location-outline"
                          size={18}
                          color={
                            selectedTown?.id === town.id ? "#ff6b00" : "#666"
                          }
                        />
                        <Text
                          style={[
                            styles.townName,
                            selectedTown?.id === town.id &&
                              styles.townNameSelected,
                          ]}
                        >
                          {town.name}
                        </Text>
                      </View>
                      {selectedTown?.id === town.id && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#ff6b00"
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E8EAED",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  placeholder: {
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "90%",
    paddingTop: 24,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1a1a1a",
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,107,0,0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 10,
  },
  gpsButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ff6b00",
  },
  townsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  areaGroup: {
    marginBottom: 20,
  },
  areaLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  townItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#FAFAFA",
  },
  townItemSelected: {
    backgroundColor: "rgba(255,107,0,0.08)",
  },
  townItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  townName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  townNameSelected: {
    fontWeight: "600",
    color: "#ff6b00",
  },
});
