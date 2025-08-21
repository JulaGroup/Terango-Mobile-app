import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Image,
  FlatList,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { API_URL } from "@/constants/config";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";

const HEADER_HEIGHT = 300;
const STICKY_HEADER_HEIGHT = 80;

// Helper function to get category icons
const getCategoryIcon = (category: string): any => {
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes("grocery") || categoryLower.includes("food")) {
    return "basket";
  } else if (categoryLower.includes("electronics")) {
    return "phone-portrait";
  } else if (
    categoryLower.includes("clothing") ||
    categoryLower.includes("fashion")
  ) {
    return "shirt";
  } else if (
    categoryLower.includes("home") ||
    categoryLower.includes("garden")
  ) {
    return "home";
  } else if (
    categoryLower.includes("beauty") ||
    categoryLower.includes("health")
  ) {
    return "heart";
  } else if (categoryLower.includes("sports")) {
    return "fitness";
  } else if (categoryLower.includes("books")) {
    return "book";
  } else if (categoryLower.includes("toys")) {
    return "game-controller";
  } else {
    return "storefront";
  }
};

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

// Product Card Component
interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (productId: string) => void;
  cartQuantity: number;
}

const ProductCard = ({
  product,
  onAddToCart,
  onRemoveFromCart,
  cartQuantity,
}: ProductCardProps) => {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null
  );

  // expand controls when product is added
  const handleAdd = () => {
    onAddToCart(product);
    setExpanded(true);

    // reset collapse timer
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => {
      setExpanded(false);
    }, 4000);
    setTimer(t);
  };

  const { updateQuantity } = useCart();
  const handleRemove = () => {
    if (cartQuantity > 1) {
      updateQuantity(product.id, cartQuantity - 1);
    } else {
      onRemoveFromCart(product.id);
      setExpanded(false);
      if (timer) clearTimeout(timer);
    }
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [timer]);

  return (
    <View style={styles.productCard}>
      {/* Product Image */}
      <View style={styles.productImageContainer}>
        {product.imageUrl && !imageLoadError ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="storefront" size={32} color="#E5E5E5" />
          </View>
        )}

        {/* Discount Badge (optional - you can add discount logic) */}
        {/* <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-20%</Text>
        </View> */}

        {/* Floating Add/Quantity Controls */}
        {cartQuantity === 0 ? (
          <TouchableOpacity
            style={styles.floatingAddButton}
            onPress={handleAdd}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        ) : expanded ? (
          <View style={styles.overlayControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={handleRemove}
              activeOpacity={0.8}
            >
              <Ionicons name="remove" size={14} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.quantityText}>{cartQuantity}</Text>

            <TouchableOpacity
              style={styles.quantityButton}
              onPress={handleAdd}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.floatingAddButton}
            onPress={() => setExpanded(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.quantityBadgeText}>{cartQuantity}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        {product.description && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {product.description}
          </Text>
        )}
        <View style={styles.productPriceRow}>
          <Text style={styles.productPrice}>D{product.price.toFixed(2)}</Text>
          {/* Optional: Previous price for discounted items */}
          {/* <Text style={styles.productPreviousPrice}>D{(product.price * 1.2).toFixed(2)}</Text> */}
        </View>
      </View>
    </View>
  );
};

// Category Section Component
interface CategorySectionProps {
  category: string;
  products: Product[];
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (productId: string) => void;
  getCartQuantity: (productId: string) => number;
}

const CategorySection = ({
  category,
  products,
  onAddToCart,
  onRemoveFromCart,
  getCartQuantity,
}: CategorySectionProps) => {
  const categoryIcon = getCategoryIcon(category);

  const renderProductCard = ({ item }: { item: Product }) => (
    <View style={styles.productCardWrapper}>
      <ProductCard
        product={item}
        onAddToCart={onAddToCart}
        onRemoveFromCart={onRemoveFromCart}
        cartQuantity={getCartQuantity(item.id)}
      />
    </View>
  );

  return (
    <View style={styles.categorySection}>
      {/* Category Header */}
      <View style={styles.categoryHeaderContainer}>
        <View style={styles.categoryHeaderContent}>
          <View style={styles.categoryIconWrapper}>
            <LinearGradient
              colors={["#FF8500", "#FF6B00"]}
              style={styles.categoryIconContainer}
            >
              <Ionicons name={categoryIcon} size={20} color="#fff" />
            </LinearGradient>
          </View>
          <View style={styles.categoryTextContainer}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <Text style={styles.categorySubtitle}>
              {products.length} {products.length === 1 ? "item" : "items"}{" "}
              available
            </Text>
          </View>
        </View>

        {/* View All Button */}
        <TouchableOpacity style={styles.viewAllButton} activeOpacity={0.7}>
          <Text style={styles.viewAllText}>View all</Text>
          <Ionicons name="chevron-forward" size={16} color={PrimaryColor} />
        </TouchableOpacity>
      </View>

      {/* Quality Banner */}
      {/* <View style={styles.qualityBanner}>
        <View style={styles.qualityBannerLeft}>
          <View style={styles.qualityIconContainer}>
            <Ionicons name="checkmark-circle" size={16} color="#27AE60" />
          </View>
          <View>
            <Text style={styles.qualityTitle}>Fresh & Quality Assured</Text>
            <Text style={styles.qualitySubtitle}>
              Handpicked • Best prices • Fast delivery
            </Text>
          </View>
        </View>
        <View style={styles.qualityBadge}>
          <Text style={styles.qualityBadgeText}>Premium</Text>
        </View>
      </View> */}

      {/* Products Horizontal Slider */}
      <FlatList
        data={products}
        renderItem={renderProductCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsListContainer}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        snapToInterval={180}
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
      <View style={[styles.heroSection, { backgroundColor: "#f0f0f0" }]}>
        <LinearGradient
          colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.7)"]}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroNavigation}>
              <SkeletonLoader
                width={40}
                height={40}
                style={{ borderRadius: 20, marginRight: 16 }}
              />
              <SkeletonLoader
                width={40}
                height={40}
                style={{ borderRadius: 20 }}
              />
            </View>

            {/* Shop Info Skeleton */}
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
                  style={{
                    marginRight: 20,
                    backgroundColor: "rgba(255,255,255,0.2)",
                  }}
                />
                <SkeletonLoader
                  width={90}
                  height={14}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                  }}
                />
              </View>

              <SkeletonLoader
                width={80}
                height={24}
                style={{
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              />
            </View>
          </View>
        </LinearGradient>
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
  openingHours?: any;
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
  description?: string;
  imageUrl?: string;
  shopId: string;
  subCategory?: {
    id: string;
    name: string;
  };
}

export default function ShopDetails() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { cartItems, addToCart, removeFromCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scrollY] = useState(new Animated.Value(0));
  const [cartPulse] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [imageLoadErrors, setImageLoadErrors] = useState<{
    [key: string]: boolean;
  }>({});

  // Group products by category
  const [groupedProducts, setGroupedProducts] = useState<{
    [key: string]: Product[];
  }>({});

  const fetchShopDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/shops/${shopId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch shop: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(data.products);
      setShop(data);

      // Group products by subcategory
      const grouped: { [key: string]: Product[] } = {};

      data.products?.forEach((product: Product) => {
        const categoryName = product.subCategory?.name || "All Products";
        if (!grouped[categoryName]) {
          grouped[categoryName] = [];
        }
        grouped[categoryName].push(product);
      });

      setGroupedProducts(grouped);
    } catch (err: any) {
      console.error("Error fetching shop details:", err);
      setError(err.message || "Failed to load shop details");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    if (shopId) {
      fetchShopDetails();
    }
  }, [shopId, fetchShopDetails]);

  // Fade in animation when shop data loads
  useEffect(() => {
    if (shop && !loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [shop, loading, fadeAnim]);

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

  const handleAddToCart = (item: Product) => {
    if (!shop) return;

    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      description: item.description || "",
      vendorId: shop.id,
      vendorName: shop.name,
      imageUrl: item.imageUrl || "",
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

  const handleImageError = (key: string) => {
    setImageLoadErrors((prev) => ({ ...prev, [key]: true }));
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

  // Animated values for hero section
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT - STICKY_HEADER_HEIGHT],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-200, 0, HEADER_HEIGHT],
    outputRange: [1.3, 1, 0.8],
    extrapolate: "clamp",
  });

  const containerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -50],
    extrapolate: "clamp",
  });

  const imageInnerTranslateY = scrollY.interpolate({
    inputRange: [-200, 0, HEADER_HEIGHT],
    outputRange: [0, 0, 50],
    extrapolate: "clamp",
  });

  if (loading) {
    return <ShopDetailsSkeleton />;
  }

  if (error || !shop) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || "Shop not found"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchShopDetails}
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
            {shop.name}
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
          {/* Shop Background Image */}
          {shop.imageUrl && !imageLoadErrors[`hero-${shop.id}`] ? (
            <Animated.Image
              source={{ uri: shop.imageUrl }}
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
              onError={() => handleImageError(`hero-${shop.id}`)}
            />
          ) : (
            <View style={styles.heroBackgroundPlaceholder}>
              <Ionicons name="storefront" size={60} color="#ccc" />
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

              {/* Shop Info */}
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{shop.name}</Text>
                <Text style={styles.restaurantDescription}>
                  {shop.description || "Quality products at great prices"}
                </Text>

                {/* Enhanced Shop Meta */}
                <View style={styles.restaurantMeta}>
                  {shop.rating && (
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text style={styles.metaText}>
                        {shop.rating.toFixed(1)} ({shop.totalReviews || 0}
                        reviews)
                      </Text>
                    </View>
                  )}

                  {shop.address && (
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="location"
                        size={16}
                        color="rgba(255,255,255,0.9)"
                      />
                      <Text style={styles.metaText}>
                        {shop.city
                          ? `${shop.city}, ${shop.state || ""}`
                          : shop.address}
                      </Text>
                    </View>
                  )}

                  {shop.phone && (
                    <TouchableOpacity
                      style={styles.metaItem}
                      onPress={() => {
                        if (shop.phone) {
                          Linking.openURL(`tel:${shop.phone}`);
                        }
                      }}
                    >
                      <Ionicons
                        name="call"
                        size={16}
                        color="rgba(255,255,255,0.9)"
                      />
                      <Text style={styles.metaText}>{shop.phone}</Text>
                    </TouchableOpacity>
                  )}

                  {shop.minimumOrderAmount && shop.minimumOrderAmount > 0 && (
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="cash-outline"
                        size={16}
                        color="rgba(255,255,255,0.9)"
                      />
                      <Text style={styles.metaText}>
                        Min. order: ${shop.minimumOrderAmount}
                      </Text>
                    </View>
                  )}

                  {shop.shopType && (
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="pricetag"
                        size={16}
                        color="rgba(255,255,255,0.9)"
                      />
                      <Text style={styles.metaText}>{shop.shopType}</Text>
                    </View>
                  )}
                </View>

                {/* Operating Status Badge */}
                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: shop.isActive ? "#00C851" : "#FF6B6B",
                      },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {shop.isActive ? "Open Now" : "Closed"}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Category Sections as Sliders */}
        <Animated.View
          style={[styles.categoriesContainer, { opacity: fadeAnim }]}
        >
          {Object.entries(groupedProducts).map(([category, products]) => (
            <CategorySection
              key={category}
              category={category}
              products={products}
              onAddToCart={handleAddToCart}
              onRemoveFromCart={handleRemoveFromCart}
              getCartQuantity={getCartItemQuantity}
            />
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
              router.push("/cart");
            }}
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
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
    backgroundColor: "#FAFAFA",
    paddingTop: 8,
    paddingBottom: 100,
  },
  categorySection: {
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 8,
    boxShadow:
      "rgba(0, 0, 0, 0.1) 0px 0px 5px 0px, rgba(0, 0, 0, 0.1) 0px 0px 1px 0px",
  },
  categoryHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIconWrapper: {
    marginRight: 12,
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  categorySubtitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 133, 0, 0.2)",
  },
  viewAllText: {
    fontSize: 13,
    color: PrimaryColor,
    fontWeight: "600",
    marginRight: 4,
  },
  qualityBanner: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#27AE60",
  },
  qualityBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  qualityIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: "#E8F5E8",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  qualityTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  qualitySubtitle: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  qualityBadge: {
    backgroundColor: "#27AE60",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qualityBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.5,
  },
  productsListContainer: {
    paddingHorizontal: 16,
  },
  productCardWrapper: {
    width: 168,
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
    marginBottom: 2,
    boxShadow:
      " rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgb(209, 213, 219) 0px 0px 0px 1px inset",
  },
  productImageContainer: {
    width: "100%",
    height: 140,
    position: "relative",
    overflow: "hidden",
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
    fontWeight: "700",
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
  quantityBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
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
  productPreviousPrice: {
    fontSize: 14,
    color: "#999",
    textDecorationLine: "line-through",
    marginLeft: 8,
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
    width: 40,
    height: 40,
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
    height: 23,
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
    fontSize: 13,
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
});
