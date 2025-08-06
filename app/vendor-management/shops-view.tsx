import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  FlatList,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { vendorApi, menuApi } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

interface Shop {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  isActive: boolean;
  rating: number;
  totalOrders: number;
  productsCount: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  stock: number;
  image?: string;
  subCategoryId?: string;
}

export default function ShopManagement() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchShops = useCallback(async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        Alert.alert("Error", "Please log in again");
        return;
      }

      const response = await vendorApi.getVendorByUserId(userId);
      if (response && response.shops) {
        const shopList = response.shops || [];
        setShops(shopList);
        if (shopList.length > 0) {
          setSelectedShop(shopList[0]);
          fetchProducts(shopList[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching shops:", error);
      Alert.alert("Error", "Failed to fetch shops");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  const fetchProducts = async (shopId: string) => {
    try {
      // For now, we'll simulate shop products. In a real app, this would be a shop-specific API
      const response = await menuApi.getMenusByRestaurant(shopId);
      setProducts(response || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      Alert.alert("Error", "Failed to fetch products");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShops();
    setRefreshing(false);
  };

  const selectShop = (shop: Shop) => {
    setSelectedShop(shop);
    fetchProducts(shop.id);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.productDetails}>
            <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
            <View style={styles.productMeta}>
              <Text style={styles.productStock}>Stock: {item.stock || 0}</Text>
              <View
                style={[
                  styles.availabilityBadge,
                  { backgroundColor: item.isAvailable ? "#10B981" : "#EF4444" },
                ]}
              >
                <Text style={styles.availabilityText}>
                  {item.isAvailable ? "In Stock" : "Out of Stock"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Shop Inventory</Text>
            <Text style={styles.headerSubtitle}>Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading shops...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (shops.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Shop Inventory</Text>
            <Text style={styles.headerSubtitle}>No shops found</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Shop Found</Text>
          <Text style={styles.emptyDescription}>
            Please contact admin to set up your shop.
          </Text>
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
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Shop Inventory</Text>
          <Text style={styles.headerSubtitle}>
            {selectedShop ? selectedShop.name : "Select a shop"}
          </Text>
        </View>
      </View>

      {/* Shop Selector */}
      {shops.length > 1 && (
        <View style={styles.shopSelector}>
          <FlatList
            horizontal
            data={shops}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.shopChip,
                  selectedShop?.id === item.id && styles.shopChipActive,
                ]}
                onPress={() => selectShop(item)}
              >
                <Text
                  style={[
                    styles.shopChipText,
                    selectedShop?.id === item.id && styles.shopChipTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shopSelectorContent}
          />
        </View>
      )}

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <LinearGradient
          colors={["#EBF8FF", "#DBEAFE"]}
          style={styles.infoBannerGradient}
        >
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.infoBannerText}>
            Product management is handled by admin. Contact support for changes.
          </Text>
        </LinearGradient>
      </View>

      {/* Products List */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Products</Text>
            <Text style={styles.emptyDescription}>
              Contact admin to add products for your shop.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  shopSelector: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  shopSelectorContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  shopChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  shopChipActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  shopChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  shopChipTextActive: {
    color: "#FFF",
  },
  infoBanner: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  infoBannerGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: "#1E40AF",
    fontWeight: "500",
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  productCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: "row",
    padding: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 20,
  },
  productDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3B82F6",
  },
  productMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  productStock: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 40,
  },
});
