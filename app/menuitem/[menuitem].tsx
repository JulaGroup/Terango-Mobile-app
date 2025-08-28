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
  Share,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { API_URL } from "@/constants/config";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const IMAGE_HEIGHT = 300;
const HEADER_HEIGHT = 60;

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

// Menu Item Detail Skeleton
const MenuItemDetailSkeleton = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header Skeleton */}
      <View style={styles.header}>
        <SkeletonLoader width={40} height={40} style={{ borderRadius: 20 }} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SkeletonLoader width={40} height={40} style={{ borderRadius: 20 }} />
          <SkeletonLoader width={40} height={40} style={{ borderRadius: 20 }} />
        </View>
      </View>

      {/* Image Skeleton */}
      <SkeletonLoader
        width="100%"
        height={IMAGE_HEIGHT}
        style={{ marginBottom: 20 }}
      />

      {/* Content Skeleton */}
      <View style={{ paddingHorizontal: 20 }}>
        <SkeletonLoader width="80%" height={28} style={{ marginBottom: 12 }} />
        <SkeletonLoader width="100%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="70%" height={16} style={{ marginBottom: 16 }} />
        
        {/* Restaurant Info Skeleton */}
        <SkeletonLoader width="60%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="50%" height={16} style={{ marginBottom: 16 }} />
        
        {/* Details Skeleton */}
        <SkeletonLoader width="40%" height={20} style={{ marginBottom: 12 }} />
        <SkeletonLoader width="30%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="35%" height={16} style={{ marginBottom: 20 }} />
        
        <SkeletonLoader width={120} height={36} style={{ marginBottom: 30 }} />
      </View>
    </SafeAreaView>
  );
};

// Menu Item Interface
interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  preparationTime?: number;
  mealTime?: string;
  isAvailable: boolean;
  menu: {
    id: string;
    title: string;
    restaurant: {
      id: string;
      name: string;
      description?: string;
      address: string;
      city: string;
      phone: string;
      rating: number;
      totalReviews: number;
      minimumOrderAmount: number;
      acceptsOrders: boolean;
      imageUrl?: string;
    };
  };
  subCategory?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export default function MenuItemDetailPage() {
  const router = useRouter();
  const { menuitem } = useLocalSearchParams<{ menuitem: string }>();
  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();

  const [loading, setLoading] = useState(true);
  const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  // Fetch menu item details
  const fetchMenuItemDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/menuitem/${menuitem}`);
      console.log("Fetching menu item:", response);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch menu item: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Fetched menu item:", data);
      setMenuItem(data);
    } catch (err: any) {
      console.error("Error fetching menu item details:", err);
      setError(err.message || "Failed to load menu item details");
    } finally {
      setLoading(false);
    }
  }, [menuitem]);

  useEffect(() => {
    if (menuitem) {
      fetchMenuItemDetails();
    }
  }, [menuitem, fetchMenuItemDetails]);

  // Fade in animation when menu item data loads
  useEffect(() => {
    if (menuItem && !loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [menuItem, loading, fadeAnim, scaleAnim]);

  const handleAddToCart = (item: MenuItem) => {
    if (!item.menu?.restaurant) return;

    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      description: item.description || "",
      vendorId: item.menu.restaurant.id,
      vendorName: item.menu.restaurant.name,
      imageUrl: item.imageUrl || "",
      entityType: "restaurant" as const,
    };

    addToCart(cartItem);
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (!menuItem) return;

    if (newQuantity === 0) {
      removeFromCart(menuItem.id);
    } else {
      updateQuantity(menuItem.id, newQuantity);
    }
  };

  const handleShare = async () => {
    if (!menuItem) return;

    try {
      await Share.share({
        message: `Check out this delicious item: ${
          menuItem.name
        } from ${menuItem.menu.restaurant.name} - D${menuItem.price.toFixed(2)}`,
        title: menuItem.name,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    Alert.alert(
      isFavorite ? "Removed from Favorites" : "Added to Favorites",
      isFavorite
        ? "Item removed from your favorites"
        : "Item added to your favorites"
    );
  };

  const getCartItemQuantity = (itemId: string): number => {
    const item = cartItems.find((cartItem) => cartItem.id === itemId);
    return item ? item.quantity : 0;
  };

  const currentQuantity = menuItem ? getCartItemQuantity(menuItem.id) : 0;
  const canOrder = menuItem?.isAvailable && menuItem?.menu?.restaurant?.acceptsOrders;

  if (loading) {
    return <MenuItemDetailSkeleton />;
  }

  if (error || !menuItem) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.errorContainer}>
          <Ionicons name="restaurant-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || "Menu item not found"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchMenuItemDetails}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerRightButtons}>
          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: isFavorite ? "#FEF2F2" : "#F8FAFC" },
            ]}
            onPress={handleToggleFavorite}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? "#EF4444" : "#64748B"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Menu Item Image */}
        <Animated.View
          style={[
            styles.imageContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {menuItem.imageUrl && !imageLoadError ? (
            <Image
              source={{ uri: menuItem.imageUrl }}
              style={styles.menuItemImage}
              resizeMode="cover"
              onError={() => setImageLoadError(true)}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="restaurant-outline" size={60} color="#E5E5E5" />
              <Text style={styles.imagePlaceholderText}>
                No Image Available
              </Text>
            </View>
          )}

          {/* Availability Badge */}
          <View style={styles.availabilityBadge}>
            <View
              style={[
                styles.availabilityDot,
                {
                  backgroundColor: canOrder ? "#00C851" : "#FF6B6B",
                },
              ]}
            />
            <Text style={styles.availabilityText}>
              {canOrder ? "Available" : "Unavailable"}
            </Text>
          </View>

          {/* Meal Time Badge */}
          {menuItem.mealTime && (
            <View style={styles.mealTimeBadge}>
              <Ionicons 
                name={
                  menuItem.mealTime === "breakfast" ? "sunny-outline" :
                  menuItem.mealTime === "lunch" ? "partly-sunny-outline" :
                  menuItem.mealTime === "dinner" ? "moon-outline" : "time-outline"
                } 
                size={12} 
                color="#fff" 
              />
              <Text style={styles.mealTimeText}>
                {menuItem.mealTime.charAt(0).toUpperCase() + menuItem.mealTime.slice(1)}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Menu Item Info */}
        <Animated.View
          style={[
            styles.menuItemInfo,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.menuItemName}>{menuItem.name}</Text>

          {menuItem.description && (
            <Text style={styles.menuItemDescription}>{menuItem.description}</Text>
          )}

          {/* Category Info */}
          {menuItem.subCategory && (
            <View style={styles.categoryInfo}>
              <Ionicons name="pricetag-outline" size={16} color="#64748B" />
              <Text style={styles.categoryName}>{menuItem.subCategory.name}</Text>
            </View>
          )}

          {/* Restaurant Info */}
          <TouchableOpacity 
            style={styles.restaurantInfo}
            activeOpacity={0.7}
            onPress={() => {
              // Navigate to restaurant details
              // router.push(`/restaurant/${menuItem.menu.restaurant.id}`);
            }}
          >
            <View style={styles.restaurantImageContainer}>
              {menuItem.menu.restaurant.imageUrl ? (
                <Image
                  source={{ uri: menuItem.menu.restaurant.imageUrl }}
                  style={styles.restaurantImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.restaurantImagePlaceholder}>
                  <Ionicons name="restaurant-outline" size={16} color="#94A3B8" />
                </View>
              )}
            </View>
            <View style={styles.restaurantDetails}>
              <Text style={styles.restaurantName}>{menuItem.menu.restaurant.name}</Text>
              <View style={styles.restaurantMeta}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={styles.ratingText}>
                    {menuItem.menu.restaurant.rating > 0 
                      ? menuItem.menu.restaurant.rating.toFixed(1) 
                      : "New"}
                  </Text>
                </View>
                <Text style={styles.separatorDot}>•</Text>
                <Text style={styles.addressText}>
                  {menuItem.menu.restaurant.city}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Details Section */}
          <View style={styles.detailsSection}>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={18} color="#64748B" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Preparation Time</Text>
                <Text style={styles.detailValue}>
                  {menuItem.preparationTime ? `${menuItem.preparationTime} mins` : "Not specified"}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="card-outline" size={18} color="#64748B" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Minimum Order</Text>
                <Text style={styles.detailValue}>
                  D{menuItem.menu.restaurant.minimumOrderAmount.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={18} color="#64748B" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>
                  {menuItem.menu.restaurant.address}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>D{menuItem.price.toFixed(2)}</Text>
            {!canOrder && (
              <Text style={styles.unavailableText}>Currently unavailable</Text>
            )}
          </View>
        </Animated.View>

        {/* Bottom Spacing for Add to Cart Button */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Add to Cart Button */}
      <Animated.View
        style={[
          styles.addToCartContainer,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          },
        ]}
      >
        {currentQuantity === 0 ? (
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              { opacity: canOrder ? 1 : 0.5 }
            ]}
            onPress={() => canOrder && handleAddToCart(menuItem)}
            disabled={!canOrder}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={canOrder ? [PrimaryColor, "#FF6B00"] : ["#94A3B8", "#64748B"]}
              style={styles.addToCartGradient}
            >
              <Ionicons name="restaurant-outline" size={20} color="#fff" />
              <Text style={styles.addToCartText}>
                {canOrder ? "Add to Cart" : "Unavailable"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(currentQuantity - 1)}
              activeOpacity={0.8}
            >
              <Ionicons name="remove" size={18} color="#fff" />
            </TouchableOpacity>

            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityText}>{currentQuantity}</Text>
              <Text style={styles.quantityLabel}>
                {currentQuantity === 1 ? "item" : "items"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(currentQuantity + 1)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRightButtons: {
    flexDirection: "row",
    gap: 12,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: "100%",
    height: IMAGE_HEIGHT,
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  menuItemImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  imagePlaceholderText: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 8,
  },
  availabilityBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  availabilityText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "600",
  },
  mealTimeBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mealTimeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  menuItemInfo: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  menuItemName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  menuItemDescription: {
    fontSize: 16,
    color: "#64748B",
    lineHeight: 24,
    letterSpacing: -0.2,
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryName: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 6,
    fontWeight: "500",
  },
  restaurantInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  restaurantImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    marginRight: 12,
  },
  restaurantImage: {
    width: "100%",
    height: "100%",
  },
  restaurantImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  restaurantMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginLeft: 2,
  },
  separatorDot: {
    color: "#CBD5E1",
    fontSize: 12,
    marginHorizontal: 8,
  },
  addressText: {
    fontSize: 12,
    color: "#64748B",
    flex: 1,
  },
  detailsSection: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },
  priceContainer: {
    marginTop: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: "900",
    color: PrimaryColor,
    letterSpacing: -1,
  },
  unavailableText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
    marginTop: 4,
  },
  addToCartContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 34,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  addToCartButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  addToCartGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  addToCartText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PrimaryColor,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  quantityDisplay: {
    alignItems: "center",
    marginHorizontal: 32,
  },
  quantityText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  quantityLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
});