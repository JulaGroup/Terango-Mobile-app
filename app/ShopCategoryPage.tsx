import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  StatusBar,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import VendorAwareProductCard from "@/components/common/VendorAwareProductCard";
import { useCart } from "@/context/CartContext";
import { PrimaryColor } from "@/constants/Colors";
import { API_URL } from "@/constants/config";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { OpeningHours } from "@/lib/api";

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

interface ShopMeta {
  id?: string;
  name?: string;
  openingHours?: OpeningHours | null;
  isActive?: boolean | null;
  acceptsOrders?: boolean | null;
}

// Skeleton Loader
const SkeletonLoader = ({
  width = "100%",
  height = 160,
}: {
  width?: string | number;
  height?: number;
}) => {
  // cast width to any to avoid TypeScript's strict width type mismatch for percentage strings
  const widthValue: any = width as any;
  return (
    <View
      style={{
        width: widthValue,
        height,
        backgroundColor: "#E8E8E8",
        borderRadius: 12,
        opacity: 0.7,
      }}
    />
  );
};

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

  const shopId = Array.isArray(params.shopId)
    ? params.shopId[0]
    : (params.shopId as string | undefined);

  // params & initial values
  const shopName = (params.shopName as string) || "";
  const initialCategory = (params.categoryName as string) || "";

  // state
  const [categories, setCategories] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategory || ""
  );
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(false); // Loading per category
  const [shopMeta, setShopMeta] = useState<ShopMeta | null>(null);

  // refs & layout
  const categoriesTabsRef = useRef<FlatList>(null);
  const tabLayoutsRef = useRef<
    Map<string, { width: number; absoluteX: number }>
  >(new Map());
  const scrollOffsetRef = useRef(0);

  // animated underline shared values
  const underlineX = useSharedValue(0);
  const underlineWidth = useSharedValue(0);

  // modal state
  const [isModalVisible, setModalVisible] = useState(false);

  // initialize tabLayouts when categories change
  useEffect(() => {
    tabLayoutsRef.current = new Map();
  }, [categories]);

  const animateUnderline = useCallback(
    (category: string) => {
      const layout = tabLayoutsRef.current.get(category);
      if (!layout) {
        return;
      }

      const widthFactor = 0.6;
      const targetWidth = layout.width * widthFactor;
      const relativeX = layout.absoluteX - scrollOffsetRef.current;
      const targetX = relativeX + (layout.width - targetWidth) / 2;

      underlineX.value = withTiming(targetX, {
        duration: 240,
        easing: Easing.out(Easing.exp),
      });
      underlineWidth.value = withTiming(targetWidth, {
        duration: 240,
        easing: Easing.out(Easing.exp),
      });
    },
    [underlineX, underlineWidth]
  );

  const scrollToCategory = useCallback(
    (category: string) => {
      if (!category) {
        return;
      }

      const index = categories.findIndex((c) => c === category);
      if (index === -1) {
        return;
      }

      try {
        categoriesTabsRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      } catch (error) {
        void error;
        requestAnimationFrame(() => scrollToCategory(category));
      }

      animateUnderline(category);
    },
    [categories, animateUnderline]
  );

  const handleTabLayout = (
    category: string,
    layout: { x: number; y: number; width: number; height: number }
  ) => {
    tabLayoutsRef.current.set(category, {
      width: layout.width,
      absoluteX: layout.x + scrollOffsetRef.current,
    });
    animateUnderline(category);
  };

  // fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      if (!shopId) return;

      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/products/shop/${shopId}`);
        if (!response.ok) throw new Error("Failed to fetch products");
        const parsed = await response.json();

        // Extract unique categories
        const uniqueCategories = [
          ...new Set(
            parsed.map((p: Product) => p.subCategory?.name || "Other")
          ),
        ].filter(Boolean) as string[];

        setCategories(uniqueCategories);

        // Set initial category
        if (initialCategory && uniqueCategories.includes(initialCategory)) {
          setSelectedCategory(initialCategory);
        } else if (uniqueCategories.length > 0) {
          setSelectedCategory(uniqueCategories[0]);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  useEffect(() => {
    const fetchShopMeta = async () => {
      if (!shopId) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/shops/${shopId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch shop details");
        }

        const data = await response.json();
        setShopMeta({
          id: data.id,
          name: data.name,
          openingHours: data.openingHours ?? null,
          isActive: data.isActive ?? null,
          acceptsOrders: data.acceptsOrders ?? null,
        });
      } catch (error) {
        console.error("Error fetching shop meta:", error);
      }
    };

    fetchShopMeta();
  }, [shopId]);

  // Fetch products for selected category
  useEffect(() => {
    const fetchCategoryProducts = async () => {
      if (!shopId || !selectedCategory) return;

      setCategoryLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/products/shop/${shopId}`);
        if (!response.ok) throw new Error("Failed to fetch products");
        const parsed = await response.json();

        // Filter products for selected category
        const categoryProducts = parsed.filter(
          (p: Product) => p.subCategory?.name === selectedCategory
        );

        setAllProducts(categoryProducts);
      } catch (error) {
        console.error("Error fetching category products:", error);
      } finally {
        setCategoryLoading(false);
      }
    };

    if (selectedCategory) {
      fetchCategoryProducts();
    }
  }, [selectedCategory, shopId]);

  const animatedUnderlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlineX.value }],
    width: underlineWidth.value,
  }));

  useEffect(() => {
    scrollToCategory(selectedCategory);
  }, [selectedCategory, scrollToCategory]);

  const handleTabsScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.x;
      requestAnimationFrame(() => animateUnderline(selectedCategory));
    },
    [animateUnderline, selectedCategory]
  );

  // debounced search (no network call required)
  useEffect(() => {
    const timer = setTimeout(() => {
      // nothing to do - filteredProducts is memoized
    }, 250);
    return () => clearTimeout(timer);
  }, [searchText]);

  // filtered products for current category + search
  const filteredProducts = useMemo(() => {
    let filtered = allProducts; // Already filtered by category in fetch

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [allProducts, searchText]);

  // cart helpers
  const handleAddToCart = (product: Product) => {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description || "",
      vendorId: product.shopId,
      vendorName: shopMeta?.name || shopName || "",
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

  const getTotalCartItems = (): number =>
    cartItems.reduce((total, item) => total + item.quantity, 0);

  // category selection (also used by modal)
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    scrollToCategory(category);
    setModalVisible(false);
  };

  // render product card
  const renderProductCard = ({ item }: { item: Product }) => (
    <View style={styles.productCardWrapper}>
      <VendorAwareProductCard
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
        vendor={{
          vendorId: shopId || item.shopId,
          vendorType: "shop",
          openingHours: shopMeta?.openingHours ?? null,
          isActive: shopMeta?.isActive ?? null,
          acceptsOrders: shopMeta?.acceptsOrders ?? null,
          vendorName: shopMeta?.name ?? shopName,
        }}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
        translucent={false}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {shopMeta?.name || shopName}
        </Text>

        <View style={styles.headerRightButtons}>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.headerListButton}
          >
            <Ionicons name="list" size={24} color="#000" />
          </TouchableOpacity>

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
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <FlatList
          ref={categoriesTabsRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          style={styles.categoriesTabsContainer}
          contentContainerStyle={styles.categoriesTabsContent}
          onScroll={handleTabsScroll}
          scrollEventThrottle={16}
          renderItem={({ item: category, index }) => (
            <TouchableOpacity
              key={category}
              style={styles.categoryTab}
              onPress={() => handleCategorySelect(category)}
              activeOpacity={0.8}
              onLayout={(e) => handleTabLayout(category, e.nativeEvent.layout)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === category && styles.categoryTabTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Animated underline */}
        <Animated.View
          style={[styles.tabUnderlineAnimated, animatedUnderlineStyle]}
        />

        {/* Modal: All categories */}
        <Modal
          animationType="slide"
          transparent
          visible={isModalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>All Categories</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={categories}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalCategoryItem}
                    onPress={() => handleCategorySelect(item)}
                  >
                    <Text
                      style={[
                        styles.modalCategoryText,
                        selectedCategory === item && {
                          color: PrimaryColor,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {item}
                    </Text>
                    {selectedCategory === item && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={PrimaryColor}
                      />
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => (
                  <View style={styles.modalSeparator} />
                )}
              />
            </View>
          </View>
        </Modal>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${selectedCategory || "items"}...`}
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

      {/* Products */}
      {loading || categoryLoading ? (
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
          columnWrapperStyle={styles.columnWrapper}
          scrollEnabled
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchText ? "No products found" : "No products available"}
          </Text>
        </View>
      )}

      {/* Floating Cart Summary */}
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
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  backButton: { padding: 4 },
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
  cartBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  headerRightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerListButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },

  // Tabs
  tabsWrapper: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    position: "relative",
  },
  categoriesTabsContainer: {
    flexGrow: 1,
  },
  categoriesTabsContent: {
    paddingHorizontal: 12,
    gap: 24,
    paddingVertical: 12,
  },
  categoryTab: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginRight: 8,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    letterSpacing: -0.2,
  },
  categoryTabTextActive: {
    color: "#000",
    textDecorationLine: "underline",
    textDecorationColor: PrimaryColor,
    textDecorationStyle: "solid",
  },
  tabUnderlineAnimated: {
    position: "absolute",
    bottom: 0,
    left: 0, // Start at 0 - translateX handles positioning
    height: 3,
    backgroundColor: PrimaryColor,
    borderRadius: 2,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#000" },
  modalCategoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  modalCategoryText: { fontSize: 16, color: "#333" },
  modalSeparator: { height: 1, backgroundColor: "#eee" },

  // Search + Grid
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
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#000", paddingVertical: 8 },
  productsGrid: { paddingHorizontal: 0, paddingVertical: 8 },
  columnWrapper: {
    justifyContent: "flex-start",
    paddingHorizontal: 8,
    marginBottom: 8,
    gap: 8,
  },
  productCardWrapper: { flex: 1, maxWidth: "33.33%" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { marginTop: 12, fontSize: 14, color: "#999" },

  // Skeletons
  skeletonCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  skeletonInfo: {
    padding: 12,
  },

  // Floating cart summary
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
