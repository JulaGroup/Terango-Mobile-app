import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  store?: {
    id: string;
    name: string;
    rating: number;
  };
}

interface HomeEssentialsProps {
  onViewAll?: () => void;
}

export default function HomeEssentials({ onViewAll }: HomeEssentialsProps) {
  const [cleaningSupplies, setCleaningSupplies] = useState<Product[]>([]);
  const [homeUtilities, setHomeUtilities] = useState<Product[]>([]);
  const [toiletries, setToiletries] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeProducts();
  }, []);

  const fetchHomeProducts = async () => {
    try {
      // Fetch cleaning supplies, home utilities, and toiletries
      const [cleaningResponse, utilitiesResponse, toiletriesResponse] =
        await Promise.all([
          fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/api/public/products-by-subcategory/b8f9cf07-7875-492d-8269-8ea393515ebe?limit=2`
          ), // Cleaning Supplies
          fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/api/public/products-by-subcategory/4a72494c-3929-461b-ae0a-1f5f6e4be0fb?limit=2`
          ), // Home Utilities
          fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/api/public/products-by-subcategory/d2633442-5433-4001-8611-3ec49c881482?limit=2`
          ), // Toiletries
        ]);

      const cleaningData = await cleaningResponse.json();
      const utilitiesData = await utilitiesResponse.json();
      const toiletriesData = await toiletriesResponse.json();

      if (cleaningData.success) {
        setCleaningSupplies(cleaningData.data || []);
      }
      if (utilitiesData.success) {
        setHomeUtilities(utilitiesData.data || []);
      }
      if (toiletriesData.success) {
        setToiletries(toiletriesData.data || []);
      }
    } catch (error) {
      console.error("Error fetching home products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductPress = (
    product: Product,
    subcategoryId: string,
    subcategoryName: string
  ) => {
    router.push({
      pathname: "/SubCategoryProductsPage",
      params: {
        subcategoryId,
        subcategoryName,
        productId: product.id,
      },
    });
  };

  const handleViewAllCleaning = () => {
    router.push({
      pathname: "/SubCategoryProductsPage",
      params: {
        subcategoryId: "b8f9cf07-7875-492d-8269-8ea393515ebe",
        subcategoryName: "Cleaning Supplies",
      },
    });
  };

  const handleViewAllUtilities = () => {
    router.push({
      pathname: "/SubCategoryProductsPage",
      params: {
        subcategoryId: "4a72494c-3929-461b-ae0a-1f5f6e4be0fb",
        subcategoryName: "Home Utilities",
      },
    });
  };

  const handleViewAllToiletries = () => {
    router.push({
      pathname: "/SubCategoryProductsPage",
      params: {
        subcategoryId: "d2633442-5433-4001-8611-3ec49c881482",
        subcategoryName: "Toiletries",
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🏠 Home Essentials</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (
    cleaningSupplies.length === 0 &&
    homeUtilities.length === 0 &&
    toiletries.length === 0
  ) {
    return null;
  }

  const allProducts = [
    ...cleaningSupplies.map((p) => ({
      ...p,
      category: "cleaning",
      subcategoryId: "b8f9cf07-7875-492d-8269-8ea393515ebe",
      subcategoryName: "Cleaning Supplies",
    })),
    ...homeUtilities.map((p) => ({
      ...p,
      category: "utilities",
      subcategoryId: "4a72494c-3929-461b-ae0a-1f5f6e4be0fb",
      subcategoryName: "Home Utilities",
    })),
    ...toiletries.map((p) => ({
      ...p,
      category: "toiletries",
      subcategoryId: "d2633442-5433-4001-8611-3ec49c881482",
      subcategoryName: "Toiletries",
    })),
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "cleaning":
        return "#10B981";
      case "utilities":
        return "#3B82F6";
      case "toiletries":
        return "#8B5CF6";
      default:
        return "#6B7280";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "cleaning":
        return "sparkles";
      case "utilities":
        return "home";
      case "toiletries":
        return "water";
      default:
        return "cube";
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "cleaning":
        return "Clean";
      case "utilities":
        return "Home";
      case "toiletries":
        return "Care";
      default:
        return "Home";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>🏠 Home Essentials</Text>
          <Text style={styles.subtitle}>Everything for your home</Text>
        </View>
      </View>

      {/* Quick Category Navigation */}
      <View style={styles.categoryNav}>
        <TouchableOpacity
          onPress={handleViewAllCleaning}
          style={styles.categoryChip}
        >
          <Ionicons name="sparkles" size={16} color="#10B981" />
          <Text style={[styles.categoryChipText, { color: "#10B981" }]}>
            Cleaning
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleViewAllUtilities}
          style={styles.categoryChip}
        >
          <Ionicons name="home" size={16} color="#3B82F6" />
          <Text style={[styles.categoryChipText, { color: "#3B82F6" }]}>
            Utilities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleViewAllToiletries}
          style={styles.categoryChip}
        >
          <Ionicons name="water" size={16} color="#8B5CF6" />
          <Text style={[styles.categoryChipText, { color: "#8B5CF6" }]}>
            Toiletries
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {allProducts.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={styles.productCard}
            onPress={() =>
              handleProductPress(
                product,
                product.subcategoryId,
                product.subcategoryName
              )
            }
            activeOpacity={0.8}
          >
            <View style={styles.imageContainer}>
              {product.image ? (
                <Image
                  source={{ uri: product.image }}
                  style={styles.productImage}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons
                    name={getCategoryIcon(product.category)}
                    size={24}
                    color="#9CA3AF"
                  />
                </View>
              )}
              <View
                style={[
                  styles.badge,
                  { backgroundColor: getCategoryColor(product.category) },
                ]}
              >
                <Text style={styles.badgeText}>
                  {getCategoryBadge(product.category)}
                </Text>
              </View>
            </View>

            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.productDescription} numberOfLines={1}>
                {product.description || "Home essential item"}
              </Text>
              <View style={styles.priceRow}>
                <Text
                  style={[
                    styles.price,
                    { color: getCategoryColor(product.category) },
                  ]}
                >
                  D{product.price.toFixed(2)}
                </Text>
                {product.store && (
                  <View style={styles.storeInfo}>
                    <Ionicons name="star" size={12} color="#FCD34D" />
                    <Text style={styles.rating}>
                      {product.store.rating.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  categoryNav: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  productCard: {
    width: 150,
    marginRight: 12,
    backgroundColor: "#FFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: 110,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: 110,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFF",
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
    lineHeight: 18,
  },
  productDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
  },
  storeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  rating: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  loadingContainer: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
});
