import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Platform,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { API_URL } from "@/constants/config";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import { OpeningHours } from "@/lib/api";
import {
  getOperatingStatus,
  formatDayLabel,
  formatTimeLabel,
} from "@/utils/openingHours";
import MealItemCard from "@/components/common/MealItemCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { MEAL_TIMES } from "@/constants/MealTimes";

const HEADER_HEIGHT = 300;
const STICKY_HEADER_HEIGHT = Platform.OS === "ios" ? 100 : 84;
const STATUS_BAR_HEIGHT =
  Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24;
// Extra top padding so header controls sit lower when not scrolled
const HEADER_TOP_PADDING = Platform.OS === "ios" ? 12 : 8;

// (category icon helper removed - unused)

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
      <View style={styles.heroContainer}>
        <View style={styles.heroImagePlaceholder}>
          <Ionicons name="restaurant" size={60} color="#ccc" />
          <Text style={{ color: "#888", marginTop: 8, fontSize: 14 }}>
            Restaurant image loading...
          </Text>
        </View>

        {/* Header buttons skeleton */}
        <View style={styles.heroHeaderButtons}>
          <View style={styles.heroBackButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </View>
          <View style={styles.heroCartButton}>
            <Ionicons name="cart-outline" size={22} color="#fff" />
          </View>
        </View>

        <View style={styles.overlayCard}>
          <View style={styles.titleRow}>
            <SkeletonLoader
              width="80%"
              height={28}
              style={{
                marginBottom: 0,
                backgroundColor: "#E0E0E0",
              }}
            />
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: "#F3F4F6", marginTop: 6 },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: "#10B981" }]}
              />
              <Text style={[styles.statusText, { color: "#111" }]}>
                Open Now
              </Text>
            </View>
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <SkeletonLoader
              width={40}
              height={16}
              style={{
                marginLeft: 4,
                backgroundColor: "#E0E0E0",
              }}
            />
          </View>
          <SkeletonLoader
            width="100%"
            height={16}
            style={{
              marginTop: 4,
              backgroundColor: "#E0E0E0",
            }}
          />
          <SkeletonLoader
            width="70%"
            height={14}
            style={{
              marginTop: 2,
              backgroundColor: "#E0E0E0",
            }}
          />
        </View>
      </View>

      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBarContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={{ marginRight: 8 }}
          />
          <SkeletonLoader
            width="100%"
            height={16}
            style={{
              backgroundColor: "#E0E0E0",
            }}
          />
        </View>
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
  discountedPrice?: number;
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
  openingHours?: OpeningHours | null;
  acceptsOrders?: boolean;
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
  const { addToCart, cartItems, removeFromCart, updateQuantity } = useCart();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("all");
  const [scrollY] = useState(new Animated.Value(0));
  const [cartPulse] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [imageLoadErrors, setImageLoadErrors] = useState<{
    [key: string]: boolean;
  }>({});
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  // Debounce search text
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchText]);

  // All menu items (flat list)
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const sectionRefs = useRef<{ key: string; y: number }[]>([]);

  const handleTabPress = (categoryId: string) => {
    // only set the active filter; do not auto-scroll
    setActiveSection(categoryId);
  };

  // Get meal time categories that have at least one item
  const getAvailableMealTimes = () => {
    // Always include "All" tab
    const availableTabs = [MEAL_TIMES[0]]; // "All" tab

    // Check each meal time category
    MEAL_TIMES.slice(1).forEach((mealTime) => {
      const hasItems = allMenuItems.some(
        (item) => item.mealTime?.toLowerCase() === mealTime.name.toLowerCase(),
      );
      if (hasItems) {
        availableTabs.push(mealTime);
      }
    });

    return availableTabs;
  };

  // Filter menu items by selected meal time and search text
  const getFilteredMenuItems = (): { [key: string]: MenuItem[] } => {
    const itemsToFilter =
      debouncedSearchText.length > 0
        ? allMenuItems.filter((item) =>
            item.name.toLowerCase().includes(debouncedSearchText.toLowerCase())
          )
        : allMenuItems;

    if (activeSection === "all") {
      // Group all items by their meal time
      const grouped: { [key: string]: MenuItem[] } = {};
      itemsToFilter.forEach((item) => {
        const mealTime =
          item.mealTime || "Main Course" || "Breakfast" || "Lunch" || "Dinner";
        if (!grouped[mealTime]) {
          grouped[mealTime] = [];
        }
        grouped[mealTime].push(item);
      });
      return grouped;
    } else {
      // Show only items matching the selected meal time
      const mealTimeCategory = MEAL_TIMES.find((mt) => mt.id === activeSection);
      if (!mealTimeCategory) return {};

      const filtered = itemsToFilter.filter(
        (item) =>
          item.mealTime?.toLowerCase() === mealTimeCategory.name.toLowerCase()
      );

      return filtered.length > 0 ? { [mealTimeCategory.name]: filtered } : {};
    }
  };

  const fetchRestaurantDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/api/restaurants/${restaurantId}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch restaurant: ${response.statusText}`);
      }

      const data = await response.json();

      setRestaurant(data);

      // Flatten all menu items into a single array (filter out unavailable items)
      const allItems: MenuItem[] = [];
      data.menus?.forEach((menu: Menu) => {
        menu.items?.forEach((item: MenuItem) => {
          // Only show items that are available (isAvailable is true or undefined/null)
          if (item.isAvailable !== false) {
            allItems.push(item);
          }
        });
      });

      setAllMenuItems(allItems);

      // Default to showing all sections
      setActiveSection("all");
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

  const getCartItemQuantity = (itemId: string): number => {
    const item = cartItems.find((cartItem) => cartItem.id === itemId);
    return item ? item.quantity : 0;
  };

  const getTotalCartItems = (): number => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalCartPrice = (): number => {
    return cartItems.reduce((total, item) => {
      // Use discounted price if available, otherwise use regular price
      const itemPrice = item.discountedPrice || item.price;
      return total + itemPrice * item.quantity;
    }, 0);
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

  const operatingStatus = useMemo(
    () =>
      getOperatingStatus({
        openingHours: restaurant?.openingHours || undefined,
        isActive: restaurant?.isActive,
        acceptsOrders: restaurant?.acceptsOrders,
      }),
    [restaurant?.openingHours, restaurant?.isActive, restaurant?.acceptsOrders],
  );

  const isOpen = operatingStatus.isOpen;
  const statusTheme = isOpen
    ? {
        label: "Open now",
        badge: "Open",
        color: "rgba(16,185,129,0.95)",
      }
    : operatingStatus.reason === "inactive"
      ? {
          label: "Offline",
          badge: "Offline",
          color: "rgba(107,114,128,0.95)",
        }
      : operatingStatus.reason === "not_accepting_orders"
        ? {
            label: "Paused",
            badge: "Paused",
            color: "rgba(234,179,8,0.95)",
          }
        : {
            label: "Closed",
            badge: "Closed",
            color: "rgba(239,68,68,0.95)",
          };

  const nextOpeningText =
    !isOpen && operatingStatus.nextOpening
      ? `Opens ${formatDayLabel(
          operatingStatus.nextOpening.day,
        )} ${formatTimeLabel(operatingStatus.nextOpening.time)}`
      : null;

  const closesAtText =
    isOpen && operatingStatus.closesAt
      ? `Closes ${formatDayLabel(
          operatingStatus.closesAt.day,
        )} ${formatTimeLabel(operatingStatus.closesAt.time)}`
      : null;

  const statusMetaText = isOpen ? closesAtText : nextOpeningText;
  const statusMetaTextClean = statusMetaText
    ? statusMetaText.replace(/\s+/g, " ").trim()
    : undefined;

  const orderingDisabled = !isOpen;

  const orderingDisabledMessage = useMemo(() => {
    if (!orderingDisabled) {
      return undefined;
    }

    switch (operatingStatus.reason) {
      case "inactive":
        return "This restaurant is offline right now.";
      case "not_accepting_orders":
        return "This restaurant has paused new orders.";
      default:
        return statusMetaTextClean
          ? `This restaurant is closed. ${statusMetaTextClean}.`
          : "This restaurant is currently closed.";
    }
  }, [orderingDisabled, operatingStatus.reason, statusMetaTextClean]);

  const handleAddAttemptBlocked = useCallback(() => {
    if (!orderingDisabled) {
      return;
    }

    const message =
      orderingDisabledMessage ||
      "This restaurant is not accepting orders at the moment.";

    Alert.alert("Ordering unavailable", message);
  }, [orderingDisabled, orderingDisabledMessage]);

  const handleAddToCart = useCallback(
    (item: MenuItem) => {
      if (!restaurant) {
        return;
      }

      if (orderingDisabled) {
        handleAddAttemptBlocked();
        return;
      }

      const cartItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        discountedPrice: item.discountedPrice,
        description: item.description || "",
        vendorId: restaurant.id,
        vendorName: restaurant.name,
        imageUrl: item.imageUrl || "",
        entityType: "restaurant",
      };

      addToCart(cartItem);

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
    },
    [
      addToCart,
      cartPulse,
      handleAddAttemptBlocked,
      orderingDisabled,
      restaurant,
    ],
  );

  const handleRemove = useCallback(
    (productId: string) => {
      const cartItem = cartItems.find((item) => item.id === productId);
      if (cartItem && cartItem.quantity > 1) {
        updateQuantity(productId, cartItem.quantity - 1);
      } else {
        removeFromCart(productId);
      }
    },
    [cartItems, removeFromCart, updateQuantity],
  );

  const stickySubtitleParts = [statusTheme.label];
  if (statusMetaText) {
    stickySubtitleParts.push(statusMetaText);
  }
  stickySubtitleParts.push("Restaurant");
  const stickySubtitle = stickySubtitleParts.join(" • ");

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

      {/* Sticky Header (shop-style) */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.stickyHeaderContent}>
          <TouchableOpacity
            style={styles.stickyHeaderBackButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <View style={styles.stickyHeaderTitleContainer}>
            <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <Text style={styles.stickyHeaderSubtitle} numberOfLines={1}>
              {stickySubtitle}
            </Text>
          </View>

          <View style={styles.stickyHeaderActions}>
            <TouchableOpacity
              style={styles.stickyHeaderButton}
              onPress={() => router.push("/cart")}
            >
              <Ionicons name="cart-outline" size={22} color="#000" />
              {getTotalCartItems() > 0 && (
                <View style={styles.stickyCartBadge}>
                  <Text style={styles.stickyCartBadgeText}>
                    {getTotalCartItems()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section - Modern Design */}
        <View style={styles.heroContainer}>
          {/* Restaurant Background Image */}
          {restaurant.imageUrl && !imageLoadErrors[`hero-${restaurant.id}`] ? (
            <Image
              source={{ uri: restaurant.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
              onError={() => handleImageError(`hero-${restaurant.id}`)}
            />
          ) : (
            <View style={styles.heroImagePlaceholder}>
              <Ionicons name="restaurant" size={60} color="#ccc" />
              <Text style={{ color: "#888", marginTop: 8, fontSize: 14 }}>
                Restaurant image unavailable
              </Text>
            </View>
          )}

          {/* Gradient Overlay for better text visibility */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={styles.imageGradient}
          />

          {/* Header buttons on top of image */}
          <View style={styles.heroHeaderButtons}>
            <TouchableOpacity
              style={styles.heroBackButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerRightButtons}>
              {/* Open/Closed Badge */}
              <View
                style={[
                  styles.statusBadgeHeader,
                  {
                    backgroundColor: statusTheme.color,
                  },
                ]}
                accessibilityLabel={`Restaurant is ${statusTheme.badge.toLowerCase()}`}
                accessibilityHint={
                  nextOpeningText
                    ? `${statusTheme.badge}. ${nextOpeningText}.`
                    : closesAtText
                      ? `${statusTheme.badge}. ${closesAtText}.`
                      : undefined
                }
              >
                <View
                  style={[
                    styles.statusDotHeader,
                    {
                      backgroundColor: "#fff",
                    },
                  ]}
                />
                <View>
                  <Text style={styles.statusTextHeader}>
                    {statusTheme.badge}
                  </Text>
                  {isOpen && closesAtText && (
                    <Text style={styles.statusTextSubHeader}>
                      {closesAtText}
                    </Text>
                  )}
                  {!isOpen && nextOpeningText && (
                    <Text style={styles.statusTextSubHeader}>
                      {nextOpeningText}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.heroCartButton}
                onPress={() => router.push("/cart")}
              >
                <Ionicons name="cart-outline" size={22} color="#fff" />
                {getTotalCartItems() > 0 ? (
                  <View style={styles.heroCartBadge}>
                    <Text style={styles.heroCartBadgeText}>
                      {getTotalCartItems()}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>

          {/* Restaurant Info at Bottom of Image */}
          <View style={styles.heroInfoContainer}>
            <View style={styles.heroInfoContent}>
              {/* Restaurant Name */}
              <Text style={styles.restaurantNameHero}>{restaurant.name}</Text>

              {/* Rating & Reviews */}
              {restaurant.rating ? (
                <View style={styles.ratingRowHero}>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color="#FFC107" />
                    <Text style={styles.ratingTextHero}>
                      {restaurant.rating.toFixed(1)}
                    </Text>
                  </View>
                  {restaurant.totalReviews ? (
                    <Text style={styles.reviewCountHero}>
                      {restaurant.totalReviews} reviews
                    </Text>
                  ) : null}
                  {restaurant.address ? (
                    <>
                      <Text style={styles.dotSeparator}>•</Text>
                      <Text style={styles.addressHero} numberOfLines={1}>
                        {restaurant.address}
                      </Text>
                    </>
                  ) : null}
                </View>
              ) : null}

              {/* Description */}
              {restaurant.description ? (
                <Text style={styles.restaurantDescHero} numberOfLines={2}>
                  {restaurant.description}
                </Text>
              ) : null}

              {(closesAtText || nextOpeningText) && (
                <Text style={styles.statusMetaTextHero} numberOfLines={2}>
                  {closesAtText || nextOpeningText}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBarContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#999"
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search in ${restaurant.name}`}
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>
        {orderingDisabled && (
          <View style={styles.orderingDisabledBanner}>
            <Ionicons name="alert-circle" size={20} color="#f97316" />
            <View style={styles.orderingDisabledBannerTextContainer}>
              <Text style={styles.orderingDisabledBannerTitle}>
                Ordering unavailable
              </Text>
              {orderingDisabledMessage ? (
                <Text style={styles.orderingDisabledBannerSubtitle}>
                  {orderingDisabledMessage}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Professional Meal Time Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {getAvailableMealTimes().map((mealTime) => (
              <TouchableOpacity
                key={mealTime.id}
                style={[
                  styles.tabButton,
                  activeSection === mealTime.id && styles.tabButtonActive,
                ]}
                onPress={() => handleTabPress(mealTime.id)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeSection === mealTime.id && styles.tabTextActive,
                  ]}
                >
                  {mealTime.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Menu Items - Grouped by Meal Time */}
        <Animated.View style={[styles.menuContainer, { opacity: fadeAnim }]}>
          {Object.entries(getFilteredMenuItems()).length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="restaurant-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No items found</Text>
              <Text style={styles.emptyStateText}>
                There are no menu items available for the selected category.
              </Text>
            </View>
          ) : (
            Object.entries(getFilteredMenuItems()).map(
              ([category, items], idx) => (
                <View
                  key={category}
                  style={styles.menuSection}
                  onLayout={(e) => {
                    const layoutY = e.nativeEvent.layout.y;
                    sectionRefs.current[idx] = { key: category, y: layoutY };
                  }}
                >
                  <Text style={styles.menuSectionTitle}>{category}</Text>
                  {items.length === 0 ? (
                    <View style={styles.emptyCategoryContainer}>
                      <Ionicons
                        name="fast-food-outline"
                        size={48}
                        color="#ccc"
                      />
                      <Text style={styles.emptyCategoryText}>
                        No items available in this category
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.menuItemsList}>
                      {items.map((item: MenuItem, j: number) => (
                        <MealItemCard
                          key={item.id}
                          product={{
                            id:
                              typeof item.id === "number"
                                ? item.id
                                : Number(item.id) || j,
                            name: item.name,
                            price: item.price,
                            discountedPrice: item.discountedPrice,
                            image: item.imageUrl || undefined,
                            description: item.description || undefined,
                          }}
                          cartQuantity={getCartItemQuantity(item.id)}
                          onAddToCart={() => handleAddToCart(item)}
                          onRemoveFromCart={() => handleRemove(item.id)}
                          onPress={() =>
                            router.push({
                              pathname: "/menuitem/[menuitem]",
                              params: { menuitem: item.id },
                            })
                          }
                          orderingDisabled={orderingDisabled}
                          disabledReason={orderingDisabledMessage}
                          onAddDisabledPress={handleAddAttemptBlocked}
                        />
                      ))}
                    </View>
                  )}
                </View>
              ),
            )
          )}
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
    backgroundColor: "#fff",
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  stickyHeaderGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + HEADER_TOP_PADDING,
  },
  stickyHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    height: 300,
    position: "relative",
    backgroundColor: "#f5f5f5",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f5f5f5",
  },
  heroImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
  heroHeaderButtons: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 8,
    zIndex: 10,
  },
  headerRightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  heroCartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  heroCartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: PrimaryColor,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  heroCartBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  statusBadgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusDotHeader: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  statusTextSubHeader: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
  },
  heroInfoContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  heroInfoContent: {
    gap: 8,
  },
  restaurantNameHero: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  ratingRowHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingTextHero: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  reviewCountHero: {
    fontSize: 13,
    fontWeight: "500",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dotSeparator: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "bold",
  },
  addressHero: {
    fontSize: 13,
    fontWeight: "500",
    color: "#fff",
    flex: 1,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  restaurantDescHero: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.95)",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statusMetaTextHero: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  overlayCard: {
    display: "none", // Not used in new design
  },
  statusBadgeTopRight: {
    display: "none", // Not used in new design
  },
  ratingRow: {
    display: "none", // Not used in new design
  },
  ratingText: {
    display: "none", // Not used in new design
  },
  reviewCount: {
    display: "none", // Not used in new design
  },
  restaurantDesc: {
    display: "none", // Not used in new design
  },
  addressRow: {
    display: "none", // Not used in new design
  },
  restaurantAddress: {
    display: "none", // Not used in new design
  },
  titleRow: {
    display: "none", // Not used in new design
  },
  searchBarWrapper: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
  },
  orderingDisabledBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fed7aa",
    backgroundColor: "#fff7ed",
    marginHorizontal: 20,
    marginBottom: 18,
    gap: 12,
  },
  orderingDisabledBannerTextContainer: {
    flex: 1,
  },
  orderingDisabledBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 4,
  },
  orderingDisabledBannerSubtitle: {
    fontSize: 14,
    color: "#b45309",
    lineHeight: 18,
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
    paddingTop: 10,
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
    backgroundColor: PrimaryColor,
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
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 28,
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
    backgroundColor: "#FFFFFF",
    paddingTop: 20,
    paddingBottom: 120,
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
    padding: 10,
    paddingTop: 10,
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
    // marginVertical: 2,
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
  // Tabs (Uber Eats style)
  tabsContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
    paddingVertical: 10,
  },
  tabsContent: {
    paddingHorizontal: 12,
    alignItems: "center",
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 18,
    backgroundColor: "#F8F9FA",
  },
  tabButtonActive: {
    backgroundColor: PrimaryColor,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#fff",
  },
  menuItemsList: {
    // no horizontal padding so item cards can span full width
  },
  // Shop-style sticky header styles
  stickyHeaderContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_HEIGHT + HEADER_TOP_PADDING,
    paddingBottom: 12,
  },
  stickyHeaderBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stickyHeaderTitleContainer: {
    flex: 1,
    justifyContent: "center",
  },
  stickyHeaderSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 1,
    fontWeight: "500",
  },
  stickyHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  stickyHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  stickyCartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: PrimaryColor,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  stickyCartBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyCategoryContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyCategoryText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 12,
  },
});
