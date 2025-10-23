import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { API_URL } from "@/constants/config";
import { PrimaryColor } from "@/constants/Colors";
import ProductCard from "@/components/common/ProductCard";
import { useCart } from "@/context/CartContext";
import { SafeAreaView } from "react-native-safe-area-context";

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
  discountedPrice?: number;
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
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const [subCategories, setSubCategories] = useState<
    { id: string; name: string }[]
  >([]);

  const scrollViewRef = useRef<ScrollView>(null);
  const tabsRef = useRef<ScrollView>(null);

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

  // Fetch subcategories for the shop (by getting all products and extracting unique subcategories)
  const fetchSubCategories = useCallback(async () => {
    if (!shopId) return;
    try {
      console.log("Fetching products for shop to get subcategories...");
      const resp = await fetch(`${API_URL}/api/shops/${shopId}`);
      if (!resp.ok) throw new Error("Failed to fetch shop products");
      const shopData = await resp.json();

      // Extract unique subcategories from products
      const subCategoryMap = new Map();
      shopData.products?.forEach((product: any) => {
        if (product.subCategory && product.isAvailable !== false) {
          subCategoryMap.set(product.subCategory.id, {
            id: product.subCategory.id,
            name: product.subCategory.name,
          });
        }
      });

      const uniqueSubCategories = Array.from(subCategoryMap.values());
      console.log("Extracted subcategories:", uniqueSubCategories);
      setSubCategories(uniqueSubCategories);
    } catch (err) {
      console.error("Failed to fetch subcategories:", err);
    }
  }, [shopId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  useEffect(() => {
    fetchSubCategories();
  }, [fetchSubCategories]);

  // Auto-scroll to active tab when subcategories load
  useEffect(() => {
    if (subCategories.length === 0 || !subCategoryId || loading) return;

    const activeIndex = subCategories.findIndex(
      (s) => s.id === subCategoryId
    );

    if (activeIndex === -1) return;

    // Estimate tab width (depends on your spacing & font size)
    const AVERAGE_TAB_WIDTH = 100; // Adjust to your design
    const scrollX = Math.max(activeIndex * AVERAGE_TAB_WIDTH - width / 3, 0);

    const timeout = setTimeout(() => {
      if (tabsRef.current) {
        tabsRef.current.scrollTo({
          x: scrollX,
          animated: true,
        });
        console.log("✅ Scrolled to approx tab index:", activeIndex);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [subCategories, subCategoryId, loading]);

  useEffect(() => {
    if (!query) return setFiltered(products);
    const q = query.toLowerCase();
    setFiltered(products.filter((p) => p.name.toLowerCase().includes(q)));
  }, [query, products]);

  // Auto-scroll to products when they load
  useEffect(() => {
    if (!loading && products.length > 0) {
      setShouldAutoScroll(true);
    }
  }, [loading, products]);

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
    return (
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
          cartQuantity={getCartItemQuantity(item.id)}
          onAddToCart={() => handleAddToCart(item)}
          onRemoveFromCart={() => handleRemoveFromCart(item.id)}
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
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 6 }).map((_, index) => {
        const horizontalPadding = 16 * 2;
        const columnGap = 16;
        const cardWidth = (width - horizontalPadding - columnGap) / 2;
        return (
          <View
            key={`skeleton-${index}`}
            style={{
              width: cardWidth,
              height: 220,
              backgroundColor: "#E0E0E0",
              borderRadius: 16,
              marginBottom: 20,
            }}
          />
        );
      })}
    </View>
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

      {/* Subcategory Tabs */}
      {(() => {
        console.log(
          "Rendering tabs condition check:",
          subCategories.length > 0,
          subCategories
        );
        return (
          subCategories.length > 0 && (
            <View style={styles.tabsWrapper}>
              <ScrollView
                ref={tabsRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.subCategoryTabsContainer}
                contentContainerStyle={styles.subCategoryTabsContent}
              >
                {subCategories.map((subCategory) => {
                  console.log(
                    "Rendering tab:",
                    subCategory.name,
                    "active:",
                    subCategory.id === subCategoryId
                  );
                  return (
                    <TouchableOpacity
                      key={subCategory.id}
                      style={styles.subCategoryTab}
                      onPress={() => {
                        if (subCategory.id !== subCategoryId) {
                          router.replace({
                            pathname: "/storeCategoryProducts",
                            params: {
                              shopId,
                              subCategoryId: subCategory.id,
                            },
                          });
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.subCategoryTabText,
                          subCategory.id === subCategoryId &&
                            styles.subCategoryTabTextActive,
                        ]}
                      >
                        {subCategory.name}
                      </Text>
                      {subCategory.id === subCategoryId && (
                        <View style={styles.tabUnderline} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )
        );
      })()}

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onLayout={() => {
          if (shouldAutoScroll && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
              y: 150,
              animated: false,
            });
            setShouldAutoScroll(false);
          }
        }}
      >
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
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.productsGrid}
            ListEmptyComponent={<ListEmpty />}
            scrollEnabled={false} // Disable FlatList scrolling since parent ScrollView handles it
          />
        )}
      </ScrollView>

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

  // Products Grid
  productsGrid: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  columnWrapper: {
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    marginBottom: 8,
    gap: 8,
  },
  productCardWrapper: {
    flex: 1,
    maxWidth: "33.33%",
  },
  skeletonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },

  // Subcategory Tabs
  tabsWrapper: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  subCategoryTabsContainer: {
    maxHeight: 50,
  },
  subCategoryTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 24,
  },
  subCategoryTab: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: "relative",
  },
  subCategoryTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    letterSpacing: -0.2,
  },
  subCategoryTabTextActive: {
    color: "#000",
  },
  tabUnderline: {
    height: 3,
    backgroundColor: PrimaryColor,
    marginTop: 8,
    borderRadius: 1.5,
    width: "100%",
  },
});
