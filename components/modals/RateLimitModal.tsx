import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

interface RateLimitModalProps {
  visible: boolean;
  onClose: () => void;
  retryAfter?: string; // e.g., "30 minutes", "1 hour"
  message?: string;
}

const { height } = Dimensions.get("window");

export default function RateLimitModal({
  visible,
  onClose,
  retryAfter = "30 minutes",
  message,
}: RateLimitModalProps) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide up and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide down and fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Warning Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={48} color="#FF6B35" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Request Blocked</Text>

          {/* Message */}
          <Text style={styles.message}>
            {message ||
              `Too many login attempts detected. For your security, please try again in ${retryAfter}.`}
          </Text>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#6B7280"
            />
            <Text style={styles.infoText}>
              This helps protect your account from unauthorized access
            </Text>
          </View>

          {/* Retry Time */}
          <View style={styles.retryContainer}>
            <Ionicons name="time-outline" size={20} color="#FF6B35" />
            <Text style={styles.retryText}>Try again in: {retryAfter}</Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>I Understand</Text>
          </TouchableOpacity>

          {/* Help Link */}
          <TouchableOpacity style={styles.helpButton} onPress={onClose}>
            <Text style={styles.helpText}>Contact Support</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 420,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFF5F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFE5DD",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  retryContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F2",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFE5DD",
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B35",
  },
  button: {
    backgroundColor: "#FF6B35",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  helpButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  helpText: {
    fontSize: 15,
    color: "#FF6B35",
    fontWeight: "600",
  },
});
