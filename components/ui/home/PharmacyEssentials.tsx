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

interface PharmacyEssentialsProps {
  onViewAll?: () => void;
}

export default function PharmacyEssentials({
  onViewAll,
}: PharmacyEssentialsProps) {
  const [medicines, setMedicines] = useState<Product[]>([]);
  const [personalCare, setPersonalCare] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPharmacyProducts();
  }, []);

  const fetchPharmacyProducts = async () => {
    try {
      // Fetch both medicines and personal care products
      const [medicinesResponse, personalCareResponse] = await Promise.all([
        fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/public/products-by-subcategory/f41dd4c6-b7df-4df2-8190-36a02a152006?limit=3`
        ), // Medicines
        fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/public/products-by-subcategory/91769bbc-c354-4b97-ae8f-3b8b27727d57?limit=3`
        ), // Personal Care
      ]);

      const medicinesData = await medicinesResponse.json();
      const personalCareData = await personalCareResponse.json();

      if (medicinesData.success) {
        setMedicines(medicinesData.data || []);
      }
      if (personalCareData.success) {
        setPersonalCare(personalCareData.data || []);
      }
    } catch (error) {
      console.error("Error fetching pharmacy products:", error);
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

  const handleViewAllMedicines = () => {
    router.push({
      pathname: "/SubCategoryProductsPage",
      params: {
        subcategoryId: "f41dd4c6-b7df-4df2-8190-36a02a152006",
        subcategoryName: "Medicines",
      },
    });
  };

  const handleViewAllPersonalCare = () => {
    router.push({
      pathname: "/SubCategoryProductsPage",
      params: {
        subcategoryId: "91769bbc-c354-4b97-ae8f-3b8b27727d57",
        subcategoryName: "Personal Care",
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>💊 Pharmacy Essentials</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#EF4444" />
        </View>
      </View>
    );
  }

  if (medicines.length === 0 && personalCare.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>💊 Pharmacy Essentials</Text>
          <Text style={styles.subtitle}>Health & wellness products</Text>
        </View>
      </View>

      {/* Medicines Section */}
      {medicines.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Medicines</Text>
            <TouchableOpacity
              onPress={handleViewAllMedicines}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {medicines.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() =>
                  handleProductPress(
                    product,
                    "f41dd4c6-b7df-4df2-8190-36a02a152006",
                    "Medicines"
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
                      <Ionicons name="medical" size={24} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={[styles.badge, { backgroundColor: "#EF4444" }]}>
                    <Text style={styles.badgeText}>Rx</Text>
                  </View>
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.productDescription} numberOfLines={1}>
                    {product.description || "Pharmacy medicine"}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.price, { color: "#EF4444" }]}>
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
      )}

      {/* Personal Care Section */}
      {personalCare.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Care</Text>
            <TouchableOpacity
              onPress={handleViewAllPersonalCare}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color="#8B5CF6" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {personalCare.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() =>
                  handleProductPress(
                    product,
                    "91769bbc-c354-4b97-ae8f-3b8b27727d57",
                    "Personal Care"
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
                      <Ionicons name="heart" size={24} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={[styles.badge, { backgroundColor: "#8B5CF6" }]}>
                    <Text style={styles.badgeText}>Care</Text>
                  </View>
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.productDescription} numberOfLines={1}>
                    {product.description || "Personal care item"}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.price, { color: "#8B5CF6" }]}>
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
      )}
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
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  productCard: {
    width: 140,
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
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FFF",
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 3,
    lineHeight: 16,
  },
  productDescription: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
  },
  storeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  rating: {
    fontSize: 10,
    fontWeight: "500",
    color: "#6B7280",
  },
  loadingContainer: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
});
