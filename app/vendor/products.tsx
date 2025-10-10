import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Switch,
  StatusBar,
  Animated,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useVendor } from "@/context/VendorContext";
import { orderApi, subCategoryApi } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";
import ProductCard, { UniversalProduct } from "@/components/common/ProductCard";

interface SubCategory {
  id: string;
  name: string;
}

interface Product extends UniversalProduct {
  stock: number;
  category?: string;
  subCategoryId?: string;
  isActive: boolean;
}

const { width } = Dimensions.get("window");
const numColumns = 2;
const cardWidth = (width - 60) / numColumns; // Account for padding and margins

export default function VendorProducts() {
  const router = useRouter();
  const { currentBusiness } = useVendor();
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(false);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingSubCategories, setLoadingSubCategories] = useState(true);

  // Animation values
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(50), []);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    subCategoryId: "",
    imageUrl: "",
    isActive: true,
  });

  const categories = [
    "All",
    "Electronics",
    "Clothing",
    "Food & Beverages",
    "Health & Beauty",
    "Home & Garden",
    "Sports",
    "Others",
  ];

  // Fetch subcategories on component mount
  useEffect(() => {
    const fetchSubCategories = async () => {
      try {
        setLoadingSubCategories(true);
        const response = await subCategoryApi.getAllSubCategories();
        console.log("📂 Fetched subcategories:", response);

        if (response?.data) {
          setSubCategories(response.data);
        } else if (Array.isArray(response)) {
          setSubCategories(response);
        } else {
          setSubCategories([]);
        }
      } catch (error) {
        console.error("❌ Error fetching subcategories:", error);
        setSubCategories([]);
      } finally {
        setLoadingSubCategories(false);
      }
    };

    fetchSubCategories();
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!currentBusiness || currentBusiness.type !== "SHOP") {
      setProducts([]);
      return;
    }

    try {
      const response = await orderApi.getShopProducts(currentBusiness.id);

      if (response && response.products) {
        setProducts(
          response.products.map((product: any) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            image: product.imageUrl,
            stock: product.stock || 0,
            category: product.category || "Others",
            isActive: product.isActive !== false,
            inStock: (product.stock || 0) > 0,
          }))
        );
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      // Demo data for testing
      setProducts([
        {
          id: 1,
          name: "Fresh Apples",
          description: "Premium quality red apples",
          price: 25000,
          image: "https://via.placeholder.com/150",
          stock: 50,
          category: "Food & Beverages",
          isActive: true,
          inStock: true,
        },
        {
          id: 2,
          name: "Organic Bananas",
          description: "Fresh organic bananas",
          price: 15000,
          stock: 0,
          category: "Food & Beverages",
          isActive: true,
          inStock: false,
        },
        {
          id: 3,
          name: "Premium Rice 5kg",
          description: "Premium jasmine rice",
          price: 75000,
          stock: 20,
          category: "Food & Beverages",
          isActive: false,
          inStock: true,
        },
      ]);
    }
  }, [currentBusiness]);

  useEffect(() => {
    if (currentBusiness?.type === "SHOP") {
      fetchProducts();
    }

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fetchProducts, currentBusiness, fadeAnim, slideAnim]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const toggleProductStatus = async (productId: number, isActive: boolean) => {
    try {
      // API call would go here
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product.id === productId ? { ...product, isActive } : product
        )
      );
    } catch (error) {
      console.error("Error updating product status:", error);
      Alert.alert("Error", "Failed to update product status");
    }
  };

  const updateStock = async (productId: number, newStock: number) => {
    try {
      // API call would go here
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product.id === productId
            ? { ...product, stock: newStock, inStock: newStock > 0 }
            : product
        )
      );
    } catch (error) {
      console.error("Error updating stock:", error);
      Alert.alert("Error", "Failed to update stock");
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      stock: product.stock.toString(),
      subCategoryId: product.subCategoryId || "",
      imageUrl: product.image || "",
      isActive: product.isActive,
    });
    setEditMode(true);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setSelectedProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      stock: "",
      subCategoryId: "",
      imageUrl: "",
      isActive: true,
    });
    setEditMode(false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!currentBusiness || currentBusiness.type !== "SHOP") {
      Alert.alert("Error", "Products can only be managed for shops");
      return;
    }

    try {
      const productFormData = new FormData();
      productFormData.append("name", formData.name);
      productFormData.append("description", formData.description);
      productFormData.append("price", formData.price);
      productFormData.append("stock", formData.stock);
      productFormData.append("isActive", formData.isActive.toString());

      // Add subCategoryId if selected
      if (formData.subCategoryId) {
        productFormData.append("subCategoryId", formData.subCategoryId);
      }

      if (editMode && selectedProduct) {
        await orderApi.updateShopProduct(
          selectedProduct.id.toString(),
          productFormData
        );
      } else {
        await orderApi.createShopProduct(productFormData);
      }

      setModalVisible(false);
      await fetchProducts();
      Alert.alert(
        "Success",
        `Product ${editMode ? "updated" : "added"} successfully`
      );
    } catch (error) {
      console.error("Error saving product:", error);
      Alert.alert("Error", `Failed to ${editMode ? "update" : "add"} product`);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "" ||
      filterCategory === "All" ||
      product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getStockSummary = () => {
    const lowStock = products.filter((p) => p.stock < 5 && p.isActive).length;
    const outOfStock = products.filter(
      (p) => p.stock === 0 && p.isActive
    ).length;
    const totalProducts = products.length;
    return { lowStock, outOfStock, totalProducts };
  };

  const { lowStock, outOfStock, totalProducts } = getStockSummary();

  // Cloudinary configuration - matching Next.js VM format exactly
  const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
  const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

  const handleImageUpload = async (uri: string): Promise<string> => {
    try {
      setImageLoading(true);

      // Create FormData for Cloudinary upload
      const formData = new FormData();
      formData.append("file", {
        uri: uri,
        type: "image/jpeg",
        name: "product-image.jpg",
      } as any);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

      const uploadResponse = await fetch(cloudinaryUrl, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const data = await uploadResponse.json();
      setImageLoading(false);
      return data.secure_url;
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      setImageLoading(false);
      Alert.alert("Upload Error", "Failed to upload image. Please try again.");
      return "";
    }
  };

  const handleImagePicker = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "Permission to access camera roll is required!"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Upload to Cloudinary and get secure URL
        const cloudinaryUrl = await handleImageUpload(result.assets[0].uri);

        if (cloudinaryUrl) {
          setFormData({ ...formData, imageUrl: cloudinaryUrl });
          Alert.alert("Success", "Image uploaded successfully to Cloudinary!");
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setImageLoading(false);
      Alert.alert("Error", "Failed to select image");
    }
  };

  // Dummy functions for ProductCard (not used in vendor context)
  const handleAddToCart = () => {};
  const handleRemoveFromCart = () => {};

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productWrapper}>
      <ProductCard
        product={item}
        cartQuantity={0}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
        onPress={() => handleEdit(item)}
        cardWidth={cardWidth}
      />

      {/* Vendor Controls Overlay */}
      <View style={styles.vendorControls}>
        <View style={styles.stockInfo}>
          <Text
            style={[
              styles.stockText,
              item.stock < 5 ? styles.lowStock : styles.normalStock,
            ]}
          >
            Stock: {item.stock}
          </Text>
          {item.stock < 5 && (
            <Ionicons name="warning" size={14} color="#F44336" />
          )}
        </View>

        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={[
              styles.statusToggle,
              item.isActive ? styles.activeToggle : styles.inactiveToggle,
            ]}
            onPress={() => toggleProductStatus(item.id, !item.isActive)}
          >
            <Text
              style={[
                styles.statusText,
                { color: item.isActive ? "#4CAF50" : "#666" },
              ]}
            >
              {item.isActive ? "Active" : "Inactive"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stockButton}
            onPress={() => {
              Alert.prompt(
                "Update Stock",
                "Enter new stock quantity:",
                (text) => {
                  const newStock = parseInt(text || "0");
                  if (!isNaN(newStock) && newStock >= 0) {
                    updateStock(item.id, newStock);
                  }
                },
                "plain-text",
                item.stock.toString()
              );
            }}
          >
            <Ionicons name="cube" size={16} color={PrimaryColor} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (currentBusiness?.type !== "SHOP") {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[PrimaryColor, "#1976D2"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Product Management</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>

        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Shop Only</Text>
          <Text style={styles.emptyDescription}>
            Product management is only available for shop businesses
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const getBusinessName = () => {
    if (currentBusiness?.name) {
      return currentBusiness.name;
    }
    return "Your Shop";
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={[PrimaryColor, "#1976D2"]}
        style={styles.headerGradient}
      >
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Product Management</Text>
              <Text style={styles.headerSubtitle}>{getBusinessName()}</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalProducts}</Text>
              <Text style={styles.statLabel}>Total Products</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: "#FF5722" }]}>
                {lowStock}
              </Text>
              <Text style={styles.statLabel}>Low Stock</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: "#F44336" }]}>
                {outOfStock}
              </Text>
              <Text style={styles.statLabel}>Out of Stock</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterChip,
                filterCategory === category && styles.filterChipActive,
              ]}
              onPress={() =>
                setFilterCategory(category === "All" ? "" : category)
              }
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterCategory === category && styles.filterChipTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stock Alerts */}
      {(lowStock > 0 || outOfStock > 0) && (
        <View style={styles.alertContainer}>
          {outOfStock > 0 && (
            <Text style={styles.alertText}>
              ⚠️ {outOfStock} product{outOfStock > 1 ? "s" : ""} out of stock
            </Text>
          )}
          {lowStock > 0 && (
            <Text style={styles.alertText}>
              📦 {lowStock} product{lowStock > 1 ? "s" : ""} running low
            </Text>
          )}
        </View>
      )}

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Products</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery || filterCategory
                ? "No products match your search criteria"
                : "Start by adding your first product"}
            </Text>
            {!searchQuery && !filterCategory && (
              <TouchableOpacity style={styles.emptyAction} onPress={handleAdd}>
                <Text style={styles.emptyActionText}>Add First Product</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Enhanced Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[PrimaryColor, "#1976D2"]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>
                {editMode ? "Edit Product" : "Add Product"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter product name"
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your product"
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Image Upload Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Image</Text>
                <TouchableOpacity
                  style={styles.imagePickerContainer}
                  onPress={handleImagePicker}
                >
                  {formData.imageUrl ? (
                    <View style={styles.selectedImageContainer}>
                      <Image
                        source={{ uri: formData.imageUrl }}
                        style={styles.selectedImage}
                        resizeMode="cover"
                      />
                      {imageLoading && (
                        <View style={styles.imageOverlay}>
                          <ActivityIndicator
                            size="large"
                            color={PrimaryColor}
                          />
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera" size={40} color="#ccc" />
                      <Text style={styles.imagePlaceholderText}>
                        {imageLoading ? "Uploading..." : "Add Image"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>Price (GMD) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.price}
                    onChangeText={(text) =>
                      setFormData({ ...formData, price: text })
                    }
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>Stock Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.stock}
                    onChangeText={(text) =>
                      setFormData({ ...formData, stock: text })
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category (Subcategory)</Text>
                {loadingSubCategories ? (
                  <ActivityIndicator size="small" color={PrimaryColor} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.categorySelector}>
                      {subCategories.map((subCat) => (
                        <TouchableOpacity
                          key={subCat.id}
                          style={[
                            styles.categoryOption,
                            formData.subCategoryId === subCat.id &&
                              styles.categoryOptionActive,
                          ]}
                          onPress={() =>
                            setFormData({
                              ...formData,
                              subCategoryId: subCat.id,
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.categoryOptionText,
                              formData.subCategoryId === subCat.id &&
                                styles.categoryOptionTextActive,
                            ]}
                          >
                            {subCat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Product Active</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) =>
                    setFormData({ ...formData, isActive: value })
                  }
                  trackColor={{ false: "#767577", true: PrimaryColor }}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <LinearGradient
                  colors={[PrimaryColor, "#1976D2"]}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {editMode ? "Update Product" : "Add Product"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    marginTop: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  headerRight: {
    width: 40,
  },
  addButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  searchContainer: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  filterContainer: {},
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: PrimaryColor,
  },
  filterChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "white",
  },
  alertContainer: {
    backgroundColor: "#FFF3CD",
    padding: 12,
    margin: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFEAA7",
  },
  alertText: {
    fontSize: 14,
    color: "#856404",
    marginBottom: 4,
  },
  listContainer: {
    padding: 10,
  },
  productWrapper: {
    flex: 1,
    margin: 5,
    position: "relative",
  },
  vendorControls: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 8,
    padding: 8,
    zIndex: 10,
  },
  stockInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  stockText: {
    fontSize: 12,
    fontWeight: "600",
    marginRight: 5,
  },
  lowStock: {
    color: "#F44336",
  },
  normalStock: {
    color: "#4CAF50",
  },
  controlButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  activeToggle: {
    borderColor: "#4CAF50",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  inactiveToggle: {
    borderColor: "#666",
    backgroundColor: "rgba(102, 102, 102, 0.1)",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  stockButton: {
    padding: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  emptyAction: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  emptyActionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: "white",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  categorySelector: {
    flexDirection: "row",
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 10,
  },
  categoryOptionActive: {
    backgroundColor: PrimaryColor,
  },
  categoryOptionText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  categoryOptionTextActive: {
    color: "white",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginBottom: 30,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  saveButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  saveButtonGradient: {
    padding: 18,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  // Image upload styles
  imagePickerContainer: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    borderRadius: 12,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  selectedImageContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  selectedImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholder: {
    alignItems: "center",
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
});
