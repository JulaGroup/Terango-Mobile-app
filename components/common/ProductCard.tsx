import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";

export interface UniversalProduct {
  id: string | number;
  name: string;
  price: number;
  image?: string | number;
  description?: string;
  inStock?: boolean;
  discountedPrice?: number;
}

interface ProductCardProps {
  product: UniversalProduct;
  cartQuantity: number;
  onAddToCart: (product: UniversalProduct) => void;
  onRemoveFromCart: () => void;
  onPress?: () => void;
  cardWidth?: number; // Optional prop for responsive width
  orderingDisabled?: boolean;
  disabledReason?: string;
  onAddDisabledPress?: () => void;
}

const ProductCard = ({
  product,
  cartQuantity,
  onAddToCart,
  onRemoveFromCart,
  onPress,
  cardWidth,
  orderingDisabled,
  disabledReason,
  onAddDisabledPress,
}: ProductCardProps) => {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastPressTime = useRef(0);
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
          ((product.price - product.discountedPrice) / product.price) * 100,
        )
      : 0;

  const displayPrice = product.discountedPrice || product.price;

  // Handle navigation with instant response - prevent true double-clicks only
  const handlePress = () => {
    if (!onPress) return;

    const now = Date.now();
    const timeSinceLastPress = now - lastPressTime.current;

    // Only prevent if clicked within 50ms (prevents accidental double-clicks)
    if (timeSinceLastPress < 50) {
      return;
    }

    lastPressTime.current = now;

    // Execute navigation instantly - no delay
    onPress();
  };

  // Dynamic styles based on cardWidth
  const dynamicStyles = StyleSheet.create({
    card: {
      width: cardWidth || "100%",
      backgroundColor: "#fff",
      borderRadius: 12,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 4,
    },
  });

  return (
    <TouchableOpacity
      style={[
        styles.card,
        dynamicStyles.card,
        isOrderingDisabled && styles.cardDisabled,
      ]}
      activeOpacity={0.8}
      onPress={handlePress}
    >
      <View style={styles.productImageContainer}>
        {product.image && !imageLoadError ? (
          <Image
            source={
              typeof product.image === "string" ? product.image : product.image
            }
            style={styles.image}
            contentFit="contain"
            transition={200}
            cachePolicy="memory-disk"
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="restaurant" size={28} color="#E5E5E5" />
          </View>
        )}

        {/* Discount Badge - Top Left Corner */}
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

        {/* Floating Add/Quantity Controls */}
        {cartQuantity === 0 ? (
          <TouchableOpacity
            style={[
              styles.floatingAddButton,
              isOrderingDisabled && styles.floatingAddButtonDisabled,
            ]}
            onPress={handleAdd}
            activeOpacity={isOrderingDisabled ? 1 : 0.8}
          >
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        ) : expanded ? (
          <View style={styles.overlayControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={handleRemove}
              activeOpacity={0.8}
            >
              <Ionicons name="remove" size={12} color="#fff" />
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
              <Ionicons name="add" size={12} color="#fff" />
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
      </View>

      {/* Product Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        {product.description && (
          <Text style={styles.desc} numberOfLines={1}>
            {product.description}
          </Text>
        )}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={styles.productPriceRow}>
            <Text style={styles.productPrice}>D{displayPrice.toFixed(2)}</Text>
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    // Base card styles (width will be overridden by dynamic styles)
    marginRight: 0, // Remove marginRight since parent handles spacing
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 7,
    borderWidth: 0.8,
    borderColor: "#DFDFDFFF",
  },
  cardDisabled: {
    opacity: 0.55,
  },
  cartIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  cartIndicatorText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#10b981",
    marginLeft: 2,
  },
  productImageContainer: {
    width: "100%",
    height: 90, // Reduced height for more compact look
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ffff",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  floatingAddButton: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 30,
    height: 30,
    backgroundColor: PrimaryColor,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
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
    bottom: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 15,
    paddingHorizontal: 6,
    paddingVertical: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    fontSize: 12,
    fontWeight: "700",
    marginHorizontal: 8,
    minWidth: 16,
    textAlign: "center",
  },
  quantityBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  info: {
    padding: 8, // Reduced padding for more compact look
  },
  name: {
    fontWeight: "600",
    fontSize: 13, // Slightly smaller for narrow cards
    marginBottom: 2,
    lineHeight: 16,
    color: "#1F2937",
  },
  desc: {
    color: "#6B7280",
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 12,
  },
  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 2,
    flexWrap: "wrap",
    gap: 6,
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    letterSpacing: -0.2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: PrimaryColor,
    letterSpacing: -0.3,
  },
  orderingStatusBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(17,24,39,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "70%",
    display: "none",
  },
  orderingStatusBadgeText: {
    color: "#F9FAFB",
    fontSize: 10,
    fontWeight: "600",
  },
});

export default ProductCard;
