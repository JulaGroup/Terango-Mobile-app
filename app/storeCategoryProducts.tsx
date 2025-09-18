import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { API_URL } from "@/constants/config";
import { PrimaryColor } from "@/constants/Colors";
import ProductCard from "@/components/common/ProductCard";
import { useCart } from "@/context/CartContext";

const { width } = Dimensions.get("window");
const NUM_COLUMNS = 3;

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  shopId: string;
  subCategory?: { id: string; name: string };
}

export default function StoreCategoryProducts() {
  const router = useRouter();
  const { shopId, subCategoryId } = useLocalSearchParams<{
    shopId: string;
    subCategoryId: string;
  }>();

  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [subCategoryName, setSubCategoryName] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!shopId || !subCategoryId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `${API_URL}/api/shops/${shopId}/subcategories/${subCategoryId}/products?limit=100`
      );
      if (!resp.ok) throw new Error("Failed to fetch products");
      const data = await resp.json();
      setProducts(data || []);
      setFiltered(data || []);
      // Derive subcategory name from first product if available
      if (Array.isArray(data) && data.length > 0 && data[0].subCategory?.name) {
        setSubCategoryName(data[0].subCategory.name);
      }
    } catch (e: any) {
      console.error("Failed to load store category products:", e);
      setError(e.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [shopId, subCategoryId]);

  // Fetch shop details to get shop name
  const fetchShop = useCallback(async () => {
    if (!shopId) return;
    try {
      const resp = await fetch(`${API_URL}/api/shops/${shopId}`);
      if (!resp.ok) throw new Error("Failed to fetch shop");
      const data = await resp.json();
      setShopName(data?.name || null);
    } catch (err) {
      console.error("Failed to fetch shop:", err);
    }
  }, [shopId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  useEffect(() => {
    if (!query) return setFiltered(products);
    const q = query.toLowerCase();
    setFiltered(products.filter((p) => p.name.toLowerCase().includes(q)));
  }, [query, products]);

  const getTotalCartItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getCartItemQuantity = (itemId: string) => {
    const it = cartItems.find((c) => c.id === itemId);
    return it ? it.quantity : 0;
  };

  const handleAddToCart = (item: Product) => {
    if (!item) return;
    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      description: item.description || "",
      vendorId: item.shopId,
      vendorName: "",
      imageUrl: item.imageUrl || "",
      entityType: "product",
    } as any;
    addToCart(cartItem);
  };

  const handleRemoveFromCart = (productId: string) => {
    const cartItem = cartItems.find((ci) => ci.id === productId);
    if (cartItem && cartItem.quantity > 1) {
      updateQuantity(productId, cartItem.quantity - 1);
    } else {
      removeFromCart(productId);
    }
  };

  const renderItem = ({ item, index }: { item: Product; index: number }) => {
    // Fit two columns within the FlatList paddingHorizontal:16
    // cardWidth = (screenWidth - paddingLeft - paddingRight - gap) / 2
    const horizontalPadding = 16 * 2; // contentContainerStyle paddingHorizontal * 2
    const columnGap = 6; // desired gap between columns
    const cardWidth = (width - horizontalPadding - columnGap) / 3;

    return (
      <View style={{ width: cardWidth, marginBottom: 20 }}>
        <ProductCard
          product={{
            id: Number(item.id),
            name: item.name,
            price: item.price,
            image: item.imageUrl,
            description: item.description,
            inStock: true,
          }}
          cartQuantity={getCartItemQuantity(item.id)}
          onAddToCart={() => handleAddToCart(item)}
          onRemoveFromCart={() => handleRemoveFromCart(item.id)}
          cardWidth={cardWidth}
          onPress={() => router.push(`/product/${item.id}`)}
        />
      </View>
    );
  };

  const ListEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={64} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Products Found</Text>
      <Text style={styles.emptySubtitle}>
        Try a different search or check back later.
      </Text>
    </View>
  );

  const SkeletonGrid = () => (
    <FlatList
      data={Array.from({ length: 6 })}
      numColumns={2}
      keyExtractor={(_, index) => `skeleton-${index}`}
      renderItem={({ index }) => {
        const horizontalPadding = 16 * 2;
        const columnGap = 16;
        const cardWidth = (width - horizontalPadding - columnGap) / 2;
        return (
          <View
            style={{
              width: cardWidth,
              height: 220,
              backgroundColor: "#E0E0E0",
              borderRadius: 16,
              marginBottom: 20,
            }}
          />
        );
      }}
      columnWrapperStyle={{ justifyContent: "space-between" }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
      }}
      showsVerticalScrollIndicator={false}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header - matching SubCategoryView */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {subCategoryName || "Products"}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {shopName
              ? `Store: ${shopName}`
              : `${filtered.length} ${
                  filtered.length === 1 ? "item" : "items"
                } found`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push("/cart")}
          activeOpacity={0.7}
        >
          <Ionicons name="cart" size={22} color="#111827" />
          {getTotalCartItems() > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getTotalCartItems()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar - matching SubCategoryView */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBarContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#94A3B8"
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search products..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <SkeletonGrid />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={fetchProducts}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 8,
            }}
            ListEmptyComponent={<ListEmpty />}
          />
        )}
      </View>

      {/* Floating cart summary */}
      {getTotalCartItems() > 0 && (
        <TouchableOpacity
          style={styles.cartSummary}
          onPress={() => router.push("/cart")}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[PrimaryColor, "#FF6B00"]}
            style={styles.cartSummaryInner}
          >
            <Ionicons name="cart" size={20} color="#fff" />
            <Text style={styles.cartSummaryText}>
              {getTotalCartItems()} items
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  // Header - matching SubCategoryView
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    backgroundColor: "#F1F5F9",
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  cartButton: {
    backgroundColor: "#F1F5F9",
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },

  // Search Bar - matching SubCategoryView
  searchBarWrapper: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "#fff",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  searchBarInput: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    paddingVertical: 0,
  },

  content: {
    flex: 1,
    marginTop: 8,
  },

  // Error & Empty States - matching SubCategoryView
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },

  // Cart Summary
  cartSummary: {
    position: "absolute",
    right: 16,
    bottom: 24,
    zIndex: 20,
  },
  cartSummaryInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
  },
  cartSummaryText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "700",
  },
});
