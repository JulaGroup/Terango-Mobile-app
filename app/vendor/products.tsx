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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useVendor } from "@/context/VendorContext";
import { orderApi, subCategoryApi, menuApi } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";

interface SubCategory {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  image?: string;
  stock: number;
  category?: string;
  subCategoryId?: string;
  isActive: boolean;
  inStock?: boolean;
}

export default function VendorProducts() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentBusiness } = useVendor();
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterNoImages, setFilterNoImages] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingSubCategories, setLoadingSubCategories] = useState(true);

  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(50), []);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    discountedPrice: "",
    stock: "",
    subCategoryId: "",
    imageUrl: "",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState({
    name: "",
    price: "",
    stock: "",
    discountedPrice: "",
  });

  const [touchedFields, setTouchedFields] = useState({
    name: false,
    price: false,
    stock: false,
    discountedPrice: false,
  });

  const [focusedFields, setFocusedFields] = useState({
    name: false,
    price: false,
    stock: false,
    discountedPrice: false,
  });

  const validateField = (field: string, value: string) => {
    let error = "";
    switch (field) {
      case "name":
        if (!value.trim()) error = "Product name is required";
        else if (value.trim().length < 2)
          error = "Must be at least 2 characters";
        else if (value.trim().length > 100)
          error = "Must be less than 100 characters";
        break;
      case "price":
        if (!value.trim()) error = "Price is required";
        else {
          const price = parseFloat(value);
          if (isNaN(price) || price <= 0)
            error = "Price must be a positive number";
          else if (price > 999999) error = "Price cannot exceed 999,999 GMD";
        }
        break;
      case "stock":
        if (!value.trim()) error = "Stock quantity is required";
        else {
          const stock = parseInt(value);
          if (isNaN(stock) || stock < 0)
            error = "Stock must be a non-negative number";
          else if (stock > 99999) error = "Stock cannot exceed 99,999 units";
        }
        break;
      case "discountedPrice":
        if (value.trim()) {
          const dp = parseFloat(value);
          const op = parseFloat(formData.price);
          if (isNaN(dp) || dp <= 0) error = "Must be a positive number";
          else if (!isNaN(op) && dp >= op)
            error = "Must be less than original price";
          else if (dp > 999999) error = "Cannot exceed 999,999 GMD";
        }
        break;
    }
    return error;
  };

  const validateForm = () => {
    const errors = {
      name: validateField("name", formData.name),
      price: validateField("price", formData.price),
      stock: validateField("stock", formData.stock),
      discountedPrice: validateField(
        "discountedPrice",
        formData.discountedPrice,
      ),
    };
    setFormErrors(errors);
    return !Object.values(errors).some((e) => e !== "");
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touchedFields[field as keyof typeof touchedFields]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: validateField(field, value),
      }));
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    setFocusedFields((prev) => ({ ...prev, [field]: false }));
    setFormErrors((prev) => ({
      ...prev,
      [field]: validateField(
        field,
        formData[field as keyof typeof formData] as string,
      ),
    }));
  };

  const handleFieldFocus = (field: string) => {
    setFocusedFields((prev) => ({ ...prev, [field]: true }));
  };

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

  useEffect(() => {
    const fetchSubCategories = async () => {
      try {
        setLoadingSubCategories(true);
        const response = await subCategoryApi.getAllSubCategories();
        if (response?.data) setSubCategories(response.data);
        else if (Array.isArray(response)) setSubCategories(response);
        else setSubCategories([]);
      } catch {
        setSubCategories([]);
      } finally {
        setLoadingSubCategories(false);
      }
    };
    fetchSubCategories();
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!currentBusiness) {
      setProducts([]);
      return;
    }
    try {
      let response;
      if (currentBusiness.type === "SHOP") {
        response = await orderApi.getShopProducts(currentBusiness.id);
        if (Array.isArray(response)) {
          setProducts(
            response.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              price: p.price,
              image: p.imageUrl,
              stock: p.stock || 0,
              category: p.category || "Others",
              subCategoryId: p.subCategoryId,
              isActive: p.isActive !== false,
              inStock: (p.stock || 0) > 0,
            })),
          );
        } else setProducts([]);
      } else if (currentBusiness.type === "RESTAURANT") {
        response = await menuApi.getMenuItemsByRestaurant(currentBusiness.id);
        if (Array.isArray(response)) {
          setProducts(
            response.map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              price: item.price,
              image: item.imageUrl,
              stock: 999,
              category: item.category || "Others",
              subCategoryId: item.subCategoryId,
              isActive: item.isAvailable !== false,
              inStock: true,
            })),
          );
        } else setProducts([]);
      } else if (currentBusiness.type === "PHARMACY") {
        response = await orderApi.getShopProducts(currentBusiness.id);
        if (Array.isArray(response)) {
          setProducts(
            response.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              price: p.price,
              image: p.imageUrl,
              stock: p.stock || 0,
              category: p.category || "Medications",
              subCategoryId: p.subCategoryId,
              isActive: p.isActive !== false,
              inStock: (p.stock || 0) > 0,
            })),
          );
        } else setProducts([]);
      } else setProducts([]);
    } catch {
      setProducts([]);
    }
  }, [currentBusiness]);

  useEffect(() => {
    if (currentBusiness) fetchProducts();
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

  const toggleProductStatus = async (productId: string, newStatus: boolean) => {
    Alert.alert(
      newStatus ? "Enable Product" : "Disable Product",
      newStatus
        ? "Make this product available for customers?"
        : "Make this product unavailable?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: newStatus ? "Enable" : "Disable",
          onPress: async () => {
            if (!currentBusiness || currentBusiness.type !== "SHOP") {
              Alert.alert("Unavailable", "Only shop products can be toggled.");
              return;
            }
            let previousState: Product[] = [];
            try {
              setProducts((prev) => {
                previousState = prev.map((p) => ({ ...p }));
                return prev.map((p) =>
                  p.id === productId ? { ...p, isActive: newStatus } : p,
                );
              });
              await orderApi.updateShopProduct(productId, {
                isActive: newStatus,
              });
              Alert.alert(
                "Success",
                `Product ${newStatus ? "enabled" : "disabled"}`,
              );
            } catch {
              Alert.alert("Error", "Failed to update product status.");
              if (previousState.length) setProducts(previousState);
            }
          },
        },
      ],
    );
  };

  const handleDelete = async (productId: string) => {
    Alert.alert("Delete Product", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!currentBusiness || currentBusiness.type !== "SHOP") {
            Alert.alert("Unavailable", "Only shop products can be deleted.");
            return;
          }
          const prev = products.map((p) => ({ ...p }));
          try {
            setProducts((p) => p.filter((product) => product.id !== productId));
            await orderApi.deleteShopProduct(productId);
            Alert.alert("Success", "Product deleted successfully");
          } catch {
            Alert.alert("Error", "Failed to delete product.");
            setProducts(prev);
          } finally {
            await fetchProducts();
          }
        },
      },
    ]);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      discountedPrice: product.discountedPrice?.toString() || "",
      stock: product.stock.toString(),
      subCategoryId: product.subCategoryId || "",
      imageUrl: product.image || "",
      isActive: product.isActive,
    });
    setFormErrors({ name: "", price: "", stock: "", discountedPrice: "" });
    setTouchedFields({
      name: false,
      price: false,
      stock: false,
      discountedPrice: false,
    });
    setFocusedFields({
      name: false,
      price: false,
      stock: false,
      discountedPrice: false,
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
      discountedPrice: "",
      stock: "",
      subCategoryId: "",
      imageUrl: "",
      isActive: true,
    });
    setFormErrors({ name: "", price: "", stock: "", discountedPrice: "" });
    setTouchedFields({
      name: false,
      price: false,
      stock: false,
      discountedPrice: false,
    });
    setFocusedFields({
      name: false,
      price: false,
      stock: false,
      discountedPrice: false,
    });
    setEditMode(false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix the errors before saving.");
      return;
    }
    if (!currentBusiness || currentBusiness.type !== "SHOP") {
      Alert.alert("Error", "Products can only be managed for shops");
      return;
    }
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        discountedPrice: formData.discountedPrice
          ? parseFloat(formData.discountedPrice)
          : null,
        stock: parseInt(formData.stock),
        isActive: formData.isActive,
        shopId: currentBusiness.id,
        imageUrl: formData.imageUrl || undefined,
        subCategoryId: formData.subCategoryId || undefined,
      };
      if (editMode && selectedProduct) {
        await orderApi.updateShopProduct(
          selectedProduct.id.toString(),
          productData as any,
        );
      } else {
        await orderApi.createShopProduct(productData as any);
      }
      setModalVisible(false);
      await fetchProducts();
      Alert.alert(
        "Success",
        `Product ${editMode ? "updated" : "added"} successfully`,
      );
    } catch {
      Alert.alert("Error", `Failed to ${editMode ? "update" : "add"} product`);
    }
  };

  const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
  const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

  const handleImageUpload = async (uri: string): Promise<string> => {
    try {
      setImageLoading(true);
      const data = new FormData();
      data.append("file", {
        uri,
        type: "image/jpeg",
        name: "product.jpg",
      } as any);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: data,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      setImageLoading(false);
      return json.secure_url;
    } catch {
      setImageLoading(false);
      Alert.alert("Upload Error", "Failed to upload image. Please try again.");
      return "";
    }
  };

  const handleImagePicker = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Camera roll access is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const url = await handleImageUpload(result.assets[0].uri);
      if (url) {
        setFormData((prev) => ({ ...prev, imageUrl: url }));
        Alert.alert("Success", "Image uploaded successfully!");
      }
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "" ||
      filterCategory === "All" ||
      p.category === filterCategory;
    const matchesNoImages = !filterNoImages || !p.image;
    return matchesSearch && matchesCategory && matchesNoImages;
  });

  const lowStock = products.filter(
    (p) => p.stock < 5 && p.stock > 0 && p.isActive,
  ).length;
  const outOfStock = products.filter((p) => p.stock === 0 && p.isActive).length;
  const totalProducts = products.length;
  const noImages = products.filter((p) => !p.image).length;

  const ProductCard = React.memo(function ProductCard({
    item,
  }: {
    item: Product;
  }) {
    const stockColor =
      item.stock === 0 ? "#EF4444" : item.stock < 5 ? "#F97316" : "#22C55E";
    const stockLabel =
      item.stock === 0
        ? "Out of stock"
        : item.stock < 5
          ? `${item.stock} left`
          : `${item.stock} in stock`;

    return (
      <View style={styles.productCard}>
        <View style={styles.productImageContainer}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.productImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube" size={32} color="#ccc" />
            </View>
          )}
          <View
            style={[styles.stockBadge, { backgroundColor: stockColor + "E6" }]}
          >
            <Text style={styles.stockBadgeText}>
              {item.stock === 0
                ? "Out"
                : item.stock < 5
                  ? "Low"
                  : `${item.stock}`}
            </Text>
          </View>
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={styles.productDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}

          <View style={styles.productMeta}>
            <Text style={styles.productPrice}>D{item.price.toFixed(2)}</Text>
            <View
              style={[styles.stockPill, { backgroundColor: stockColor + "18" }]}
            >
              <View
                style={[styles.stockDot, { backgroundColor: stockColor }]}
              />
              <Text style={[styles.stockPillText, { color: stockColor }]}>
                {stockLabel}
              </Text>
            </View>
          </View>

          <View style={styles.productActions}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                item.isActive ? styles.actionBtnMuted : styles.actionBtnPrimary,
              ]}
              onPress={() => toggleProductStatus(item.id, !item.isActive)}
            >
              <Ionicons
                name={item.isActive ? "eye-off-outline" : "eye-outline"}
                size={14}
                color={item.isActive ? "#999" : PrimaryColor}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: item.isActive ? "#999" : PrimaryColor },
                ]}
              >
                {item.isActive ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDark]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create-outline" size={14} color="white" />
              <Text style={[styles.actionBtnText, { color: "white" }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDelete]}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={14} color="#CC3333" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  });

  if (currentBusiness?.type !== "SHOP") {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={["#1A1A1A", "#2D2D2D"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Product Management</Text>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={72} color="#ddd" />
          <Text style={styles.emptyTitle}>Shop Only</Text>
          <Text style={styles.emptyDescription}>
            Product management is only available for shop businesses
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />

      <LinearGradient
        colors={["#1A1A1A", "#2D2D2D"]}
        style={styles.headerGradient}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Product Management</Text>
              <Text style={styles.headerSubtitle}>
                {currentBusiness?.name ?? "Your Shop"}
              </Text>
            </View>
            <TouchableOpacity style={styles.circleBtn} onPress={handleAdd}>
              <Ionicons name="add" size={22} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <View style={styles.statPillIcon}>
                <Ionicons name="cube-outline" size={16} color={PrimaryColor} />
              </View>
              <View>
                <Text style={styles.statPillValue}>{totalProducts}</Text>
                <Text style={styles.statPillLabel}>Total</Text>
              </View>
            </View>
            <View style={styles.statPill}>
              <View style={styles.statPillIcon}>
                <Ionicons name="image-outline" size={16} color={PrimaryColor} />
              </View>
              <View>
                <Text style={styles.statPillValue}>{noImages}</Text>
                <Text style={styles.statPillLabel}>No Image</Text>
              </View>
            </View>
            <View style={styles.statPill}>
              <View style={styles.statPillIcon}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={PrimaryColor}
                />
              </View>
              <View>
                <Text style={styles.statPillValue}>{outOfStock}</Text>
                <Text style={styles.statPillLabel}>Out of Stock</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterNoImages && styles.filterChipActive,
            ]}
            onPress={() => setFilterNoImages(!filterNoImages)}
          >
            <Ionicons
              name="image-outline"
              size={13}
              color={filterNoImages ? PrimaryColor : "#888"}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterChipText,
                filterNoImages && styles.filterChipTextActive,
              ]}
            >
              No Images
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => {
            const active =
              filterCategory === cat ||
              (cat === "All" && filterCategory === "");
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilterCategory(cat === "All" ? "" : cat)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {(lowStock > 0 || outOfStock > 0) && (
        <View style={styles.alertBanner}>
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

      <FlatList
        data={filteredProducts}
        renderItem={({ item }) => <ProductCard item={item} />}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        initialNumToRender={8}
        windowSize={5}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={72} color="#ddd" />
            <Text style={styles.emptyTitle}>No Products</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery || filterCategory
                ? "No products match your filters"
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

      {/* Full-screen Modal */}
      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalScreen} edges={["bottom"]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={["#1A1A1A", "#2D2D2D"]}
              style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}
            >
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="arrow-back" size={20} color="white" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editMode ? "Edit Product" : "Add Product"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {currentBusiness?.name ?? "Your Shop"}
                </Text>
              </View>
              <View style={{ width: 36 }} />
            </LinearGradient>

            <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedFields.name && styles.inputFocused,
                    formErrors.name && touchedFields.name && styles.inputError,
                  ]}
                  placeholder="Enter product name"
                  value={formData.name}
                  onChangeText={(t) => handleFieldChange("name", t)}
                  onBlur={() => handleFieldBlur("name")}
                  onFocus={() => handleFieldFocus("name")}
                  maxLength={100}
                />
                {formErrors.name && touchedFields.name && (
                  <Text style={styles.errorText}>{formErrors.name}</Text>
                )}
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your product"
                  value={formData.description}
                  onChangeText={(t) =>
                    setFormData((p) => ({ ...p, description: t }))
                  }
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Image */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Image</Text>
                <TouchableOpacity
                  style={[
                    styles.imagePicker,
                    imageLoading && styles.imagePickerUploading,
                  ]}
                  onPress={handleImagePicker}
                  disabled={imageLoading}
                >
                  {formData.imageUrl ? (
                    <View style={styles.selectedImageContainer}>
                      <Image
                        source={{ uri: formData.imageUrl }}
                        style={styles.selectedImage}
                        contentFit="cover"
                      />
                      {imageLoading ? (
                        <View style={styles.imageOverlay}>
                          <ActivityIndicator
                            size="large"
                            color={PrimaryColor}
                          />
                          <Text style={styles.uploadingText}>Uploading...</Text>
                        </View>
                      ) : (
                        <View style={styles.imageActions}>
                          <TouchableOpacity
                            style={styles.imageActionBtn}
                            onPress={handleImagePicker}
                          >
                            <Ionicons name="camera" size={15} color="white" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.imageActionBtn,
                              { backgroundColor: "rgba(239,68,68,0.85)" },
                            ]}
                            onPress={() =>
                              setFormData((p) => ({ ...p, imageUrl: "" }))
                            }
                          >
                            <Ionicons name="trash" size={15} color="white" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons
                        name={imageLoading ? "cloud-upload" : "camera"}
                        size={36}
                        color={imageLoading ? PrimaryColor : "#ccc"}
                      />
                      <Text
                        style={[
                          styles.imagePlaceholderText,
                          imageLoading && { color: PrimaryColor },
                        ]}
                      >
                        {imageLoading ? "Uploading..." : "Tap to add image"}
                      </Text>
                      {!imageLoading && (
                        <Text style={styles.imageHint}>JPG, PNG up to 5MB</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Price + Stock */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Price (GMD) *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedFields.price && styles.inputFocused,
                      formErrors.price &&
                        touchedFields.price &&
                        styles.inputError,
                    ]}
                    placeholder="0"
                    value={formData.price}
                    onChangeText={(t) => handleFieldChange("price", t)}
                    onBlur={() => handleFieldBlur("price")}
                    onFocus={() => handleFieldFocus("price")}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                  {formErrors.price && touchedFields.price && (
                    <Text style={styles.errorText}>{formErrors.price}</Text>
                  )}
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Stock Qty *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedFields.stock && styles.inputFocused,
                      formErrors.stock &&
                        touchedFields.stock &&
                        styles.inputError,
                    ]}
                    placeholder="0"
                    value={formData.stock}
                    onChangeText={(t) => handleFieldChange("stock", t)}
                    onBlur={() => handleFieldBlur("stock")}
                    onFocus={() => handleFieldFocus("stock")}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  {formErrors.stock && touchedFields.stock && (
                    <Text style={styles.errorText}>{formErrors.stock}</Text>
                  )}
                </View>
              </View>

              {/* Discounted Price */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Discounted Price (GMD){" "}
                  <Text style={styles.optionalText}>(Optional)</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedFields.discountedPrice && styles.inputFocused,
                    formErrors.discountedPrice &&
                      touchedFields.discountedPrice &&
                      styles.inputError,
                  ]}
                  placeholder="Enter discounted price"
                  value={formData.discountedPrice}
                  onChangeText={(t) => handleFieldChange("discountedPrice", t)}
                  onBlur={() => handleFieldBlur("discountedPrice")}
                  onFocus={() => handleFieldFocus("discountedPrice")}
                  keyboardType="numeric"
                  maxLength={10}
                />
                {formErrors.discountedPrice &&
                  touchedFields.discountedPrice && (
                    <Text style={styles.errorText}>
                      {formErrors.discountedPrice}
                    </Text>
                  )}
                {formData.discountedPrice &&
                  parseFloat(formData.discountedPrice) > 0 &&
                  formData.price &&
                  parseFloat(formData.price) > 0 &&
                  parseFloat(formData.discountedPrice) <
                    parseFloat(formData.price) && (
                    <View style={styles.discountPreview}>
                      <Ionicons name="pricetag" size={15} color="#16A34A" />
                      <Text style={styles.discountPreviewText}>
                        {Math.round(
                          ((parseFloat(formData.price) -
                            parseFloat(formData.discountedPrice)) /
                            parseFloat(formData.price)) *
                            100,
                        )}
                        % OFF — customers will see this badge
                      </Text>
                    </View>
                  )}
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category (Subcategory)</Text>
                {loadingSubCategories ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={PrimaryColor} />
                    <Text style={styles.loadingRowText}>
                      Loading categories...
                    </Text>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.categoryRow}>
                      <TouchableOpacity
                        style={[
                          styles.categoryChip,
                          !formData.subCategoryId && styles.categoryChipActive,
                        ]}
                        onPress={() =>
                          setFormData((p) => ({ ...p, subCategoryId: "" }))
                        }
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            !formData.subCategoryId &&
                              styles.categoryChipTextActive,
                          ]}
                        >
                          None
                        </Text>
                      </TouchableOpacity>
                      {subCategories.map((sub) => (
                        <TouchableOpacity
                          key={sub.id}
                          style={[
                            styles.categoryChip,
                            formData.subCategoryId === sub.id &&
                              styles.categoryChipActive,
                          ]}
                          onPress={() =>
                            setFormData((p) => ({
                              ...p,
                              subCategoryId: sub.id,
                            }))
                          }
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              formData.subCategoryId === sub.id &&
                                styles.categoryChipTextActive,
                            ]}
                          >
                            {sub.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
                {subCategories.length === 0 && !loadingSubCategories && (
                  <Text style={styles.noCategoriesText}>
                    No categories available yet.
                  </Text>
                )}
              </View>

              {/* Active toggle */}
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Product Active</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, isActive: v }))
                  }
                  trackColor={{ false: "#E0E0E0", true: PrimaryColor }}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editMode ? "Update Product" : "Add Product"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8F8" },

  // Header
  headerGradient: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 18,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerTitleContainer: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.2,
  },

  // Stat pills
  statsRow: { flexDirection: "row", gap: 10 },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statPillIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFF4EC",
    justifyContent: "center",
    alignItems: "center",
  },
  statPillValue: { fontSize: 16, fontWeight: "700", color: "white" },
  statPillLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)" },

  // Search + filter
  searchContainer: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: "#1A1A1A" },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#FFF4EC",
    borderWidth: 1,
    borderColor: PrimaryColor,
  },
  filterChipText: { fontSize: 13, color: "#888", fontWeight: "500" },
  filterChipTextActive: { color: PrimaryColor, fontWeight: "700" },

  // Alert banner
  alertBanner: {
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  alertText: { fontSize: 13, color: "#92400E", marginBottom: 2 },

  // List
  listContent: { padding: 14, paddingBottom: 32 },

  // Product card (horizontal, matching menu card)
  productCard: {
    backgroundColor: "white",
    borderRadius: 14,
    marginBottom: 10,
    height: 120,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    overflow: "hidden",
  },
  productImageContainer: { width: 120, height: 120, position: "relative" },
  productImage: { width: "100%", height: "100%" },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  stockBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockBadgeText: { color: "white", fontSize: 10, fontWeight: "700" },
  productInfo: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  productName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  productDescription: { fontSize: 12, color: "#888", lineHeight: 16 },
  productMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productPrice: { fontSize: 15, fontWeight: "700", color: PrimaryColor },
  stockPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  stockDot: { width: 5, height: 5, borderRadius: 3 },
  stockPillText: { fontSize: 10, fontWeight: "600" },
  productActions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 7,
    gap: 3,
  },
  actionBtnMuted: { backgroundColor: "#F5F5F5" },
  actionBtnPrimary: { backgroundColor: "#FFF4EC" },
  actionBtnDark: { backgroundColor: "#1A1A1A" },
  actionBtnDelete: { backgroundColor: "#FFF0F0", paddingHorizontal: 10 },
  actionBtnText: { fontSize: 12, fontWeight: "700" },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 16,
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAction: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 10,
  },
  emptyActionText: { color: "white", fontSize: 14, fontWeight: "700" },

  // Modal
  modalScreen: { flex: 1, backgroundColor: "#F8F8F8" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 18,
    paddingHorizontal: 16,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "white" },
  modalSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 },

  // Form
  form: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  inputGroup: { marginBottom: 18 },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  optionalText: {
    fontSize: 11,
    fontWeight: "400",
    color: "#BBB",
    textTransform: "none",
    letterSpacing: 0,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: "white",
    color: "#1A1A1A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  inputFocused: {
    borderColor: PrimaryColor,
    borderWidth: 1.5,
    shadowColor: PrimaryColor,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: { borderColor: "#EF4444", borderWidth: 1.5 },
  textArea: { height: 88, textAlignVertical: "top", paddingTop: 14 },
  row: { flexDirection: "row", gap: 12 },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 5,
    fontWeight: "500",
  },

  discountPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  discountPreviewText: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
    flex: 1,
  },

  categoryRow: { flexDirection: "row" },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: "#FFF4EC",
    borderWidth: 1,
    borderColor: PrimaryColor,
  },
  categoryChipText: { fontSize: 13, color: "#888", fontWeight: "500" },
  categoryChipTextActive: { color: PrimaryColor, fontWeight: "700" },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  loadingRowText: { marginLeft: 10, fontSize: 13, color: "#888" },
  noCategoriesText: {
    fontSize: 13,
    color: "#BBB",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 10,
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  switchLabel: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },

  saveButton: {
    backgroundColor: PrimaryColor,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  saveButtonText: { color: "white", fontSize: 16, fontWeight: "700" },

  // Image upload
  imagePicker: {
    borderWidth: 2,
    borderColor: "#EBEBEB",
    borderStyle: "dashed",
    borderRadius: 12,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  imagePickerUploading: {
    borderColor: PrimaryColor,
    backgroundColor: "#FFF4EC",
  },
  selectedImageContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  selectedImage: { width: "100%", height: "100%" },
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
  uploadingText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  imageActions: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 8,
  },
  imageActionBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholder: { alignItems: "center" },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
  imageHint: { marginTop: 4, fontSize: 11, color: "#BBB" },
});
