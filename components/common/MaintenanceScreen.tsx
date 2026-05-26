/**
 * MaintenanceScreen
 *
 * Full-screen maintenance view — shown either globally (whole app) or per
 * service (replaces the service's index screen content).
 *
 * Props:
 *   serviceName  – e.g. "Express Delivery" (shown in title)
 *   message      – override message text (falls back to context message)
 *   onRetry      – optional retry callback (re-fetches /api/app-status)
 *   fullScreen   – true → dark gradient overlay; false → card-style (default true)
 */
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMaintenance } from "@/context/MaintenanceContext";

interface MaintenanceScreenProps {
  serviceName?: string;
  message?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export default function MaintenanceScreen({
  serviceName,
  message,
  onRetry,
  fullScreen = true,
}: MaintenanceScreenProps) {
  const { flags, refetch } = useMaintenance();

  const displayMessage = message || flags.maintenanceMessage;

  const title = serviceName
    ? `${serviceName} Maintenance`
    : "We'll Be Right Back";

  // Subtle floating animation for the icon
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const handleRetry = async () => {
    await refetch();
    onRetry?.();
  };

  const content = (
    <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
      {/* Icon */}
      <Animated.View
        style={[styles.iconWrapper, { transform: [{ translateY: floatAnim }] }]}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="construct-outline" size={44} color="#ff6b00" />
        </View>
      </Animated.View>

      {/* Heading */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{displayMessage}</Text>

      {/* Status pill */}
      <View style={styles.pill}>
        <View style={styles.pillDot} />
        <Text style={styles.pillText}>Maintenance in progress</Text>
      </View>

      {/* Retry */}
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={handleRetry}
        activeOpacity={0.8}
      >
        <Ionicons
          name="refresh"
          size={16}
          color="#fff"
          style={{ marginRight: 6 }}
        />
        <Text style={styles.retryText}>Check Again</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  if (!fullScreen) {
    return <View style={styles.cardContainer}>{content}</View>;
  }

  return (
    <LinearGradient
      colors={["#1a1a1a", "#2d1a0a", "#1a1a1a"]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>{content}</SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
    maxWidth: 360,
  },
  iconWrapper: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,107,0,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,107,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,107,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,107,0,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 32,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ff6b00",
    marginRight: 8,
  },
  pillText: {
    fontSize: 12,
    color: "#ff6b00",
    fontWeight: "600",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff6b00",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
