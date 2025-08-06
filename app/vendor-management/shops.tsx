import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  FlatList,
  Modal,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";
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
  categories: string[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  stockQuantity: number;
  sku: string;
  image?: string;
}

export default function ShopManagement() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<"shop" | "product">("shop");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      // TODO: Fetch from API
      // Mock data for now
      setShops([
        {
          id: "1",
          name: "Gambian Crafts & Souvenirs",
          description: "Authentic Gambian crafts, textiles and souvenirs",
          address: "Serekunda Market, Serekunda",
          phone: "+220 987 6543",
          isActive: true,
          rating: 4.3,
          totalOrders: 45,
          productsCount: 78,
          categories: ["Crafts", "Textiles", "Souvenirs", "Jewelry"],
        },
      ]);
    } catch (error) {
      console.error("Error loading shops:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (shopId: string) => {
    try {
      // TODO: Fetch from API
      // Mock data for now
      setProducts([
        {
          id: "1",
          name: "Traditional Kente Cloth",
          description: "Handwoven colorful traditional cloth",
          price: 800,
          category: "Textiles",
          isAvailable: true,
          stockQuantity: 15,
          sku: "KNT001",
        },
        {
          id: "2",
          name: "Wooden Djembe Drum",
          description: "Authentic African djembe drum, hand-carved",
          price: 1200,
          category: "Crafts",
          isAvailable: true,
          stockQuantity: 8,
          sku: "DJM002",
        },
        {
          id: "3",
          name: "Gold-plated Bracelet",
          description: "Traditional Gambian gold-plated jewelry",
          price: 450,
          category: "Jewelry",
          isAvailable: false,
          stockQuantity: 0,
          sku: "JWL003",
        },
        {
          id: "4",
          name: "Baobab Seed Necklace",
          description: "Natural baobab seed beaded necklace",
          price: 180,
          category: "Jewelry",
          isAvailable: true,
          stockQuantity: 25,
          sku: "JWL004",
        },
      ]);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const ShopCard = ({ shop }: { shop: Shop }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => {
        setSelectedShop(shop);
        loadProducts(shop.id);
      }}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={shop.isActive ? ["#60A5FA", "#3B82F6"] : ["#9CA3AF", "#6B7280"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.shopGradient}
      >
        <View style={styles.shopHeader}>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{shop.name}</Text>
            <Text style={styles.shopDescription}>{shop.description}</Text>
            <View style={styles.shopMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.metaText}>{shop.rating}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="receipt-outline" size={14} color="#fff" />
                <Text style={styles.metaText}>{shop.totalOrders} orders</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="cube-outline" size={14} color="#fff" />
                <Text style={styles.metaText}>
                  {shop.productsCount} products
                </Text>
              </View>
            </View>
            <View style={styles.categoriesContainer}>
              {shop.categories.slice(0, 3).map((category, index) => (
                <View key={index} style={styles.categoryTag}>
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              ))}
              {shop.categories.length > 3 && (
                <Text style={styles.moreCategoriesText}>
                  +{shop.categories.length - 3} more
                </Text>
              )}
            </View>
          </View>
          <View style={styles.shopActions}>
            <View
              style={[
                styles.statusBadge,
                shop.isActive ? styles.activeBadge : styles.inactiveBadge,
              ]}
            >
              <Text style={styles.statusText}>
                {shop.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const ProductCard = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productContent}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productDescription}>{item.description}</Text>
          <View style={styles.productMeta}>
            <Text style={styles.productPrice}>D{item.price}</Text>
            <Text style={styles.productCategory}>{item.category}</Text>
            <Text style={styles.productSku}>SKU: {item.sku}</Text>
          </View>
          <View style={styles.stockInfo}>
            <Ionicons
              name={
                item.stockQuantity > 0 ? "checkmark-circle" : "close-circle"
              }
              size={16}
              color={item.stockQuantity > 0 ? "#10B981" : "#EF4444"}
            />
            <Text
              style={[
                styles.stockText,
                { color: item.stockQuantity > 0 ? "#10B981" : "#EF4444" },
              ]}
            >
              {item.stockQuantity > 0
                ? `${item.stockQuantity} in stock`
                : "Out of stock"}
            </Text>
          </View>
        </View>
        <View style={styles.productActions}>
          <Switch
            value={item.isAvailable}
            onValueChange={() => {
              // TODO: Update availability
              Alert.alert(
                "Coming Soon",
                "Product availability toggle coming soon!"
              );
            }}
            trackColor={{ false: "#E5E7EB", true: "#3B82F6" }}
            thumbColor={item.isAvailable ? "#fff" : "#9CA3AF"}
          />
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              Alert.alert("Coming Soon", "Product editing coming soon!")
            }
          >
            <Ionicons name="create-outline" size={18} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (selectedShop) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedShop(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{selectedShop.name}</Text>
            <Text style={styles.headerSubtitle}>Product Management</Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setModalType("product");
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Products */}
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProductCard item={item} />}
          contentContainerStyle={styles.productListContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.productHeader}>
              <Text style={styles.sectionTitle}>
                Products ({products.length})
              </Text>
              <View style={styles.productStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {products.filter((item) => item.isAvailable).length}
                  </Text>
                  <Text style={styles.statLabel}>Available</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {products.filter((item) => item.stockQuantity > 0).length}
                  </Text>
                  <Text style={styles.statLabel}>In Stock</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {Math.round(
                      products.reduce((acc, item) => acc + item.price, 0) /
                        products.length
                    )}
                  </Text>
                  <Text style={styles.statLabel}>Avg Price</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {products.reduce(
                      (acc, item) => acc + item.stockQuantity,
                      0
                    )}
                  </Text>
                  <Text style={styles.statLabel}>Total Stock</Text>
                </View>
              </View>
            </View>
          }
        />
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
          <Text style={styles.headerTitle}>Shop Management</Text>
          <Text style={styles.headerSubtitle}>
            Manage your shops & products
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setModalType("shop");
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Shops List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shopsContainer}>
          <Text style={styles.sectionTitle}>Your Shops ({shops.length})</Text>

          {shops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}

          {shops.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Shops Yet</Text>
              <Text style={styles.emptyDescription}>
                Add your first shop to start managing your products and
                inventory.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => {
                  setModalType("shop");
                  setShowAddModal(true);
                }}
              >
                <Text style={styles.emptyButtonText}>Add Shop</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Add New {modalType === "shop" ? "Shop" : "Product"}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAddModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalMessage}>
              {modalType === "shop" ? "Shop" : "Product"} creation form coming
              soon!
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  shopsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  shopCard: {
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  shopGradient: {
    borderRadius: 16,
    padding: 20,
  },
  shopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  shopDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 12,
  },
  shopMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  categoryTag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "500",
  },
  moreCategoriesText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    fontStyle: "italic",
  },
  shopActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  inactiveBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },
  productListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  productHeader: {
    paddingVertical: 20,
  },
  productStats: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#3B82F6",
  },
  productCategory: {
    fontSize: 12,
    color: "#8b5cf6",
    backgroundColor: "#f3f0ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  productSku: {
    fontSize: 12,
    color: "#6b7280",
  },
  stockInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: "500",
  },
  productActions: {
    alignItems: "center",
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  modalMessage: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
