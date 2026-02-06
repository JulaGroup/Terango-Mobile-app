import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";
import { useLocation } from "@/hooks/useLocation";
import { useAddress } from "@/context/AddressContext";
import { AddressService } from "@/services/AddressService";
import { SecureStorage } from "@/utils/secureStorage";
import { LinearGradient } from "expo-linear-gradient";

export default function AddHomeAddress() {
  const router = useRouter();
  const { getCurrentLocation } = useLocation();
  const { addAddress } = useAddress();

  const [loading, setLoading] = useState(false);
  const [locationFetched, setLocationFetched] = useState(false);
  const [addressPreview, setAddressPreview] = useState<{
    street: string;
    city: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    // Entrance animation
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

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    try {
      // Get current location (permission check is handled by useLocation hook)
      const currentLoc = await getCurrentLocation();
      if (!currentLoc) {
        alert(
          "Unable to get your location. Please enable location permissions in settings and try again."
        );
        setLoading(false);
        return;
      }

      // Reverse geocode to get readable address
      const displayAddress = await AddressService.getAddressFromCoordinates(
        currentLoc.latitude,
        currentLoc.longitude
      );

      // Set preview for user confirmation
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

  const handleSaveAddress = async () => {
    if (!addressPreview) return;

    setLoading(true);
    try {
      const userId = await SecureStorage.getItem("userId");
      if (!userId) throw new Error("User ID not found");

      // Save as default home address
      await addAddress({
        label: "Home",
        street: addressPreview.street,
        city: addressPreview.city,
        country: "The Gambia",
        latitude: addressPreview.latitude,
        longitude: addressPreview.longitude,
      });

      // Mark onboarding as complete
      await SecureStorage.setItem("addressOnboardingComplete", "true");

      // Navigate to main app
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
      // Mark that user skipped this step
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
          {!locationFetched ? (
            // Show "Use Current Location" button
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
            // Show "Continue" button after location is fetched
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

// Benefit Item Component
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
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
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
