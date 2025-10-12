import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Components
import Cart from "@/components/common/Cart";
import SearchBar from "@/components/common/SearchBar";
import SearchModal from "@/components/common/SearchModal";
import CategoryGrid from "@/components/ui/browse/CategoryGrid";
import RestaurantNearYou from "@/components/ui/home/RestaurantNearYouNew";
import AdBanner from "@/components/ui/home/AdBanner";
import LocalShops from "@/components/ui/home/LocalShops";
import ProductCard, { UniversalProduct } from "@/components/common/ProductCard";
import MealItemCard from "@/components/common/MealItemCard";
import TrendingSkeleton from "@/components/ui/browse/TrendingSkeleton";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryColor } from "@/constants/Colors";
import { API_URL } from "@/constants/config";

const { width } = Dimensions.get("window");

interface TrendingProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  shopName?: string;
  discount?: number;
}

interface TrendingMeal {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  restaurantName?: string;
  rating?: number;
}

export default function BrowseScreen() {
  const [searchText, setSearchText] = useState("");
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>(
    []
  );
  const [trendingMeals, setTrendingMeals] = useState<TrendingMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [productsPage, setProductsPage] = useState(1);
  const [mealsPage, setMealsPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [hasMoreMeals, setHasMoreMeals] = useState(true);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [loadingMoreMeals, setLoadingMoreMeals] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const showStickySearchBar = scrollY.interpolate({
    inputRange: [100, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Load recent searches from AsyncStorage
  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      loadRecentSearches(),
      fetchTrendingProducts(),
      // fetchTrendingMeals(),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setProductsPage(1);
    setMealsPage(1);
    await Promise.all([
      fetchTrendingProducts(1, false),
      // fetchTrendingMeals(1, false),
    ]);
    setRefreshing(false);
  };

  const loadMoreProducts = () => {
    if (!loadingMoreProducts && hasMoreProducts) {
      const nextPage = productsPage + 1;
      setProductsPage(nextPage);
      fetchTrendingProducts(nextPage, true);
    }
  };

  // const loadMoreMeals = () => {
  //   if (!loadingMoreMeals && hasMoreMeals) {
  //     const nextPage = mealsPage + 1;
  //     setMealsPage(nextPage);
  //     fetchTrendingMeals(nextPage, true);
  //   }
  // };

  const loadRecentSearches = async () => {
    try {
      const searches = await AsyncStorage.getItem("@recent_searches");
      if (searches) {
        setRecentSearches(JSON.parse(searches));
      }
    } catch (error) {
      console.error("Error loading recent searches:", error);
    }
  };

  const saveRecentSearch = async (searchQuery: string) => {
    try {
      const searches = [...new Set([searchQuery, ...recentSearches])].slice(
        0,
        5
      );
      await AsyncStorage.setItem("@recent_searches", JSON.stringify(searches));
      setRecentSearches(searches);
    } catch (error) {
      console.error("Error saving search:", error);
    }
  };

  const clearRecentSearch = async (searchQuery: string) => {
    try {
      const filtered = recentSearches.filter((s) => s !== searchQuery);
      await AsyncStorage.setItem("@recent_searches", JSON.stringify(filtered));
      setRecentSearches(filtered);
    } catch (error) {
      console.error("Error clearing search:", error);
    }
  };

  const fetchTrendingProducts = async (
    page: number = 1,
    append: boolean = false
  ) => {
    try {
      if (append) {
        setLoadingMoreProducts(true);
      }

      const response = await fetch(
        `${API_URL}/api/public/products?page=${page}&limit=10&sortBy=orders&sortOrder=desc&isAvailable=true`
      );

      if (response.ok) {
        const data = await response.json();

        // Transform API data - API returns products in 'data.data' array
        const transformedProducts =
          data.data?.map((product: any) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            discountedPrice: product.discountedPrice || undefined,
            imageUrl:
              product.imageUrl ||
              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
            shopName: product.shop?.name || "Local Shop",
          })) || [];

        if (append) {
          setTrendingProducts((prev) => [...prev, ...transformedProducts]);
        } else {
          setTrendingProducts(transformedProducts);
        }

        // Check if there's more data
        setHasMoreProducts(data.pagination?.hasMore || false);
      } else {
        if (!append) {
          setTrendingProducts([]);
        }
      }
    } catch (error) {
      console.error("Error fetching trending products:", error);
      if (!append) {
        setTrendingProducts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMoreProducts(false);
    }
  };

  // const fetchTrendingMeals = async (
  //   page: number = 1,
  //   append: boolean = false
  // ) => {
  //   try {
  //     if (append) {
  //       setLoadingMoreMeals(true);
  //     }

  //     // Fetch menu items directly from the menu-items endpoint
  //     const menuResponse = await fetch(
  //       `${API_URL}/api/menu-items?page=${page}&limit=10&sortBy=orders&sortOrder=desc`
  //     );

  //     if (menuResponse.ok) {
  //       const menuData = await menuResponse.json();

  //       // Transform menu items
  //       const transformedMeals =
  //         menuData.data?.map((item: any) => ({
  //           id: item.id,
  //           name: item.name,
  //           price: item.price,
  //           imageUrl:
  //             item.imageUrl ||
  //             "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
  //           restaurantName:
  //             item.restaurant?.name ||
  //             item.menu?.restaurant?.name ||
  //             "Restaurant",
  //           rating: item.rating || 4.5,
  //         })) || [];

  //       if (append) {
  //         setTrendingMeals((prev) => [...prev, ...transformedMeals]);
  //       } else {
  //         setTrendingMeals(transformedMeals);
  //       }

  //       // Check if there's more data
  //       setHasMoreMeals(menuData.pagination?.hasMore || false);
  //     } else {
  //       if (!append) {
  //         setTrendingMeals([]);
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Error fetching trending meals:", error);
  //     if (!append) {
  //       setTrendingMeals([]);
  //     }
  //   } finally {
  //     setLoadingMoreMeals(false);
  //   }
  // };

  // Handle category navigation
  const handleCategoryPress = (categoryId: string, categoryName: string) => {
    if (categoryId === "all") {
      router.push("/AllCategoriesPage");
    } else {
      router.push({
        pathname: "/CategoryDetailsPage",
        params: { categoryId, categoryName },
      });
    }
  };

  const handleSearchPress = (query: string) => {
    saveRecentSearch(query);
    setSearchText(query);
    setSearchModalVisible(true);
  };

  // Cart handlers
  const handleAddToCart = (product: UniversalProduct) => {
    setCart((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1,
    }));
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[productId] > 1) {
        newCart[productId] -= 1;
      } else {
        delete newCart[productId];
      }
      return newCart;
    });
  };

  const renderTrendingItem = ({ item }: { item: TrendingProduct }) => {
    // Transform to UniversalProduct format
    const product: UniversalProduct = {
      id: parseInt(item.id) || 0,
      name: item.name,
      price: item.price,
      image: item.imageUrl,
      description: item.shopName || "",
      inStock: true,
    };

    return (
      <View style={{ width: 180, marginRight: 12 }}>
        <ProductCard
          product={product}
          cartQuantity={cart[product.id] || 0}
          onAddToCart={handleAddToCart}
          onRemoveFromCart={() => handleRemoveFromCart(product.id)}
          onPress={() => {
            // Navigate to product details
            console.log("Product pressed:", item.name);
          }}
          cardWidth={180}
        />
      </View>
    );
  };

  const renderMealItem = ({ item }: { item: TrendingMeal }) => {
    // Transform to UniversalProduct format
    const meal: UniversalProduct = {
      id: parseInt(item.id) || 0,
      name: item.name,
      price: item.price,
      image: item.imageUrl,
      description: item.restaurantName || "",
      inStock: true,
    };

    return (
      <View style={{ width: 180, marginRight: 12 }}>
        <MealItemCard
          product={meal}
          cartQuantity={cart[meal.id] || 0}
          onAddToCart={handleAddToCart}
          onRemoveFromCart={() => handleRemoveFromCart(meal.id)}
          onPress={() => {
            // Navigate to meal details
            console.log("Meal pressed:", item.name);
          }}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Sticky SearchBar */}
      <Animated.View
        style={[
          styles.stickySearchBar,
          {
            opacity: showStickySearchBar,
          },
        ]}
      >
        <View style={{ flex: 1, marginBottom: 10 }}>
          <SearchBar
            onChangeText={(text) => setSearchText(text)}
            value={searchText}
            onPress={() => setSearchModalVisible(true)}
            editable={false}
            fullWidth={true}
          />
        </View>
        <Cart />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PrimaryColor]}
            tintColor={PrimaryColor}
          />
        }
      >
        {/* Browse Page Search Bar */}
        <SearchBar
          onChangeText={(text) => setSearchText(text)}
          value={searchText}
          onPress={() => setSearchModalVisible(true)}
          editable={false}
        />

        {/* Welcome Section */}
        <LinearGradient
          colors={[PrimaryColor, "#FF8C42"]}
          style={styles.welcomeSection}
        >
          <Text style={styles.welcomeTitle}>
            Explore Teran<Text style={styles.welcomeAccent}>GO</Text> 🇬🇲
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Find the best meals, groceries, and fresh produce near you —
            delivered quickly, safely, and with love across The Gambia.
          </Text>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickAction}>
            <View
              style={[styles.quickActionIcon, { backgroundColor: "#10B981" }]}
            >
              <Ionicons name="flash" size={24} color="#fff" />
            </View>
            <Text style={styles.quickActionText}>Flash Deals</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View
              style={[styles.quickActionIcon, { backgroundColor: "#F59E0B" }]}
            >
              <Ionicons name="star" size={24} color="#fff" />
            </View>
            <Text style={styles.quickActionText}>Top Rated</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View
              style={[styles.quickActionIcon, { backgroundColor: "#EF4444" }]}
            >
              <Ionicons name="pricetag" size={24} color="#fff" />
            </View>
            <Text style={styles.quickActionText}>Best Offers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View
              style={[styles.quickActionIcon, { backgroundColor: "#8B5CF6" }]}
            >
              <Ionicons name="gift" size={24} color="#fff" />
            </View>
            <Text style={styles.quickActionText}>Rewards</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <TouchableOpacity
                onPress={() => {
                  AsyncStorage.removeItem("@recent_searches");
                  setRecentSearches([]);
                }}
              >
                <Text style={styles.sectionAction}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.recentSearchesContainer}
            >
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentSearchChip}
                  onPress={() => handleSearchPress(search)}
                >
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.recentSearchText}>{search}</Text>
                  <TouchableOpacity
                    onPress={() => clearRecentSearch(search)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories Grid - Main Focus */}
        <CategoryGrid onCategoryPress={handleCategoryPress} />

        {/* Trending Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🛒 Trending Products</Text>
            <TouchableOpacity>
              <Text style={styles.sectionAction}>See All</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <TrendingSkeleton count={3} />
          ) : (
            <FlatList
              data={trendingProducts}
              renderItem={renderTrendingItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingContainer}
              onEndReached={loadMoreProducts}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingMoreProducts ? (
                  <View
                    style={{
                      width: 50,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <ActivityIndicator size="small" color={PrimaryColor} />
                  </View>
                ) : null
              }
            />
          )}
        </View>

        {/* Trending Meals */}
        {/* <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🍽️ Trending Meals</Text>
            <TouchableOpacity>
              <Text style={styles.sectionAction}>See All</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <TrendingSkeleton count={3} />
          ) : (
            <FlatList
              data={trendingMeals}
              renderItem={renderMealItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingContainer}
              onEndReached={loadMoreMeals}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingMoreMeals ? (
                  <View
                    style={{
                      width: 50,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <ActivityIndicator size="small" color={PrimaryColor} />
                  </View>
                ) : null
              }
            />
          )}
        </View> */}

        {/* Advertisement Banner */}
        <AdBanner
          title="🌟 Discover Local Treasures"
          buttonText="Explore Now"
          backgroundColor="#27AE60"
          onPress={() => console.log("Explore local treasures")}
        />

        {/* Restaurants Near You */}
        <RestaurantNearYou />

        {/* Local Shops - Quality products near you */}
        <LocalShops />

        {/* Advertisement Banner */}
        <AdBanner
          title="🔥 Weekly Special Offers"
          buttonText="View Deals"
          backgroundColor="#E74C3C"
          onPress={() => console.log("View weekly deals")}
        />
      </Animated.ScrollView>

      {/* Search Modal */}
      <SearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        initialQuery={searchText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  stickySearchBar: {
    position: "absolute",
    top: 40,
    zIndex: 1000,
    backgroundColor: "#fff",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: width,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginHorizontal: 16,
    borderRadius: 20,
    marginTop: 10,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  welcomeAccent: {
    fontWeight: "bold",
    color: "#fff",
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 24,
    opacity: 0.95,
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  quickAction: {
    alignItems: "center",
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: "600",
    color: PrimaryColor,
  },
  recentSearchesContainer: {
    marginTop: 8,
  },
  recentSearchChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  recentSearchText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  trendingContainer: {
    paddingRight: 16,
  },
  trendingCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  trendingImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#F3F4F6",
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
    fontWeight: "bold",
  },
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  trendingInfo: {
    padding: 10,
  },
  trendingName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  trendingShop: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  trendingPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: PrimaryColor,
  },
  favoritesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
  },
  favoriteCard: {
    width: (width - 48) / 2,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteImage: {
    width: "100%",
    height: 120,
  },
  favoriteText: {
    padding: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
  },
});
