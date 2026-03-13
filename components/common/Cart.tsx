import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Text, TouchableOpacity, Animated } from "react-native";

const Cart = () => {
  const { getTotalQuantity } = useCart();
  const router = useRouter();

  // Animation for cart bounce when items are added
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;

  const previousQuantity = useRef(getTotalQuantity());
  const currentQuantity = getTotalQuantity();

  useEffect(() => {
    // Only animate if quantity increased
    if (currentQuantity > previousQuantity.current) {
      // Bounce animation for the entire cart
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Scale animation for the badge
      Animated.sequence([
        Animated.timing(badgeScale, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(badgeScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    previousQuantity.current = currentQuantity;
  }, [currentQuantity, bounceAnim, badgeScale]);

  return (
    <TouchableOpacity
      style={{
        backgroundColor: "rgba(255,255,255,0.22)",
        padding: 8,
        borderRadius: 10,
      }}
      onPress={() => router.push("/cart")}
      activeOpacity={0.8}
    >
      <Animated.View
        style={{
          position: "relative",
          transform: [{ scale: bounceAnim }],
        }}
      >
        <Ionicons name="cart-outline" size={22} color="#fff" />
        {currentQuantity > 0 && (
          <Animated.View
            style={{
              position: "absolute",
              top: -8,
              right: -10,
              backgroundColor: "white",
              borderRadius: 10,
              paddingHorizontal: 5,
              paddingVertical: 2,
              shadowColor: "white",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
              transform: [{ scale: badgeScale }],
            }}
          >
            <Text
              style={{
                color: PrimaryColor,
                fontSize: 10,
                fontWeight: "700",
                textAlign: "center",
                minWidth: 14,
              }}
            >
              {currentQuantity}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default Cart;
