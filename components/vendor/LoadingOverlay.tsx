import React from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

interface LoadingOverlayProps {
  visible: boolean;
  label?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, label }) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay} accessibilityLabel="Loading">
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#2563EB" />
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.18)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    minWidth: 180,
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },
});

export default LoadingOverlay;
