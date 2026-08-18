import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Animated,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";
import { useLocation } from "@/hooks/useLocation";
import { useAddress } from "@/context/AddressContext";
import { AddressService } from "@/services/AddressService";
import LocationSearchSheet, {
  PickedLocation,
} from "@/components/express/LocationSearchSheet";
import { SecureStorage } from "@/utils/secureStorage";
import { LinearGradient } from "expo-linear-gradient";
import { PermissionContext } from "@/context/PermissionContext";
import * as Location from "expo-location";

export default function AddHomeAddress() {
  const router = useRouter();
  const { getCurrentLocation } = useLocation();
  const { addAddress } = useAddress();
  const [searchOpen, setSearchOpen] = useState(false);
  const permissionContext = useContext(PermissionContext);

  const [loading, setLoading] = useState(false);
  const [locationFetched, setLocationFetched] = useState(false);
  const [addressPreview, setAddressPreview] = useState<{
    street: string;
    city: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  // Track app state so we can re-attempt location after user returns from Settings
  const appState = React.useRef(AppState.currentState);
  const waitingForSettingsReturn = React.useRef(false);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // When user returns from Settings, automatically retry fetching location
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const comingToForeground =
        appState.current.match(/inactive|background/) && nextState === "active";

      appState.current = nextState;

      if (comingToForeground && waitingForSettingsReturn.current) {
        waitingForSettingsReturn.current = false;
        // Small delay to let iOS fully restore permission state
        setTimeout(() => {
          attemptFetchLocation();
        }, 500);
      }
    });

    return () => subscription.remove();
  }, []);

  /**
   * Core location fetch — called after permission is confirmed granted.
   */
  const attemptFetchLocation = async () => {
    setLoading(true);
    try {
      const currentLoc = await getCurrentLocation();
      if (!currentLoc) {
        alert(
          "Unable to get your location. Please enable location permissions in Settings and try again.",
        );
        return;
      }

      const displayAddress = await AddressService.getAddressFromCoordinates(
        currentLoc.latitude,
        currentLoc.longitude,
      );

      setAddressPreview({
        street: displayAddress,
        city: currentLoc.address || "Banjul",
        latitude: currentLoc.latitude,
        longitude: currentLoc.longitude,
      });

      setLocationFetched(true);
    } catch (error) {
      console.error("Error fetching location:", error);
      alert("Failed to get your location. Please try again or skip for now.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Main handler for "Use Current Location" button.
   *
   * Strategy:
   * 1. Check current permission status directly via expo-location.
   * 2a. If granted → fetch immediately.
   * 2b. If undetermined → ask via PermissionContext modal (which triggers native prompt),
   *     then re-check and fetch.
   * 2c. If denied → tell user to open Settings; set flag so we auto-retry on return.
   */
  const handleUseCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status === "granted") {
        await attemptFetchLocation();
        return;
      }

      if (status === "undetermined") {
        // Use PermissionContext to show the native permission prompt
        if (permissionContext) {
          setLoading(false); // release loading while modal is shown
          await permissionContext.requestLocationPermission();

          // Re-check after user responds to the prompt
          const { status: newStatus } =
            await Location.getForegroundPermissionsAsync();

          if (newStatus === "granted") {
            await attemptFetchLocation();
          } else {
            // User denied — nudge them toward Settings
            alert(
              "Location permission denied. You can enable it in Settings → Privacy & Security → Location Services → TeranGO.",
            );
          }
        } else {
          // Fallback: ask directly if context is unavailable
          const { status: newStatus } =
            await Location.requestForegroundPermissionsAsync();
          if (newStatus === "granted") {
            await attemptFetchLocation();
          }
        }
        return;
      }

      // Status is "denied" — user must go to Settings
      setLoading(false);
      waitingForSettingsReturn.current = true;
      alert(
        "Location permission is disabled. Please go to Settings → Privacy & Security → Location Services → TeranGO and enable 'While Using the App', then come back.",
      );
    } catch (error) {
      console.error("Permission check error:", error);
      setLoading(false);
      alert("Failed to check location permissions. Please try again.");
    }
  };

  const handleSaveAddress = async () => {
    if (!addressPreview) return;

    setLoading(true);
    try {
      const userId = await SecureStorage.getItem("userId");
      if (!userId) throw new Error("User ID not found");

      await addAddress({
        label: "Home",
        street: addressPreview.street,
        city: addressPreview.city,
        country: "The Gambia",
        latitude: addressPreview.latitude,
        longitude: addressPreview.longitude,
      });

      await SecureStorage.setItem("addressOnboardingComplete", "true");
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error saving address:", error);
      alert("Failed to save address. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await SecureStorage.setItem("addressOnboardingComplete", "skipped");
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error skipping:", error);
      router.replace("/(tabs)");
    }
  };

  return (
    <View style={styles.container}>
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
        {/* Illustration Circle */}
        <View style={styles.illustrationContainer}>
          <LinearGradient
            colors={[PrimaryColor + "20", PrimaryColor + "05"]}
            style={styles.illustrationCircle}
          >
            <Ionicons name="home" size={100} color={PrimaryColor} />
          </LinearGradient>
        </View>

        {/* Title and Description */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Add Your Home Address</Text>
          <Text style={styles.description}>
            Help us deliver to you faster by saving your home address.
            We&apos;ll use your location to show nearby restaurants and
            calculate accurate delivery fees.
          </Text>
        </View>

        {/* Address Preview (if fetched) */}
        {locationFetched && addressPreview && (
          <Animated.View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Ionicons name="location-sharp" size={24} color={PrimaryColor} />
              <Text style={styles.previewLabel}>Your Location</Text>
            </View>
            <Text style={styles.previewAddress}>{addressPreview.street}</Text>
            <Text style={styles.previewCity}>{addressPreview.city}</Text>

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={handleUseCurrentLocation}
                disabled={loading}
              >
                <Ionicons name="refresh" size={16} color={PrimaryColor} />
                <Text style={styles.changeButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Searching has to be an equal option, not a fallback. This screen
              was GPS-only, so anyone who declined the permission, got a poor
              fix indoors, or simply was not at home while signing up had no
              way to continue except Skip — which is how customers end up with
              no address and then cannot be quoted a delivery fee. */}
          {!locationFetched && (
            <TouchableOpacity
              style={styles.searchAddressButton}
              onPress={() => setSearchOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="search"
                size={20}
                color={PrimaryColor}
                style={styles.buttonIcon}
              />
              <Text style={styles.searchAddressButtonText}>
                Search for your address
              </Text>
            </TouchableOpacity>
          )}

          {!locationFetched ? (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                loading && styles.primaryButtonDisabled,
              ]}
              onPress={handleUseCurrentLocation}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="navigate"
                    size={22}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.primaryButtonText}>
                    Use Current Location
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                loading && styles.primaryButtonDisabled,
              ]}
              onPress={handleSaveAddress}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Continue to App</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={22}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsContainer}>
          <BenefitItem
            icon="flash"
            text="Faster checkout with saved addresses"
          />
          <BenefitItem
            icon="restaurant"
            text="See nearby restaurants and shops"
          />
          <BenefitItem icon="pricetag" text="Get accurate delivery fees" />
        </View>

        <LocationSearchSheet
          visible={searchOpen}
          mode="dropoff"
          onClose={() => setSearchOpen(false)}
          onSelect={(place: PickedLocation) => {
            setAddressPreview({
              street: place.address || place.label,
              city: place.city || "Banjul",
              latitude: place.latitude,
              longitude: place.longitude,
            });
            setLocationFetched(true);
            setSearchOpen(false);
          }}
          reference={null}
        />

        {/* Skip Option */}
        <View style={styles.skipContainer}>
          <TouchableOpacity
            style={styles.skipLinkButton}
            onPress={handleSkip}
            disabled={loading}
          >
            <Text style={styles.skipLinkText}>Skip for now and add later</Text>
            <Ionicons name="arrow-forward" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const BenefitItem = ({ icon, text }: { icon: string; text: string }) => (
  <View style={styles.benefitItem}>
    <View style={styles.benefitIconContainer}>
      <Ionicons name={icon as any} size={16} color={PrimaryColor} />
    </View>
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  illustrationContainer: {
    alignItems: "center",
    marginVertical: 30,
  },
  illustrationCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  previewCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: PrimaryColor + "20",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: PrimaryColor,
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewAddress: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  previewCity: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  changeButtonText: {
    fontSize: 14,
    color: PrimaryColor,
    fontWeight: "600",
    marginLeft: 6,
  },
  actionsContainer: {
    marginBottom: 30,
  },
  searchAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: PrimaryColor,
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 12,
  },
  searchAddressButtonText: {
    color: PrimaryColor,
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: PrimaryColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 12,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  buttonIcon: {
    marginHorizontal: 8,
  },
  benefitsContainer: {
    marginTop: 10,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  benefitIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PrimaryColor + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  benefitText: {
    fontSize: 15,
    color: "#4B5563",
    flex: 1,
  },
  skipContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  skipLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipLinkText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginRight: 6,
  },
});
