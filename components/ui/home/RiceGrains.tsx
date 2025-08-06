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

interface RiceGrainsProps {
  onViewAll?: () => void;
}

export default function RiceGrains({ onViewAll }: RiceGrainsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiceGrains();
  }, []);

  const fetchRiceGrains = async () => {
    try {
      // Using the subcategory ID for Rice & Grains from your data
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/public/products-by-subcategory/cca76ff8-bc4e-4544-acc1-872c119943a5?limit=6`
      );
      const data = await response.json();

      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching rice & grains:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: "/SubCategoryProductsPage",
      params: {
        subcategoryId: "cca76ff8-bc4e-4544-acc1-872c119943a5",
        subcategoryName: "Rice & Grains",
        productId: product.id,
      },
    });
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push({
        pathname: "/SubCategoryProductsPage",
        params: {
          subcategoryId: "cca76ff8-bc4e-4544-acc1-872c119943a5",
          subcategoryName: "Rice & Grains",
        },
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🌾 Rice & Grains</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#10B981" />
        </View>
      </View>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>🌾 Rice & Grains</Text>
          <Text style={styles.subtitle}>Premium quality staples</Text>
        </View>
        <TouchableOpacity onPress={handleViewAll} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={16} color="#10B981" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {products.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={styles.productCard}
            onPress={() => handleProductPress(product)}
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
                  <Ionicons name="nutrition" size={24} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Fresh</Text>
              </View>
            </View>

            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.productDescription} numberOfLines={1}>
                {product.description || "Quality grains & rice"}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>D{product.price.toFixed(2)}</Text>
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
    paddingVertical: 16,
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
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  productCard: {
    width: 160,
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
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: 120,
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
    backgroundColor: "#10B981",
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
    color: "#10B981",
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
