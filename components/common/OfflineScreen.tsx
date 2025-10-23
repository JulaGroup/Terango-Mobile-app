// components/common/OfflineScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { LinearGradient } from "expo-linear-gradient";

interface OfflineScreenProps {
  onRetry?: () => void;
  message?: string;
}

export default function OfflineScreen({
  onRetry,
  message,
}: OfflineScreenProps) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Pulse animation for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, pulseAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient colors={["#F9FAFB", "#FFFFFF"]} style={styles.gradient}>
        {/* Animated Icon */}
        <Animated.View
          style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-offline-outline" size={80} color="#9CA3AF" />
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>You&apos;re Offline</Text>

        {/* Message */}
        <Text style={styles.message}>
          {message ||
            "No internet connection detected. Please check your network settings and try again."}
        </Text>

        {/* Features unavailable list */}
        <View style={styles.featuresList}>
          <FeatureItem
            icon="wifi-outline"
            text="Internet connection required"
            unavailable
          />
          <FeatureItem
            icon="bookmark-outline"
            text="Cached content may be available"
            unavailable={false}
          />
          <FeatureItem
            icon="reload-outline"
            text="Data will sync when back online"
            unavailable={false}
          />
        </View>

        {/* Retry Button */}
        {onRetry && (
          <TouchableOpacity style={styles.button} onPress={onRetry}>
            <LinearGradient
              colors={[PrimaryColor, "#FF6B9D"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.buttonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#9CA3AF"
          />
          <Text style={styles.helpText}>
            Make sure Wi-Fi or mobile data is enabled
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// Feature item component
const FeatureItem = ({
  icon,
  text,
  unavailable = false,
}: {
  icon: string;
  text: string;
  unavailable?: boolean;
}) => (
  <View style={styles.featureItem}>
    <View
      style={[
        styles.featureIcon,
        unavailable
          ? styles.featureIconUnavailable
          : styles.featureIconAvailable,
      ]}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={unavailable ? "#EF4444" : "#10B981"}
      />
    </View>
    <Text
      style={[styles.featureText, unavailable && styles.featureTextUnavailable]}
    >
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  featuresList: {
    width: "100%",
    marginBottom: 32,
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  featureIconUnavailable: {
    backgroundColor: "#FEE2E2",
  },
  featureIconAvailable: {
    backgroundColor: "#D1FAE5",
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  featureTextUnavailable: {
    color: "#9CA3AF",
  },
  button: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  helpContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  helpText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
});
