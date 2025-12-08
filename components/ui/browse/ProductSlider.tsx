import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import VendorAwareProductCard from "@/components/common/VendorAwareProductCard";
import { useCart } from "@/context/CartContext";
import { router } from "expo-router";

const CARD_WIDTH = 160; // Compact width for horizontal scroll

interface Product {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  shopName?: string;
  shopId?: string;
  rating?: number;
  description?: string;
  _count?: {
    orderItems: number;
  };
}

interface ProductSliderProps {
  title: string;
  subtitle?: string;
  products: Product[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  onProductPress?: (product: Product) => void;
  onSeeAllPress?: () => void;
  showRating?: boolean;
  showDiscount?: boolean;
}

const SkeletonCard = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };

    pulse();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeletonCard,
        {
          opacity,
        },
      ]}
    >
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonText} />
      <View style={[styles.skeletonText, { width: "60%", marginTop: 8 }]} />
    </Animated.View>
  );
};

// Transform product data to match ProductCard interface
const transformProduct = (product: Product) => ({
  id: product.id,
  name: product.name,
  price: product.discountedPrice || product.price,
  discountedPrice: product.discountedPrice,
  image: product.imageUrl || "https://via.placeholder.com/300",
  description: product.shopName,
  inStock: true,
});

export default function ProductSlider({
  title,
  subtitle,
  products,
  isLoading = false,
  onLoadMore,
  onProductPress,
  onSeeAllPress,
  showRating = true,
  showDiscount = true,
}: ProductSliderProps) {
  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();

  // Get cart quantity for a product
  const getCartQuantity = (productId: string): number => {
    const item = cartItems.find((cartItem) => cartItem.id === productId);
    return item ? item.quantity : 0;
  };

  // Handle add to cart
  const handleAdd = (item: Product) => {
    if (!item) return;
    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      discountedPrice: item.discountedPrice,
      description: item.description || "",
      vendorId: item.shopId || "",
      vendorName: item.shopName || "",
      imageUrl: item.imageUrl || "",
      entityType: "product",
    } as any;
    addToCart(cartItem);
  };

  // Handle remove from cart
  const handleRemove = (productId: string) => {
    const ci = cartItems.find((c) => c.id === productId);
    if (ci && ci.quantity > 1) {
      updateQuantity(productId, ci.quantity - 1);
    } else {
      removeFromCart(productId);
    }
  };

  // Handle product press - navigate to product details
  const handleProductPress = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <TouchableOpacity
          onPress={onSeeAllPress}
          activeOpacity={0.7}
          style={styles.seeAllButton}
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={PrimaryColor}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      </View>

      {/* Products List */}
      <View style={styles.listContainer}>
        {isLoading && products.length === 0 ? (
          <FlatList
            data={[1, 2, 3, 4]}
            renderItem={() => <SkeletonCard />}
            keyExtractor={(_, index) => `skeleton-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
            scrollEventThrottle={16}
          />
        ) : products.length > 0 ? (
          <FlatList
            data={products}
            renderItem={({ item }) => (
              <View style={{ marginRight: 12 }}>
                <VendorAwareProductCard
                  product={transformProduct(item)}
                  cartQuantity={getCartQuantity(item.id)}
                  onAddToCart={() => handleAdd(item)}
                  onRemoveFromCart={() => handleRemove(item.id)}
                  onPress={() => handleProductPress(item.id)}
                  cardWidth={CARD_WIDTH}
                  vendor={{
                    vendorId: item.shopId,
                    vendorType: "shop",
                    vendorName: item.shopName,
                  }}
                />
              </View>
            )}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.5}
            scrollEventThrottle={16}
            ListFooterComponent={
              isLoading ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={PrimaryColor} />
                </View>
              ) : null
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="sad-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No products available</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: PrimaryColor,
  },
  listContainer: {
    minHeight: 260,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  imageContainer: {
    width: "100%",
    height: 150,
    position: "relative",
    backgroundColor: "#F3F4F6",
  },
  image: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    padding: 12,
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  shopName: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F2937",
  },
  ordersText: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: "800",
    color: PrimaryColor,
  },
  originalPrice: {
    fontSize: 11,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: PrimaryColor,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    marginRight: 0,
  },
  skeletonImage: {
    width: "100%",
    height: 150,
    backgroundColor: "#E0E0E0",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  skeletonText: {
    height: 12,
    backgroundColor: "#E0E0E0",
    borderRadius: 6,
    marginTop: 12,
    marginHorizontal: 12,
  },
  footerLoader: {
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
