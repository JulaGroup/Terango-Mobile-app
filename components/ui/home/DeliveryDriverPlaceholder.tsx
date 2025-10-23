import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Temporary placeholder component for delivery driver image
// Replace this by saving your actual image as: assets/images/delivery-driver.png
export default function DeliveryDriverPlaceholder() {
  return (
    <View style={styles.container}>
      {/* Orange motorcycle icon as placeholder */}
      <View style={styles.iconContainer}>
        <Ionicons name="bicycle" size={100} color="#FF6B35" />
        <View style={styles.helmet}>
          <Ionicons name="ellipse" size={40} color="#FF8E53" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  iconContainer: {
    position: "relative",
  },
  helmet: {
    position: "absolute",
    top: -20,
    right: 15,
  },
});
