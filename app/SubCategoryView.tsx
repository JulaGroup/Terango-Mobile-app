import React, { useState, useEffect, useCallback } from "react";
import { TextInput } from "react-native";
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
  RefreshControl,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { API_URL } from "@/constants/config";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/common/ProductCard";

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
  openingHours?: any;
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
}

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  shopId: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
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
    { key: "restaurants", label: "Restaurants", count: counts.restaurants },
    { key: "shops", label: "Stores", count: counts.shops },
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

// Restaurant Card Component
const RestaurantCard = ({ restaurant }: { restaurant: Restaurant }) => {
  const router = useRouter();
  const [imageLoadError, setImageLoadError] = useState(false);

  const rating = restaurant.rating || Math.random() * (5.0 - 3.5) + 3.5;
  const reviewCount =
    restaurant.totalReviews || Math.floor(Math.random() * 450 + 50);

  return (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() =>
        router.push({
          pathname: "/restaurant-details",
          params: { restaurantId: restaurant.id },
        })
      }
      activeOpacity={0.85}
    >
      <View style={styles.restaurantImageContainer}>
        {restaurant.imageUrl && !imageLoadError ? (
          <Image
            source={{ uri: restaurant.imageUrl }}
            style={styles.restaurantImage}
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <View style={styles.restaurantImagePlaceholder}>
            <Ionicons name="restaurant-outline" size={40} color="#ccc" />
          </View>
        )}

        {restaurant.isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>OPEN</Text>
          </View>
        )}

        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text style={styles.restaurantDesc} numberOfLines={2}>
          {restaurant.description || "Delicious food served fresh"}
        </Text>

        <View style={styles.restaurantFooter}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.locationText} numberOfLines={1}>
              {restaurant.address || restaurant.city || "Location"}
            </Text>
          </View>
          <Text style={styles.reviewText}>{reviewCount} reviews</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Shop Card Component
const ShopCard = ({ shop }: { shop: Shop }) => {
  const router = useRouter();
  const [imageLoadError, setImageLoadError] = useState(false);

  const rating = shop.rating || Math.random() * (5.0 - 3.5) + 3.5;
  const reviewCount = shop.totalReviews || Math.floor(Math.random() * 450 + 50);

  return (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() =>
        router.push({
          pathname: "/shop-details",
          params: { shopId: shop.id },
        })
      }
      activeOpacity={0.8}
    >
      <View style={styles.shopImageContainer}>
        {shop.imageUrl && !imageLoadError ? (
          <Image
            source={{ uri: shop.imageUrl }}
            style={styles.shopImage}
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <View style={styles.shopImagePlaceholder}>
            <Ionicons name="storefront" size={40} color="#ccc" />
          </View>
        )}

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: shop.isActive
                ? "rgba(0,200,81,0.9)"
                : "rgba(239,68,68,0.9)",
            },
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {shop.isActive ? "Open" : "Closed"}
          </Text>
        </View>

        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.shopInfo}>
        <Text style={styles.shopName} numberOfLines={1}>
          {shop.name}
        </Text>
        <Text style={styles.shopDesc} numberOfLines={2}>
          {shop.description || "Quality products served fresh"}
        </Text>

        {shop.shopType && (
          <View style={styles.shopTypeBadge}>
            <Text style={styles.shopTypeBadgeText}>{shop.shopType}</Text>
          </View>
        )}

        {shop.minimumOrderAmount !== undefined && (
          <Text style={styles.minOrderText}>
            Min. order: D{shop.minimumOrderAmount.toFixed(2)}
          </Text>
        )}

        <View style={styles.shopFooter}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.locationText} numberOfLines={1}>
              {`${shop.city ?? ""}${shop.city && shop.address ? ", " : ""}${
                shop.address ?? "Location"
              }`}
            </Text>
          </View>
          <Text style={styles.reviewText}>{reviewCount} reviews</Text>
        </View>

        {shop.acceptsOrders && (
          <View style={styles.acceptsOrdersBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#27AE60" />
            <Text style={styles.acceptsOrdersText}>Accepts Orders</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Menu Item Card Component
const MenuItemCard = ({ menuItem }: { menuItem: MenuItem }) => {
  const { addToCart, cartItems, removeFromCart, updateQuantity } = useCart();
  const [imageLoadError, setImageLoadError] = useState(false);

  const cartQuantity =
    cartItems.find((item) => item.id === menuItem.id)?.quantity || 0;

  const handleAddToCart = () => {
    // Determine entityType dynamically
    let entityType = "restaurant";
    if (menuItem.menu && menuItem.menu.restaurantId) {
      entityType = "restaurant";
    } else if ((menuItem as any).shopId) {
      entityType = "shop";
    } else if ((menuItem as any).pharmacyId) {
      entityType = "pharmacy";
    }
    const cartItem = {
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      description: menuItem.description || "",
      vendorId:
        menuItem.menu?.restaurantId ||
        (menuItem as any).shopId ||
        (menuItem as any).pharmacyId ||
        "",
      vendorName: entityType.charAt(0).toUpperCase() + entityType.slice(1),
      imageUrl: menuItem.imageUrl || "",
      entityType,
    };
    addToCart(cartItem);
  };

  const handleRemove = () => {
    if (cartQuantity > 1) {
      updateQuantity(menuItem.id, cartQuantity - 1);
    } else {
      removeFromCart(menuItem.id);
    }
  };

  return (
    <View style={styles.menuItemCard}>
      <View style={styles.menuItemImageContainer}>
        {menuItem.imageUrl && !imageLoadError ? (
          <Image
            source={{ uri: menuItem.imageUrl }}
            style={styles.menuItemImage}
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <View style={styles.menuItemImagePlaceholder}>
            <Ionicons name="restaurant" size={32} color="#E5E5E5" />
          </View>
        )}

        {!menuItem.isAvailable && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>Unavailable</Text>
          </View>
        )}

        {/* Add/Quantity Controls */}
        {cartQuantity === 0 ? (
          <TouchableOpacity
            style={styles.floatingAddButton}
            onPress={handleAddToCart}
            activeOpacity={0.8}
            disabled={!menuItem.isAvailable}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
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
              onPress={handleAddToCart}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.menuItemInfo}>
        <Text style={styles.menuItemName} numberOfLines={2}>
          {menuItem.name}
        </Text>
        {menuItem.description && (
          <Text style={styles.menuItemDesc} numberOfLines={2}>
            {menuItem.description}
          </Text>
        )}
        <Text style={styles.menuItemPrice}>D{menuItem.price.toFixed(2)}</Text>
      </View>
    </View>
  );
};

// Main Component
export default function SubCategoryView() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { subCategoryId, subCategoryName } = useLocalSearchParams();
  const { cartItems } = useCart();

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
    console.log(subCategoryId);
    try {
      setError(null);
      const response = await fetch(
        `${API_URL}/api/subcategories/${subCategoryId}/entities`
      );
      console.log("response############" + JSON.stringify(response));
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
  useEffect(() => {
    console.log("Updated data:", data);
  }, [data]);
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

  const getCounts = () => {
    const restaurants = data.restaurants.length;
    const shops = data.shops.length;
    const products = data.products.length;
    const menuItems = data.menuItems.length;
    const all = restaurants + shops + products + menuItems;

    return { all, restaurants, shops, products, menuItems };
  };

  const renderContent = () => {
    if (activeTab === "all") {
      return (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              {data.restaurants.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Restaurants</Text>
                    <Text style={styles.sectionCount}>
                      {data.restaurants.length}
                    </Text>
                  </View>
                  <FlatList
                    data={data.restaurants}
                    horizontal
                    keyExtractor={(item) => `restaurant-${item.id}`}
                    renderItem={({ item }) => (
                      <View style={{ marginRight: 16 }}>
                        <RestaurantCard restaurant={item} />
                      </View>
                    )}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                  />
                </View>
              )}
              {data.shops.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Stores</Text>
                    <Text style={styles.sectionCount}>{data.shops.length}</Text>
                  </View>
                  <FlatList
                    data={data.shops}
                    horizontal
                    keyExtractor={(item) => `shop-${item.id}`}
                    renderItem={({ item }) => (
                      <View style={{ marginRight: 16 }}>
                        <ShopCard shop={item} />
                      </View>
                    )}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                  />
                </View>
              )}
              {data.products.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Products</Text>
                    <Text style={styles.sectionCount}>
                      {data.products.length}
                    </Text>
                  </View>
                  <FlatList
                    data={data.products}
                    horizontal
                    keyExtractor={(item) => `product-${item.id}`}
                    renderItem={({ item }) => (
                      <ProductCard
                        product={{
                          id: Number(item.id),
                          name: item.name,
                          price: item.price,
                          image: item.imageUrl,
                          description: item.description,
                          inStock: true,
                        }}
                        cartQuantity={
                          cartItems.find((ci) => ci.id === item.id)?.quantity ||
                          0
                        }
                        onAddToCart={() => {
                          /* Handle add to cart */
                        }}
                        onRemoveFromCart={() => {
                          /* Handle remove from cart */
                        }}
                      />
                    )}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                  />
                </View>
              )}
              {data.menuItems.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Meals</Text>
                    <Text style={styles.sectionCount}>
                      {data.menuItems.length}
                    </Text>
                  </View>
                  <FlatList
                    data={data.menuItems}
                    horizontal
                    keyExtractor={(item) => `menu-${item.id}`}
                    renderItem={({ item }) => (
                      <View style={{ marginRight: 16 }}>
                        <MenuItemCard menuItem={item} />
                      </View>
                    )}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                  />
                </View>
              )}
            </>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      );
    }

    // Filtered view for specific tabs
    if (activeTab === "restaurants") {
      if (data.restaurants.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Restaurants Found</Text>
            <Text style={styles.emptySubtitle}>
              There are no restaurants in this category yet.
            </Text>
          </View>
        );
      }
      return (
        <FlatList
          data={data.restaurants}
          key={`restaurants-fullwidth`}
          keyExtractor={(item) => `restaurant-${item.id}`}
          renderItem={({ item }) => (
            <View style={{ width: "100%", marginBottom: 16 }}>
              <RestaurantCard restaurant={item} />
            </View>
          )}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 8,
          }}
          showsVerticalScrollIndicator={false}
        />
      );
    } else if (activeTab === "shops") {
      if (data.shops.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Stores Found</Text>
            <Text style={styles.emptySubtitle}>
              There are no stores in this category yet.
            </Text>
          </View>
        );
      }
      return (
        <FlatList
          data={data.shops}
          numColumns={2}
          key={`shops-2col`}
          keyExtractor={(item) => `shop-${item.id}`}
          renderItem={({ item }) => (
            <View
              style={{
                width: (width - 48) / 2,
                marginRight: 16,
                marginBottom: 16,
              }}
            >
              <ShopCard shop={item} />
            </View>
          )}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        />
      );
    } else if (activeTab === "products") {
      if (data.products.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptySubtitle}>
              There are no products in this category yet.
            </Text>
          </View>
        );
      }
      // Use same card width/height as MenuItemCard for consistency
      const cardWidth = (width - 56) / 2;
      return (
        <FlatList
          data={data.products}
          numColumns={2}
          key={`products-2col`}
          keyExtractor={(item) => `product-${item.id}`}
          renderItem={({ item, index }) => {
            const isLeft = index % 2 === 0;
            const cartQuantity =
              cartItems.find((ci) => ci.id === item.id)?.quantity || 0;
            return (
              <View
                style={{
                  width: cardWidth,
                  marginLeft: isLeft ? 0 : 16,
                  marginRight: isLeft ? 8 : 0,
                  marginBottom: 20,
                  // Match MenuItemCard style
                }}
              >
                <ProductCard
                  product={{
                    id: Number(item.id),
                    name: item.name,
                    price: item.price,
                    image: item.imageUrl,
                    description: item.description,
                    inStock: true,
                  }}
                  cartQuantity={cartQuantity}
                  onAddToCart={() => {
                    // Add to cart logic
                  }}
                  onRemoveFromCart={() => {
                    // Remove from cart logic
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
          columnWrapperStyle={{ justifyContent: "space-between" }}
          showsVerticalScrollIndicator={false}
        />
      );
    } else if (activeTab === "menuItems") {
      if (data.menuItems.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Meals Found</Text>
            <Text style={styles.emptySubtitle}>
              There are no meals in this category yet.
            </Text>
          </View>
        );
      }
      return (
        <FlatList
          data={data.menuItems}
          numColumns={2}
          key={`menuItems-2col`}
          keyExtractor={(item) => `menu-${item.id}`}
          renderItem={({ item, index }) => {
            // Reduce card width and add more spacing to prevent overlap
            const cardWidth = (width - 56) / 2;
            const isLeft = index % 2 === 0;
            return (
              <View
                style={{
                  width: cardWidth,
                  marginLeft: isLeft ? 0 : 16,
                  marginRight: isLeft ? 8 : 0,
                  marginBottom: 20,
                  //   padding: 2,
                }}
              >
                <MenuItemCard menuItem={item} />
              </View>
            );
          }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 8,
          }}
          columnWrapperStyle={{ justifyContent: "space-between" }}
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
              No restaurants, stores, products, or meals are available in this
              category yet.
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
  },
  searchBarInput: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    paddingVertical: 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
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
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 8,
  },
  tabsContent: {
    paddingHorizontal: 20,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabButtonActive: {
    backgroundColor: PrimaryColor,
    borderColor: PrimaryColor,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  tabButtonTextActive: {
    color: "#fff",
  },
  tabBadge: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tabBadgeTextActive: {
    color: "#fff",
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
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
});
