import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";
interface LoginRequiredDialogProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  action?: string; // "add to cart", "place order", etc.
}

const { width } = Dimensions.get("window");

export default function LoginRequiredDialog({
  visible,
  onClose,
  title = "Login Required",
  message = "Please sign in to continue with this action.",
  action = "continue",
}: LoginRequiredDialogProps) {
  const router = useRouter();

  const handleLogin = () => {
    onClose();
    router.push("/auth");
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header with Icon */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={32}
                color={PrimaryColor}
              />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>Benefits of signing in:</Text>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.benefitText}>Save items to your cart</Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.benefitText}>Track your orders</Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.benefitText}>Faster checkout</Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.benefitText}>
                  Personalized recommendations
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Continue Browsing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[PrimaryColor, "#E55A3D"]}
                style={styles.loginButtonGradient}
              >
                <Text style={styles.loginButtonText}>Sign In / Sign Up</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    width: width - 40,
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${PrimaryColor}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  message: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  benefitsContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  actions: {
    flexDirection: "column",
    gap: 12,
    padding: 20,
    paddingTop: 0,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
  },
  loginButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});
