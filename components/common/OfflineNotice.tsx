// components/common/OfflineNotice.tsx
import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { LinearGradient } from "expo-linear-gradient";

export default function OfflineNotice() {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  const isOffline = !isConnected || isInternetReachable === false;

  React.useEffect(() => {
    if (isOffline) {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide up
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOffline, slideAnim]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={["#EF4444", "#DC2626"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.content}>
          <Ionicons name="cloud-offline" size={20} color="white" />
          <View style={styles.textContainer}>
            <Text style={styles.title}>No Internet Connection</Text>
            <Text style={styles.subtitle}>
              Please check your connection and try again
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10,
  },
  gradient: {
    paddingTop: 50, // Account for status bar
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
  },
});
