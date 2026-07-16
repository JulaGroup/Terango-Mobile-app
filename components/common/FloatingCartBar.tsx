/**
 * Global floating "View Cart" bar — shown only on the three top-level
 * browsing screens (Home, Food, Mart), so a user with items in their cart
 * has a persistent way back to it without needing a dedicated Cart tab.
 * Mounted once in the root layout, above the navigation Stack.
 *
 * Deliberately an allowlist, not a denylist: it was previously shown
 * everywhere except a few excluded screens, which meant it sat on top of
 * (and blocked) the "Add to Cart" button on item detail pages like
 * /menuitem/[menuitem]. Only add a path here if it's a page you scroll
 * through browsing, not one with its own bottom action button.
 */
import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/context/CartContext";

const ORANGE = "#ff6b00";

// Only these screens show the floating cart bar.
const SHOWN_PATHS = new Set(["/", "/food", "/mart"]);

// Tab-group root routes render behind the floating tab bar, so the cart bar
// needs extra bottom offset there; other (stack) screens have no tab bar.
const TAB_ROOT_PATHS = new Set(["/", "/browse", "/orders", "/profile"]);

export default function FloatingCartBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { getItemCount, getTotalAmount, getVendorDetails } = useCart();

  const itemCount = getItemCount();
  const total = getTotalAmount();
  const vendor = getVendorDetails();

  const hidden = !SHOWN_PATHS.has(pathname) || itemCount === 0;

  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(1)).current;
  const [mounted, setMounted] = useState(!hidden);
  const previousCount = useRef(itemCount);

  useEffect(() => {
    if (!hidden) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 220,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 120,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [hidden]);

  // Small bounce whenever the item count goes up, so adding from a product
  // page gives a visible confirmation even though the bar was already up.
  useEffect(() => {
    if (itemCount > previousCount.current) {
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1.05,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
    previousCount.current = itemCount;
  }, [itemCount]);

  if (!mounted) return null;

  const isTabRoot = TAB_ROOT_PATHS.has(pathname);
  const bottomOffset = isTabRoot
    ? (Platform.OS === "ios" ? 49 : 75) + insets.bottom + 12
    : insets.bottom + 16;

  return (
    <Animated.View
      pointerEvents={hidden ? "none" : "box-none"}
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: bottomOffset,
        zIndex: 999,
        opacity,
        transform: [{ translateY }, { scale: bounce }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push("/cart")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#1a1a1a",
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 14,
          elevation: 10,
        }}
      >
        {/* Item count badge */}
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            backgroundColor: ORANGE,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>
            {itemCount}
          </Text>
        </View>

        {/* Label */}
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}
            numberOfLines={1}
          >
            {vendor?.name || "Your order"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 1 }}>
            D{total.toFixed(2)}
          </Text>
        </View>

        {/* View cart CTA */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: ORANGE, fontSize: 14, fontWeight: "800" }}>
            View Cart
          </Text>
          <Ionicons name="chevron-forward" size={16} color={ORANGE} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
