import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";

interface ComingSoonModalProps {
  visible: boolean;
  title: string;
  message: string;
  helper?: string;
  badge?: string;
  onClose: () => void;
}

const ComingSoonModal: React.FC<ComingSoonModalProps> = ({
  visible,
  title,
  message,
  helper,
  badge,
  onClose,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss coming soon modal"
        />
        <View style={styles.card}>
          <LinearGradient
            colors={["#2563EB", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.iconBadge}>
                <Ionicons name="sparkles" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.titleText}>{title}</Text>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            </View>
            {badge ? (
              <View style={styles.badgeChip}>
                <Ionicons name="hourglass" size={12} color="#fff" />
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
          </LinearGradient>

          {helper ? <Text style={styles.helperText}>{helper}</Text> : null}

          <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
            <Text style={styles.primaryButtonText}>Sounds good</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  messageText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    lineHeight: 18,
  },
  badgeChip: {
    marginTop: 18,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  helperText: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    fontSize: 13,
    lineHeight: 18,
    color: "#374151",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: PrimaryColor,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default ComingSoonModal;
