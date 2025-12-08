import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  FlatList,
  Platform,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, router } from "expo-router";
import VendorAwareProductCard from "@/components/common/VendorAwareProductCard";
import { API_URL } from "@/constants/config";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
// Removed unused import: Category
import { SafeAreaView } from "react-native-safe-area-context";
import { OpeningHours } from "@/lib/api";
import { formatDayLabel, formatTimeLabel } from "@/utils/openingHours";
import { useVendorOrderingStatus } from "@/hooks/useVendorOrderingStatus";
import { VendorOrderingMeta } from "@/utils/vendorOrdering";

const HEADER_HEIGHT = 300;
const STICKY_HEADER_HEIGHT = Platform.OS === "ios" ? 100 : 84;
const STATUS_BAR_HEIGHT =
  Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24;
// Extra top padding so header controls sit lower when not scrolled
const HEADER_TOP_PADDING = Platform.OS === "ios" ? 12 : 8;

// Removed unused helper: getCategoryIcon

// Skeleton Loader Component
const SkeletonLoader = ({
  width: skeletonWidth,
  height,
  style,
}: {
  width: number | string;
  height: number;
  style?: any;
}) => {
  const [opacity] = useState(new Animated.Value(0.3));

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
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

// Animated Category Loader Component
const LoadingCategoryAnimation = () => {
  const [dotAnimations] = useState([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Animate the dots
    const animateDots = () => {
      const animations = dotAnimations.map((anim, index) =>
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.loop(
            Animated.sequence([
              Animated.timing(anim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: 0.3,
                duration: 600,
                useNativeDriver: true,
              }),
            ])
          ),
        ])
      );

      Animated.parallel(animations).start();
    };

    // Animate the pulsating ball
    const animatePulse = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDots();
    animatePulse();
  }, [dotAnimations, pulseAnim]);

  return (
    <View style={styles.categoryLoaderContainer}>
      <View style={styles.loaderWrapper}>
        {/* Pulsating Orange Ball */}
        <Animated.View
          style={[
            styles.pulsatingBall,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.3],
                outputRange: [1, 0.7],
              }),
            },
          ]}
        />

        {/* Animated dots */}
        <View style={styles.dotsContainer}>
          {dotAnimations.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.loaderDot,
                {
                  opacity: anim,
                  transform: [
                    {
                      scale: anim.interpolate({
                        inputRange: [0.3, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>

        <Text style={styles.loaderText}>Loading more...</Text>
      </View>
    </View>
  );
};

// Removed unused handler: handleCategoryPress

// Updated Category Section Component - Uber Eats Style
interface CategorySectionProps {
  category: string;
  products: Product[];
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (productId: string) => void;
  getCartQuantity: (productId: string) => number;
  vendor: VendorOrderingMeta;
}

const CategorySection = ({
  category,
  products,
  onAddToCart,
  onRemoveFromCart,
  getCartQuantity,
  vendor,
}: CategorySectionProps) => {
  const handleAdd = (item: Product) => {
    if (!item) return;
    onAddToCart(item);
  };

  const handleRemove = (productId: string) => {
    onRemoveFromCart(productId);
  };

  const handleProductPress = (productId: string) => {
    // Direct navigation - ProductCard already has double-click prevention
    router.push(`/product/${productId}`);
  };

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
        onAddToCart={() => handleAdd(item)}
        onRemoveFromCart={() => handleRemove(item.id)}
        onPress={() => handleProductPress(item.id)}
        vendor={vendor}
      />
    </View>
  );

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryTitle}>{category}</Text>

        <TouchableOpacity
          style={styles.viewAllButton}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: "/storeCategoryProducts",
              params: {
                shopId: String((products[0] && products[0].shopId) || ""),
                subCategoryId: String(
                  (products[0] && products[0].subCategory?.id) || ""
                ),
                shopName: String(vendor?.vendorName || ""),
                subCategoryName: String(
                  (products[0] && products[0].subCategory?.name) || ""
                ),
              },
            })
          }
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
          <Ionicons name="chevron-forward" size={16} color="#666666" />
        </TouchableOpacity>
      </View>

      {/* Products Horizontal Slider */}
      <FlatList
        data={products}
        renderItem={renderProductCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsListContainer}
        ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
        snapToInterval={200}
        decelerationRate="fast"
        scrollEventThrottle={16}
      />
    </View>
  );
};

// Shop Details Skeleton
const ShopDetailsSkeleton = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Hero Section Skeleton */}
      <View style={styles.heroContainer}>
        <View style={styles.heroImagePlaceholder}>
          <Ionicons name="storefront" size={60} color="#ccc" />
          <Text style={{ color: "#888", marginTop: 8, fontSize: 14 }}>
            Shop image loading...
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

        {/* Overlay content skeleton */}
        <View style={styles.overlayCard}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: "#E0E0E0",
                shadowColor: "rgba(0,0,0,0.1)",
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: "#fff",
                  opacity: 0.6,
                },
              ]}
            />
            <SkeletonLoader
              width={80}
              height={12}
              style={{ backgroundColor: "#DADADA" }}
            />
          </View>

          <SkeletonLoader
            width="60%"
            height={26}
            style={{ marginTop: 16, backgroundColor: "#E0E0E0" }}
          />
          <SkeletonLoader
            width="40%"
            height={16}
            style={{ marginTop: 8, backgroundColor: "#E0E0E0" }}
          />
          <SkeletonLoader
            width="85%"
            height={14}
            style={{ marginTop: 12, backgroundColor: "#E0E0E0" }}
          />
          <SkeletonLoader
            width="70%"
            height={12}
            style={{ marginTop: 6, backgroundColor: "#E0E0E0" }}
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
      <ScrollView style={{ flex: 1, paddingTop: 20 }}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={{ marginBottom: 32, paddingHorizontal: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <SkeletonLoader
                width={40}
                height={40}
                style={{ borderRadius: 20, marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <SkeletonLoader
                  width="60%"
                  height={18}
                  style={{ marginBottom: 4 }}
                />
                <SkeletonLoader width="40%" height={14} />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[1, 2, 3].map((card) => (
                <View key={card} style={{ marginRight: 12 }}>
                  <SkeletonLoader
                    width={168}
                    height={220}
                    style={{ borderRadius: 16 }}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

// Shop Interface
interface Shop {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  openingHours?: OpeningHours | null;
  shopType?: string;
  rating?: number;
  totalReviews?: number;
  isActive: boolean;
  acceptsOrders: boolean;
  minimumOrderAmount?: number;
  products?: Product[];
}

// Product Interface
interface Product {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  description?: string;
  imageUrl?: string;
  shopId: string;
  isAvailable?: boolean;
  subCategory?: {
    id: string;
    name: string;
  };
}

export default function ShopDetails() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { cartItems, addToCart, removeFromCart } = useCart();
  const [searchText, setSearchText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scrollY] = useState(new Animated.Value(0));
  const [cartPulse] = useState(new Animated.Value(1));
  // Removed unused image error tracking state

  // Group products by category
  const [groupedProducts, setGroupedProducts] = useState<{
    [key: string]: Product[];
  }>({});

  // Category tabs state
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryTabsRef = useRef<ScrollView>(null);

  // Lazy loading state for categories
  const [currentCategoryPage, setCurrentCategoryPage] = useState(1);
  const [hasMoreCategories, setHasMoreCategories] = useState(true);
  const [loadingMoreCategories, setLoadingMoreCategories] = useState(false);

  const PRODUCTS_PER_CATEGORY = 5; // Show 5 products from each category (Uber Eats style)
  const CATEGORIES_PER_PAGE = 5; // Load 5 categories at a time - smaller batches for smoother UX

  const vendorMeta = React.useMemo<VendorOrderingMeta>(() => {
    return {
      vendorId: shop?.id ?? null,
      vendorType: "shop",
      vendorName: shop?.name ?? null,
      openingHours: shop?.openingHours ?? null,
      isActive: shop?.isActive ?? null,
      acceptsOrders: shop?.acceptsOrders ?? null,
    };
  }, [
    shop?.id,
    shop?.name,
    shop?.openingHours,
    shop?.isActive,
    shop?.acceptsOrders,
  ]);

  const {
    orderingDisabled,
    disabledReason: orderingDisabledReason,
    status: operatingStatus,
  } = useVendorOrderingStatus({
    vendorId: vendorMeta.vendorId,
    vendorType: "shop",
    meta: vendorMeta,
    skip: !vendorMeta.vendorId,
  });

  const fetchShopDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setCurrentCategoryPage(1); // Reset to page 1
      setHasMoreCategories(true);

      // Fetch shop info
      const shopResponse = await fetch(`${API_URL}/api/shops/${shopId}`);

      if (!shopResponse.ok) {
        throw new Error(`Failed to fetch shop: ${shopResponse.statusText}`);
      }

      const shopData = await shopResponse.json();
      setShop(shopData);

      // Fetch FIRST page of products sampled by category from backend (10 categories x 5 products)
      let categoriesKeys: string[] = [];
      try {
        const sampleResponse = await fetch(
          `${API_URL}/api/shops/${shopId}/products/by-category?productsPerCategory=${PRODUCTS_PER_CATEGORY}&categoriesPerPage=${CATEGORIES_PER_PAGE}&categoryPage=1`
        );

        if (!sampleResponse.ok) {
          throw new Error(
            `Failed to fetch products by category: ${sampleResponse.statusText}`
          );
        }

        const sampleData: {
          categories: {
            category: { id: string; name: string } | null;
            products: Product[];
            totalInCategory: number;
            hasMore: boolean;
          }[];
        } = await sampleResponse.json();

        // Group products by category name
        const grouped: { [key: string]: Product[] } = {};
        (sampleData.categories || []).forEach((entry) => {
          const categoryName = entry.category?.name || "All Products";
          grouped[categoryName] = entry.products || [];
        });

        setGroupedProducts(grouped);
        categoriesKeys = Object.keys(grouped);

        // Check if there are more categories to load
        // If we got fewer categories than requested, we've reached the end
        setHasMoreCategories(
          sampleData.categories.length >= CATEGORIES_PER_PAGE
        );
      } catch (e) {
        console.warn("Falling back to includeProducts flow due to error:", e);
        // Fallback: fetch includeProducts and locally cap to N per category
        const productsResponse = await fetch(
          `${API_URL}/api/shops/${shopId}?includeProducts=true`
        );
        if (!productsResponse.ok) {
          throw new Error(
            `Failed to fetch products: ${productsResponse.statusText}`
          );
        }
        const shopWithProducts = await productsResponse.json();
        const grouped: { [key: string]: Product[] } = {};
        const allCategories = new Set<string>();

        shopWithProducts.products?.forEach((product: Product) => {
          const categoryName = product.subCategory?.name || "All Products";
          allCategories.add(categoryName);
        });

        // Only take first CATEGORIES_PER_PAGE categories for initial load
        const categoryList = Array.from(allCategories).slice(
          0,
          CATEGORIES_PER_PAGE
        );

        shopWithProducts.products?.forEach((product: Product) => {
          const categoryName = product.subCategory?.name || "All Products";
          if (!categoryList.includes(categoryName)) return;

          if (!grouped[categoryName]) grouped[categoryName] = [];
          if (grouped[categoryName].length < PRODUCTS_PER_CATEGORY) {
            grouped[categoryName].push(product);
          }
        });

        setGroupedProducts(grouped);
        categoriesKeys = Object.keys(grouped);
        setHasMoreCategories(allCategories.size > CATEGORIES_PER_PAGE);
      }

      // Set first category as selected by default
      if (categoriesKeys.length > 0) {
        setSelectedCategory((prev) => prev || categoriesKeys[0]);
      }
    } catch (err: any) {
      console.error("Error fetching shop details:", err);
      setError(err.message || "Failed to load shop details");
    } finally {
      setLoading(false);
    }
  }, [shopId, PRODUCTS_PER_CATEGORY, CATEGORIES_PER_PAGE]);

  // Load more categories function
  const loadMoreCategories = useCallback(async () => {
    if (!shopId || loadingMoreCategories || !hasMoreCategories) return;

    try {
      setLoadingMoreCategories(true);
      const nextPage = currentCategoryPage + 1;

      const sampleResponse = await fetch(
        `${API_URL}/api/shops/${shopId}/products/by-category?productsPerCategory=${PRODUCTS_PER_CATEGORY}&categoriesPerPage=${CATEGORIES_PER_PAGE}&categoryPage=${nextPage}`
      );

      if (!sampleResponse.ok) {
        console.warn("Failed to fetch more categories");
        return;
      }

      const sampleData: {
        categories: {
          category: { id: string; name: string } | null;
          products: Product[];
          totalInCategory: number;
          hasMore: boolean;
        }[];
      } = await sampleResponse.json();

      // Append new categories to existing grouped products
      setGroupedProducts((prev) => {
        const newGrouped = { ...prev };
        (sampleData.categories || []).forEach((entry) => {
          const categoryName = entry.category?.name || "All Products";
          // Only add if not already present
          if (!newGrouped[categoryName]) {
            newGrouped[categoryName] = entry.products || [];
          }
        });
        return newGrouped;
      });

      setCurrentCategoryPage(nextPage);

      // Check if there are more categories to load
      setHasMoreCategories(sampleData.categories.length >= CATEGORIES_PER_PAGE);
    } catch (err: any) {
      console.error("Error loading more categories:", err);
    } finally {
      setLoadingMoreCategories(false);
    }
  }, [
    shopId,
    currentCategoryPage,
    hasMoreCategories,
    loadingMoreCategories,
    PRODUCTS_PER_CATEGORY,
    CATEGORIES_PER_PAGE,
  ]);

  useEffect(() => {
    if (shopId) {
      fetchShopDetails();
    }
  }, [shopId, fetchShopDetails]);

  // Remove fade animation - just show content immediately
  // Content appears instantly after loading for better UX

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
  }, [cartPulse, cartItems]);

  // Scroll to selected category tab when it changes
  useEffect(() => {
    if (selectedCategory && categoryTabsRef.current && !loading) {
      const categories = Object.keys(groupedProducts);
      const categoryIndex = categories.indexOf(selectedCategory);

      if (categoryIndex >= 0) {
        // Calculate scroll position for the tab
        // Each tab has some width, let's estimate 100px per tab plus margins
        const tabWidth = 100; // approximate width per tab
        const scrollPosition = categoryIndex * tabWidth;

        // Delay scroll to ensure content is rendered
        setTimeout(() => {
          categoryTabsRef.current?.scrollTo({
            x: scrollPosition,
            animated: true,
          });
        }, 300);
      }
    }
  }, [selectedCategory, groupedProducts, loading]);

  const handleAddToCart = (item: Product) => {
    if (!shop) return;
    if (orderingDisabled) {
      handleOrderingUnavailable();
      return;
    }

    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      discountedPrice: item.discountedPrice, // Add discounted price
      description: item.description || "",
      vendorId: shop.id,
      vendorName: shop.name,
      imageUrl: item.imageUrl || "",
      entityType: "shop",
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

  const handleRemoveFromCart = (itemId: string) => {
    removeFromCart(itemId);
  };

  // Removed unused image error handler

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

  const isOpen = operatingStatus?.isOpen ?? !orderingDisabled;

  const statusReason = operatingStatus?.reason;

  const statusTheme = React.useMemo(
    () =>
      isOpen
        ? {
            label: "Open now",
            badge: "Open",
            color: "rgba(16,185,129,0.95)",
            shadow: "#10B981",
          }
        : statusReason === "inactive"
        ? {
            label: "Offline",
            badge: "Offline",
            color: "rgba(107,114,128,0.95)",
            shadow: "#6B7280",
          }
        : statusReason === "not_accepting_orders"
        ? {
            label: "Paused",
            badge: "Paused",
            color: "rgba(234,179,8,0.95)",
            shadow: "#CA8A04",
          }
        : {
            label: "Closed",
            badge: "Closed",
            color: "rgba(239,68,68,0.95)",
            shadow: "#EF4444",
          },
    [isOpen, statusReason]
  );

  const nextOpening = operatingStatus?.nextOpening;
  const closesAt = operatingStatus?.closesAt;

  const nextOpeningText =
    !isOpen && nextOpening
      ? `Opens ${formatDayLabel(nextOpening.day)} ${formatTimeLabel(
          nextOpening.time
        )}`
      : null;

  const closesAtText =
    isOpen && closesAt
      ? `Closes ${formatDayLabel(closesAt.day)} ${formatTimeLabel(
          closesAt.time
        )}`
      : null;

  const statusMetaText = isOpen ? closesAtText : nextOpeningText;
  const statusMetaTextClean = statusMetaText
    ? statusMetaText.replace(/\s+/g, " ").trim()
    : undefined;

  const handleOrderingUnavailable = useCallback(() => {
    if (!orderingDisabled) {
      return;
    }
    const message =
      orderingDisabledReason ||
      (statusMetaTextClean
        ? `This shop is closed. ${statusMetaTextClean}.`
        : "This shop is not accepting orders at the moment.");
    Alert.alert("Ordering unavailable", message);
  }, [orderingDisabled, orderingDisabledReason, statusMetaTextClean]);

  const stickySubtitleParts = [statusTheme.label];
  if (statusMetaText) {
    stickySubtitleParts.push(statusMetaText);
  }
  stickySubtitleParts.push(shop?.shopType || "Store");
  const stickySubtitle = stickySubtitleParts.join(" • ");

  // Enhanced animated values for smoother transitions
  const headerOpacity = scrollY.interpolate({
    inputRange: [
      HEADER_HEIGHT - STICKY_HEADER_HEIGHT - 50,
      HEADER_HEIGHT - STICKY_HEADER_HEIGHT,
    ],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT - STICKY_HEADER_HEIGHT],
    outputRange: [0, -10],
    extrapolate: "clamp",
  });

  // Removed unused animation interpolations

  if (loading) {
    return <ShopDetailsSkeleton />;
  }

  if (error || !shop) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["left", "right", "bottom"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>
            {String(error) || "Shop not found"}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchShopDetails()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />

      {/* Enhanced Sticky Header - Uber Eats Style */}
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <View style={styles.stickyHeaderContent}>
          <TouchableOpacity
            style={styles.stickyHeaderBackButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <View style={styles.stickyHeaderTitleContainer}>
            <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
              {shop.name}
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
              {getTotalCartItems() > 0 ? (
                <View style={styles.stickyCartBadge}>
                  <Text style={styles.stickyCartBadgeText}>
                    {getTotalCartItems()}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: (event: any) => {
              // Auto-load more categories when near bottom
              const { layoutMeasurement, contentOffset, contentSize } =
                event.nativeEvent;
              const paddingToBottom = 600; // Trigger 600px before the end - perfect for 5 categories
              const isCloseToBottom =
                layoutMeasurement.height + contentOffset.y >=
                contentSize.height - paddingToBottom;

              if (
                isCloseToBottom &&
                hasMoreCategories &&
                !loadingMoreCategories
              ) {
                loadMoreCategories();
              }
            },
          }
        )}
        scrollEventThrottle={400}
        showsVerticalScrollIndicator={false}
      >
        {/* Uber Eats/DoorDash style header */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: shop.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          {/* Header buttons on top of image */}
          <View style={styles.heroHeaderButtons}>
            <TouchableOpacity
              style={styles.heroBackButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

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

          <View style={styles.overlayCard}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusTheme.color,
                  shadowColor: statusTheme.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                },
              ]}
              accessibilityLabel={`Shop is ${statusTheme.badge.toLowerCase()}`}
              accessibilityHint={
                statusMetaText
                  ? `${statusTheme.badge}. ${statusMetaText}.`
                  : undefined
              }
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: "#fff",
                  },
                ]}
              />
              <View>
                <Text style={styles.statusText}>{statusTheme.badge}</Text>
                {/* {isOpen && closesAtText ? (
                  <Text style={styles.statusTextSubHeader}>{closesAtText}</Text>
                ) : null} */}
                {!isOpen && nextOpeningText ? (
                  <Text style={styles.statusTextSubHeader}>
                    {nextOpeningText}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.shopName}>{shop.name}</Text>
            </View>
            {shop.rating ? (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{shop.rating.toFixed(1)}</Text>
              </View>
            ) : null}
            {shop.description ? (
              <Text style={styles.shopDesc} numberOfLines={2}>
                {shop.description}
              </Text>
            ) : null}
            {shop.address ? (
              <Text
                style={styles.shopAddress}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {shop.address}
              </Text>
            ) : null}
            {statusMetaText ? (
              <Text style={styles.statusMetaText} numberOfLines={2}>
                {statusMetaText}
              </Text>
            ) : null}
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
              placeholder={`Search in ${shop.name}`}
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
              {orderingDisabledReason ? (
                <Text style={styles.orderingDisabledBannerSubtitle}>
                  {orderingDisabledReason}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Enhanced Sticky Header - Uber Eats Style */}
        <Animated.View
          style={[
            styles.stickyHeader,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <View style={styles.stickyHeaderContent}>
            <TouchableOpacity
              style={styles.stickyHeaderBackButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>

            <View style={styles.stickyHeaderTitleContainer}>
              <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
                {shop.name}
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
                {getTotalCartItems() > 0 ? (
                  <View style={styles.stickyCartBadge}>
                    <Text style={styles.stickyCartBadgeText}>
                      {getTotalCartItems()}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
        {/* Horizontal Scrollable Category Tabs - Uber Eats Style */}
        {Object.keys(groupedProducts).length > 0 ? (
          <View style={styles.categoryTabsContainer}>
            <ScrollView
              ref={categoryTabsRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTabsContent}
            >
              {Object.keys(groupedProducts).map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryTab]}
                  onPress={() => {
                    // Direct navigation with minimal params - page will fetch its own data
                    router.push({
                      pathname: "/ShopCategoryPage",
                      params: {
                        shopId: shop?.id || "",
                        shopName: shop?.name || "",
                        categoryName: category,
                      },
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryTabText]}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Category Sections as Sliders */}
        <View style={styles.categoriesContainer}>
          {Object.keys(groupedProducts).length > 0 ? (
            Object.entries(groupedProducts).map(
              ([category, products], index) => (
                <View key={category}>
                  <CategorySection
                    category={category}
                    products={products}
                    onAddToCart={handleAddToCart}
                    onRemoveFromCart={handleRemoveFromCart}
                    getCartQuantity={getCartItemQuantity}
                    vendor={vendorMeta}
                  />
                </View>
              )
            )
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="cube-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No Products Available</Text>
              <Text style={styles.emptyStateText}>
                This shop doesn&apos;t have any products listed yet.
              </Text>
            </View>
          )}

          {/* Beautiful Animated Loader for Loading More Categories */}
          {loadingMoreCategories && <LoadingCategoryAnimation />}
        </View>
      </Animated.ScrollView>

      {/* Floating Cart Summary */}
      {cartItems.length > 0 ? (
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
            onPress={() => router.push("/cart")}
            activeOpacity={0.9}
          >
            <View style={styles.cartSummaryContainer}>
              <View style={styles.cartSummaryContent}>
                <View style={styles.cartIconContainer}>
                  <Ionicons name="cart" size={20} color="#fff" />
                  <View style={styles.cartItemsBadge}>
                    <Text style={styles.cartItemsCount}>
                      {getTotalCartItems()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cartTextContainer}>
                  <Text style={styles.cartItemsText}>
                    {getTotalCartItems()}
                    {getTotalCartItems() === 1 ? " item" : " items"}
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
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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

  stickyHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -0.3,
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
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    position: "relative",
    width: "100%",
    height: 280,
    marginBottom: 0,
  },
  heroImagePlaceholder: {
    width: "100%",
    height: 250,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  heroImage: {
    width: "100%",
    height: 250,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
  heroHeaderButtons: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 44 : 24,
    paddingBottom: 8,
    zIndex: 10,
  },
  heroBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroCartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  heroCartBadge: {
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
  heroCartBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  overlayCard: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: -60,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    paddingTop: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "center",
  },
  shopName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
    textAlign: "center",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
    marginLeft: 4,
  },
  shopDesc: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  shopAddress: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginTop: 2,
  },
  statusMetaText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
  titleRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    position: "absolute",
    top: 0,
    right: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    zIndex: 10,
    gap: 8,
    maxWidth: 220,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.9,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  statusTextSubHeader: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    lineHeight: 14,
  },
  searchBarWrapper: {
    marginTop: 70,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#222",
    paddingVertical: 4,
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

  stickyHeaderGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
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

  // Category Tabs - Uber Eats Style
  categoryTabsContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  categoryTabsContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },

  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    marginRight: 8,
    position: "relative",
  },

  categoryTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.3,
  },
  categoryTabTextActive: {
    color: "#FFFFFF",
  },

  // Updated Categories Container - Uber Eats Style
  categoriesContainer: {
    backgroundColor: "#FFFFFF",
    paddingTop: 20,
    paddingBottom: 120,
  },

  // Updated Category Section - Clean Uber Eats Style
  categorySection: {
    marginBottom: 40,
    backgroundColor: "#FFFFFF",
  },

  // Simple Category Header - Black text, See All with arrow
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  categoryTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: -0.3,
  },

  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  viewAllText: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
    marginRight: 4,
  },

  // Enhanced cart summary styles
  cartSummary: {
    position: "absolute",
    bottom: 34,
    left: 16,
    right: 16,
    zIndex: 1000,
  },

  cartSummaryButton: {
    borderRadius: 32,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },

  cartSummaryContainer: {
    backgroundColor: "#0F172A",
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    position: "relative",
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
    marginRight: 18,
    elevation: 6,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },

  cartItemsBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#0F172A",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },

  cartItemsCount: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  cartTextContainer: {
    flex: 1,
    marginRight: 18,
  },

  cartItemsText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 3,
    letterSpacing: -0.2,
  },

  cartCheckoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  cartPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  cartTotalPrice: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginRight: 10,
  },

  // Clean Product Cards Container
  productsListContainer: {
    paddingLeft: 10,
    paddingRight: 4,
  },

  productCardWrapper: {
    width: 140,
  },

  // Enhanced Product Card Styles for Uber Eats Look
  productCard: {
    backgroundColor: "#FFFFFF",
    height: 280,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: Platform.OS === "ios" ? "rgba(0, 0, 0, 0.06)" : "#000",
    shadowOffset:
      Platform.OS === "ios" ? { width: 0, height: 2 } : { width: 0, height: 1 },
    shadowOpacity: Platform.OS === "ios" ? 0.06 : 0.1,
    shadowRadius: Platform.OS === "ios" ? 8 : 4,
    elevation: Platform.OS === "android" ? 3 : 0,
    marginBottom: 4,
    borderWidth: Platform.OS === "ios" ? 0.5 : 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
  },

  productImageContainer: {
    width: "100%",
    height: 160,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
  },

  productImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F8FAFC",
  },

  productImagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },

  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  discountText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.1,
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
    shadowColor:
      Platform.OS === "ios" ? "rgba(255, 133, 0, 0.3)" : PrimaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === "ios" ? 0.2 : 0.25,
    shadowRadius: 4,
    elevation: Platform.OS === "android" ? 4 : 0,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  overlayControls: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: Platform.OS === "ios" ? "rgba(0, 0, 0, 0.2)" : "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === "ios" ? 0.1 : 0.15,
    shadowRadius: 8,
    elevation: Platform.OS === "android" ? 6 : 0,
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
    fontWeight: "600",
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: "center",
    letterSpacing: -0.2,
  },

  quantityBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  // Clean Product Info
  productInfo: {
    padding: 12,
    height: 120,
    justifyContent: "space-between",
  },

  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
    lineHeight: 18,
    letterSpacing: -0.1,
    marginBottom: 4,
  },

  productDescription: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 16,
    letterSpacing: 0,
    opacity: 0.8,
    marginBottom: 8,
  },

  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
  },

  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: -0.2,
  },

  productPreviousPrice: {
    fontSize: 12,
    color: "#999999",
    textDecorationLine: "line-through",
    marginLeft: 6,
    letterSpacing: 0,
    opacity: 0.7,
  },

  // Empty state styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },

  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },

  emptyStateText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },

  // Beautiful Category Loader Styles
  categoryLoaderContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  loaderWrapper: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#FAFAFA",
    borderRadius: 24,
    minWidth: 180,
  },
  pulsatingBall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PrimaryColor,
    marginBottom: 20,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },
  loaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PrimaryColor,
  },
  loaderText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    textAlign: "center",
    letterSpacing: -0.1,
  },
});
