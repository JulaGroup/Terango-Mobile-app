import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  // Image removed, now handled by ProductCard
  FlatList,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { API_URL } from "@/constants/config";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/common/ProductCard";

const HEADER_HEIGHT = 300;
const STICKY_HEADER_HEIGHT = 80;

// Helper function to get category icons
const getCategoryIcon = (category: string): any => {
  const categoryLower = category.toLowerCase();
  if (
    categoryLower.includes("appetizer") ||
    categoryLower.includes("starter")
  ) {
    return "leaf";
  } else if (
    categoryLower.includes("main") ||
    categoryLower.includes("entree")
  ) {
    return "restaurant";
  } else if (
    categoryLower.includes("dessert") ||
    categoryLower.includes("sweet")
  ) {
    return "ice-cream";
  } else if (
    categoryLower.includes("drink") ||
    categoryLower.includes("beverage")
  ) {
    return "wine";
  } else if (categoryLower.includes("pizza")) {
    return "pizza";
  } else if (
    categoryLower.includes("burger") ||
    categoryLower.includes("sandwich")
  ) {
    return "fast-food";
  } else if (categoryLower.includes("salad")) {
    return "nutrition";
  } else if (categoryLower.includes("soup")) {
    return "cafe";
  } else {
    return "restaurant-outline";
  }
};

// Skeleton Loader Component for Restaurant Details
const SkeletonLoader = ({
  width: skeletonWidth,
  height,
  style,
}: {
  width: number | string;
  height: number;
  style?: any;
}) => {
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
        {
          width: skeletonWidth,
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

// Restaurant Details Skeleton
const RestaurantDetailsSkeleton = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Hero Section Skeleton */}
      <View style={[styles.heroSection, { backgroundColor: "#f0f0f0" }]}>
        <LinearGradient
          colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.7)"]}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            {/* Navigation */}
            <View style={styles.heroNavigation}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </View>

              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="cart" size={24} color="#fff" />
              </View>
            </View>

            {/* Restaurant Info Skeleton */}
            <View style={styles.restaurantInfo}>
              <SkeletonLoader
                width="80%"
                height={28}
                style={{
                  marginBottom: 8,
                  backgroundColor: "rgba(255,255,255,0.3)",
                }}
              />
              <SkeletonLoader
                width="100%"
                height={16}
                style={{
                  marginBottom: 4,
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              />
              <SkeletonLoader
                width="70%"
                height={16}
                style={{
                  marginBottom: 16,
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              />

              {/* Meta info skeleton */}
              <View style={{ flexDirection: "row", marginBottom: 16 }}>
                <SkeletonLoader
                  width={80}
                  height={14}
                  style={{
                    marginRight: 20,
                    backgroundColor: "rgba(255,255,255,0.2)",
                  }}
                />
                <SkeletonLoader
                  width={100}
                  height={14}
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                />
              </View>

              <SkeletonLoader
                width={100}
                height={32}
                style={{
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Categories Skeleton */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
        >
          <SkeletonLoader
            width={80}
            height={40}
            style={{ marginRight: 12, borderRadius: 20 }}
          />
          <SkeletonLoader
            width={100}
            height={40}
            style={{ marginRight: 12, borderRadius: 20 }}
          />
          <SkeletonLoader
            width={90}
            height={40}
            style={{ marginRight: 12, borderRadius: 20 }}
          />
        </ScrollView>
      </View>

      {/* Menu Items Skeleton */}
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <SkeletonLoader width="60%" height={22} style={{ marginBottom: 16 }} />
        {/* Menu Item Skeletons */}
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.productCard}>
            <View style={styles.productInfo}>
              <View style={styles.productName}>
                <SkeletonLoader
                  width="80%"
                  height={16}
                  style={{ marginBottom: 4 }}
                />
                <SkeletonLoader
                  width="100%"
                  height={12}
                  style={{ marginBottom: 4 }}
                />
                <SkeletonLoader
                  width="60%"
                  height={12}
                  style={{ marginBottom: 8 }}
                />
                <SkeletonLoader width="40%" height={16} />
              </View>

              <View style={styles.productImageContainer}>
                <SkeletonLoader
                  width={100}
                  height={100}
                  style={{ borderRadius: 16, marginBottom: 8 }}
                />
                <SkeletonLoader
                  width={36}
                  height={36}
                  style={{ borderRadius: 18 }}
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
  imageUrl?: string;
  mealTime?: string;
}

interface Menu {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
}

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  minimumOrderAmount?: number;
  rating?: number;
  totalReviews?: number;
  openingHours?: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  service: {
    id: string;
    name: string;
    type: string;
    category: {
      name: string;
    };
  };
  menus: Menu[];
}

export default function RestaurantDetails() {
  const router = useRouter();
  const { restaurantId } = useLocalSearchParams();
  const { addToCart, cartItems, removeFromCart } = useCart();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("");
  const [scrollY] = useState(new Animated.Value(0));
  const [cartPulse] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [imageLoadErrors, setImageLoadErrors] = useState<{
    [key: string]: boolean;
  }>({});

  // Group menu items by meal time
  const [groupedMenuItems, setGroupedMenuItems] = useState<{
    [key: string]: MenuItem[];
  }>({});

  const fetchRestaurantDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/api/restaurants/${restaurantId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch restaurant: ${response.statusText}`);
      }

      const data = await response.json();

      setRestaurant(data);
      // Group menu items by meal time
      const grouped: { [key: string]: MenuItem[] } = {};

      data.menus?.forEach((menu: Menu) => {
        menu.items?.forEach((item: MenuItem) => {
          const mealTime = item.mealTime || menu.name || "All Items";
          if (!grouped[mealTime]) {
            grouped[mealTime] = [];
          }
          grouped[mealTime].push(item);
        });
      });

      setGroupedMenuItems(grouped);

      // Set first section as active
      const firstSection = Object.keys(grouped)[1];
      if (firstSection) {
        setActiveSection("");
      }
    } catch (err: any) {
      console.error("Error fetching restaurant details:", err);
      setError(err.message || "Failed to load restaurant details");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantDetails();
    }
  }, [restaurantId, fetchRestaurantDetails]);

  // Fade in animation when restaurant data loads
  useEffect(() => {
    if (restaurant && !loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [restaurant, loading, fadeAnim]);

  // Pulse animation for cart button
  useEffect(() => {
    if (cartItems.length > 0) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(cartPulse, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(cartPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(() => pulse());
      };
      pulse();
    }
  }, [cartItems.length, cartPulse]);

  const handleAddToCart = (item: MenuItem) => {
    if (!restaurant) return;

    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      description: item.description || "",
      vendorId: restaurant.id,
      vendorName: restaurant.name,
      imageUrl: item.imageUrl || "",
      entityType: "restaurant",
    };

    addToCart(cartItem);

    // Enhanced cart animation feedback
    Animated.sequence([
      Animated.timing(cartPulse, {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cartPulse, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getCartItemQuantity = (itemId: string): number => {
    const item = cartItems.find((cartItem) => cartItem.id === itemId);
    return item ? item.quantity : 0;
  };

  const getTotalCartItems = (): number => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalCartPrice = (): number => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  const handleImageError = (imageId: string) => {
    setImageLoadErrors((prev) => ({
      ...prev,
      [imageId]: true,
    }));
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT * 0.7, HEADER_HEIGHT],
    outputRange: [0, 0.3, 1],
    extrapolate: "clamp",
  });

  const containerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT * 0.1],
    extrapolate: "clamp",
  });

  const imageScale = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [1, 1.1],
    extrapolate: "clamp",
  });

  const imageInnerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, HEADER_HEIGHT * 0.1],
    extrapolate: "clamp",
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT * 0.5, HEADER_HEIGHT],
    outputRange: [1, 0.8, 0.3],
    extrapolate: "clamp",
  });

  if (loading) {
    return <RestaurantDetailsSkeleton />;
  }

  if (error || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>
            {String(error) || "Restaurant not found"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchRestaurantDetails}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Sticky Header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={["rgba(0,0,0,0.8)", "rgba(0,0,0,0.4)"]}
          style={styles.stickyHeaderGradient}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
            {restaurant.name}
          </Text>

          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push("/cart")}
          >
            <Ionicons name="cart" size={24} color="#fff" />
            {getTotalCartItems() > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{getTotalCartItems()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              transform: [{ translateY: containerTranslateY }],
              opacity: heroOpacity,
            },
          ]}
        >
          {/* Restaurant Background Image */}
          {restaurant.imageUrl && !imageLoadErrors[`hero-${restaurant.id}`] ? (
            <Animated.Image
              source={{ uri: restaurant.imageUrl }}
              style={[
                styles.heroBackgroundImage,
                {
                  transform: [
                    { scale: imageScale },
                    { translateY: imageInnerTranslateY },
                  ],
                },
              ]}
              resizeMode="cover"
              onError={() => handleImageError(`hero-${restaurant.id}`)}
            />
          ) : (
            <View style={styles.heroBackgroundPlaceholder}>
              <Ionicons name="restaurant" size={60} color="#ccc" />
              <Text style={{ color: "#888", marginTop: 8, fontSize: 14 }}>
                Restaurant image unavailable
              </Text>
            </View>
          )}

          <LinearGradient
            colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.7)"]}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              {/* Navigation */}
              <View style={styles.heroNavigation}>
                <TouchableOpacity
                  style={styles.backButtonHero}
                  onPress={() => router.back()}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cartButtonHero}
                  onPress={() => router.push("/cart")}
                >
                  <Ionicons name="cart" size={24} color="#fff" />
                  {getTotalCartItems() > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>
                        {getTotalCartItems()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Restaurant Info */}
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{restaurant.name}</Text>
                <Text style={styles.restaurantDescription}>
                  {restaurant.description || "Delicious food made with love"}
                </Text>

                {/* Enhanced Restaurant Meta */}
                <View style={styles.restaurantMeta}>
                  {typeof restaurant.rating === "number" && (
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text style={styles.metaText}>
                        {restaurant.rating.toFixed(1)} (
                        {restaurant.totalReviews ?? 0} reviews)
                      </Text>
                    </View>
                  )}

                  {typeof restaurant.address === "string" && (
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="location"
                        size={16}
                        color="rgba(255,255,255,0.9)"
                      />
                      <Text style={styles.metaText}>
                        {typeof restaurant.city === "string"
                          ? `${restaurant.city}${
                              restaurant.state ? `, ${restaurant.state}` : ""
                            }`
                          : restaurant.address}
                      </Text>
                    </View>
                  )}

                  {restaurant.phone && (
                    <TouchableOpacity
                      style={styles.metaItem}
                      onPress={() => {
                        if (restaurant.phone) {
                          Linking.openURL(`tel:${restaurant.phone}`);
                        }
                      }}
                    >
                      <Ionicons
                        name="call"
                        size={16}
                        color="rgba(255,255,255,0.9)"
                      />
                      <Text style={styles.metaText}>{restaurant.phone}</Text>
                    </TouchableOpacity>
                  )}

                  {typeof restaurant.minimumOrderAmount === "number" &&
                    restaurant.minimumOrderAmount > 0 && (
                      <View style={styles.metaItem}>
                        <Ionicons
                          name="cash-outline"
                          size={16}
                          color="rgba(255,255,255,0.9)"
                        />
                        <Text style={styles.metaText}>
                          Min. order: D
                          {restaurant.minimumOrderAmount.toFixed(2)}
                        </Text>
                      </View>
                    )}
                </View>

                {/* Operating Status Badge */}
                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: restaurant.isActive
                          ? "#00C851"
                          : "#FF6B6B",
                      },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {restaurant.isActive ? "Open Now" : "Closed"}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Enhanced Menu Categories */}
        <View style={styles.categoriesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContent}
          >
            {/* All Categories Button */}
            <TouchableOpacity
              style={[
                styles.categoryButton,
                (!activeSection || activeSection === "") &&
                  styles.categoryButtonActive,
              ]}
              onPress={() => setActiveSection("")}
            >
              <View style={styles.categoryIconContainer}>
                <Ionicons
                  name="grid"
                  size={18}
                  color={
                    !activeSection || activeSection === "" ? "#fff" : "#007AFF"
                  }
                />
              </View>
              <Text
                style={[
                  styles.categoryButtonText,
                  (!activeSection || activeSection === "") &&
                    styles.categoryButtonTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {/* Individual Category Buttons with Icons */}
            {Object.keys(groupedMenuItems).map((category, index) => {
              const categoryIcon = getCategoryIcon(category);
              const itemCount = groupedMenuItems[category]?.length || 0;

              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    activeSection === category && styles.categoryButtonActive,
                  ]}
                  onPress={() => setActiveSection(category)}
                >
                  <View style={styles.categoryIconContainer}>
                    <Ionicons
                      name={categoryIcon}
                      size={18}
                      color={activeSection === category ? "#fff" : "#007AFF"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryButtonText,
                      activeSection === category &&
                        styles.categoryButtonTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{itemCount}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Menu Items - Horizontal Sliders per Category */}
        <Animated.View style={[styles.menuContainer, { opacity: fadeAnim }]}>
          {Object.entries(groupedMenuItems)
            .filter(
              ([category]) =>
                !activeSection ||
                activeSection === "" ||
                activeSection === category
            )
            .map(([category, items]) => (
              <View key={category} style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>{category}</Text>
                <FlatList
                  data={items}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 4 }}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => (
                    <View style={{ width: 200, marginRight: 6 }}>
                      <ProductCard
                        product={{
                          id:
                            typeof item.id === "number"
                              ? item.id
                              : Number(item.id) || index,
                          name: item.name,
                          price: item.price,
                          image: item.imageUrl || "",
                          description: item.description || "",
                          inStock: item.isAvailable,
                        }}
                        cartQuantity={getCartItemQuantity(item.id)}
                        onAddToCart={() => handleAddToCart(item)}
                        onRemoveFromCart={() => removeFromCart(item.id)}
                        onPress={() =>
                          router.push({
                            pathname: "/menuitem/[menuitem]",
                            params: { menuitem: item.id },
                          })
                        }
                      />
                    </View>
                  )}
                />
              </View>
            ))}
        </Animated.View>
      </Animated.ScrollView>

      {/* Floating Cart Summary */}
      {cartItems.length > 0 && (
        <Animated.View
          style={[
            styles.cartSummary,
            {
              transform: [{ scale: cartPulse }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.cartSummaryButton}
            onPress={() => {
              // Add haptic feedback here if needed
              router.push("/cart");
            }}
            activeOpacity={0.9}
          >
            <View style={styles.cartSummaryContainer}>
              <View style={styles.cartSummaryContent}>
                <View style={styles.cartIconContainer}>
                  <Ionicons name="cart" size={24} color="#fff" />
                  <View style={styles.cartItemsBadge}>
                    <Text style={styles.cartItemsCount}>
                      {getTotalCartItems()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cartTextContainer}>
                  <Text style={styles.cartItemsText}>
                    {getTotalCartItems()}{" "}
                    {getTotalCartItems() === 1 ? "item" : "items"}
                  </Text>
                  <Text style={styles.cartCheckoutText}>
                    Proceed to Checkout
                  </Text>
                </View>

                <View style={styles.cartPriceContainer}>
                  <Text style={styles.cartTotalPrice}>
                    D{getTotalCartPrice().toFixed(2)}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="rgba(255,255,255,0.8)"
                  />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
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
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: STICKY_HEADER_HEIGHT,
    zIndex: 1000,
  },
  stickyHeaderGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  stickyHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    height: HEADER_HEIGHT,
    backgroundColor: "#f0f0f0",
    justifyContent: "flex-end",
    position: "relative",
    overflow: "hidden",
  },
  heroBackgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  heroBackgroundPlaceholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  heroGradient: {
    flex: 1,
    justifyContent: "space-between",
  },
  heroContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  heroNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonHero: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cartButtonHero: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 12,
    fontWeight: "bold",
  },
  restaurantInfo: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  restaurantName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  restaurantDescription: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 16,
    lineHeight: 22,
  },
  restaurantMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
    marginBottom: 8,
  },
  metaText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(39, 174, 96, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#27AE60",
    marginRight: 6,
  },
  statusText: {
    color: "#27AE60",
    fontSize: 12,
    fontWeight: "600",
  },
  categoriesContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.06)",
    paddingBottom: 4,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: "#F8F9FA",
    marginRight: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    minHeight: 44,
  },
  categoryButtonActive: {
    backgroundColor: PrimaryColor,
    elevation: 6,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    borderColor: PrimaryColor,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 0.3,
  },
  categoryButtonTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  menuContainer: {
    padding: 24,
    paddingTop: 16,
  },
  menuSection: {
    marginBottom: 40,
  },
  menuSectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    letterSpacing: -0.5,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: PrimaryColor,
    alignSelf: "flex-start",
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    marginVertical: 2,
    boxShadow:
      " rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgb(209, 213, 219) 0px 0px 0px 1px inset",
  },
  productImageContainer: {
    width: "100%",
    height: 140,
    position: "relative",
    overflow: "hidden",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  productImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F8F8F8",
  },
  productImagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
    lineHeight: 20,
  },
  productDescription: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
    lineHeight: 16,
  },
  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: PrimaryColor,
    letterSpacing: -0.5,
  },
  actionButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PrimaryColor,
    borderRadius: 14,
    paddingHorizontal: 2,
    paddingVertical: 2,
    elevation: 2,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PrimaryColor,
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
  unavailableOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    backdropFilter: "blur(2px)",
  },
  unavailableText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EF4444",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  cartSummary: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  cartSummaryButton: {
    borderRadius: 28,
    elevation: 16,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  cartSummaryContainer: {
    backgroundColor: "#1F2937",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
  },
  cartSummaryContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cartIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PrimaryColor,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginRight: 16,
    elevation: 4,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cartItemsBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1F2937",
  },
  cartItemsCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  cartTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  cartItemsText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  cartCheckoutText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cartPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  cartTotalPrice: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginRight: 8,
  },

  // Enhanced Category Styles
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryIconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  categoryBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  categoryBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
});
