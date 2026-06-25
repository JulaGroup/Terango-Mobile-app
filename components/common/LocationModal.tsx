/**
 * LocationModal Component
 *
 * A modern, sleek location selection modal for TeranGo app.
 *
 * Current Features:
 * - GPS-based current location detection
 * - Save/manage addresses by category (Home, Office, Other)
 * - Beautiful UI with TeranGo branding
 * - Tab-based address organization
 *
 * Future Features (Ready to Enable):
 * - Google Places Autocomplete integration
 * - Real-time address search and suggestions
 * - Automatic address validation and coordinates
 *
 * To Enable Google Places (when ready):
 * 1. Get Google Places API key from Google Cloud Console
 * 2. Add the key to constants/config.ts
 * 3. Set isGooglePlacesAvailable = true in renderAddForm()
 * 4. Test with billing account (has generous free tier)
 *
 * Dependencies:
 * - react-native-google-places-autocomplete (already installed)
 * - @react-native-async-storage/async-storage
 * - expo-location
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  Linking,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { useLocation } from "@/hooks/useLocation";
import { useAddress } from "@/context/AddressContext";
import { AddressService, Address } from "@/services/AddressService";
import { GOOGLE_PLACES_API_KEY } from "@/constants/config";
import { SecureStorage } from "@/utils/secureStorage";
import { router } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";

const { height } = Dimensions.get("window");

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAddress: (address: Address) => void;
  currentAddress?: string;
}

const LocationModal = ({
  visible,
  onClose,
  onSelectAddress,
  currentAddress,
}: LocationModalProps) => {
  // bounding box roughly covering The Gambia
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
  const [selectedTab, setSelectedTab] = useState<"Home" | "Office" | "Other">(
    "Home",
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const { getCurrentLocation } = useLocation();
  const {
    addresses,
    loading,
    fetchAddresses,
    addAddress,
    deleteAddress,
    setDefaultAddress,
    setSelectedAddress,
  } = useAddress();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<{
    street: string;
    city?: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  const slideAnim = useRef(new Animated.Value(height)).current;

  // Check if user is logged in when modal opens
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStorage.getItem("token");
        const loggedIn = await SecureStorage.getItem("isLoggedIn");
        setIsLoggedIn(!!(token && loggedIn));
      } catch (error) {
        console.error("Error checking auth:", error);
        setIsLoggedIn(false);
      }
    };

    if (visible) {
      checkAuth();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      fetchAddresses();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fetchAddresses, slideAnim]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 20;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        slideAnim.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        onClose();
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const handlePlaceSelect = async (data: any, details: any) => {
    if (!details?.geometry?.location) {
      Alert.alert("Error", "Unable to get location coordinates");
      return;
    }

    try {
      const addressData = {
        label: selectedTab,
        street: details.formatted_address || data.description,
        city:
          details.address_components?.find(
            (comp: any) =>
              comp.types.includes("locality") ||
              comp.types.includes("administrative_area_level_1"),
          )?.long_name || "Banjul",
        state:
          details.address_components?.find((comp: any) =>
            comp.types.includes("administrative_area_level_1"),
          )?.long_name || "",
        country: "The Gambia",
        postalCode:
          details.address_components?.find((comp: any) =>
            comp.types.includes("postal_code"),
          )?.long_name || "",
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
      };

      await addAddress(addressData);
      // Refresh addresses and return to the address list inside the modal
      await fetchAddresses();
      setShowAddForm(false);
      Alert.alert("Success", "Address added successfully");
    } catch (error) {
      console.error("Error adding address:", error);
      Alert.alert("Error", "Failed to add address");
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      // Check permission first — if denied, open Settings
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) {
        if (perm.canAskAgain) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(
              "Location Required",
              "Please allow location access so we can detect your address.",
            );
            return;
          }
        } else {
          Alert.alert(
            "Location Permission Denied",
            "Location access was denied. Please enable it in Settings to use this feature.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
      }

      const currentLoc = await getCurrentLocation();
      if (!currentLoc) {
        Alert.alert(
          "Location",
          "Unable to get current location. Please check permissions and try again.",
        );
        return;
      }
      // ensure within Gambia bounds
      if (!isWithinGambia(currentLoc.latitude, currentLoc.longitude)) {
        Alert.alert(
          "Out of bounds",
          "Your device location appears outside The Gambia. Please move to a Gambian location.",
        );
        return;
      }
      // Reverse geocode to a human readable address (uses frontend service which calls Nominatim)
      const displayAddress = await AddressService.getAddressFromCoordinates(
        currentLoc.latitude,
        currentLoc.longitude,
      );

      // Set preview so user can confirm and save
      setCurrentPreview({
        street: displayAddress,
        city: currentLoc.address || "",
        latitude: currentLoc.latitude,
        longitude: currentLoc.longitude,
      });
    } catch (error) {
      console.error("Error using current location:", error);
      Alert.alert(
        "Error",
        "Failed to get current location. Please check your location permissions.",
      );
    }
  };

  // Search for an address string and set preview
  const searchAddress = async () => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      Alert.alert("Enter address", "Please type an address to search");
      return;
    }
    setSearching(true);
    try {
      const coords =
        await AddressService.getCoordinatesFromAddress(searchQuery);
      if (!coords) {
        Alert.alert("Not found", "Could not find that address");
        return;
      }

      // enforce country bounds
      if (!isWithinGambia(coords.latitude, coords.longitude)) {
        Alert.alert(
          "Out of bounds",
          "Only addresses within The Gambia are allowed",
        );
        return;
      }

      const display = await AddressService.getAddressFromCoordinates(
        coords.latitude,
        coords.longitude,
      );

      setCurrentPreview({
        street: display,
        city: "",
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } catch (err) {
      console.error("Search failed:", err);
      Alert.alert("Error", "Address search failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  const saveCurrentPreview = async () => {
    if (!currentPreview) return;
    // block non-Gambian previews
    if (!isWithinGambia(currentPreview.latitude, currentPreview.longitude)) {
      Alert.alert("Invalid location", "Address must be within The Gambia.");
      return;
    }
    try {
      const payload = {
        label: selectedTab || "Home",
        street: currentPreview.street,
        city: currentPreview.city || "",
        country: "The Gambia",
        latitude: currentPreview.latitude,
        longitude: currentPreview.longitude,
      };

      await addAddress(payload);
      // Refresh addresses in the modal and return to the address list
      await fetchAddresses();
      Alert.alert("Success", "Address added successfully");
      setCurrentPreview(null);
      // Close the add form but keep the modal open so user can continue managing addresses
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to save preview:", err);
      Alert.alert("Error", "Failed to save address. Please try again.");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAddress(addressId);
            } catch (error) {
              console.error("Error deleting address:", error);
              Alert.alert("Error", "Failed to delete address");
            }
          },
        },
      ],
    );
  };

  const getAddressesByLabel = (label: string) => {
    return addresses.filter(
      (addr) => addr.label.toLowerCase() === label.toLowerCase(),
    );
  };

  const renderTabButton = (tab: "Home" | "Office" | "Other") => {
    const isSelected = selectedTab === tab;
    const tabAddresses = getAddressesByLabel(tab);
    const hasAddresses = tabAddresses.length > 0;

    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tabButton,
          isSelected && styles.tabButtonActive,
          !hasAddresses && styles.tabButtonEmpty,
        ]}
        onPress={() => setSelectedTab(tab)}
      >
        <Ionicons
          name={
            tab === "Home"
              ? "home"
              : tab === "Office"
                ? "briefcase"
                : "location"
          }
          size={20}
          color={isSelected ? "#ff6b00" : !hasAddresses ? "#ff6b00" : "#929292"}
        />
        <Text
          style={[
            styles.tabButtonText,
            isSelected && styles.tabButtonTextActive,
            !hasAddresses && styles.tabButtonTextEmpty,
          ]}
        >
          {tab}
        </Text>
        {hasAddresses ? (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{tabAddresses.length}</Text>
          </View>
        ) : (
          <View style={styles.setupIndicator}>
            <Ionicons name="add-circle" size={16} color="#ff6b00" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderAddressItem = ({ item: address }: { item: Address }) => (
    <TouchableOpacity
      style={[
        styles.addressItem,
        address.isDefault ? styles.addressItemDefault : null,
      ]}
      onPress={async () => {
        const userId = await SecureStorage.getItem("userId");
        const token = await SecureStorage.getItem("token");
        const userPhone = await SecureStorage.getItem("userPhone");

        if (!userId || !token || !userPhone) {
          Alert.alert(
            "Login Required",
            "You must be logged in to select an address.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Login", onPress: () => router.push("/auth") },
            ],
          );
          return;
        }

        try {
          setSelectedAddress(address);
        } catch (e) {
          console.warn("setSelectedAddress missing:", e);
        }
        onSelectAddress(address);
        // Keep modal open to allow changing default or other actions
      }}
    >
      <View style={styles.addressIcon}>
        <Ionicons
          name={
            address.label.toLowerCase().includes("home")
              ? "home"
              : address.label.toLowerCase().includes("office")
                ? "briefcase"
                : "location"
          }
          size={24}
          color="#ff6b00"
        />
      </View>
      <View style={styles.addressContent}>
        <Text style={styles.addressLabel}>{address.label}</Text>
        <Text style={styles.addressText} numberOfLines={2}>
          {address.addressLine}
        </Text>
        {address.city ? (
          <Text style={styles.addressCity}>{address.city}</Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "column", alignItems: "flex-end" }}>
        {address.isDefault ? (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.makeDefaultButton}
            onPress={async () => {
              try {
                await setDefaultAddress(address.id);
                await fetchAddresses();
              } catch (err) {
                console.error("Failed to set default:", err);
                Alert.alert("Error", "Failed to set default address");
              }
            }}
          >
            <Text style={styles.makeDefaultText}>Make default</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.deleteButton, { marginTop: 8 }]}
          onPress={() => handleDeleteAddress(address.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#ff6b00" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderAddForm = () => {
    // TODO: Enable Google Places API in the future (when API key is available)
    // To enable: Set this to true and add your Google Places API key to config.ts
    const isGooglePlacesAvailable = false;

    // Future Google Places check (uncomment when ready):
    // const isGooglePlacesAvailable =
    //   GOOGLE_PLACES_API_KEY &&
    //   typeof GOOGLE_PLACES_API_KEY === "string" &&
    //   GOOGLE_PLACES_API_KEY !== "YOUR_GOOGLE_PLACES_API_KEY_HERE" &&
    //   GOOGLE_PLACES_API_KEY !== "YOUR_ACTUAL_API_KEY_HERE" &&
    //   GOOGLE_PLACES_API_KEY.length > 10;

    return (
      <View style={styles.addForm}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Add {selectedTab} Address</Text>
          <TouchableOpacity onPress={() => setShowAddForm(false)}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.formContent}>
          {/* <Text style={styles.inputLabel}>
            {isGooglePlacesAvailable
              ? "Search for a location"
              : "Current options for adding addresses"}
          </Text> */}
          {isGooglePlacesAvailable ? (
            // Google Places Autocomplete (for future use)
            <View style={styles.googlePlacesContainer}>
              <GooglePlacesAutocomplete
                placeholder="Type your address here..."
                onPress={handlePlaceSelect}
                query={{
                  key: GOOGLE_PLACES_API_KEY,
                  language: "en",
                  components: "country:gm", // Restrict to The Gambia
                }}
                fetchDetails={true}
                styles={{
                  container: styles.placesContainer,
                  textInputContainer: styles.placesTextInputContainer,
                  textInput: styles.placesTextInput,
                  listView: styles.placesListView,
                  row: styles.placesRow,
                  description: styles.placesDescription,
                }}
                textInputProps={{
                  placeholderTextColor: "#999",
                  returnKeyType: "search",
                }}
                debounce={300}
                minLength={2}
                enablePoweredByContainer={false}
                nearbyPlacesAPI="GooglePlacesSearch"
                GooglePlacesSearchQuery={{
                  rankby: "distance",
                }}
                renderLeftButton={() => (
                  <View style={styles.searchIconContainer}>
                    <Ionicons name="search" size={20} color="#999" />
                  </View>
                )}
              />
            </View>
          ) : (
            <View style={styles.manualAddressContainer}>
              {/* Instructional text to make the button more discoverable */}
              <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                  Tap the big orange button below to automatically detect your
                  current location. No typing or searching required.
                </Text>
              </View>

              {/* BIG FETCH LOCATION BUTTON - PRIMARY ACTION */}
              <TouchableOpacity
                style={styles.bigFetchLocationButton}
                onPress={async () => {
                  setSearching(true);
                  await handleUseCurrentLocation();
                  setSearching(false);
                }}
                activeOpacity={0.8}
              >
                {searching ? (
                  <View style={styles.fetchLoadingContainer}>
                    <ActivityIndicator size={32} color="#fff" />
                    <Text style={styles.fetchLoadingText}>
                      Finding your location...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.fetchContentContainer}>
                    <Ionicons name="locate" size={40} color="#fff" />
                    <Text style={styles.fetchButtonTitle}>
                      Find My Location
                    </Text>
                    <Text style={styles.fetchButtonSubtitle}>
                      Use GPS to find your current address
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {currentPreview ? (
                <View style={styles.previewCard}>
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewTitle}>Confirm address</Text>
                    <Text style={styles.previewSubtitle}>{selectedTab}</Text>
                  </View>
                  <Text style={styles.previewStreet}>
                    {currentPreview.street}
                  </Text>
                  <View style={styles.previewActions}>
                    <TouchableOpacity
                      style={styles.cancelPreviewButton}
                      onPress={() => setCurrentPreview(null)}
                    >
                      <Text style={styles.cancelPreviewText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.savePreviewButton}
                      onPress={async () => {
                        await saveCurrentPreview();
                      }}
                    >
                      <Text style={styles.savePreviewText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.placeholderContainerSmall}>
                  <Text style={styles.placeholderTextSmall}>
                    Search for an address or tap the location button to use your
                    current location.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowAddForm(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeaderComponent = () => (
    <>
      {/* <TouchableOpacity
        style={styles.currentLocationButton}
        onPress={handleUseCurrentLocation}
      >
        <View style={styles.currentLocationIcon}>
          <Ionicons name="locate" size={24} color="#ff6b00" />
        </View>
        <View style={styles.currentLocationContent}>
          <Text style={styles.currentLocationText}>Use Current Location</Text>
          <Text style={styles.currentLocationSubtext}>
            We&apos;ll detect your location automatically
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity> */}

      <View style={styles.divider} />

      <View style={styles.tabContainer}>
        <Text style={styles.tabsTitle}>Choose location type</Text>
        <View style={styles.tabsRow}>
          {renderTabButton("Home")}
          {renderTabButton("Office")}
          {renderTabButton("Other")}
        </View>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6b00" />
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      )}

      {/* Section title for addresses */}
      {!loading && getAddressesByLabel(selectedTab).length > 0 && (
        <Text style={styles.sectionTitle}>{selectedTab} Addresses</Text>
      )}
    </>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name={
            selectedTab === "Home"
              ? "home-outline"
              : selectedTab === "Office"
                ? "briefcase-outline"
                : "location-outline"
          }
          size={64}
          color="#E0E0E0"
        />
        <View style={styles.emptyBadge}>
          <Ionicons name="add" size={20} color="#ff6b00" />
        </View>
      </View>

      <Text style={styles.emptyTitle}>Set up your {selectedTab} location</Text>
      <Text style={styles.emptyText}>
        {selectedTab === "Home"
          ? "Add your home address for quick and easy ordering"
          : selectedTab === "Office"
            ? "Add your office address for lunch and work orders"
            : "Add other frequently visited locations"}
      </Text>

      <TouchableOpacity
        style={styles.setupButton}
        onPress={() => setShowAddForm(true)}
      >
        <Ionicons name="add-circle" size={24} color="#FFF" />
        <Text style={styles.setupButtonText}>
          Set up {selectedTab} location
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooterComponent = () => (
    <TouchableOpacity
      style={styles.addNewAddressButton}
      onPress={() => setShowAddForm(true)}
    >
      <Ionicons name="add-circle" size={24} color="#ff6b00" />
      <Text style={styles.addNewAddressText}>
        Add Another {selectedTab} Address
      </Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    // Show login banner if user is not logged in
    if (isLoggedIn === false) {
      return (
        <View style={styles.loginBannerContainer}>
          <View style={styles.loginBannerContent}>
            <Ionicons
              name="lock-closed"
              size={48}
              color="#ff6b00"
              style={styles.loginBannerIcon}
            />
            <Text style={styles.loginBannerTitle}>Sign In Required</Text>
            <Text style={styles.loginBannerMessage}>
              You need to sign in to save delivery addresses
            </Text>
            <TouchableOpacity
              style={styles.loginBannerButton}
              onPress={() => {
                onClose();
                router.push("/auth");
              }}
            >
              <Text style={styles.loginBannerButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (showAddForm) {
      return renderAddForm();
    }

    const tabAddresses = getAddressesByLabel(selectedTab);

    return (
      <FlatList
        data={tabAddresses}
        renderItem={renderAddressItem}
        keyExtractor={(item) => item.id}
        style={styles.content}
        contentContainerStyle={styles.addressListContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeaderComponent}
        ListEmptyComponent={!loading ? renderEmptyComponent : null}
        ListFooterComponent={
          tabAddresses.length > 0 ? renderFooterComponent : null
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleBar} />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Where to deliver?</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          {renderContent()}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(38, 38, 38, 0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: height * 0.1,
    paddingBottom: 20,
    shadowColor: "#ff6b00",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  handleBar: {
    width: 48,
    height: 5,
    backgroundColor: "#D1D5DB",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#262626",
  },
  closeButton: {
    padding: 8,
    borderRadius: 24,
    backgroundColor: "#F8F8F8",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#FFF5EE",
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#ff6b00",
    paddingHorizontal: 20,
  },
  currentLocationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  currentLocationContent: {
    flex: 1,
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#262626",
    marginBottom: 4,
  },
  currentLocationSubtext: {
    fontSize: 14,
    color: "#929292",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginBottom: 20,
  },
  tabContainer: {
    marginBottom: 20,
  },
  tabsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#929292",
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 12,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: "#F8F8F8",
    position: "relative",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  tabButtonActive: {
    backgroundColor: "#FFF5EE",
    borderColor: "#ff6b00",
  },
  tabButtonEmpty: {
    borderWidth: 1,
    borderColor: "#ff6b00",
    borderStyle: "dashed",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#929292",
    marginLeft: 8,
  },
  tabButtonTextActive: {
    color: "#ff6b00",
  },
  tabButtonTextEmpty: {
    color: "#ff6b00",
  },
  tabBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff6b00",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  setupIndicator: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FFF5EE",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff6b00",
  },
  addressList: {
    flex: 1,
  },
  addressListContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#262626",
    marginBottom: 16,
  },
  addressItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  addressItemDefault: {
    borderColor: "#FFDAB3",
    backgroundColor: "#FFF8F0",
  },
  addressIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#262626",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: "#929292",
    lineHeight: 20,
    fontWeight: "500",
  },
  addressCity: {
    fontSize: 12,
    color: "#929292",
    marginTop: 2,
    fontWeight: "500",
  },
  deleteButton: {
    padding: 10,
    backgroundColor: "#FFF5EE",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ff6b00",
  },
  defaultBadge: {
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFDAB3",
  },
  defaultBadgeText: {
    color: "#ff6b00",
    fontWeight: "700",
    fontSize: 12,
  },
  makeDefaultButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFF5EE",
    borderWidth: 1,
    borderColor: "#ff6b00",
  },
  makeDefaultText: {
    color: "#ff6b00",
    fontWeight: "700",
    fontSize: 12,
  },
  addNewAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: "#ff6b00",
    borderStyle: "dashed",
    borderRadius: 16,
    marginTop: 16,
    backgroundColor: "#FFF5EE",
  },
  addNewAddressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff6b00",
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    flex: 1,
    justifyContent: "center",
  },
  emptyIconContainer: {
    position: "relative",
    marginBottom: 16,
  },
  emptyBadge: {
    position: "absolute",
    bottom: -8,
    right: -8,
    backgroundColor: "#FFF5EE",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  setupButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff6b00",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    marginLeft: 8,
  },
  addForm: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#262626",
  },
  formContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#262626",
    marginBottom: 12,
  },
  googlePlacesContainer: {
    flex: 1,
    zIndex: 1000,
  },
  placesContainer: {
    flex: 0,
  },
  placesTextInputContainer: {
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
  },
  placesTextInput: {
    fontSize: 16,
    color: "#262626",
    fontWeight: "500",
    backgroundColor: "transparent",
    paddingLeft: 48,
  },
  placesListView: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    maxHeight: 200,
  },
  placesRow: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  placesDescription: {
    fontSize: 14,
    color: "#262626",
    fontWeight: "500",
  },
  searchIconContainer: {
    position: "absolute",
    left: 18,
    top: 18,
    zIndex: 1,
  },
  placeholderContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF5EE",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ff6b00",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 12,
    display: "none", // Hide search row
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    display: "none", // Hide search box
  },
  searchInput: {
    marginLeft: 8,
    fontSize: 15,
    color: "#262626",
    flex: 1,
    display: "none", // Hide search input
  },
  locateButton: {
    backgroundColor: "#ff6b00",
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    display: "none", // Hide old locate button
  },
  // BIG FETCH LOCATION BUTTON STYLES
  bigFetchLocationButton: {
    backgroundColor: "#ff6b00",
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginVertical: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#ff6b00",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  fetchContentContainer: {
    alignItems: "center",
    gap: 12,
  },
  fetchLoadingContainer: {
    alignItems: "center",
    gap: 12,
  },
  fetchButtonTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  fetchButtonSubtitle: {
    fontSize: 13,
    color: "#ffe6d0",
    textAlign: "center",
    fontWeight: "500",
  },
  fetchLoadingText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  previewCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  previewTitle: {
    fontWeight: "700",
    color: "#262626",
  },
  previewSubtitle: {
    fontSize: 12,
    color: "#929292",
  },
  previewStreet: {
    color: "#444",
    marginBottom: 12,
    fontSize: 14,
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelPreviewButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#F8F8F8",
  },
  cancelPreviewText: { color: "#666" },
  savePreviewButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#ff6b00",
  },
  savePreviewText: { color: "#fff", fontWeight: "700" },
  placeholderContainerSmall: {
    alignItems: "center",
    padding: 12,
    marginTop: 12,
  },
  placeholderTextSmall: { color: "#666", textAlign: "center" },
  placeholderText: {
    fontSize: 14,
    color: "#ff6b00",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  instructionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFF5EE",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ff6b00",
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 15,
    color: "#262626",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "600",
  },
  buttonRow: {
    paddingTop: 20,
  },
  cancelButton: {
    backgroundColor: "#F8F8F8",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#929292",
  },
  // Manual address styles
  manualAddressContainer: {
    flex: 1,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ff6b00",
    marginBottom: 8,
    textAlign: "center",
  },
  optionsList: {
    marginVertical: 16,
    gap: 12,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE4D6",
  },
  optionText: {
    fontSize: 14,
    color: "#262626",
    marginLeft: 8,
    flex: 1,
  },
  infoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff6b00",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "center",
    marginTop: 8,
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
    marginLeft: 6,
  },
  // Future feature notice styles
  futureFeatureNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  futureFeatureText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 6,
    flex: 1,
    fontStyle: "italic",
  },
  loginBannerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loginBannerContent: {
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 40,
    borderRadius: 20,
    width: "100%",
    maxWidth: 400, // Limit width on larger screens
  },
  loginBannerIcon: {
    marginBottom: 16,
  },
  loginBannerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#262626",
    marginBottom: 12,
    textAlign: "center",
  },
  loginBannerMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  loginBannerButton: {
    backgroundColor: "#ff6b00",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  loginBannerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default LocationModal;
