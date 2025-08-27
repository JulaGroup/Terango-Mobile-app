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

// Related Product Card Component
interface RelatedProductCardProps {
  product: Product;
  onPress: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  cartQuantity: number;
}

const RelatedProductCard = ({
  product,
  onPress,
  onAddToCart,
  cartQuantity,
}: RelatedProductCardProps) => {
  const [imageLoadError, setImageLoadError] = useState(false);

  return (
    <TouchableOpacity
      style={styles.relatedProductCard}
      onPress={() => onPress(product.id)}
      activeOpacity={0.8}
    >
      <View style={styles.relatedProductImageContainer}>
        {product.imageUrl && !imageLoadError ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.relatedProductImage}
            resizeMode="cover"
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <View style={styles.relatedProductImagePlaceholder}>
            <Ionicons name="image-outline" size={24} color="#E5E5E5" />
          </View>
        )}

        {/* Quick Add Button */}
        <TouchableOpacity
          style={styles.quickAddButton}
          onPress={() => onAddToCart(product)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>

        {cartQuantity > 0 && (
          <View style={styles.cartQuantityBadge}>
            <Text style={styles.cartQuantityText}>{cartQuantity}</Text>
          </View>
        )}
      </View>

      <View style={styles.relatedProductInfo}>
        <Text style={styles.relatedProductName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.relatedProductPrice}>
          D{product.price.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Product Detail Skeleton
const ProductDetailSkeleton = () => {
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
        <SkeletonLoader width="80%" height={24} style={{ marginBottom: 12 }} />
        <SkeletonLoader width="100%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="60%" height={16} style={{ marginBottom: 20 }} />
        <SkeletonLoader width={120} height={32} style={{ marginBottom: 30 }} />

        {/* Related Items Skeleton */}
        <SkeletonLoader width="50%" height={20} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[1, 2, 3].map((item) => (
            <SkeletonLoader
              key={item}
              width={140}
              height={180}
              style={{ borderRadius: 12 }}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

// Product Interface
interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  shopId: string;
  shop?: {
    id: string;
    name: string;
  };
  subCategory?: {
    id: string;
    name: string;
  };
  stock?: number;
  rating?: number;
  totalReviews?: number;
}

export default function ProductDetail() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  // Fetch product details
  const fetchProductDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/products/${productId}`);
      console.log(response);
      if (!response.ok) {
        throw new Error(`Failed to fetch product: ${response.statusText}`);
      }

      const data = await response.json();
      setProduct(data);

      // Fetch related products from the same shop or category
      // if (data.shopId) {
      //   try {
      //     const relatedResponse = await fetch(
      //       `${API_URL}/api/products?shopId=${data.shopId}&limit=10&exclude=${productId}`
      //     );
      //     if (relatedResponse.ok) {
      //       const relatedData = await relatedResponse.json();
      //       setRelatedProducts(relatedData.slice(0, 6)); // Show max 6 related items
      //     }
      //   } catch (relatedError) {
      //     console.warn("Failed to fetch related products:", relatedError);
      //   }
      // }
    } catch (err: any) {
      console.error("Error fetching product details:", err);
      setError(err.message || "Failed to load product details");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
    }
  }, [productId, fetchProductDetails]);

  // Fade in animation when product data loads
  useEffect(() => {
    if (product && !loading) {
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
  }, [product, loading, fadeAnim, scaleAnim]);

  const handleAddToCart = (item: Product) => {
    if (!item.shop) return;

    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      description: item.description || "",
      vendorId: item.shop.id,
      vendorName: item.shop.name,
      imageUrl: item.imageUrl || "",
    };

    addToCart(cartItem);
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (!product) return;

    if (newQuantity === 0) {
      removeFromCart(product.id);
    } else {
      updateQuantity(product.id, newQuantity);
    }
  };

  const handleShare = async () => {
    if (!product) return;

    try {
      await Share.share({
        message: `Check out this product: ${
          product.name
        } - D${product.price.toFixed(2)}`,
        title: product.name,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // Here you would typically make an API call to save/remove from favorites
    Alert.alert(
      isFavorite ? "Removed from Favorites" : "Added to Favorites",
      isFavorite
        ? "Product removed from your favorites"
        : "Product added to your favorites"
    );
  };

  const handleRelatedProductPress = (relatedProductId: string) => {
    // router.push(`/(tabs)/product/${relatedProductId}`);
  };

  const getCartItemQuantity = (itemId: string): number => {
    const item = cartItems.find((cartItem) => cartItem.id === itemId);
    return item ? item.quantity : 0;
  };

  const currentQuantity = product ? getCartItemQuantity(product.id) : 0;

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || "Product not found"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchProductDetails}
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
        {/* Product Image */}
        <Animated.View
          style={[
            styles.imageContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {product.imageUrl && !imageLoadError ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
              onError={() => setImageLoadError(true)}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={60} color="#E5E5E5" />
              <Text style={styles.imagePlaceholderText}>
                No Image Available
              </Text>
            </View>
          )}

          {/* Stock Badge */}
          {product.stock !== undefined && (
            <View style={styles.stockBadge}>
              <View
                style={[
                  styles.stockDot,
                  {
                    backgroundColor: product.stock > 0 ? "#00C851" : "#FF6B6B",
                  },
                ]}
              />
              <Text style={styles.stockText}>
                {product.stock > 0
                  ? `${product.stock} in stock`
                  : "Out of stock"}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Product Info */}
        <Animated.View
          style={[
            styles.productInfo,
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
          <Text style={styles.productName}>{product.name}</Text>

          {product.description && (
            <Text style={styles.productDescription}>{product.description}</Text>
          )}

          {/* Rating & Reviews */}
          {product.rating && (
            <View style={styles.ratingContainer}>
              <View style={styles.rating}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {product.rating.toFixed(1)}
                </Text>
                {product.totalReviews && (
                  <Text style={styles.reviewsText}>
                    ({product.totalReviews} reviews)
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Shop Info */}
          {product.shop && (
            <View style={styles.shopInfo}>
              <Ionicons name="storefront-outline" size={16} color="#64748B" />
              <Text style={styles.shopName}>Sold by {product.shop.name}</Text>
            </View>
          )}

          <View style={styles.priceContainer}>
            <Text style={styles.price}>D{product.price.toFixed(2)}</Text>
            {/* Optional: Add previous price for discounts */}
          </View>
        </Animated.View>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <Animated.View
            style={[
              styles.relatedSection,
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Related Items</Text>
              <TouchableOpacity
                // onPress={() => router.push(`/(tabs)/shop/${product.shopId}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={relatedProducts}
              renderItem={({ item }) => (
                <RelatedProductCard
                  product={item}
                  onPress={handleRelatedProductPress}
                  onAddToCart={handleAddToCart}
                  cartQuantity={getCartItemQuantity(item.id)}
                />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedProductsList}
              ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
              snapToInterval={160}
              decelerationRate="fast"
            />
          </Animated.View>
        )}

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
            style={styles.addToCartButton}
            onPress={() => handleAddToCart(product)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[PrimaryColor, "#FF6B00"]}
              style={styles.addToCartGradient}
            >
              <Ionicons name="cart-outline" size={20} color="#fff" />
              <Text style={styles.addToCartText}>Add to Cart</Text>
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
  productImage: {
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
  stockBadge: {
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
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stockText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "600",
  },
  productInfo: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  productDescription: {
    fontSize: 16,
    color: "#64748B",
    lineHeight: 24,
    letterSpacing: -0.2,
    marginBottom: 16,
  },
  ratingContainer: {
    marginBottom: 16,
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 8,
  },
  shopInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  shopName: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 6,
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
  relatedSection: {
    paddingTop: 32,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  seeAllText: {
    fontSize: 14,
    color: PrimaryColor,
    fontWeight: "600",
  },
  relatedProductsList: {
    paddingHorizontal: 20,
  },
  relatedProductCard: {
    width: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  relatedProductImageContainer: {
    width: "100%",
    height: 120,
    position: "relative",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
  },
  relatedProductImage: {
    width: "100%",
    height: "100%",
  },
  relatedProductImagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  quickAddButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    backgroundColor: PrimaryColor,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cartQuantityBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cartQuantityText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  relatedProductInfo: {
    padding: 12,
  },
  relatedProductName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    lineHeight: 18,
    marginBottom: 6,
  },
  relatedProductPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: PrimaryColor,
    letterSpacing: -0.3,
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
