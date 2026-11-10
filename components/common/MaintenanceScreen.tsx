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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMaintenance } from "@/context/MaintenanceContext";

interface MaintenanceScreenProps {
  serviceName?: string;
  message?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
  onBack?: () => void;
}

const ORANGE = "#FF6B00";

export default function MaintenanceScreen({
  serviceName,
  message,
  onRetry,
  fullScreen = true,
  onBack,
}: MaintenanceScreenProps) {
  const { flags, refetch } = useMaintenance();
  const router = useRouter();

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
          <Ionicons name="construct" size={42} color={ORANGE} />
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
        activeOpacity={0.85}
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

  const backButton = (
    <TouchableOpacity
      style={styles.backBtn}
      onPress={() => (onBack ? onBack() : router.back())}
      activeOpacity={0.8}
    >
      <Ionicons name="chevron-back" size={22} color="#1C1C1E" />
    </TouchableOpacity>
  );

  if (!fullScreen) {
    return (
      <View style={styles.cardContainer}>
        {content}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>{backButton}</View>
        <View style={styles.centerWrap}>{content}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7FB" },
  safeArea: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingTop: 8 },
  centerWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1C1C1E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F6F7FB",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
    maxWidth: 360,
  },
  iconWrapper: { marginBottom: 24 },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 28,
    backgroundColor: "#FFF1E6",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 23,
    fontWeight: "900",
    color: "#1C1C1E",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    color: "#8A8F98",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 26,
    fontWeight: "500",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1E6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 30,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ORANGE,
    marginRight: 8,
  },
  pillText: { fontSize: 12.5, color: ORANGE, fontWeight: "700" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ORANGE,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
