import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { API_URL } from "@/constants/config";
import { useCart } from "@/context/CartContext";
import { PrimaryColor } from "@/constants/Colors";
import VendorAwareProductCard from "@/components/common/VendorAwareProductCard";
import MealItemCard from "@/components/common/MealItemCard";
import VendorAwareMealItemCard from "@/components/common/VendorAwareMealItemCard";

const { height } = Dimensions.get("window");

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  initialQuery?: string;
}

interface SearchResults {
  restaurants: any[];
  shops: any[];
  products: any[];
  menuItems: any[];
  total: number;
  hasMore: boolean;
}

interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
}

const SearchModal: React.FC<SearchModalProps> = ({
  visible,
  onClose,
  initialQuery = "",
}) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults>({
    restaurants: [],
    shops: [],
    products: [],
    menuItems: [],
    total: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "all" | "products" | "meals" | "restaurants" | "shops"
  >("all");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([
    { id: "1", query: "Burger", timestamp: Date.now() - 3600000 },
    { id: "2", query: "Chicken yassa", timestamp: Date.now() - 7200000 },
    { id: "3", query: "Fresh vegetables", timestamp: Date.now() - 10800000 },
  ]);
  const [popularSearches] = useState([
    "Rice",
    "Chicken",
    "Fish",
    "Vegetables",
    "Bread",
    "Drinks",
    "Snacks",
    "Fruits",
  ]);

  const slideAnim = useRef(new Animated.Value(height)).current;
  const searchInputRef = useRef<TextInput>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToCart, removeFromCart, cartItems } = useCart();

  // Animation for slide up/down
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
      // Focus search input after animation
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 350);
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Reset on modal open
  useEffect(() => {
    if (visible) {
      setQuery(initialQuery);
      setActiveTab("all");
      setResults({
        restaurants: [],
        shops: [],
        products: [],
        menuItems: [],
        total: 0,
        hasMore: false,
      });
    }
  }, [visible, initialQuery]);

  // Debounced search
  const performSearch = async (
    searchQuery: string,
    tabType: string = activeTab,
    pageNum: number = 1,
  ) => {
    if (searchQuery.trim().length < 2) {
      setResults({
        restaurants: [],
        shops: [],
        products: [],
        menuItems: [],
        total: 0,
        hasMore: false,
      });
      return;
    }

    // Map frontend tab names to API types
    const apiType = tabType === "meals" ? "menu_items" : tabType;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/search?q=${encodeURIComponent(
          searchQuery,
        )}&type=${apiType}&page=${pageNum}&limit=20`,
      );
      const data = await response.json();

      if (data.success) {
        if (pageNum === 1) {
          setResults(data.data);
        } else {
          // Append results for pagination
          setResults((prev) => ({
            ...data.data,
            restaurants: [...prev.restaurants, ...data.data.restaurants],
            shops: [...prev.shops, ...data.data.shops],
            products: [...prev.products, ...data.data.products],
            menuItems: [...prev.menuItems, ...data.data.menuItems],
          }));
        }
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (text: string) => {
    setQuery(text);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Set new timeout for search
    searchTimeout.current = setTimeout(() => {
      if (text.trim().length >= 2) {
        performSearch(text, activeTab, 1);
      }
    }, 500);
  };

  // Save search to recent searches
  const saveSearch = (searchQuery: string) => {
    if (searchQuery.trim().length < 2) return;

    const newSearch: RecentSearch = {
      id: Date.now().toString(),
      query: searchQuery.trim(),
      timestamp: Date.now(),
    };

    setRecentSearches((prev) => [
      newSearch,
      ...prev.filter((s) => s.query !== searchQuery.trim()).slice(0, 9),
    ]);
  };

  // Handle search submission
  const handleSearchSubmit = () => {
    if (query.trim().length >= 2) {
      saveSearch(query);
      performSearch(query, activeTab, 1);
    }
  };

  // Clear search
  const clearSearch = () => {
    setQuery("");
    setResults({
      restaurants: [],
      shops: [],
      products: [],
      menuItems: [],
      total: 0,
      hasMore: false,
    });
    searchInputRef.current?.focus();
  };

  // Handle back/close
  const handleClose = () => {
    setQuery("");
    onClose();
  };

  // Render restaurant items - matching SubCategoryView structure
  const renderRestaurants = () => {
    if (results.restaurants.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="restaurant" size={20} color={PrimaryColor} />
            <Text style={styles.sectionTitle}>Restaurants</Text>
          </View>
          <Text style={styles.sectionCount}>{results.restaurants.length}</Text>
        </View>
        {results.restaurants.map((restaurant) => (
          <TouchableOpacity
            key={restaurant.id}
            style={styles.modernRestaurantCard}
            onPress={() => {
              onClose();
              router.push({
                pathname: "/restaurant-details",
                params: { restaurantId: restaurant.id },
              });
            }}
            activeOpacity={0.85}
          >
            <View style={styles.modernImageContainer}>
              {restaurant.imageUrl ? (
                <Image
                  source={{ uri: restaurant.imageUrl }}
                  style={{
                    width: "100%" as const,
                    height: "100%" as const,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                  }}
                  onError={() => {
                    // Could add error state handling here
                  }}
                />
              ) : (
                <View style={styles.modernImagePlaceholder}>
                  <Ionicons
                    name="restaurant-outline"
                    size={40}
                    color="#94a3b8"
                  />
                </View>
              )}

              {restaurant.isActive && (
                <View
                  style={[
                    styles.modernStatusBadge,
                    { backgroundColor: "rgba(34,197,94,0.95)" },
                  ]}
                >
                  <View style={styles.statusIndicator} />
                  <Text style={styles.modernStatusText}>Open</Text>
                </View>
              )}
            </View>

            <View style={styles.modernCardContent}>
              <View style={styles.modernCardHeader}>
                <Text style={styles.modernCardTitle} numberOfLines={1}>
                  {restaurant.name}
                </Text>
              </View>

              <Text style={styles.modernCardDescription} numberOfLines={2}>
                {restaurant.description || "Fresh and delicious food"}
              </Text>

              <View style={styles.modernCardFooter}>
                <View style={styles.modernLocationInfo}>
                  <Ionicons name="location-outline" size={12} color="#64748b" />
                  <Text style={styles.modernLocationText} numberOfLines={1}>
                    {restaurant.address || "Nearby"}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render shop items - matching SubCategoryView structure
  const renderShops = () => {
    if (results.shops.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="storefront" size={20} color={PrimaryColor} />
            <Text style={styles.sectionTitle}>Shops</Text>
          </View>
          <Text style={styles.sectionCount}>{results.shops.length}</Text>
        </View>
        {results.shops.map((shop) => (
          <TouchableOpacity
            key={shop.id}
            style={styles.modernCard}
            onPress={() => {
              onClose();
              router.push({
                pathname: "/shop-details",
                params: { shopId: shop.id },
              });
            }}
            activeOpacity={0.8}
          >
            <View style={styles.modernImageContainer}>
              {shop.imageUrl ? (
                <Image
                  source={{ uri: shop.imageUrl }}
                  style={{
                    width: "100%" as const,
                    height: "100%" as const,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                  }}
                  onError={() => {
                    // Could add error state handling here
                  }}
                />
              ) : (
                <View style={styles.modernImagePlaceholder}>
                  <Ionicons name="storefront" size={40} color="#94a3b8" />
                </View>
              )}

              <View
                style={[
                  styles.modernStatusBadge,
                  {
                    backgroundColor: shop.isActive
                      ? "rgba(34,197,94,0.95)"
                      : "rgba(239,68,68,0.95)",
                  },
                ]}
              >
                <View style={styles.statusIndicator} />
                <Text style={styles.modernStatusText}>
                  {shop.isActive ? "Open" : "Closed"}
                </Text>
              </View>
            </View>

            <View style={styles.modernCardContent}>
              <View style={styles.modernCardHeader}>
                <Text style={styles.modernCardTitle} numberOfLines={1}>
                  {shop.name}
                </Text>
                {shop.shopType && (
                  <View style={styles.modernTypeBadge}>
                    <Text style={styles.modernTypeText}>{shop.shopType}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.modernCardDescription} numberOfLines={2}>
                {shop.description || "Quality products served fresh"}
              </Text>

              <View style={styles.modernCardFooter}>
                <View style={styles.modernLocationInfo}>
                  <Ionicons name="location-outline" size={12} color="#64748b" />
                  <Text style={styles.modernLocationText} numberOfLines={1}>
                    {`${shop.city ?? ""}${
                      shop.city && shop.address ? ", " : ""
                    }${shop.address ?? "Location"}`}
                  </Text>
                </View>
              </View>

              {shop.acceptsOrders && (
                <View style={styles.acceptsOrdersBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                  <Text style={styles.acceptsOrdersText}>Accepts Orders</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render menu items in list matching SubCategoryView
  const renderMenuItems = () => {
    if (results.menuItems.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="fast-food-outline" size={20} color="#64748b" />
            <Text style={styles.sectionTitle}>Meals</Text>
          </View>
          <Text style={styles.sectionCount}>{results.menuItems.length}</Text>
        </View>
        <View>
          {results.menuItems.map((menuItem) => {
            // Convert menuItem to UniversalProduct format
            const universalProduct = {
              id: parseInt(menuItem.id),
              name: menuItem.name,
              price: menuItem.price,
              discountedPrice: menuItem.discountedPrice,
              image: menuItem.imageUrl,
              description: menuItem.description,
              inStock: menuItem.isAvailable !== false,
            };

            const cartQuantity =
              cartItems.find((item) => String(item.id) === String(menuItem.id))
                ?.quantity || 0;

            return (
              <View
                key={menuItem.id}
                style={{
                  width: "100%",
                  marginBottom: 12,
                }}
              >
                <VendorAwareMealItemCard
                  product={universalProduct}
                  cartQuantity={cartQuantity}
                  onAddToCart={() => {
                    const cartItem = {
                      id: String(menuItem.id),
                      name: menuItem.name,
                      price: menuItem.price,
                      discountedPrice: menuItem.discountedPrice,
                      imageUrl: menuItem.imageUrl || "",
                      vendorId: menuItem.menu?.restaurantId || "",
                      vendorName: "Restaurant",
                      description: menuItem.description || "",
                      entityType: "menuItem",
                    };
                    addToCart(cartItem);
                  }}
                  onRemoveFromCart={() => removeFromCart(String(menuItem.id))}
                  onPress={() => {
                    onClose();
                    router.push(`/menuitem/${menuItem.id}`);
                  }}
                  vendor={{
                    vendorId: menuItem.menu?.restaurantId,
                    vendorType: "restaurant",
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Render products in 3-column grid matching SubCategoryView
  const renderProducts = () => {
    if (results.products.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="cube-outline" size={20} color="#64748b" />
            <Text style={styles.sectionTitle}>Products</Text>
          </View>
          <Text style={styles.sectionCount}>{results.products.length}</Text>
        </View>
        {/* 3-column grid layout matching SubCategoryView */}
        <View style={styles.productsGrid}>
          {results.products.map((product) => {
            // Convert product to UniversalProduct format
            const universalProduct = {
              id: parseInt(product.id),
              name: product.name,
              price: product.price,
              image: product.imageUrl,
              description: product.description,
              discountedPrice: product.discountedPrice,
              inStock: true,
            };

            const cartQuantity =
              cartItems.find((item) => String(item.id) === String(product.id))
                ?.quantity || 0;

            return (
              <View key={product.id} style={styles.productGridItem}>
                <VendorAwareProductCard
                  product={universalProduct}
                  cartQuantity={cartQuantity}
                  onAddToCart={() => {
                    const cartItem = {
                      id: String(product.id),
                      name: product.name,
                      price: product.price,
                      discountedPrice: product.discountedPrice,
                      imageUrl: product.imageUrl,
                      vendorId: product.shopId || "",
                      vendorName: "Shop",
                      description: product.description || "",
                      entityType: "shop",
                    };
                    addToCart(cartItem);
                  }}
                  onRemoveFromCart={() => removeFromCart(String(product.id))}
                  onPress={() => {
                    onClose();
                    router.push(`/product/${product.id}`);
                  }}
                  vendor={{
                    vendorId: product.shopId,
                    vendorType: "shop",
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Render tab button with badge like SubCategoryView
  const renderTabButton = (tab: string, label: string, count?: number) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => {
        setActiveTab(tab as any);
        if (query.trim().length >= 2) {
          performSearch(query, tab, 1);
        }
      }}
      activeOpacity={0.8}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View
          style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}
        >
          <Text
            style={[
              styles.tabBadgeText,
              activeTab === tab && styles.tabBadgeTextActive,
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.safeArea, { paddingTop: insets.top }]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.keyboardAvoid}
            >
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleClose}
                >
                  <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>

                <View style={styles.searchInputContainer}>
                  <Ionicons
                    name="search"
                    size={20}
                    color="#FF6B35"
                    style={styles.searchIcon}
                  />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder="Search restaurants, shops, products..."
                    placeholderTextColor="#9CA3AF"
                    value={query}
                    onChangeText={handleSearchChange}
                    onSubmitEditing={handleSearchSubmit}
                    returnKeyType="search"
                  />
                  {query.length > 0 && (
                    <TouchableOpacity
                      onPress={clearSearch}
                      style={styles.clearButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSearchSubmit}
                >
                  <Text style={styles.saveButtonText}>Search</Text>
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
              >
                {query.length === 0 ? (
                  <View style={styles.emptyState}>
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionTitle}>
                            Recent Searches
                          </Text>
                          <TouchableOpacity
                            onPress={() => setRecentSearches([])}
                          >
                            <Text style={styles.clearAllText}>Clear All</Text>
                          </TouchableOpacity>
                        </View>
                        {recentSearches.map((search) => (
                          <TouchableOpacity
                            key={search.id}
                            style={styles.recentItem}
                            onPress={() => {
                              setQuery(search.query);
                              performSearch(search.query, activeTab, 1);
                            }}
                          >
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color="#9CA3AF"
                            />
                            <Text style={styles.recentText}>
                              {search.query}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                setRecentSearches((prev) =>
                                  prev.filter((s) => s.id !== search.id),
                                )
                              }
                            >
                              <Ionicons
                                name="close"
                                size={16}
                                color="#9CA3AF"
                              />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Popular Searches */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Popular Searches</Text>
                      <View style={styles.tagsContainer}>
                        {popularSearches.map((tag, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.tagButton}
                            onPress={() => {
                              setQuery(tag);
                              performSearch(tag, activeTab, 1);
                            }}
                          >
                            <Text style={styles.tagText}>{tag}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Search Tips */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Search Tips</Text>
                      <Text style={styles.tipText}>
                        • Try searching for &quot;benachin&quot; or
                        &quot;chicken pizza&quot;
                        {"\n"}• Search by cuisine type like
                        &quot;Senegalese&quot; or &quot;Lebanese&quot;{"\n"}•
                        Look for specific items like &quot;bread&quot; or
                        &quot;vegetables&quot;
                      </Text>
                    </View>
                  </View>
                ) : (
                  <>
                    {/* Tabs */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.tabsContainer}
                      contentContainerStyle={styles.tabsContent}
                    >
                      {renderTabButton("all", "All", results.total)}
                      {renderTabButton(
                        "products",
                        "Products",
                        results.products.length,
                      )}
                      {renderTabButton(
                        "meals",
                        "Meals",
                        results.menuItems.length,
                      )}
                      {renderTabButton(
                        "restaurants",
                        "Restaurants",
                        results.restaurants.length,
                      )}
                      {renderTabButton("shops", "Stores", results.shops.length)}
                    </ScrollView>

                    {/* Results */}
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#FF6B35" />
                        <Text style={styles.loadingText}>Searching...</Text>
                      </View>
                    ) : (
                      <View style={styles.resultsContainer}>
                        {activeTab === "all" ? (
                          // Show all results - Products & Menu Items first, then Restaurants & Shops
                          <>
                            {renderProducts()}
                            {renderMenuItems()}
                            {renderRestaurants()}
                            {renderShops()}
                          </>
                        ) : activeTab === "products" ? (
                          renderProducts()
                        ) : activeTab === "meals" ? (
                          renderMenuItems()
                        ) : activeTab === "restaurants" ? (
                          renderRestaurants()
                        ) : activeTab === "shops" ? (
                          renderShops()
                        ) : null}

                        {/* No Results */}
                        {!loading &&
                          results.total === 0 &&
                          query.length >= 2 && (
                            <View style={styles.noResults}>
                              <Ionicons
                                name="search-outline"
                                size={48}
                                color="#9CA3AF"
                              />
                              <Text style={styles.noResultsTitle}>
                                No results found
                              </Text>
                              <Text style={styles.noResultsText}>
                                Try searching with different keywords or check
                                your spelling
                              </Text>
                            </View>
                          )}
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#F9FAFB",
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 44,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  saveButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
    marginLeft: 6,
  },
  clearAllText: {
    fontSize: 14,
    color: "#FF6B35",
    fontWeight: "600" as const,
  },
  recentItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 8,
  },
  recentText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    marginLeft: 12,
  },
  tagsContainer: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  tagButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tagText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  tipText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  tabsContainer: {
    maxHeight: 70,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 12,
  },
  tabsContent: {
    paddingHorizontal: 16,
    alignItems: "center" as const,
  },
  tabButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    borderWidth: 0,
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  tabText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600" as const,
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "700" as const,
  },
  tabBadge: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#475569",
  },
  tabBadgeTextActive: {
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  resultsContainer: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "space-between" as const,
  },
  gridItem: {
    width: "48%" as const,
    marginBottom: 16,
  },
  noResults: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingVertical: 48,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#111827",
    marginTop: 12,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center" as const,
    lineHeight: 20,
  },
  // Modern card styles from SubCategoryView
  sectionTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  sectionCount: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  modernCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden" as const,
  },
  modernRestaurantCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden" as const,
  },
  modernImageContainer: {
    position: "relative" as const,
    height: 180,
    width: "100%" as const,
  },
  modernImagePlaceholder: {
    width: "100%" as const,
    height: "100%" as const,
    backgroundColor: "#f8fafc",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  modernStatusBadge: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  modernStatusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  modernCardContent: {
    padding: 16,
  },
  modernCardHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: 8,
  },
  modernCardTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#1f2937",
    flex: 1,
    marginRight: 8,
  },
  modernTypeBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modernTypeText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
  },
  modernCardDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  modernCardFooter: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  modernLocationInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    flex: 1,
  },
  modernLocationText: {
    fontSize: 12,
    color: "#64748b",
    flex: 1,
  },
  acceptsOrdersBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 8,
  },
  acceptsOrdersText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "600" as const,
  },
  // Products Grid - 3 columns
  productsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    marginTop: 8,
  },
  productGridItem: {
    width: "33.33%" as const,
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  productCardWrapper: {
    width: "30%" as const, // 3 columns with gap
    marginBottom: 8,
  },
};

export default SearchModal;
