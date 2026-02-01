import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "@/constants/config";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import VendorAwareProductCard from "@/components/common/VendorAwareProductCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

interface TeranGOProduct {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  description?: string;
  brand?: string;
  stock?: number;
  isAvailable: boolean;
  isFeatured: boolean;
  priority: number;
  shop?: {
    id: string;
    name: string;
    imageUrl?: string;
    vendorId: string;
  };
}

// Skeleton Card for loading
const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: "80%" }]} />
      <View style={[styles.skeletonLine, { width: "50%", marginTop: 8 }]} />
      <View style={[styles.skeletonLine, { width: "40%", marginTop: 8 }]} />
    </View>
  </View>
);

export default function TeranGOPicksPage() {
  const router = useRouter();
  const { addToCart, getQuantity, removeFromCart } = useCart();
  const [products, setProducts] = useState<TeranGOProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchProducts = useCallback(
    async (pageNum: number = 1, isRefresh: boolean = false) => {
      try {
        if (pageNum === 1) {
          if (isRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }
        } else {
          setLoadingMore(true);
        }

        const response = await fetch(
          `${API_URL}/api/public/products/official?page=${pageNum}&limit=20`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await response.json();
        const newProducts = data.products || [];

        if (pageNum === 1) {
          setProducts(newProducts);
        } else {
          setProducts((prev) => [...prev, ...newProducts]);
        }

        setHasMore(data.pagination?.pages > pageNum);
        setPage(pageNum);
      } catch (err) {
        console.error("Error fetching TeranGO products:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const handleRefresh = () => {
    fetchProducts(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchProducts(page + 1);
    }
  };

  const handleProductPress = (product: TeranGOProduct) => {
    router.push({
      pathname: "/product/[productId]",
      params: { productId: product.id },
    });
  };

  const handleAddToCart = (product: TeranGOProduct) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.discountedPrice || product.price,
      imageUrl: product.imageUrl || "",
      vendorId: product.shop?.vendorId || "terango-official",
      vendorName: product.shop?.name || "TeranGO Official Store",
      entityType: "SHOP",
    });
  };

  const renderProduct = ({ item }: { item: TeranGOProduct }) => (
    <View style={styles.productWrapper}>
      <VendorAwareProductCard
        product={{
          id: item.id,
          name: item.name,
          price: item.price,
          discountedPrice: item.discountedPrice,
          image: item.imageUrl,
          description: item.description,
          inStock: item.isAvailable && (item.stock ?? 0) > 0,
        }}
        cartQuantity={getQuantity(item.id)}
        onAddToCart={() => handleAddToCart(item)}
        onRemoveFromCart={() => removeFromCart(item.id)}
        onPress={() => handleProductPress(item)}
        cardWidth={CARD_WIDTH}
        vendor={{
          vendorId: item.shop?.vendorId,
          vendorType: "shop",
          vendorName: item.shop?.name || "TeranGO Official Store",
          isActive: true,
          acceptsOrders: true,
        }}
      />
      {/* TeranGO Badge */}
      <View style={styles.officialBadge}>
        <Text style={styles.badgeText}>Teran</Text>
        <Text style={[styles.badgeText, styles.badgeGO]}>GO</Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={PrimaryColor} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Products Yet</Text>
        <Text style={styles.emptySubtitle}>
          TeranGO products will appear here soon
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Teran</Text>
          <Text style={[styles.headerTitle, styles.headerTitleGO]}>GO</Text>
          <Text style={styles.headerTitle}> Picks</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="diamond" size={20} color="#FF6B00" />
        </View>
        <Text style={styles.subtitle}>
          Quality products sold directly by TeranGO
        </Text>
      </View>

      {/* Products Grid */}
      {loading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          keyExtractor={(item) => `skeleton-${item}`}
          renderItem={() => <SkeletonCard />}
        />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[PrimaryColor]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  headerTitleGO: {
    color: "#FF6B00",
  },
  subtitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  gridContainer: {
    padding: 12,
  },
  productWrapper: {
    flex: 1,
    margin: 4,
    position: "relative",
  },
  officialBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 10,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
  },
  badgeGO: {
    color: "#FF6B00",
  },
  skeletonCard: {
    flex: 1,
    margin: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  skeletonImage: {
    height: 140,
    backgroundColor: "#e8e8e8",
  },
  skeletonContent: {
    padding: 12,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: "#e8e8e8",
    borderRadius: 4,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
});
