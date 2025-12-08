import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import SkeletonLoader from "./SkeletonLoader";
import VendorAwareProductCard from "@/components/common/VendorAwareProductCard";
import { useCart } from "@/context/CartContext";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

interface Product {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  shopName?: string;
  shop?: { name: string; id: string };
  _count?: { orderItems: number };
}

interface ProductSliderSectionProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  products: Product[];
  isLoading: boolean;
  onSeeAll?: () => void;
  onProductPress?: (product: Product) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  tagLabel?: string;
  tagColors?: [string, string];
  ctaLabel?: string;
}

export default function ProductSliderSection({
  title,
  subtitle,
  icon = "star",
  iconColor = "#fff",
  iconBgColor = PrimaryColor,
  products,
  isLoading,
  onSeeAll,
  onProductPress,
  onLoadMore,
  hasMore = false,
  tagLabel,
  tagColors,
  ctaLabel = "View all",
}: ProductSliderSectionProps) {
  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();

  const getCartQuantity = (productId: string): number => {
    const item = cartItems.find((c) => c.id === productId);
    return item ? item.quantity : 0;
  };

  const handleAdd = (item: Product) => {
    if (!item) return;
    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      discountedPrice: item.discountedPrice,
      description: item.shopName || item.shop?.name || "",
      vendorId: item.shop?.id || "",
      vendorName: item.shopName || item.shop?.name || "",
      imageUrl: item.imageUrl || "",
      entityType: "product",
    } as any;
    addToCart(cartItem);
  };

  const handleRemove = (productId: string) => {
    const ci = cartItems.find((c) => c.id === productId);
    if (ci && ci.quantity > 1) {
      updateQuantity(productId, ci.quantity - 1);
    } else {
      removeFromCart(productId);
    }
  };

  const handlePress = (item: Product) => {
    if (onProductPress) return onProductPress(item);
    router.push({
      pathname: "/product/[productId]",
      params: { productId: item.id },
    });
  };

  const transformProduct = (p: Product) => ({
    id: p.id,
    name: p.name,
    price: p.discountedPrice || p.price,
    discountedPrice: p.discountedPrice,
    image: p.imageUrl || "https://via.placeholder.com/300",
    description: p.shopName || p.shop?.name,
    inStock: true,
  });

  const gradientColors = tagColors || [PrimaryColor, "#7C3AED"];

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.cardWrapper}>
      {tagLabel ? (
        <LinearGradient colors={gradientColors} style={styles.tagChip}>
          <Text style={styles.tagText}>{tagLabel}</Text>
        </LinearGradient>
      ) : null}
      <VendorAwareProductCard
        product={transformProduct(item)}
        cartQuantity={getCartQuantity(item.id)}
        onAddToCart={() => handleAdd(item)}
        onRemoveFromCart={() => handleRemove(item.id)}
        onPress={() => handlePress(item)}
        cardWidth={166}
        vendor={{
          vendorId: item.shop?.id,
          vendorType: "shop",
          vendorName: item.shopName || item.shop?.name,
        }}
      />
    </View>
  );

  if (isLoading && products.length === 0) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: iconBgColor ?? PrimaryColor },
              ]}
            >
              <Ionicons name={icon} size={20} color={iconColor} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>{title}</Text>
              {subtitle ? (
                <Text style={styles.sectionSubtitle}>{subtitle}</Text>
              ) : null}
            </View>
          </View>
        </View>
        <SkeletonLoader type="card" count={2} />
      </View>
    );
  }

  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: iconBgColor ?? PrimaryColor },
            ]}
          >
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle ? (
              <Text style={styles.sectionSubtitle}>{subtitle}</Text>
            ) : null}
          </View>
        </View>
        {onSeeAll ? (
          <TouchableOpacity style={styles.ctaChip} onPress={onSeeAll}>
            <Text style={styles.ctaChipText}>{ctaLabel}</Text>
            <Ionicons name="arrow-forward" size={16} color={PrimaryColor} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginVertical: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },
  ctaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F4F5",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  ctaChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: PrimaryColor,
    marginRight: 6,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  cardWrapper: {
    marginRight: 14,
    position: "relative",
  },
  tagChip: {
    position: "absolute",
    top: 10,
    left: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 5,
  },
  tagText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
