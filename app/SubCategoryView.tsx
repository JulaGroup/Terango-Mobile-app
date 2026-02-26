import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  FlatList,
  RefreshControl,
  Dimensions,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { API_URL } from "@/constants/config";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import VendorAwareProductCard from "@/components/common/VendorAwareProductCard";
import VendorAwareMealItemCard from "@/components/common/VendorAwareMealItemCard";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Interfaces
interface Restaurant {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  rating?: number;
  totalReviews?: number;
  acceptsOrders?: boolean;
  fullWidth?: boolean;
}
interface Shop {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  rating?: number;
  totalReviews?: number;
  shopType?: string;
  minimumOrderAmount?: number;
  acceptsOrders: boolean;
  fullWidth?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  description?: string;
  imageUrl?: string;
  shopId: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  description?: string;
  imageUrl?: string;
  menu: {
    restaurantId: string;
  };
  isAvailable: boolean;
}

interface SubCategoryData {
  restaurants: Restaurant[];
  shops: Shop[];
  products: Product[];
  menuItems: MenuItem[];
}

// Skeleton Loader Component
const SkeletonLoader = ({ width: w, height, style }: any) => {
  const [opacity] = useState(new Animated.Value(0.3));

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
        {
          width: w,
          height: height,
          backgroundColor: "#E0E0E0",
          borderRadius: 8,
          opacity: opacity,
        },
        style,
      ]}
    />
  );
};

// Filter Tabs Component
const FilterTabs = ({ activeTab, onTabChange, counts }: any) => {
  const tabs = [
    { key: "all", label: "All", count: counts.all },
    { key: "products", label: "Products", count: counts.products },
    { key: "menuItems", label: "Meals", count: counts.menuItems },
  ];

  return (
    <View style={styles.tabsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.tabButtonActive,
            ]}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === tab.key && styles.tabButtonTextActive,
              ]}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  activeTab === tab.key && styles.tabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === tab.key && styles.tabBadgeTextActive,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// Main Component
export default function SubCategoryView() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { subCategoryId, subCategoryName } = useLocalSearchParams();
  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();
  const [data, setData] = useState<SubCategoryData>({
    restaurants: [],
    shops: [],
    products: [],
    menuItems: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const fetchSubCategoryData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(
        `${API_URL}/api/subcategories/${subCategoryId}/entities`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const result = await response.json();
      setData({
        restaurants: result.restaurants || [],
        shops: result.shops || [],
        products: result.products || [],
        menuItems: result.menuItems || [],
      });
    } catch (err: any) {
      console.error("Error fetching subcategory data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subCategoryId]);
  useEffect(() => {}, [data]);
  useEffect(() => {
    if (subCategoryId) {
      fetchSubCategoryData();
    }
  }, [subCategoryId, fetchSubCategoryData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSubCategoryData();
  }, [fetchSubCategoryData]);

  const getTotalCartItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // Apply search filtering to products and menu items
  const filteredProducts = data.products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMenuItems = data.menuItems.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCounts = () => {
    const products = filteredProducts.length;
    const menuItems = filteredMenuItems.length;
    const all = products + menuItems;

    return { all, restaurants: 0, shops: 0, products, menuItems };
  };

  const renderContent = () => {
    if (activeTab === "all") {
      return (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Products Section - 3 Column Grid */}
          {filteredProducts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="cube-outline" size={18} color="#64748b" />
                  <Text style={styles.sectionTitle}>Products</Text>
                </View>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => setActiveTab("products")}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#666666",
                      fontWeight: "500",
                      marginRight: 4,
                    }}
                  >
                    See All
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* 3-Column Grid for Products */}
              <View style={styles.productGridContainer}>
                {filteredProducts.map((item) => {
                  const cartQuantity =
                    cartItems.find((ci) => String(ci.id) === String(item.id))
                      ?.quantity || 0;
                  return (
                    <View
                      key={`product-${item.id}`}
                      style={styles.productGridItem}
                    >
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
                        cartQuantity={cartQuantity}
                        onAddToCart={() => {
                          const cartItem = {
                            id: String(item.id),
                            vendorName: "Shop",
                            name: item.name,
                            price: item.price,
                            description: item.description || "",
                            vendorId: item.shopId || "",
                            imageUrl: item.imageUrl || "",
                            entityType: "shop",
                          };
                          addToCart(cartItem);
                        }}
                        onRemoveFromCart={() => {
                          const id = String(item.id);
                          const cartItem = cartItems.find(
                            (ci) => String(ci.id) === id
                          );
                          if (cartItem && cartItem.quantity > 1) {
                            updateQuantity(id, cartItem.quantity - 1);
                          } else {
                            removeFromCart(id);
                          }
                        }}
                        onPress={() => router.push(`/product/${item.id}`)}
                        vendor={{
                          vendorId: item.shopId,
                          vendorType: "shop",
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Menu Items Section - Single Column */}
          {filteredMenuItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons
                    name="fast-food-outline"
                    size={18}
                    color="#64748b"
                  />
                  <Text style={styles.sectionTitle}>Meals</Text>
                </View>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => setActiveTab("menuItems")}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#666666",
                      fontWeight: "500",
                      marginRight: 4,
                    }}
                  >
                    See All
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Single Column for ALL Meals using MealItemCard */}
              <FlatList
                data={filteredMenuItems}
                keyExtractor={(item) => `menu-all-${item.id}`}
                renderItem={({ item }) => {
                  const cartQuantity =
                    cartItems.find((ci) => String(ci.id) === String(item.id))
                      ?.quantity || 0;
                  return (
                    <View style={styles.mealSingleColumnItem}>
                      <VendorAwareMealItemCard
                        product={{
                          id: Number(item.id),
                          name: item.name,
                          price: item.price,
                          discountedPrice: item.discountedPrice,
                          image: item.imageUrl || "",
                          description: item.description || "",
                          inStock: item.isAvailable,
                        }}
                        cartQuantity={cartQuantity}
                        onAddToCart={() => {
                          const cartItem = {
                            id: String(item.id),
                            name: item.name,
                            price: item.price,
                            imageUrl: item.imageUrl || "",
                            vendorId: item.menu?.restaurantId || "",
                            vendorName: "Restaurant",
                            description: item.description || "",
                            entityType: "restaurant",
                          };
                          addToCart(cartItem);
                        }}
                        onRemoveFromCart={() => {
                          const id = String(item.id);
                          const cartItem = cartItems.find(
                            (ci) => String(ci.id) === id
                          );
                          if (cartItem && cartItem.quantity > 1) {
                            updateQuantity(id, cartItem.quantity - 1);
                          } else {
                            removeFromCart(id);
                          }
                        }}
                        onPress={() => router.push(`/menuitem/${item.id}`)}
                        vendor={{
                          vendorId: item.menu?.restaurantId,
                          vendorType: "restaurant",
                        }}
                      />
                    </View>
                  );
                }}
                scrollEnabled={false}
                contentContainerStyle={styles.mealSingleColumnContainer}
              />
            </View>
          )}
        </ScrollView>
      );
    }

    // Filtered view for specific tabs
    if (activeTab === "products") {
      if (filteredProducts.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "Try a different search term."
                : "There are no products in this category yet."}
            </Text>
          </View>
        );
      }

      // 3-Column Grid for Products
      const H_GAP = 12;
      const cardWidth = (width - 40 - H_GAP * 2) / 3;

      return (
        <FlatList
          data={filteredProducts}
          numColumns={3}
          key={`products-3col`}
          keyExtractor={(item) => `product-${item.id}`}
          renderItem={({ item }) => {
            const cartQuantity =
              cartItems.find((ci) => String(ci.id) === String(item.id))
                ?.quantity || 0;
            return (
              <View
                style={{
                  width: cardWidth,
                  paddingHorizontal: H_GAP / 2,
                  marginBottom: H_GAP,
                }}
              >
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
                  cartQuantity={cartQuantity}
                  onAddToCart={() => {
                    const cartItem = {
                      id: String(item.id),
                      vendorName: "Shop",
                      name: item.name,
                      price: item.price,
                      description: item.description || "",
                      vendorId: item.shopId || "",
                      imageUrl: item.imageUrl || "",
                      entityType: "shop",
                    };
                    addToCart(cartItem);
                  }}
                  onRemoveFromCart={() => {
                    const id = String(item.id);
                    const cartItem = cartItems.find(
                      (ci) => String(ci.id) === id
                    );
                    if (cartItem && cartItem.quantity > 1) {
                      updateQuantity(id, cartItem.quantity - 1);
                    } else {
                      removeFromCart(id);
                    }
                  }}
                  onPress={() => router.push(`/product/${item.id}`)}
                  vendor={{
                    vendorId: item.shopId,
                    vendorType: "shop",
                  }}
                />
              </View>
            );
          }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 8,
          }}
          showsVerticalScrollIndicator={false}
        />
      );
    } else if (activeTab === "menuItems") {
      if (filteredMenuItems.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Meals Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "Try a different search term."
                : "There are no meals in this category yet."}
            </Text>
          </View>
        );
      }
      return (
        <FlatList
          data={filteredMenuItems}
          key={`menuItems-1col`}
          keyExtractor={(item) => `menu-${item.id}`}
          renderItem={({ item }) => {
            return (
              <View
                style={{
                  width: "100%",
                  marginBottom: 12,
                }}
              >
                <VendorAwareMealItemCard
                  product={{
                    id: Number(item.id),
                    name: item.name,
                    price: item.price,
                    discountedPrice: item.discountedPrice,
                    image: item.imageUrl || "",
                    description: item.description || "",
                    inStock: item.isAvailable,
                  }}
                  cartQuantity={
                    cartItems.find((ci) => String(ci.id) === String(item.id))
                      ?.quantity || 0
                  }
                  onAddToCart={() =>
                    addToCart({
                      id: item.id.toString(),
                      name: item.name,
                      price: item.price,
                      imageUrl: item.imageUrl || "",
                      vendorId: item.menu?.restaurantId || "",
                      vendorName: "",
                      description: item.description || "",
                      entityType: "menuItem",
                    })
                  }
                  onRemoveFromCart={() => removeFromCart(String(item.id))}
                  onPress={() => router.push(`/menuitem/${item.id}`)}
                  vendor={{
                    vendorId: item.menu?.restaurantId,
                    vendorType: "restaurant",
                  }}
                />
              </View>
            );
          }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 8,
          }}
          showsVerticalScrollIndicator={false}
        />
      );
    }
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Header Skeleton */}
        <View style={styles.header}>
          <SkeletonLoader width={40} height={40} style={{ borderRadius: 20 }} />
          <SkeletonLoader
            width={150}
            height={24}
            style={{ borderRadius: 12 }}
          />
          <SkeletonLoader width={40} height={40} style={{ borderRadius: 20 }} />
        </View>

        {/* Tabs Skeleton */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[1, 2, 3, 4, 5].map((item) => (
              <SkeletonLoader
                key={item}
                width={80}
                height={40}
                style={{ marginRight: 12, borderRadius: 20 }}
              />
            ))}
          </ScrollView>
        </View>

        {/* Content Skeleton */}
        <ScrollView style={{ flex: 1, padding: 20 }}>
          {[1, 2, 3].map((section) => (
            <View key={section} style={{ marginBottom: 32 }}>
              <SkeletonLoader
                width={120}
                height={20}
                style={{ marginBottom: 16 }}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[1, 2, 3].map((card) => (
                  <SkeletonLoader
                    key={card}
                    width={280}
                    height={160}
                    style={{ marginRight: 16, borderRadius: 16 }}
                  />
                ))}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchSubCategoryData}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const counts = getCounts();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
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
            {subCategoryName || "Subcategory"}
          </Text>
          <Text style={styles.subtitle}>
            {counts.all} {counts.all === 1 ? "item" : "items"} found
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

      {/* Search Bar above Tabs */}
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
            placeholder="Search..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <FilterTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      {/* Content */}
      <View style={{ flex: 1 }}>
        {counts.all === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Items Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No results for "${searchQuery}". Try another search.`
                : `No restaurants, stores, products, or meals are available in this category yet.`}
            </Text>
          </View>
        ) : (
          renderContent()
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    position: "relative",
  },
  searchBarInput: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
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

  // Tabs
  tabsContainer: {
    backgroundColor: "#ffffff",
    paddingVertical: 20,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabsContent: {
    paddingHorizontal: 16,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#f8fafc",
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabButtonActive: {
    backgroundColor: PrimaryColor,
    borderColor: PrimaryColor,
    elevation: 3,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.2,
  },
  tabButtonTextActive: {
    color: "#ffffff",
  },
  tabBadge: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
    minWidth: 24,
    alignItems: "center",
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  tabBadgeTextActive: {
    color: "#ffffff",
  },

  // Sections
  section: {
    marginBottom: 24,
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    borderRadius: 16,
    marginHorizontal: 0,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 6,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // Restaurant Card
  restaurantCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  restaurantImageContainer: {
    height: 120,
    position: "relative",
    overflow: "hidden",
  },
  restaurantImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  restaurantImagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  activeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#27AE60",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  ratingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 2,
  },
  restaurantInfo: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  restaurantDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 16,
  },
  restaurantFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  reviewText: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Shop Card
  shopCard: {
    width: 280,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  shopImageContainer: {
    height: 120,
    position: "relative",
    overflow: "hidden",
  },
  shopImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  shopImagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  shopInfo: {
    padding: 16,
  },
  shopName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  shopDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 16,
  },
  shopTypeBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  shopTypeBadgeText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
  minOrderText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  shopFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  acceptsOrdersBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  acceptsOrdersText: {
    fontSize: 10,
    color: "#27AE60",
    fontWeight: "500",
    marginLeft: 4,
  },

  // Menu Item Card
  menuItemCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  menuItemImageContainer: {
    width: "100%",
    height: 100,
    position: "relative",
    overflow: "hidden",
  },
  menuItemImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F8F8F8",
  },
  menuItemImagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  unavailableOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  unavailableText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EF4444",
    textTransform: "uppercase",
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
  menuItemInfo: {
    padding: 8,
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
    lineHeight: 18,
  },
  menuItemDesc: {
    fontSize: 11,
    color: "#888",
    marginBottom: 8,
    lineHeight: 14,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: PrimaryColor,
    letterSpacing: -0.3,
  },

  // Error & Empty States
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

  // Modern Card Components
  modernCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  // Modern Restaurant Card Styles
  modernRestaurantCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modernImage: {
    width: "100%",
    height: 140,
    resizeMode: "cover",
  },
  overlayBadges: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  openBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34,197,94,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 2,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff",
    marginRight: 4,
  },
  openText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modernRestaurantInfo: {
    padding: 12,
  },
  modernRestaurantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  modernRestaurantDesc: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
    marginBottom: 8,
  },
  modernFooter: {
    marginBottom: 6,
  },
  deliveryInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  timeText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
    marginLeft: 3,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  reviewInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewCount: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "500",
    marginLeft: 2,
  },

  modernImageContainer: {
    position: "relative",
    height: 140,
  },
  modernCardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  modernImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modernStatusBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 2,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff",
    marginRight: 4,
  },
  modernStatusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modernRatingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    elevation: 2,
  },
  modernRatingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
    marginLeft: 2,
  },
  quickOrderButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: PrimaryColor,
    borderRadius: 20,
    padding: 6,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modernCardContent: {
    padding: 12,
  },
  modernCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  modernCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    marginRight: 8,
  },
  modernTypeBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  modernTypeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modernCardDescription: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
    marginBottom: 8,
  },
  modernMinOrderText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginBottom: 8,
  },
  modernCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modernDeliveryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modernDeliveryTime: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
    marginLeft: 3,
  },
  modernLocationInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 8,
  },
  modernLocationText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "400",
    marginLeft: 3,
    flex: 1,
  },
  modernReviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modernStarsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modernReviewCount: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "500",
  },

  // Modern Menu Card Styles
  modernMenuCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  modernMenuImageContainer: {
    position: "relative",
    height: 120,
  },
  modernMenuImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  modernMenuImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modernUnavailableOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  unavailableBadge: {
    backgroundColor: "rgba(239,68,68,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modernUnavailableText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modernFloatingAddButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: PrimaryColor,
    borderRadius: 16,
    padding: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: "#94a3b8",
  },
  quantityBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  modernQuantityControls: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 4,
    elevation: 3,
  },
  modernQuantityButton: {
    backgroundColor: PrimaryColor,
    borderRadius: 12,
    padding: 6,
    marginHorizontal: 2,
  },
  modernQuantityBadge: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginHorizontal: 2,
  },
  modernQuantityText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
  },
  modernMenuContent: {
    padding: 12,
  },
  modernMenuTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
    lineHeight: 20,
  },
  modernMenuDescription: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
    marginBottom: 8,
  },
  modernMenuFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modernMenuPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: PrimaryColor,
    letterSpacing: -0.3,
  },
  cartIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cartIndicatorText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10b981",
    marginLeft: 2,
  },

  // Popular Section Styles
  popularSection: {
    backgroundColor: "#f8fafc",
    paddingVertical: 20,
    marginBottom: 16,
  },
  popularHeader: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  popularTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  popularTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e293b",
    marginLeft: 8,
  },
  popularSubtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  popularSubsection: {
    marginBottom: 0,
  },
  popularSubsectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  popularItemWrapper: {
    marginRight: 16,
  },
  allCategoriesHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  allCategoriesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  allCategoriesSubtitle: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },

  // Enhanced Section Headers
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginRight: 2,
  },

  // Full Width Restaurant Card Styles
  fullWidthRestaurantCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 18,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#F3F4F6",
  },
  fullWidthImageContainer: {
    height: 140,
    backgroundColor: "#f8f8f8",
    position: "relative",
    overflow: "hidden",
  },
  fullWidthImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  fullWidthImagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  fullWidthActiveBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#27AE60",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fullWidthActiveBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  fullWidthRatingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  fullWidthRatingText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 2,
  },
  fullWidthRestaurantInfo: {
    padding: 16,
  },
  fullWidthRestaurantName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  fullWidthRestaurantDesc: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    lineHeight: 16,
  },
  fullWidthRestaurantFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fullWidthLocationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fullWidthLocationText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  fullWidthReviewText: {
    fontSize: 12,
    color: "#666",
  },

  // Full Width Shop Card Styles
  fullWidthShopCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 18,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.08)",
  },
  fullWidthStatusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fullWidthStatusBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  fullWidthShopInfo: {
    padding: 16,
  },
  fullWidthShopName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  fullWidthShopDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 16,
  },
  fullWidthShopTypeBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  fullWidthShopTypeBadgeText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
  fullWidthMinOrderText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  fullWidthShopFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fullWidthAcceptsOrdersBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  fullWidthAcceptsOrdersText: {
    fontSize: 10,
    color: "#27AE60",
    fontWeight: "500",
    marginLeft: 4,
  },
  productGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  productGridItem: {
    width: "33.33%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  mealGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  mealGridItem: {
    width: "50%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  mealSingleColumnContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  mealSingleColumnItem: {
    width: "100%",
    marginBottom: 12,
  },
});
