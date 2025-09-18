import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";

export interface UniversalProduct {
  id: number;
  name: string;
  price: number;
  image?: string;
  description?: string;
  inStock?: boolean;
}

interface ProductCardProps {
  product: UniversalProduct;
  cartQuantity: number;
  onAddToCart: (product: UniversalProduct) => void;
  onRemoveFromCart: () => void;
  onPress?: () => void;
  cardWidth?: number; // Optional prop for responsive width
}

const ProductCard = ({
  product,
  cartQuantity,
  onAddToCart,
  onRemoveFromCart,
  onPress,
  cardWidth,
}: ProductCardProps) => {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Expand controls when product is added
  const handleAdd = () => {
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

  // Dynamic styles based on cardWidth
  const dynamicStyles = StyleSheet.create({
    card: {
      width: cardWidth || 140, // Much narrower default width like Uber Eats
      backgroundColor: "#fff",
      borderRadius: 12,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 4,
      marginBottom: 2,
    },
  });

  return (
    <TouchableOpacity
      style={[styles.card, dynamicStyles.card]}
      activeOpacity={0.92}
      onPress={onPress}
    >
      <View style={styles.productImageContainer}>
        {product.image && !imageLoadError ? (
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="restaurant" size={28} color="#E5E5E5" />
          </View>
        )}

        {/* Floating Add/Quantity Controls */}
        {cartQuantity === 0 ? (
          <TouchableOpacity
            style={styles.floatingAddButton}
            onPress={handleAdd}
            activeOpacity={0.8}
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
              style={styles.quantityButton}
              onPress={handleAdd}
              activeOpacity={0.8}
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
            <Text style={styles.productPrice}>D{product.price.toFixed(2)}</Text>
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
    marginBottom: 2,
    borderWidth: 0.8,
    borderColor: "#DFDFDFFF",
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
    backgroundColor: "#F8F8F8",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
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
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: PrimaryColor,
    letterSpacing: -0.3,
  },
});

export default ProductCard;
