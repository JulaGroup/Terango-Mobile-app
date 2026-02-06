import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";

const { width } = Dimensions.get("window");
const isDesktop = width >= 1024;

export default function WebContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  // Show desktop blocker on large screens
  if (isDesktop) {
    return (
      <View style={styles.desktopBlocker}>
        <View style={styles.messageCard}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="phone-portrait-outline"
              size={64}
              color={PrimaryColor}
            />
          </View>
          <Text style={styles.title}>Mobile Experience Only</Text>
          <Text style={styles.message}>
            TeranGO is optimized for mobile and tablet devices. For the best
            experience, please access this application on a smartphone or
            tablet.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.hint}>
            Try resizing your browser window or scan the QR code with your
            mobile device.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.webWrapper}>
      <View style={styles.responsiveContainer}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  responsiveContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
    alignSelf: "center",
    overflow: "hidden",
  },
  desktopBlocker: {
    flex: 1,
    backgroundColor: "#0B0D0F",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  messageCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 48,
    maxWidth: 560,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${PrimaryColor}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  divider: {
    width: 60,
    height: 4,
    backgroundColor: PrimaryColor,
    borderRadius: 2,
    marginVertical: 20,
  },
  hint: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    fontStyle: "italic",
  },
});
