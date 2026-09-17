import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { openPaymentHelp, type PaymentHelpDetails } from "@/utils/paymentHelp";

/**
 * "Can't pay? Message us on WhatsApp" — shown under every Pay button. Asks
 * which support line to message, then opens WhatsApp pre-filled with the
 * order/booking/delivery details (see utils/paymentHelp.ts).
 */
export function CantPayLink({
  details,
  style,
}: {
  details: PaymentHelpDetails;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      style={[styles.link, Platform.OS === "web" && ({ cursor: "pointer" } as any), style]}
      onPress={() => openPaymentHelp(details)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Can't pay? Message us on WhatsApp"
    >
      <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
      <Text style={styles.text}>Can&apos;t pay? Message us on WhatsApp</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginBottom: 4,
  },
  text: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
});
