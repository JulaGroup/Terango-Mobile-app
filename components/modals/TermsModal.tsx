import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LegalConfig } from "@/constants/legal";

interface TermsModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const { height } = Dimensions.get("window");

export default function TermsModal({
  visible,
  onAccept,
  onDecline,
}: TermsModalProps) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // URLs from configuration
  const TERMS_URL = LegalConfig.TERMS_URL;
  const PRIVACY_URL = LegalConfig.PRIVACY_URL;

  useEffect(() => {
    if (visible) {
      // Reset agreement when modal opens
      setAgreedToTerms(false);

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

  const handleLinkPress = (url: string, title: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        console.log(`Failed to open ${title}`);
      });
    } else {
      console.log(`${title} URL not configured yet`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDecline}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => {}} // Prevent closing by tapping backdrop
        >
          <BlurView intensity={30} style={StyleSheet.absoluteFill} />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header with Icon */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={40} color="#FF6B35" />
              </View>
            </View>
            <Text style={styles.title}>Welcome to TeranGO!</Text>
            <Text style={styles.subtitle}>
              To continue, please agree to our terms
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.infoText}>
                  Your data is secure and encrypted
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.infoText}>We respect your privacy</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.infoText}>
                  You can delete your account anytime
                </Text>
              </View>
            </View>

            {/* Links Section */}
            <View style={styles.linksSection}>
              <Text style={styles.linksTitle}>Please review our policies:</Text>

              <TouchableOpacity
                style={styles.linkCard}
                onPress={() => handleLinkPress(TERMS_URL, "Terms of Service")}
              >
                <View style={styles.linkIconContainer}>
                  <Ionicons name="document-text" size={24} color="#FF6B35" />
                </View>
                <View style={styles.linkContent}>
                  <Text style={styles.linkTitle}>Terms of Service</Text>
                  <Text style={styles.linkDescription}>
                    Learn about your rights and responsibilities
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkCard}
                onPress={() => handleLinkPress(PRIVACY_URL, "Privacy Policy")}
              >
                <View style={styles.linkIconContainer}>
                  <Ionicons name="lock-closed" size={24} color="#FF6B35" />
                </View>
                <View style={styles.linkContent}>
                  <Text style={styles.linkTitle}>Privacy Policy</Text>
                  <Text style={styles.linkDescription}>
                    See how we protect your information
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Agreement Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  agreedToTerms && styles.checkboxChecked,
                ]}
              >
                {agreedToTerms && (
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.checkboxText}>
                I have read and agree to the{" "}
                <Text
                  style={styles.linkText}
                  onPress={() => handleLinkPress(TERMS_URL, "Terms of Service")}
                >
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                  style={styles.linkText}
                  onPress={() => handleLinkPress(PRIVACY_URL, "Privacy Policy")}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.acceptButton,
                !agreedToTerms && styles.acceptButtonDisabled,
              ]}
              onPress={onAccept}
              disabled={!agreedToTerms}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.acceptButtonText,
                  !agreedToTerms && styles.acceptButtonTextDisabled,
                ]}
              >
                Accept & Continue
              </Text>
              {agreedToTerms && (
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineButton}
              onPress={onDecline}
              activeOpacity={0.7}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    maxHeight: height * 0.9,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF5F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFE5DD",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 24,
    maxHeight: height * 0.5,
  },
  infoCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: "#065F46",
    fontWeight: "500",
  },
  linksSection: {
    marginBottom: 24,
  },
  linksTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  linkIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF5F2",
    justifyContent: "center",
    alignItems: "center",
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  linkDescription: {
    fontSize: 13,
    color: "#6B7280",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  linkText: {
    color: "#FF6B35",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  actions: {
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  acceptButton: {
    flexDirection: "row",
    backgroundColor: "#FF6B35",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: "#E5E7EB",
    shadowOpacity: 0,
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  acceptButtonTextDisabled: {
    color: "#9CA3AF",
  },
  declineButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  declineButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
});
