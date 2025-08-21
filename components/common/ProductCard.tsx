import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
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
  onRemoveFromCart: (product: UniversalProduct) => void;
}

const ProductCard = ({
  product,
  cartQuantity,
  onAddToCart,
  onRemoveFromCart,
}: ProductCardProps) => {
  const [slideAnim] = useState(new Animated.Value(60)); // start 60px right
  const [fadeAnim] = useState(new Animated.Value(0));
  const [expanded, setExpanded] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Animate overlay controls to slide in from right
  useEffect(() => {
    if (cartQuantity > 0 && expanded) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 60,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [cartQuantity, expanded, fadeAnim, slideAnim]);

  // Collapse overlay after timeout
  useEffect(() => {
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [timer]);

  const handleAdd = () => {
    onAddToCart(product);
    setExpanded(true);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => {
      setExpanded(false);
    }, 4000);
    setTimer(t);
  };

  const handleRemove = () => {
    onRemoveFromCart(product);
    setExpanded(false);
    if (timer) clearTimeout(timer);
  };

  return (
    <View style={styles.card}>
      <View style={styles.productImageContainer}>
        <Image source={{ uri: product.image || "" }} style={styles.image} />
        {/* Floating Add/Quantity Controls */}
        {cartQuantity === 0 ? (
          <TouchableOpacity
            style={styles.floatingAddButton}
            onPress={handleAdd}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        ) : expanded ? (
          <Animated.View
            style={[
              styles.overlayControls,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }, { scale: fadeAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={handleRemove}
            >
              <Ionicons name="remove" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{cartQuantity}</Text>
            <TouchableOpacity style={styles.quantityButton} onPress={handleAdd}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <TouchableOpacity
            style={styles.floatingAddButton}
            onPress={() => setExpanded(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      {/* Product Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{product.name}</Text>
        {product.description && (
          <Text style={styles.desc}>{product.description}</Text>
        )}
        <View style={styles.productPriceRow}>
          <Text style={styles.productPrice}>D{product.price.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};
// ...existing code...

const styles = StyleSheet.create({
  card: {
    width: 190,
    marginRight: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 2,
    boxShadow:
      " rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgb(209, 213, 219) 0px 0px 0px 1px inset",
  },
  productImageContainer: {
    width: "100%",
    height: 120,
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F8F8F8",
  },
  floatingAddButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    backgroundColor: PrimaryColor,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  overlayControls: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PrimaryColor,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginHorizontal: 10,
    minWidth: 20,
    textAlign: "center",
  },
  info: {
    padding: 10,
  },
  name: {
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 4,
  },
  desc: {
    color: "#888",
    fontSize: 12,
    marginBottom: 4,
  },
  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: PrimaryColor,
    letterSpacing: -0.5,
  },
});

export default ProductCard;
