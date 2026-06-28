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
  Linking,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Region, PROVIDER_GOOGLE } from "react-native-maps";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { useAddress } from "@/context/AddressContext";
import { AddressService, Address } from "@/services/AddressService";
import { GOOGLE_PLACES_API_KEY } from "@/constants/config";
import { SecureStorage } from "@/utils/secureStorage";
import { router } from "expo-router";


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
  const {
    addresses,
    loading,
    fetchAddresses,
    addAddress,
    deleteAddress,
    setDefaultAddress,
    setSelectedAddress,
  } = useAddress();
  const [locationPhase, setLocationPhase] = useState<"idle" | "gps" | "geocoding" | "done">("idle");
  const [saving, setSaving] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  // Use a ref for region — avoids re-renders that cause the map to snap/jump
  const mapRegionRef = useRef<Region>({
    latitude: 13.4549,
    longitude: -16.5790,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [pinCoords, setPinCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geocodingPin, setGeocodingPin] = useState(false);
  const [pinAddress, setPinAddress] = useState<string>("");
  const [pinAccuracy, setPinAccuracy] = useState<number | undefined>(undefined);
  const mapRef = useRef<MapView>(null);
  const geocodeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentPreview, setCurrentPreview] = useState<{
    street: string;
    city?: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
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

  // Reverse geocode when the pin is dragged — debounced 600ms
  const onPinDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPinCoords({ latitude, longitude });

    if (geocodeDebounce.current) clearTimeout(geocodeDebounce.current);
    geocodeDebounce.current = setTimeout(async () => {
      if (!isWithinGambia(latitude, longitude)) {
        setPinAddress("Outside service area");
        return;
      }
      setGeocodingPin(true);
      try {
        const addr = await AddressService.getAddressFromCoordinates(latitude, longitude);
        setPinAddress(addr);
      } catch {
        setPinAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      } finally {
        setGeocodingPin(false);
      }
    }, 600);
  };

  const confirmMapPin = () => {
    if (!pinCoords) return;
    setCurrentPreview({
      street: pinAddress || `${pinCoords.latitude.toFixed(5)}, ${pinCoords.longitude.toFixed(5)}`,
      latitude: pinCoords.latitude,
      longitude: pinCoords.longitude,
      accuracy: pinAccuracy,
    });
    setShowMapPicker(false);
  };

  const handleUseCurrentLocation = async () => {
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) {
        if (perm.canAskAgain) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Location Required", "Please allow location access so we can detect your address.");
            return;
          }
        } else {
          Alert.alert(
            "Location Permission Denied",
            "Location access was denied. Please enable it in Settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
      }

      setLocationPhase("gps");

      // Warm up GPS chip
      try { await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); } catch {}

      // Stream to get best fix — same approach as driver tracking
      const bestFix = await new Promise<Location.LocationObject | null>((resolve) => {
        let best: Location.LocationObject | null = null;
        let subscription: Location.LocationSubscription | null = null;

        const finish = () => { subscription?.remove(); resolve(best); };
        const timeout = setTimeout(finish, 8000);

        Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 500, distanceInterval: 0 },
          (loc) => {
            const acc = loc.coords.accuracy ?? Infinity;
            if (!best || acc < (best.coords.accuracy ?? Infinity)) best = loc;
            if (acc <= 15) { clearTimeout(timeout); finish(); }
          },
        ).then((sub) => { subscription = sub; });
      });

      if (!bestFix) {
        setLocationPhase("idle");
        Alert.alert("Location unavailable", "Unable to get a GPS fix. Go outdoors and try again.");
        return;
      }

      const { latitude, longitude, accuracy } = (bestFix as Location.LocationObject).coords;

      if (!isWithinGambia(latitude, longitude)) {
        setLocationPhase("idle");
        Alert.alert("Out of service area", "Your location appears outside The Gambia.");
        return;
      }

      // Phase 2: reverse geocode
      setLocationPhase("geocoding");
      const addr = await AddressService.getAddressFromCoordinates(latitude, longitude);

      setLocationPhase("done");
      setPinAccuracy(accuracy ?? undefined);
      setPinCoords({ latitude, longitude });
      setPinAddress(addr);
      // Animate map to GPS fix imperatively — never set region as state
      const newRegion: Region = { latitude, longitude, latitudeDelta: 0.003, longitudeDelta: 0.003 };
      mapRegionRef.current = newRegion;
      setShowMapPicker(true);
      // animateToRegion after MapView mounts (needs a tick)
      setTimeout(() => mapRef.current?.animateToRegion(newRegion, 600), 150);
    } catch (error) {
      setLocationPhase("idle");
      console.error("Error using current location:", error);
      Alert.alert("Error", "Failed to get current location. Please try again.");
    }
  };

  const saveCurrentPreview = async () => {
    if (!currentPreview) return;
    if (!isWithinGambia(currentPreview.latitude, currentPreview.longitude)) {
      Alert.alert("Invalid location", "Address must be within The Gambia.");
      return;
    }
    setSaving(true);
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
      await fetchAddresses();
      setCurrentPreview(null);
      setLocationPhase("idle");
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to save preview:", err);
      Alert.alert("Error", "Failed to save address. Please try again.");
    } finally {
      setSaving(false);
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

  const renderMapPicker = () => (
    <View style={styles.mapPickerContainer}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={mapRegionRef.current}
        onRegionChangeComplete={(r) => { mapRegionRef.current = r; }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {pinCoords && (
          <Marker
            coordinate={pinCoords}
            draggable
            onDragEnd={onPinDragEnd}
          >
            <View style={styles.pinContainer}>
              <View style={styles.pin}>
                <Ionicons name="location" size={28} color="#fff" />
              </View>
              <View style={styles.pinShadow} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top bar */}
      <View style={styles.mapTopBar}>
        <TouchableOpacity
          style={styles.mapBackButton}
          onPress={() => { setShowMapPicker(false); setLocationPhase("idle"); }}
        >
          <Ionicons name="arrow-back" size={20} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.mapTopBarTitle}>Drag pin to your exact door</Text>
      </View>

      {/* My location button */}
      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={async () => {
          if (!pinCoords) return;
          mapRef.current?.animateToRegion({
            ...pinCoords,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
          }, 400);
        }}
      >
        <Ionicons name="locate" size={22} color="#ff6b00" />
      </TouchableOpacity>

      {/* Bottom confirm sheet */}
      <View style={styles.mapBottomSheet}>
        <View style={styles.mapAddressRow}>
          <View style={styles.mapAddressIcon}>
            <Ionicons name="location" size={20} color="#ff6b00" />
          </View>
          <View style={styles.mapAddressContent}>
            {geocodingPin ? (
              <View style={styles.geocodingRow}>
                <ActivityIndicator size={14} color="#ff6b00" />
                <Text style={styles.geocodingText}>Finding address...</Text>
              </View>
            ) : (
              <Text style={styles.mapAddressText} numberOfLines={2}>
                {pinAddress || "Drag the pin to your location"}
              </Text>
            )}
            <Text style={styles.mapAddressHint}>
              {pinCoords
                ? `${pinCoords.latitude.toFixed(5)}, ${pinCoords.longitude.toFixed(5)}`
                : "GPS coordinates will appear here"}
            </Text>
          </View>
          {pinAccuracy !== undefined && (
            <View style={[
              styles.accuracyBadge,
              pinAccuracy <= 20 ? styles.accuracyExcellent
              : pinAccuracy <= 50 ? styles.accuracyGood
              : styles.accuracyPoor,
            ]}>
              <Text style={[
                styles.accuracyText,
                pinAccuracy <= 20 ? styles.accuracyTextExcellent
                : pinAccuracy <= 50 ? styles.accuracyTextGood
                : styles.accuracyTextPoor,
              ]}>
                ±{Math.round(pinAccuracy)}m
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.mapDragHint}>
          📍 Drag the orange pin to your exact front door
        </Text>

        <TouchableOpacity
          style={[styles.confirmPinButton, (!pinCoords || geocodingPin) && styles.confirmPinButtonDisabled]}
          onPress={confirmMapPin}
          disabled={!pinCoords || geocodingPin}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.confirmPinText}>Confirm this location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAddForm = () => {
    const isGooglePlacesAvailable = false;

    return (
      <View style={styles.addForm}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Add {selectedTab} Address</Text>
          <TouchableOpacity onPress={() => { setShowAddForm(false); setCurrentPreview(null); setLocationPhase("idle"); }}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.formContent}>
          {isGooglePlacesAvailable ? (
            <View style={styles.googlePlacesContainer}>
              <GooglePlacesAutocomplete
                placeholder="Type your address here..."
                onPress={handlePlaceSelect}
                query={{ key: GOOGLE_PLACES_API_KEY, language: "en", components: "country:gm" }}
                fetchDetails={true}
                styles={{
                  container: styles.placesContainer,
                  textInputContainer: styles.placesTextInputContainer,
                  textInput: styles.placesTextInput,
                  listView: styles.placesListView,
                  row: styles.placesRow,
                  description: styles.placesDescription,
                }}
                textInputProps={{ placeholderTextColor: "#999", returnKeyType: "search" }}
                debounce={300}
                minLength={2}
                enablePoweredByContainer={false}
                nearbyPlacesAPI="GooglePlacesSearch"
                GooglePlacesSearchQuery={{ rankby: "distance" }}
                renderLeftButton={() => (
                  <View style={styles.searchIconContainer}>
                    <Ionicons name="search" size={20} color="#999" />
                  </View>
                )}
              />
            </View>
          ) : (
            <View style={styles.manualAddressContainer}>
              {/* GPS phase steps */}
              {locationPhase !== "idle" && locationPhase !== "done" && (
                <View style={styles.phaseContainer}>
                  <View style={styles.phaseStep}>
                    <View style={[styles.phaseIcon, locationPhase === "gps" && styles.phaseIconActive]}>
                      {locationPhase === "gps"
                        ? <ActivityIndicator size={14} color="#fff" />
                        : <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={[styles.phaseLabel, locationPhase === "gps" && styles.phaseLabelActive]}>GPS fix</Text>
                  </View>
                  <View style={styles.phaseConnector} />
                  <View style={styles.phaseStep}>
                    <View style={[styles.phaseIcon, locationPhase === "geocoding" && styles.phaseIconActive, locationPhase === "gps" && styles.phaseIconPending]}>
                      {locationPhase === "geocoding"
                        ? <ActivityIndicator size={14} color="#fff" />
                        : <Ionicons name="map" size={14} color="#fff" />}
                    </View>
                    <Text style={[styles.phaseLabel, locationPhase === "geocoding" && styles.phaseLabelActive]}>Address</Text>
                  </View>
                </View>
              )}

              {/* GPS button */}
              <TouchableOpacity
                style={[
                  styles.bigFetchLocationButton,
                  (locationPhase === "gps" || locationPhase === "geocoding") && styles.bigFetchLocationButtonLoading,
                  currentPreview && styles.bigFetchLocationButtonRetry,
                ]}
                onPress={async () => {
                  if (locationPhase === "gps" || locationPhase === "geocoding") return;
                  setCurrentPreview(null);
                  setLocationPhase("idle");
                  await handleUseCurrentLocation();
                }}
                activeOpacity={0.8}
                disabled={locationPhase === "gps" || locationPhase === "geocoding"}
              >
                {locationPhase === "gps" ? (
                  <View style={styles.fetchLoadingContainer}>
                    <ActivityIndicator size={28} color="#fff" />
                    <Text style={styles.fetchLoadingText}>Locking GPS signal...</Text>
                    <Text style={styles.fetchLoadingHint}>Go near a window for best results</Text>
                  </View>
                ) : locationPhase === "geocoding" ? (
                  <View style={styles.fetchLoadingContainer}>
                    <ActivityIndicator size={28} color="#fff" />
                    <Text style={styles.fetchLoadingText}>Reading address...</Text>
                  </View>
                ) : currentPreview ? (
                  <View style={styles.fetchContentContainer}>
                    <Ionicons name="refresh" size={28} color="#fff" />
                    <Text style={styles.fetchButtonTitle}>Re-scan Location</Text>
                    <Text style={styles.fetchButtonSubtitle}>Open map to adjust pin</Text>
                  </View>
                ) : (
                  <View style={styles.fetchContentContainer}>
                    <Ionicons name="locate" size={40} color="#fff" />
                    <Text style={styles.fetchButtonTitle}>Find My Location</Text>
                    <Text style={styles.fetchButtonSubtitle}>GPS + drag pin to exact door</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Confirmed preview card */}
              {currentPreview ? (
                <View style={styles.previewCard}>
                  <View style={styles.previewHeader}>
                    <View style={styles.previewTitleRow}>
                      <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                      <Text style={styles.previewTitle}>Confirmed location</Text>
                    </View>
                    {currentPreview.accuracy !== undefined && (
                      <View style={[
                        styles.accuracyBadge,
                        currentPreview.accuracy <= 20 ? styles.accuracyExcellent
                        : currentPreview.accuracy <= 50 ? styles.accuracyGood
                        : styles.accuracyPoor,
                      ]}>
                        <Ionicons
                          name="radio-button-on"
                          size={10}
                          color={currentPreview.accuracy <= 20 ? "#15803d" : currentPreview.accuracy <= 50 ? "#854d0e" : "#991b1b"}
                        />
                        <Text style={[
                          styles.accuracyText,
                          currentPreview.accuracy <= 20 ? styles.accuracyTextExcellent
                          : currentPreview.accuracy <= 50 ? styles.accuracyTextGood
                          : styles.accuracyTextPoor,
                        ]}>
                          {currentPreview.accuracy <= 20 ? "Precise" : currentPreview.accuracy <= 50 ? "Good" : "Rough"} ±{Math.round(currentPreview.accuracy)}m
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.previewAddressRow}>
                    <Ionicons name="location" size={16} color="#ff6b00" style={{ marginTop: 2 }} />
                    <Text style={styles.previewStreet}>{currentPreview.street}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editPinButton}
                    onPress={() => setShowMapPicker(true)}
                  >
                    <Ionicons name="map" size={16} color="#ff6b00" />
                    <Text style={styles.editPinText}>Adjust pin on map</Text>
                  </TouchableOpacity>
                  <View style={styles.previewActions}>
                    <TouchableOpacity
                      style={styles.cancelPreviewButton}
                      onPress={() => { setCurrentPreview(null); setLocationPhase("idle"); }}
                    >
                      <Text style={styles.cancelPreviewText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.savePreviewButton, saving && styles.savePreviewButtonDisabled]}
                      onPress={saveCurrentPreview}
                      disabled={saving}
                    >
                      {saving
                        ? <ActivityIndicator size={16} color="#fff" />
                        : <Text style={styles.savePreviewText}>Save address</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              ) : locationPhase === "idle" && (
                <View style={styles.placeholderContainerSmall}>
                  <Ionicons name="navigate-outline" size={28} color="#d1d5db" />
                  <Text style={styles.placeholderTextSmall}>
                    Tap the button above — GPS locks your position, then you drag the pin to your exact door
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {!currentPreview && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => { setShowAddForm(false); setCurrentPreview(null); setLocationPhase("idle"); }}
            >
              <Text style={styles.cancelButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
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
      if (showMapPicker) {
        return renderMapPicker();
      }
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
          {...(showMapPicker ? {} : panResponder.panHandlers)}
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
  // MAP PICKER
  mapPickerContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  mapTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  mapBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  mapTopBarTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#262626",
    flex: 1,
  },
  myLocationButton: {
    position: "absolute",
    right: 16,
    bottom: 230,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  mapBottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  mapAddressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  mapAddressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff5ee",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffdab3",
  },
  mapAddressContent: {
    flex: 1,
  },
  mapAddressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#262626",
    lineHeight: 20,
  },
  mapAddressHint: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  geocodingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  geocodingText: {
    fontSize: 13,
    color: "#9ca3af",
  },
  mapDragHint: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 14,
  },
  confirmPinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff6b00",
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    shadowColor: "#ff6b00",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  confirmPinButtonDisabled: {
    backgroundColor: "#fb923c",
    shadowOpacity: 0,
  },
  confirmPinText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  // Custom draggable pin
  pinContainer: {
    alignItems: "center",
  },
  pin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ff6b00",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#ff6b00",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  pinShadow: {
    width: 12,
    height: 6,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
    marginTop: 2,
  },
  // Edit pin link
  editPinButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fff5ee",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#ffdab3",
  },
  editPinText: {
    fontSize: 13,
    color: "#ff6b00",
    fontWeight: "600",
  },

  // PHASE PROGRESS STEPS
  phaseContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },
  phaseStep: {
    alignItems: "center",
    gap: 4,
  },
  phaseIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
  },
  phaseIconActive: {
    backgroundColor: "#ff6b00",
  },
  phaseIconPending: {
    backgroundColor: "#d1d5db",
  },
  phaseConnector: {
    width: 32,
    height: 2,
    backgroundColor: "#e5e7eb",
    marginBottom: 18,
  },
  phaseLabel: {
    fontSize: 11,
    color: "#929292",
    fontWeight: "500",
  },
  phaseLabelActive: {
    color: "#ff6b00",
    fontWeight: "700",
  },

  // BIG FETCH LOCATION BUTTON STYLES
  bigFetchLocationButton: {
    backgroundColor: "#ff6b00",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#ff6b00",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  bigFetchLocationButtonLoading: {
    backgroundColor: "#fb923c",
    shadowOpacity: 0.1,
  },
  bigFetchLocationButtonRetry: {
    backgroundColor: "#374151",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    paddingVertical: 18,
  },
  fetchContentContainer: {
    alignItems: "center",
    gap: 10,
  },
  fetchLoadingContainer: {
    alignItems: "center",
    gap: 10,
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
    fontSize: 15,
    color: "#fff",
    fontWeight: "700",
  },
  fetchLoadingHint: {
    fontSize: 12,
    color: "#ffe6d0",
    fontWeight: "400",
  },

  // PREVIEW CARD
  previewCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    marginTop: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  previewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewTitle: {
    fontWeight: "700",
    fontSize: 15,
    color: "#262626",
  },
  previewAddressRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  previewStreet: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },

  // ACCURACY BADGE
  accuracyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  accuracyExcellent: { backgroundColor: "#dcfce7" },
  accuracyGood: { backgroundColor: "#fef9c3" },
  accuracyPoor: { backgroundColor: "#fee2e2" },
  accuracyText: { fontSize: 11, fontWeight: "700" },
  accuracyTextExcellent: { color: "#15803d" },
  accuracyTextGood: { color: "#854d0e" },
  accuracyTextPoor: { color: "#991b1b" },

  // ACCURACY WARNING
  accuracyWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#fef3c7",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  accuracyWarningText: {
    fontSize: 12,
    color: "#92400e",
    flex: 1,
    lineHeight: 17,
  },

  previewActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  cancelPreviewButton: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cancelPreviewText: { color: "#374151", fontWeight: "600", fontSize: 14 },
  savePreviewButton: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#ff6b00",
    alignItems: "center",
    justifyContent: "center",
  },
  savePreviewButtonDisabled: {
    backgroundColor: "#fb923c",
  },
  savePreviewText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  placeholderContainerSmall: {
    alignItems: "center",
    padding: 24,
    marginTop: 4,
    gap: 10,
  },
  placeholderTextSmall: { color: "#9ca3af", textAlign: "center", fontSize: 14, lineHeight: 20 },
  placeholderText: {
    fontSize: 14,
    color: "#ff6b00",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  instructionContainer: {
    display: "none", // replaced by phase steps
  },
  instructionText: {
    display: "none",
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
