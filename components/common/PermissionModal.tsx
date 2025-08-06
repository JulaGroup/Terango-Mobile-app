import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface PermissionModalProps {
  visible: boolean;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
  loading?: boolean;
}

const PermissionModal: React.FC<PermissionModalProps> = ({
  visible,
  title,
  description,
  icon,
  iconColor,
  primaryButtonText,
  secondaryButtonText,
  onPrimaryPress,
  onSecondaryPress,
  loading = false,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={styles.modalContainer}>
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${iconColor}15` },
            ]}
          >
            <Ionicons name={icon} size={48} color={iconColor} />
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: iconColor }]}
              onPress={onPrimaryPress}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <Animated.View style={styles.loadingIndicator}>
                  <Text style={styles.primaryButtonText}>Loading...</Text>
                </Animated.View>
              ) : (
                <Text style={styles.primaryButtonText}>
                  {primaryButtonText}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onSecondaryPress}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>
                {secondaryButtonText}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    width: width - 40,
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  contentContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 28,
  },
  description: {
    fontSize: 16,
    fontWeight: "400",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  secondaryButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "500",
  },
  loadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default PermissionModal;
