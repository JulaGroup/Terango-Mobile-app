// app/auth/address-setup.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Animated,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { userApi } from "@/lib/api";
import { SecureStorage } from "@/utils/secureStorage";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
const { width } = Dimensions.get("window");

export default function AddressSetup() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingExistingAddress, setCheckingExistingAddress] = useState(true);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);

  // Check if user already has a home address
  useEffect(() => {
    const checkExistingAddress = async () => {
      try {
        const userId = await SecureStorage.getItem("userId");
        if (!userId) {
          setCheckingExistingAddress(false);
          return;
        }

        const profile = await userApi.getUserProfile(userId);

        // If user already has home address, skip this screen
        if (profile?.homeAddress && profile.homeAddress.trim()) {
          console.log("✅ User already has home address, skipping onboarding");
          router.replace("/(tabs)");
          return;
        }

        setCheckingExistingAddress(false);
      } catch (error) {
        console.error("Error checking existing address:", error);
        setCheckingExistingAddress(false);
      }
    };

    checkExistingAddress();
  }, [router]);

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, iconScale]);

  const handleAutoDetectLocation = async () => {
    setFetchingLocation(true);
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please enable location services in your device settings to use this feature.",
          [{ text: "OK" }]
        );
        setFetchingLocation(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setCoordinates({ latitude, longitude });

      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const detectedAddress = [
          place.street,
          place.city,
          place.region,
          place.country,
        ]
          .filter(Boolean)
          .join(", ");

        setAddress(detectedAddress || "Location detected");

        Alert.alert(
          "Location Detected! 📍",
          "We found your current location. You can edit it if needed.",
          [{ text: "OK" }]
        );
      }
    } catch (error: any) {
      console.error("Location detection error:", error);
      Alert.alert(
        "Error",
        "Could not detect your location. Please enter your address manually.",
        [{ text: "OK" }]
      );
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleContinue = async () => {
    if (!address.trim()) {
      Alert.alert(
        "Address Required",
        "Please enter your home address or use auto-detect.",
        [{ text: "OK" }]
      );
      return;
    }

    setLoading(true);
    try {
      const userId = await SecureStorage.getItem("userId");
      if (!userId) throw new Error("User ID not found");

      // Get coordinates if not already detected
      let finalCoords = coordinates;
      if (!finalCoords && address.trim()) {
        try {
          const geocoded = await Location.geocodeAsync(address);
          if (geocoded && geocoded.length > 0) {
            finalCoords = {
              latitude: geocoded[0].latitude,
              longitude: geocoded[0].longitude,
            };
          }
        } catch (err) {
          console.log("Could not geocode address:", err);
        }
      }

      // Save address to backend
      await userApi.updateProfile({
        homeAddress: address,
        homeLatitude: finalCoords?.latitude,
        homeLongitude: finalCoords?.longitude,
      });

      console.log("✅ Home address saved successfully");

      // Navigate to main app
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("Error saving address:", err);
      Alert.alert(
        "Error",
        err.message || "Failed to save address. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip for now?",
      "You can add your home address later in your profile settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          style: "destructive",
          onPress: () => router.replace("/(tabs)"),
        },
      ]
    );
  };

  // Show loading screen while checking for existing address
  if (checkingExistingAddress) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PrimaryColor} />
        <Text style={styles.loadingText}>Checking your profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ scale: iconScale }] },
            ]}
          >
            <LinearGradient
              colors={[PrimaryColor, "#FF6B9D"]}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="home" size={48} color="white" />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>Set Your Home Address</Text>
          <Text style={styles.subtitle}>
            Help us deliver to you faster by saving your home address
          </Text>

          {/* Auto-detect Button */}
          <TouchableOpacity
            style={styles.autoDetectButton}
            onPress={handleAutoDetectLocation}
            disabled={fetchingLocation}
          >
            <LinearGradient
              colors={["#4F46E5", "#7C3AED"]}
              style={styles.autoDetectGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {fetchingLocation ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons name="location" size={24} color="white" />
              )}
              <Text style={styles.autoDetectText}>
                {fetchingLocation
                  ? "Detecting Location..."
                  : "Auto-Detect My Location"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Manual Address Input */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="location-outline"
              size={20}
              color="#6B7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Enter your home address"
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Location Status & Map Preview */}
          {coordinates && (
            <>
              <View style={styles.locationStatus}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.locationStatusText}>
                  Location coordinates detected
                </Text>
              </View>

              {/* Map Preview - Visual Confirmation */}
              <View style={styles.mapContainer}>
                <Text style={styles.mapLabel}>📍 Location Preview</Text>
                <View style={styles.mapPlaceholder}>
                  <Ionicons name="map" size={48} color={PrimaryColor} />
                  <Text style={styles.mapCoordinates}>
                    Lat: {coordinates.latitude.toFixed(6)}
                  </Text>
                  <Text style={styles.mapCoordinates}>
                    Lng: {coordinates.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.mapNote}>🗺️ Map view will show here</Text>
                </View>

                <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={{
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  provider={PROVIDER_GOOGLE}
                >
                  <Marker
                    coordinate={{
                      latitude: coordinates.latitude,
                      longitude: coordinates.longitude,
                    }}
                    title="Your Home"
                    description={address}
                  />
                </MapView>
              </View>
            </>
          )}

          {/* Continue Button */}
          <TouchableOpacity
            disabled={loading}
            style={[
              styles.continueButton,
              (!address.trim() || loading) && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
          >
            <LinearGradient
              colors={
                !address.trim() || loading
                  ? ["#D1D5DB", "#9CA3AF"]
                  : [PrimaryColor, "#FF6B9D"]
              }
              style={styles.continueGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Skip Button */}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>

          {/* Info Footer */}
          <View style={styles.infoFooter}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#6B7280"
            />
            <Text style={styles.infoText}>
              Your address will be used for delivery estimates and saved for
              faster checkout
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
  },
  iconContainer: {
    alignSelf: "center",
    marginBottom: 24,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    color: "#111827",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  autoDetectButton: {
    marginBottom: 24,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  autoDetectGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  autoDetectText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
    minHeight: 100,
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    lineHeight: 22,
  },
  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 6,
  },
  locationStatusText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "600",
  },
  continueButton: {
    marginBottom: 16,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  continueGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 8,
  },
  continueButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 24,
  },
  skipButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  infoFooter: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: "auto",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  // Loading screen styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  // Map preview styles
  mapContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: PrimaryColor + "30",
  },
  mapLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: PrimaryColor,
    marginBottom: 12,
    textAlign: "center",
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  map: {
    height: 200,
    width: "100%",
  },
  mapCoordinates: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  mapNote: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
    fontStyle: "italic",
  },
});
