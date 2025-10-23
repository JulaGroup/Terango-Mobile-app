import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  FlatList,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import ProductCard from "@/components/common/ProductCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "@/context/CartContext";
import { PrimaryColor } from "@/constants/Colors";
import { API_URL } from "@/constants/config";

interface Product {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  description?: string;
  shopId?: string;
  subCategory?: {
    id: string;
    name: string;
  };
}

// Skeleton Loader Component
const SkeletonLoader = ({
  width = "100%",
  height = 160,
}: {
  width?: string | number;
  height?: number;
}) => {
  const widthValue = typeof width === "number" ? width : width;
  return (
    <View
      style={
        {
          width: widthValue,
          height,
          backgroundColor: "#E8E8E8",
          borderRadius: 12,
          opacity: 0.7,
        } as any
      }
    />
  );
};

// Product Card Skeleton
const ProductCardSkeleton = () => (
  <View style={styles.productCardWrapper}>
    <View style={styles.skeletonCard}>
      <SkeletonLoader width="100%" height={120} />
      <View style={styles.skeletonInfo}>
        <SkeletonLoader width="80%" height={14} />
        <View style={{ marginTop: 8 }}>
          <SkeletonLoader width="60%" height={12} />
        </View>
        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <SkeletonLoader width="40%" height={14} />
          <SkeletonLoader width="30%" height={28} />
        </View>
      </View>
    </View>
  </View>
);

const ShopCategoryPage = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();

  // Parse params
  const shopName = params.shopName as string;
  const initialCategory = params.categoryName as string;
  const productsJson = params.products as string;

  // State
  const [categories, setCategories] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategory || ""
  );
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  // Initial fetch - only fetch all products once on mount
  useEffect(() => {
    const fetchProducts = async () => {
      if (!params.shopId) return;

      setLoading(true);
      try {
        const response = await fetch(
          `${API_URL}/api/products/shop/${params.shopId}`
        );
        if (!response.ok) throw new Error("Failed to fetch products");

        const parsed = await response.json();
        setAllProducts(parsed);

        // Group by category and get unique categories
        const uniqueCategories = [
          ...new Set(
            parsed.map((p: Product) => p.subCategory?.name || "Other")
          ),
        ].filter(Boolean) as string[];
        setCategories(uniqueCategories);

        // Set first category as selected if not provided
        if (!initialCategory && uniqueCategories.length > 0) {
          setSelectedCategory(uniqueCategories[0]);
        } else if (initialCategory) {
          setSelectedCategory(initialCategory);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        // Fallback to props if available
        if (productsJson) {
          try {
            const parsed = JSON.parse(productsJson);
            setAllProducts(parsed);
            const uniqueCategories = [
              ...new Set(
                parsed.map((p: Product) => p.subCategory?.name || "Other")
              ),
            ].filter(Boolean) as string[];
            setCategories(uniqueCategories);
            if (!initialCategory && uniqueCategories.length > 0) {
              setSelectedCategory(uniqueCategories[0]);
            }
          } catch (e) {
            console.error("Error parsing fallback products:", e);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.shopId]); // Only depend on shopId - initialCategory sets initial state

  // Debounced search effect - only search, don't refetch all products
  useEffect(() => {
    if (!selectedCategory || allProducts.length === 0) return;

    // Just trigger a local state update, no API call needed
    // Products are already loaded, we just filter them
    const debounceTimer = setTimeout(() => {
      // Filtering is handled in filteredProducts useMemo below
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchText, selectedCategory, allProducts]);

  // Filter products by selected category and search
  const filteredProducts = useMemo(() => {
    let filtered = allProducts.filter(
      (p) => p.subCategory?.name === selectedCategory
    );

    if (searchText.trim()) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchText.toLowerCase()) ||
          (p.description &&
            p.description.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    return filtered;
  }, [allProducts, selectedCategory, searchText]);

  // Cart helpers
  const handleAddToCart = (product: Product) => {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description || "",
      vendorId: product.shopId,
      vendorName: shopName || "",
      imageUrl: product.imageUrl || "",
      entityType: "product",
    } as any;
    addToCart(cartItem);
  };

  const handleRemoveFromCart = (productId: string) => {
    const ci = cartItems.find((c) => c.id === productId);
    if (ci && ci.quantity > 1) {
      updateQuantity(productId, ci.quantity - 1);
    } else {
      removeFromCart(productId);
    }
  };

  const getCartQuantity = (productId: string) => {
    const item = cartItems.find((c) => c.id === productId);
    return item ? item.quantity : 0;
  };

  // Cart helper functions
  const getTotalCartItems = (): number => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTotalCartPrice = (): number => {
    return cartItems.reduce((total, item) => {
      const itemPrice = item.discountedPrice || item.price;
      return total + itemPrice * item.quantity;
    }, 0);
  };

  // Render product card
  const renderProductCard = ({ item }: { item: Product }) => (
    <View style={styles.productCardWrapper}>
      <ProductCard
        product={{
          id: Number(item.id),
          name: item.name,
          price: item.price,
          discountedPrice: item.discountedPrice,
          image: item.imageUrl,
          description: item.description,
          inStock: true,
        }}
        cartQuantity={getCartQuantity(item.id)}
        onAddToCart={() => handleAddToCart(item)}
        onRemoveFromCart={() => handleRemoveFromCart(item.id)}
        onPress={() => router.push(`/product/${item.id}`)}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header - Fixed at top */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {shopName}
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/cart")}
          style={styles.cartIconButton}
        >
          <Ionicons name="cart-outline" size={24} color="#000" />
          {getTotalCartItems() > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getTotalCartItems()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Tabs - Uber Eats Style with animated underline */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesTabsContainer}
          contentContainerStyle={styles.categoriesTabsContent}
          scrollEventThrottle={16}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={styles.categoryTab}
              onPress={() => setSelectedCategory(category)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === category && styles.categoryTabTextActive,
                ]}
              >
                {category}
              </Text>
              {selectedCategory === category && (
                <View style={styles.tabUnderline} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${selectedCategory}...`}
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Products Grid - 3 Columns */}
      {loading ? (
        <FlatList
          data={Array(9).fill(0)}
          renderItem={() => <ProductCardSkeleton />}
          keyExtractor={(_, index) => `skeleton-${index}`}
          numColumns={3}
          contentContainerStyle={styles.productsGrid}
          columnWrapperStyle={styles.columnWrapper}
          scrollEnabled={false}
        />
      ) : filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.productsGrid}
          scrollEnabled={true}
          columnWrapperStyle={styles.columnWrapper}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchText ? "No products found" : "No products available"}
          </Text>
        </View>
      )}

      {/* Floating cart summary */}
      {getTotalCartItems() > 0 && (
        <TouchableOpacity
          style={styles.cartSummary}
          onPress={() => router.push("/cart")}
          activeOpacity={0.9}
        >
          <View style={styles.cartSummaryInner}>
            <Ionicons name="cart" size={20} color="#fff" />
            <Text style={styles.cartSummaryText}>
              {getTotalCartItems()} items
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    flex: 1,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  cartIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: PrimaryColor,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  // Uber Eats Style Tabs
  tabsWrapper: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoriesTabsContainer: {
    backgroundColor: "#fff",
    maxHeight: 60,
  },
  categoriesTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 24,
  },
  categoryTab: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: "relative",
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    letterSpacing: -0.2,
  },
  categoryTabTextActive: {
    color: "#000",
  },
  tabUnderline: {
    height: 3,
    backgroundColor: PrimaryColor,
    marginTop: 8,
    borderRadius: 1.5,
    width: "100%",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 24,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#000",
    paddingVertical: 8,
  },
  productsGrid: {
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  columnWrapper: {
    justifyContent: "flex-start",
    paddingHorizontal: 8,
    marginBottom: 8,
    gap: 8,
  },
  productCardWrapper: {
    flex: 1,
    maxWidth: "33.33%",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: "#999",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  skeletonCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  skeletonInfo: {
    padding: 12,
  },
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
    backgroundColor: PrimaryColor,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  cartSummaryText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "700",
  },
});

export default ShopCategoryPage;
