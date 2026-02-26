import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import * as Clipboard from "expo-clipboard";

export default function PromoSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync("LAUNCH2026");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.wrapper}>
      {/* --- MAIN FREE DELIVERY BANNER --- */}
      <View style={styles.bannerLarge}>
        <View style={styles.leftSection}>
          {/* <Text style={styles.icon}> */}
          <Image
            style={{ width: 40, height: 40 }}
            source={require("../../../assets/images/motorbike.png")}
            resizeMode="contain"
          />
          {/* </Text> */}
          <View>
            <Text style={styles.mainHeading}>
              FREE <Text style={styles.deliveryText}>DELIVERY</Text>
            </Text>
            <Text style={styles.subText}>
              On nearby orders over{" "}
              <Text style={styles.amountText}>GMD 500</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* --- LAUNCH OFFER BANNER --- */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.bannerSmall, copied && styles.bannerSmallActive]}
        onPress={handleCopy}
      >
        <View style={styles.smallLeft}>
          <Text style={styles.tagIcon}>🔥</Text>
          <View>
            <Text style={styles.smallHeading}>Launch Offer!</Text>
            <Text style={styles.smallText}>
              Use code <Text style={styles.promoCode}>LAUNCH2026</Text> for free
              delivery
            </Text>
          </View>
        </View>

        <View style={styles.copyButtonSmall}>
          <Text style={styles.copyIcon}>{copied ? "✓" : "📋"}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    width: "100%",
    maxWidth: "100%",
    alignSelf: "center",
    gap: 10,
    marginTop: 20,
  },

  /* === MAIN FREE DELIVERY BANNER === */
  bannerLarge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 18,
    shadowColor: "#ff7300",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  icon: {
    fontSize: 42,
  },
  mainHeading: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  deliveryText: {
    color: "#ff7300",
  },
  subText: {
    fontSize: 13,
    color: "#ccc",
    fontWeight: "500",
    marginTop: 2,
  },
  amountText: {
    fontWeight: "700",
    color: "#ffa500",
  },

  /* === SMALL LAUNCH BANNER === */
  bannerSmall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ff7300",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#ff7300",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  bannerSmallActive: {
    backgroundColor: "#ff8a1d",
  },
  smallLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tagIcon: {
    fontSize: 24,
    color: "#fff",
  },
  smallHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  smallText: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.9,
    marginTop: 1,
  },
  promoCode: {
    fontWeight: "900",
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  copyButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  copyIcon: {
    fontSize: 16,
    color: "#fff",
  },
});
