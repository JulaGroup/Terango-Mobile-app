import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";

export interface UniversalProduct {
  id: number;
  name: string;
  price: number;
  image?: string | number;
  description?: string;
  inStock?: boolean;
  discountedPrice?: number;
}

interface MealItemCardProps {
  product: UniversalProduct;
  cartQuantity: number;
  onAddToCart: (product: UniversalProduct) => void;
  onRemoveFromCart: () => void;
  onPress?: () => void;
  orderingDisabled?: boolean;
  disabledReason?: string;
  onAddDisabledPress?: () => void;
}

const MealItemCard = ({
  product,
  cartQuantity,
  onAddToCart,
  onRemoveFromCart,
  onPress,
  orderingDisabled,
  disabledReason,
  onAddDisabledPress,
}: MealItemCardProps) => {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isOrderingDisabled = orderingDisabled === true;
  const disabledLabel = (disabledReason || "").trim() || "Ordering unavailable";

  // Expand controls when product is added
  const handleAdd = () => {
    if (isOrderingDisabled) {
      onAddDisabledPress?.();
      return;
    }
    onAddToCart(product);
    setExpanded(true);

    // Reset collapse timer
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => {
      setExpanded(false);
    }, 4000);
    setTimer(t);
  };

  const handleRemove = () => {
    onRemoveFromCart();
    if (cartQuantity <= 1) {
      setExpanded(false);
      if (timer) clearTimeout(timer);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [timer]);

  // Show expanded state if item is in cart
  useEffect(() => {
    if (cartQuantity > 0 && !expanded) {
      setExpanded(false); // Keep collapsed unless explicitly expanded
    }
  }, [cartQuantity, expanded]);

  // Calculate discount percentage if discounted price exists
  const discountPercentage =
    product.discountedPrice && product.discountedPrice < product.price
      ? Math.round(
          ((product.price - product.discountedPrice) / product.price) * 100
        )
      : 0;

  const displayPrice = product.discountedPrice || product.price;

  return (
    <TouchableOpacity
      style={[styles.card, isOrderingDisabled && styles.cardDisabled]}
      activeOpacity={0.95}
      onPress={onPress}
    >
      {/* Left side - Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        {product.description && (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        )}

        <View style={styles.bottomRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>D{displayPrice.toFixed(2)}</Text>
            {discountPercentage > 0 && (
              <Text style={styles.originalPrice}>
                D{product.price.toFixed(2)}
              </Text>
            )}
          </View>
          {cartQuantity > 0 && (
            <View style={styles.cartIndicator}>
              <Ionicons name="checkmark-circle" size={12} color="#10b981" />
              <Text style={styles.cartIndicatorText}>In Cart</Text>
            </View>
          )}
        </View>
      </View>

      {/* Right side - Image with cart controls */}
      <View style={styles.imageContainer}>
        {/* Discount Badge - Top Left Corner of Image */}
        {discountPercentage > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercentage}%</Text>
          </View>
        )}

        {isOrderingDisabled && (
          <View style={styles.orderingStatusBadge}>
            <Ionicons name="time-outline" size={12} color="#F9FAFB" />
            <Text style={styles.orderingStatusBadgeText} numberOfLines={1}>
              {disabledLabel}
            </Text>
          </View>
        )}

        {product.image && !imageLoadError ? (
          <Image
            source={
              typeof product.image === "string"
                ? product.image
                : product.image
            }
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="restaurant" size={32} color="#E5E5E5" />
          </View>
        )}
      </View>

      {/* Floating Add/Quantity Controls positioned relative to the whole card */}
      {cartQuantity === 0 ? (
        <TouchableOpacity
          style={[
            styles.floatingAddButton,
            isOrderingDisabled && styles.floatingAddButtonDisabled,
          ]}
          onPress={handleAdd}
          activeOpacity={isOrderingDisabled ? 1 : 0.8}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      ) : expanded ? (
        <View style={styles.overlayControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={handleRemove}
            activeOpacity={0.8}
          >
            <Ionicons name="remove" size={14} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.quantityText}>{cartQuantity}</Text>

          <TouchableOpacity
            style={[
              styles.quantityButton,
              isOrderingDisabled && styles.quantityButtonDisabled,
            ]}
            onPress={handleAdd}
            activeOpacity={isOrderingDisabled ? 1 : 0.8}
          >
            <Ionicons name="add" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.floatingAddButton}
          onPress={() => setExpanded(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.quantityBadgeText}>{cartQuantity}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginVertical: 1,
    marginHorizontal: 0,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: "#DDDDDDFF",
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    minHeight: 92,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 12,
  },
  imageContainer: {
    width: 84,
    height: 84,
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
  },
  discountBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F8F8F8",
    borderRadius: 10,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    lineHeight: 22,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  originalPrice: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    letterSpacing: -0.2,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: PrimaryColor,
    letterSpacing: -0.3,
  },
  cartIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cartIndicatorText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10b981",
    marginLeft: 2,
  },

  // Cart controls - Exact same styles from your ProductCard
  floatingAddButton: {
    position: "absolute",
    bottom: 10,
    right: 12,
    width: 36,
    height: 36,
    backgroundColor: PrimaryColor,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  floatingAddButtonDisabled: {
    backgroundColor: "rgba(55,65,81,0.85)",
    borderColor: "rgba(255,255,255,0.35)",
  },
  overlayControls: {
    position: "absolute",
    bottom: 8,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.9)",
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  quantityButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PrimaryColor,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonDisabled: {
    backgroundColor: "rgba(31,41,55,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  quantityText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginHorizontal: 8,
    minWidth: 18,
    textAlign: "center",
  },
  quantityBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  orderingStatusBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(17,24,39,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "75%",
    zIndex: 12,
    display: "none",
  },
  orderingStatusBadgeText: {
    color: "#F9FAFB",
    fontSize: 10,
    fontWeight: "600",
  },
});

export default MealItemCard;
