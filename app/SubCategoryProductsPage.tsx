import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
  Animated,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { menuApi } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { PrimaryColor } from "@/constants/Colors";

const { width } = Dimensions.get("window");
const ITEM_WIDTH = width / 2 - 24;

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable?: boolean;
  preparationTime?: number;
  imageUrl?: string;
  restaurantId: string;
  restaurantName?: string;
}

const SubCategoryProductsPage = () => {
  const { subCategoryId, subCategoryName } = useLocalSearchParams();
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { addToCart } = useCart();
  
  // Animation for items appearing
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const items = await menuApi.getMenuItemsBySubCategory(subCategoryId as string);
        
        // Transform the data if needed
        const transformedItems = items.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          price: item.price,
          imageUrl: item.imageUrl,
          isAvailable: item.isAvailable !== false,
          restaurantId: item.restaurantId,
          restaurantName: item.restaurant?.name || "Restaurant",
        }));
        
        setProducts(transformedItems);
      } catch (error) {
        console.error("Error loading products:", error);
        setError("Failed to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [subCategoryId]);

  // Animate items when loaded
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, fadeAnim, translateY]);

  const handleProductPress = (product: MenuItem) => {
    router.push({
      pathname: "/restaurant-details",
      params: { 
        id: product.restaurantId, 
        menuItemId: product.id 
      }
    });
  };

  const handleAddToCart = (product: MenuItem) => {
    // Add the product to cart
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      restaurantId: product.restaurantId,
      restaurantName: product.restaurantName || "Restaurant"
    });
    
    Alert.alert("Added to Cart", `${product.name} has been added to your cart.`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{subCategoryName}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColor} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{subCategoryName}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => setLoading(true)}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{subCategoryName}</Text>
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => router.push("/cart")}
        >
          <Ionicons name="cart-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptyDescription}>
            We couldn't find any products in this category. Please check back later.
          </Text>
        </View>
      ) : (
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateY }],
            },
          ]}
        >
          <Text style={styles.resultCount}>{products.length} products found</Text>
          
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.productCard}
                onPress={() => handleProductPress(item)}
                activeOpacity={0.8}
              >
                <View style={styles.imageContainer}>
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                    </View>
                  )}
                  {!item.isAvailable && (
                    <View style={styles.unavailableBadge}>
                      <Text style={styles.unavailableText}>Out of Stock</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.restaurantName} numberOfLines={1}>
                    {item.restaurantName}
                  </Text>
                  <Text style={styles.price}>D{item.price.toFixed(2)}</Text>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    !item.isAvailable && styles.disabledButton,
                  ]}
                  onPress={() => item.isAvailable && handleAddToCart(item)}
                  disabled={!item.isAvailable}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: PrimaryColor,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  contentContainer: {
    flex: 1,
  },
  resultCount: {
    fontSize: 14,
    color: "#6B7280",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: {
    padding: 12,
  },
  productCard: {
    width: ITEM_WIDTH,
    backgroundColor: "#FFF",
    borderRadius: 12,
    margin: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    position: "relative",
    overflow: "hidden",
  },
  imageContainer: {
    height: 140,
    width: "100%",
    position: "relative",
  },
  productImage: {
    height: "100%",
    width: "100%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderImage: {
    height: "100%",
    width: "100%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  unavailableBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(107, 114, 128, 0.8)",
    paddingVertical: 4,
    alignItems: "center",
  },
  unavailableText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  productInfo: {
    padding: 12,
    height: 90,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  restaurantName: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: PrimaryColor,
    marginTop: 4,
  },
  addButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: PrimaryColor,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});

export default SubCategoryProductsPage;
