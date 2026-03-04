import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Switch,
  ScrollView,
  StatusBar,
  Animated,
  FlatList,
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
import * as ImageManipulator from "expo-image-manipulator";
import { useVendor } from "@/context/VendorContext";
import { menuApi, subCategoryApi } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";
import { useRealTime } from "@/hooks/useRealTime";
import { getSelectableMealTimes } from "@/constants/MealTimes";

interface SubCategory {
  id: string;
  name: string;
  imageUrl?: string;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  isAvailable: boolean;
  mealTime?: string; // This is what the schema has instead of "category"
  preparationTime?: number;
  menuId?: string; // Required in schema but optional here for display
  subCategoryId?: string;
}

export default function VendorMenuEnhanced() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentBusiness } = useVendor();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
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
    discountedPrice: "",
    mealTime: "", // Changed from category to mealTime
    subCategoryId: "",
    preparationTime: "",
    imageUrl: "",
    isAvailable: true,
  });

  // Subcategory picker UI state
  const [showSubcategoryPicker, setShowSubcategoryPicker] = useState(false);
  const [subCategorySearch, setSubCategorySearch] = useState("");

  // Derived filtered list for search + fast rendering
  const filteredSubCategories = useMemo(() => {
    if (!subCategorySearch) return subCategories;
    const q = subCategorySearch.toLowerCase().trim();
    return subCategories.filter((s) => s.name.toLowerCase().includes(q));
  }, [subCategories, subCategorySearch]);

  // Form validation state
  const [formErrors, setFormErrors] = useState({
    name: "",
    price: "",
    mealTime: "",
    preparationTime: "",
    discountedPrice: "",
  });

  const [touchedFields, setTouchedFields] = useState({
    name: false,
    price: false,
    mealTime: false,
    preparationTime: false,
    discountedPrice: false,
  });

  const [focusedFields, setFocusedFields] = useState({
    name: false,
    price: false,
    preparationTime: false,
    discountedPrice: false,
  });

  // Validation functions
  const validateField = (field: string, value: string) => {
    let error = "";

    switch (field) {
      case "name":
        if (!value.trim()) {
          error = "Item name is required";
        } else if (value.trim().length < 2) {
          error = "Item name must be at least 2 characters";
        } else if (value.trim().length > 100) {
          error = "Item name must be less than 100 characters";
        }
        break;

      case "price":
        if (!value.trim()) {
          error = "Price is required";
        } else {
          const price = parseFloat(value);
          if (isNaN(price) || price <= 0) {
            error = "Price must be a positive number";
          } else if (price > 999999) {
            error = "Price cannot exceed 999,999 GMD";
          }
        }
        break;

      case "mealTime":
        if (!value.trim()) {
          error = "Meal time is required";
        }
        break;

      case "preparationTime":
        if (!value.trim()) {
          error = "Preparation time is required";
        } else {
          const prepTime = parseInt(value);
          if (isNaN(prepTime) || prepTime < 1) {
            error = "Preparation time must be at least 1 minute";
          } else if (prepTime > 480) {
            error = "Preparation time cannot exceed 480 minutes (8 hours)";
          }
        }
        break;

      case "discountedPrice":
        if (value.trim()) {
          const discountedPrice = parseFloat(value);
          const originalPrice = parseFloat(formData.price);

          if (isNaN(discountedPrice) || discountedPrice <= 0) {
            error = "Discounted price must be a positive number";
          } else if (
            !isNaN(originalPrice) &&
            discountedPrice >= originalPrice
          ) {
            error = "Discounted price must be less than original price";
          } else if (discountedPrice > 999999) {
            error = "Discounted price cannot exceed 999,999 GMD";
          }
        }
        break;
    }

    return error;
  };

  const validateForm = () => {
    const errors = {
      name: validateField("name", formData.name),
      price: validateField("price", formData.price),
      mealTime: validateField("mealTime", formData.mealTime),
      preparationTime: validateField(
        "preparationTime",
        formData.preparationTime,
      ),
      discountedPrice: validateField(
        "discountedPrice",
        formData.discountedPrice,
      ),
    };

    setFormErrors(errors);
    return !Object.values(errors).some((error) => error !== "");
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Validate field on change if it has been touched
    if (touchedFields[field as keyof typeof touchedFields]) {
      const error = validateField(field, value);
      setFormErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    setFocusedFields((prev) => ({ ...prev, [field]: false }));

    const error = validateField(
      field,
      formData[field as keyof typeof formData] as string,
    );
    setFormErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleFieldFocus = (field: string) => {
    setFocusedFields((prev) => ({ ...prev, [field]: true }));
  };

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

  // 🔥 Real-time integration for menu updates
  useRealTime({
    enablePushNotifications: false, // Menu doesn't need push notifications
    enableWebSocket: true,
    enablePolling: false,
    onMenuUpdate: async (menuData) => {
      console.log("🍔 Menu updated via WebSocket:", menuData);
      // Refresh menu items when updates occur
      await fetchMenuItems();
    },
  });

  const fetchMenuItems = useCallback(async () => {
    if (!currentBusiness || currentBusiness.type !== "RESTAURANT") {
      console.log(
        "🏪 No current business or not a restaurant:",
        currentBusiness,
      );
      setMenuItems([]);
      return;
    }

    try {
      setIsLoading(true);
      console.log("🍽️ Fetching menu items for restaurant:", currentBusiness.id);

      // Use the correct API endpoint that matches your VM system
      const response = await menuApi.getMenuItemsByRestaurant(
        currentBusiness.id,
      );
      console.log("📋 Menu items response:", response);

      if (response?.data) {
        const menuItemsData = Array.isArray(response.data) ? response.data : [];
        console.log(
          "✅ Menu items data (from response.data):",
          menuItemsData.length,
          "items",
        );
        setMenuItems(menuItemsData);
      } else if (Array.isArray(response)) {
        console.log(
          "✅ Menu items data (direct array):",
          response.length,
          "items",
        );
        setMenuItems(response);
      } else {
        console.log("⚠️ No valid menu items found in response");
        setMenuItems([]);
      }
    } catch (error) {
      console.error("❌ Error fetching menu items:", error);
      setMenuItems([]);
      Alert.alert("Error", "Failed to load menu items. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness]);

  useEffect(() => {
    console.log("🏢 Current business in menu screen:", currentBusiness);

    if (currentBusiness?.type === "RESTAURANT") {
      fetchMenuItems();
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
  }, [fetchMenuItems, currentBusiness, fadeAnim, slideAnim]);

  const toggleAvailability = async (itemId: string, isAvailable: boolean) => {
    const actionText = isAvailable ? "Enable" : "Disable";
    const statusText = isAvailable ? "available" : "unavailable";

    Alert.alert(
      `${actionText} Menu Item`,
      `Are you sure you want to make this item ${statusText} for customers?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionText,
          onPress: async () => {
            try {
              // Use the correct menuApi method
              await menuApi.updateMenuItemAvailability(itemId, isAvailable);
              setMenuItems((prevItems) =>
                prevItems.map((item) =>
                  item.id === itemId ? { ...item, isAvailable } : item,
                ),
              );
              Alert.alert(
                "Success",
                `Menu item ${isAvailable ? "enabled" : "disabled"} successfully`,
              );
            } catch (error) {
              console.error("Error updating availability:", error);
              Alert.alert(
                "Error",
                "Failed to update item availability. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      discountedPrice: item.discountedPrice?.toString() || "",
      mealTime: item.mealTime || "Main Course", // Use mealTime from schema
      subCategoryId: item.subCategoryId || "",
      preparationTime: item.preparationTime?.toString() || "",
      imageUrl: item.imageUrl || "",
      isAvailable: item.isAvailable,
    });
    setFormErrors({
      name: "",
      price: "",
      mealTime: "",
      preparationTime: "",
      discountedPrice: "",
    });
    setTouchedFields({
      name: false,
      price: false,
      mealTime: false,
      preparationTime: false,
      discountedPrice: false,
    });
    setFocusedFields({
      name: false,
      price: false,
      preparationTime: false,
      discountedPrice: false,
    });
    setEditMode(true);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      discountedPrice: "",
      mealTime: "Main Course",
      subCategoryId: "",
      preparationTime: "",
      imageUrl: "",
      isAvailable: true,
    });
    setFormErrors({
      name: "",
      price: "",
      mealTime: "",
      preparationTime: "",
      discountedPrice: "",
    });
    setTouchedFields({
      name: false,
      price: false,
      mealTime: false,
      preparationTime: false,
      discountedPrice: false,
    });
    setFocusedFields({
      name: false,
      price: false,
      preparationTime: false,
      discountedPrice: false,
    });
    setEditMode(false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    // Validate form before saving
    if (!validateForm()) {
      Alert.alert(
        "Validation Error",
        "Please fix the errors in the form before saving.",
      );
      return;
    }

    if (!currentBusiness || currentBusiness.type !== "RESTAURANT") {
      Alert.alert("Error", "Menu items can only be managed for restaurants");
      return;
    }

    try {
      // Build item data matching the MenuItem Prisma schema
      const itemData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        discountedPrice: formData.discountedPrice
          ? parseFloat(formData.discountedPrice)
          : null,
        preparationTime: formData.preparationTime
          ? parseInt(formData.preparationTime)
          : 15,
        isAvailable: formData.isAvailable,
        ...(formData.imageUrl && { imageUrl: formData.imageUrl }),
        // mealTime is used in the schema
        ...(formData.mealTime && { mealTime: formData.mealTime }),
        // Add subCategoryId if selected
        ...(formData.subCategoryId && {
          subCategoryId: formData.subCategoryId,
        }),
      };

      if (editMode && selectedItem) {
        // Use the correct menuApi method for updating
        await menuApi.updateMenuItem(selectedItem.id, itemData);
      } else {
        // For creating, we need to provide restaurantId
        // Server will auto-create/get the menu for this restaurant
        await menuApi.createMenuItem({
          ...itemData,
          restaurantId: currentBusiness.id,
        });
      }

      setModalVisible(false);
      await fetchMenuItems();
      Alert.alert(
        "Success",
        `Menu item ${editMode ? "updated" : "added"} successfully`,
      );
    } catch (error) {
      console.error("Error saving menu item:", error);
      Alert.alert(
        "Error",
        `Failed to ${editMode ? "update" : "add"} menu item`,
      );
    }
  };

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "" || item.subCategoryId === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getMenuSummary = () => {
    const availableItems = menuItems.filter((item) => item.isAvailable).length;
    const unavailableItems = menuItems.filter(
      (item) => !item.isAvailable,
    ).length;
    const totalItems = menuItems.length;
    return { availableItems, unavailableItems, totalItems };
  };

  const { availableItems, unavailableItems, totalItems } = getMenuSummary();

  // Cloudinary configuration - matching Next.js VM format exactly
  const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
  const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

  // 🚀 Image compression before upload
  const compressImage = async (uri: string): Promise<string> => {
    try {
      console.log("📸 Compressing image...");

      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 1200 } }, // Resize to max 1200px width (maintains aspect ratio)
        ],
        {
          compress: 0.7, // 70% quality (good balance between quality and size)
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      console.log("✅ Image compressed successfully");
      return manipResult.uri;
    } catch (error) {
      console.error("❌ Error compressing image:", error);
      // Return original URI if compression fails
      return uri;
    }
  };

  const handleImageUpload = async (uri: string): Promise<string> => {
    try {
      setImageLoading(true);

      // 🚀 Compress image before uploading
      const compressedUri = await compressImage(uri);

      // Create FormData for Cloudinary upload
      const formData = new FormData();
      formData.append("file", {
        uri: compressedUri,
        type: "image/jpeg",
        name: "menu-item.jpg",
      } as any);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

      console.log("☁️ Uploading to Cloudinary...");
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
      console.log("✅ Upload successful:", data.secure_url);
      setImageLoading(false);
      return data.secure_url;
    } catch (error) {
      console.error("❌ Error uploading to Cloudinary:", error);
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
          "Permission to access camera roll is required!",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
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

  const handleDelete = async (itemId: string) => {
    Alert.alert(
      "Delete Menu Item",
      "Are you sure you want to delete this menu item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await menuApi.deleteMenuItem(itemId);
              await fetchMenuItems();
              Alert.alert("Success", "Menu item deleted successfully");
            } catch (error) {
              console.error("Error deleting menu item:", error);
              Alert.alert("Error", "Failed to delete menu item");
            }
          },
        },
      ],
    );
  };

  // 🚀 Performance: Memoized render function with React.memo
  const MenuItemCard = React.memo(function MenuItemCard({
    item,
  }: {
    item: MenuItem;
  }) {
    return (
      <View style={styles.menuItemCard}>
        {/* Item Image */}
        <View style={styles.itemImageContainer}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.itemImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              accessibilityLabel={`Image of ${item.name}`}
            />
          ) : (
            <View
              style={styles.itemImagePlaceholder}
              accessibilityLabel={`No image for ${item.name}`}
            >
              <Ionicons name="restaurant" size={40} color="#ccc" />
            </View>
          )}
          {/* Availability Badge */}
          <View
            style={[
              styles.availabilityBadge,
              item.isAvailable
                ? styles.availableBadge
                : styles.unavailableBadge,
            ]}
            accessibilityLabel={`Item is ${
              item.isAvailable ? "available" : "unavailable"
            }`}
          >
            <Ionicons
              name={item.isAvailable ? "checkmark-circle" : "close-circle"}
              size={14}
              color="white"
            />
            <Text style={styles.availabilityBadgeText}>
              {item.isAvailable ? "Available" : "Unavailable"}
            </Text>
          </View>
        </View>

        {/* Item Info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={styles.itemDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}

          <View style={styles.itemDetails}>
            <Text
              style={styles.itemPrice}
              accessibilityLabel={`Price: ${item.price.toLocaleString()} GMD`}
            >
              GMD {item.price.toLocaleString()}
            </Text>
            {item.preparationTime && (
              <View
                style={styles.prepTimeContainer}
                accessibilityLabel={`Preparation time: ${item.preparationTime} minutes`}
              >
                <Ionicons name="time-outline" size={14} color="#666" />
                <Text style={styles.prepTimeText}>
                  {item.preparationTime} min
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={[
                styles.itemActionBtn,
                item.isAvailable
                  ? styles.itemActionBtnWarning
                  : styles.itemActionBtnSuccess,
              ]}
              onPress={() => toggleAvailability(item.id, !item.isAvailable)}
            >
              <Ionicons
                name={item.isAvailable ? "eye-off-outline" : "eye-outline"}
                size={15}
                color={item.isAvailable ? "#999" : PrimaryColor}
              />
              <Text
                style={[
                  styles.itemActionBtnText,
                  item.isAvailable
                    ? styles.itemActionBtnTextMuted
                    : styles.itemActionBtnTextPrimary,
                ]}
              >
                {item.isAvailable ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.itemActionBtn, styles.itemActionBtnDark]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create-outline" size={15} color="white" />
              <Text style={[styles.itemActionBtnText, { color: "white" }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.itemActionBtn, styles.itemActionBtnDelete]}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={15} color="#CC3333" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  });

  // 🚀 Performance: Memoized renderItem
  const renderMenuItem = useCallback(
    ({ item }: { item: MenuItem }) => <MenuItemCard item={item} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (currentBusiness?.type !== "RESTAURANT") {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={["#1A1A1A", "#2D2D2D"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Menu Management</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>

        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Restaurant Only</Text>
          <Text style={styles.emptyDescription}>
            Menu management is only available for restaurant businesses
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const getBusinessName = () => {
    if (currentBusiness?.name) {
      return currentBusiness.name;
    }
    return "Your Restaurant";
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

      {/* Header */}
      <LinearGradient
        colors={["#1A1A1A", "#2D2D2D"]}
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
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Returns to previous screen"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Menu Management</Text>
              <Text style={styles.headerSubtitle}>{getBusinessName()}</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAdd}
              accessibilityRole="button"
              accessibilityLabel="Add new menu item"
              accessibilityHint="Opens form to create a new menu item"
            >
              <Ionicons name="add" size={22} color="white" />
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <View style={styles.statPillIcon}>
                <Ionicons
                  name="restaurant-outline"
                  size={16}
                  color={PrimaryColor}
                />
              </View>
              <View>
                <Text style={styles.statPillValue}>{totalItems}</Text>
                <Text style={styles.statPillLabel}>Total</Text>
              </View>
            </View>
            <View style={styles.statPill}>
              <View style={styles.statPillIcon}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={PrimaryColor}
                />
              </View>
              <View>
                <Text style={styles.statPillValue}>{availableItems}</Text>
                <Text style={styles.statPillLabel}>Available</Text>
              </View>
            </View>
            <View style={styles.statPill}>
              <View style={styles.statPillIcon}>
                <Ionicons
                  name="eye-off-outline"
                  size={16}
                  color={PrimaryColor}
                />
              </View>
              <View>
                <Text style={styles.statPillValue}>{unavailableItems}</Text>
                <Text style={styles.statPillLabel}>Hidden</Text>
              </View>
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
            placeholder="Search menu items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search menu items"
            accessibilityHint="Type to filter menu items by name"
            accessibilityRole="search"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          accessibilityLabel="Category filters"
          accessibilityHint="Swipe to browse and select categories"
        >
          <TouchableOpacity
            key="all"
            style={[
              styles.filterChip,
              filterCategory === "" && styles.filterChipActive,
            ]}
            onPress={() => setFilterCategory("")}
            accessibilityRole="button"
            accessibilityLabel="Show all items"
            accessibilityState={{ selected: filterCategory === "" }}
          >
            <Text
              style={[
                styles.filterChipText,
                filterCategory === "" && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {subCategories.map((subCat) => (
            <TouchableOpacity
              key={subCat.id}
              style={[
                styles.filterChip,
                filterCategory === subCat.id && styles.filterChipActive,
              ]}
              onPress={() => setFilterCategory(subCat.id)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${subCat.name}`}
              accessibilityHint={`${
                filterCategory === subCat.id
                  ? "Currently selected"
                  : "Tap to filter by this category"
              }`}
              accessibilityState={{ selected: filterCategory === subCat.id }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterCategory === subCat.id && styles.filterChipTextActive,
                ]}
              >
                {subCat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Menu Items List with Enhanced Controls */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PrimaryColor} />
            <Text style={styles.loadingText}>Loading menu items...</Text>
          </View>
        ) : filteredMenuItems.length > 0 ? (
          <FlatList
            data={filteredMenuItems}
            renderItem={renderMenuItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.flatListContent}
            // 🚀 Performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={6}
            windowSize={5}
            // ♿ Accessibility
            accessibilityLabel="Menu items list"
            accessibilityHint={`Showing ${filteredMenuItems.length} menu items`}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Menu Items</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery || filterCategory
                ? "No items match your search criteria"
                : "Start by adding your first menu item"}
            </Text>
            {!searchQuery && !filterCategory && (
              <TouchableOpacity style={styles.emptyAction} onPress={handleAdd}>
                <Text style={styles.emptyActionText}>Add First Item</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Enhanced Modal */}
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
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="arrow-back" size={22} color="white" />
              </TouchableOpacity>
              <View style={styles.modalHeaderTitle}>
                <Text style={styles.modalTitle}>
                  {editMode ? "Edit Menu Item" : "Add Menu Item"}
                </Text>
                <Text style={styles.modalSubtitle}>{getBusinessName()}</Text>
              </View>
              <View style={{ width: 36 }} />
            </LinearGradient>

            <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Item Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedFields.name && styles.inputFocused,
                    formErrors.name && touchedFields.name && styles.inputError,
                  ]}
                  placeholder="Enter item name"
                  value={formData.name}
                  onChangeText={(text) => handleFieldChange("name", text)}
                  onBlur={() => handleFieldBlur("name")}
                  onFocus={() => handleFieldFocus("name")}
                  maxLength={100}
                />
                {formErrors.name && touchedFields.name && (
                  <Text style={styles.errorText}>{formErrors.name}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your dish"
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
                <Text style={styles.inputLabel}>Item Image</Text>
                <TouchableOpacity
                  style={[
                    styles.imagePickerContainer,
                    imageLoading && styles.imagePickerContainerUploading,
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
                        transition={200}
                        cachePolicy="memory-disk"
                      />
                      {imageLoading && (
                        <View style={styles.imageOverlay}>
                          <ActivityIndicator
                            size="large"
                            color={PrimaryColor}
                          />
                          <Text style={styles.uploadingText}>Uploading...</Text>
                        </View>
                      )}
                      {!imageLoading && (
                        <View style={styles.imageActions}>
                          <TouchableOpacity
                            style={styles.changeImageButton}
                            onPress={handleImagePicker}
                          >
                            <Ionicons name="camera" size={16} color="white" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() =>
                              setFormData((prev) => ({
                                ...prev,
                                imageUrl: "",
                              }))
                            }
                          >
                            <Ionicons name="trash" size={16} color="white" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons
                        name={imageLoading ? "cloud-upload" : "camera"}
                        size={40}
                        color={imageLoading ? PrimaryColor : "#ccc"}
                      />
                      <Text
                        style={[
                          styles.imagePlaceholderText,
                          imageLoading && styles.imagePlaceholderTextUploading,
                        ]}
                      >
                        {imageLoading ? "Uploading..." : "Tap to add image"}
                      </Text>
                      {!imageLoading && (
                        <Text style={styles.imageHintText}>
                          JPG, PNG up to 5MB
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
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
                    onChangeText={(text) => handleFieldChange("price", text)}
                    onBlur={() => handleFieldBlur("price")}
                    onFocus={() => handleFieldFocus("price")}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                  {formErrors.price && touchedFields.price && (
                    <Text style={styles.errorText}>{formErrors.price}</Text>
                  )}
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>Prep Time (min) *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedFields.preparationTime && styles.inputFocused,
                      formErrors.preparationTime &&
                        touchedFields.preparationTime &&
                        styles.inputError,
                    ]}
                    placeholder="15"
                    value={formData.preparationTime}
                    onChangeText={(text) =>
                      handleFieldChange("preparationTime", text)
                    }
                    onBlur={() => handleFieldBlur("preparationTime")}
                    onFocus={() => handleFieldFocus("preparationTime")}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  {formErrors.preparationTime &&
                    touchedFields.preparationTime && (
                      <Text style={styles.errorText}>
                        {formErrors.preparationTime}
                      </Text>
                    )}
                </View>
              </View>

              {/* Discounted Price Section */}
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
                  onChangeText={(text) =>
                    handleFieldChange("discountedPrice", text)
                  }
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
                      <Ionicons name="pricetag" size={16} color="#10b981" />
                      <Text style={styles.discountPreviewText}>
                        {Math.round(
                          ((parseFloat(formData.price) -
                            parseFloat(formData.discountedPrice)) /
                            parseFloat(formData.price)) *
                            100,
                        )}
                        % OFF - Customers will see this discount badge
                      </Text>
                    </View>
                  )}
                {formData.discountedPrice &&
                  parseFloat(formData.discountedPrice) > 0 &&
                  formData.price &&
                  parseFloat(formData.price) > 0 &&
                  parseFloat(formData.discountedPrice) >=
                    parseFloat(formData.price) && (
                    <Text style={styles.errorText}>
                      ⚠️ Discounted price must be less than original price
                    </Text>
                  )}
              </View>

              {/* Meal Time Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Meal Time *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categorySelector}>
                    {getSelectableMealTimes().map((mealTime) => (
                      <TouchableOpacity
                        key={mealTime.id}
                        style={[
                          styles.categoryOption,
                          formData.mealTime === mealTime.name &&
                            styles.categoryOptionActive,
                          formErrors.mealTime &&
                            touchedFields.mealTime &&
                            styles.categoryOptionError,
                        ]}
                        onPress={() => {
                          setFormData({
                            ...formData,
                            mealTime: mealTime.name,
                          });
                          // Clear error when user selects a meal time
                          if (touchedFields.mealTime) {
                            setFormErrors((prev) => ({
                              ...prev,
                              mealTime: "",
                            }));
                          }
                        }}
                      >
                        <Ionicons
                          name={mealTime.icon as any}
                          size={16}
                          color={
                            formData.mealTime === mealTime.name
                              ? "white"
                              : "#666"
                          }
                          style={styles.categoryIcon}
                        />
                        <Text
                          style={[
                            styles.categoryOptionText,
                            formData.mealTime === mealTime.name &&
                              styles.categoryOptionTextActive,
                          ]}
                        >
                          {mealTime.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                {formErrors.mealTime && touchedFields.mealTime && (
                  <Text style={styles.errorText}>{formErrors.mealTime}</Text>
                )}
              </View>

              {/* Subcategory Selector (Optional) — searchable dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Category (Subcategory - Optional)
                </Text>

                {loadingSubCategories ? (
                  <ActivityIndicator size="small" color={PrimaryColor} />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.subcatSelectorButton}
                      onPress={() => setShowSubcategoryPicker(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Select subcategory"
                    >
                      <Text style={styles.subcatSelectorText} numberOfLines={1}>
                        {formData.subCategoryId
                          ? subCategories.find(
                              (s) => s.id === formData.subCategoryId,
                            )?.name || "Selected"
                          : "None"}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="#666" />
                    </TouchableOpacity>

                    {/* Picker modal */}
                    <Modal
                      visible={showSubcategoryPicker}
                      transparent
                      animationType="slide"
                      onRequestClose={() => setShowSubcategoryPicker(false)}
                    >
                      <View style={styles.subcatModalOverlay}>
                        <View style={styles.subcatModalContainer}>
                          <View style={styles.subcatModalHeader}>
                            <Text style={styles.subcatModalTitle}>
                              Select Subcategory
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                setShowSubcategoryPicker(false);
                                setSubCategorySearch("");
                              }}
                              accessibilityRole="button"
                              accessibilityLabel="Close subcategory picker"
                            >
                              <Ionicons name="close" size={22} color="#333" />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.subcatSearchWrap}>
                            <TextInput
                              value={subCategorySearch}
                              onChangeText={setSubCategorySearch}
                              placeholder="Search subcategories..."
                              style={styles.subcatSearchInput}
                              clearButtonMode="while-editing"
                              accessibilityLabel="Search subcategories"
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <FlatList
                              data={[
                                { id: "__none", name: "None" },
                                ...filteredSubCategories,
                              ]}
                              keyExtractor={(item) => item.id}
                              renderItem={({ item }) => {
                                const isSelected =
                                  item.id === "__none"
                                    ? formData.subCategoryId === ""
                                    : formData.subCategoryId === item.id;

                                return (
                                  <TouchableOpacity
                                    style={[
                                      styles.subcatListItem,
                                      isSelected &&
                                        styles.subcatListItemSelected,
                                    ]}
                                    onPress={() => {
                                      setFormData({
                                        ...formData,
                                        subCategoryId:
                                          item.id === "__none" ? "" : item.id,
                                      });
                                      setShowSubcategoryPicker(false);
                                      setSubCategorySearch("");
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.subcatListText,
                                        isSelected &&
                                          styles.subcatListTextSelected,
                                      ]}
                                    >
                                      {item.name}
                                    </Text>

                                    {isSelected && (
                                      <Ionicons
                                        name="checkmark"
                                        size={18}
                                        color={PrimaryColor}
                                      />
                                    )}
                                  </TouchableOpacity>
                                );
                              }}
                              ItemSeparatorComponent={() => (
                                <View
                                  style={{
                                    height: 1,
                                    backgroundColor: "#f2f2f2",
                                  }}
                                />
                              )}
                              keyboardShouldPersistTaps="handled"
                              contentContainerStyle={{ paddingBottom: 12 }}
                            />
                          </View>
                        </View>
                      </View>
                    </Modal>
                  </>
                )}
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Available for Order</Text>
                <Switch
                  value={formData.isAvailable}
                  onValueChange={(value) =>
                    setFormData({ ...formData, isAvailable: value })
                  }
                  trackColor={{ false: "#767577", true: PrimaryColor }}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editMode ? "Update Item" : "Add Item"}
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
  // ── Page ────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  // ── Header ──────────────────────────────────────────────
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
    marginBottom: 18,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
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
  headerRight: {
    width: 36,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  // Stats row in header
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
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
  statPillValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  statPillLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },

  // ── Search / Filter ─────────────────────────────────────
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
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#1A1A1A",
  },
  filterContainer: {},
  filterChip: {
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
  filterChipText: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: PrimaryColor,
    fontWeight: "700",
  },

  // ── List ────────────────────────────────────────────────
  listContainer: {
    flex: 1,
  },
  flatListContent: {
    padding: 14,
    paddingBottom: 32,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#888",
  },
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
  emptyActionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Menu Item Card ───────────────────────────────────────
  menuItemCard: {
    backgroundColor: "white",
    borderRadius: 14,
    marginBottom: 10,
    height: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  itemImageContainer: {
    width: 120,
    height: 120,
    position: "relative",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  itemImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  availabilityBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  availableBadge: {
    backgroundColor: "rgba(34,197,94,0.9)",
  },
  unavailableBadge: {
    backgroundColor: "rgba(239,68,68,0.9)",
  },
  availabilityBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  itemInfo: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 3,
    flexWrap: "wrap",
  },
  itemDescription: {
    fontSize: 12,
    color: "#888",
    lineHeight: 16,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  itemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: PrimaryColor,
  },
  prepTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  prepTimeText: {
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
  },
  itemActions: {
    flexDirection: "row",
    gap: 6,
  },
  itemActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 7,
    gap: 3,
  },
  itemActionBtnWarning: {
    backgroundColor: "#F5F5F5",
  },
  itemActionBtnSuccess: {
    backgroundColor: "#FFF4EC",
  },
  itemActionBtnDark: {
    backgroundColor: "#1A1A1A",
  },
  itemActionBtnDelete: {
    backgroundColor: "#FFF0F0",
    paddingHorizontal: 10,
  },
  itemActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  itemActionBtnTextMuted: {
    color: "#999",
  },
  itemActionBtnTextPrimary: {
    color: PrimaryColor,
  },

  // ── Full-screen Modal ────────────────────────────────────
  modalScreen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  // (kept for compatibility)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 18,
    paddingHorizontal: 16,
    gap: 12,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  modalHeaderTitle: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },

  // ── Form ────────────────────────────────────────────────
  form: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
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
  inputError: {
    borderColor: "#EF4444",
    borderWidth: 1.5,
  },
  textArea: {
    height: 88,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 5,
    fontWeight: "500",
  },

  // Discount preview
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

  // Meal time selector
  categorySelector: {
    flexDirection: "row",
  },
  categoryOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
  },
  categoryOptionActive: {
    backgroundColor: "#FFF4EC",
    borderWidth: 1,
    borderColor: PrimaryColor,
  },
  categoryOptionError: {
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  categoryIcon: {
    marginRight: 5,
  },
  categoryOptionText: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
  categoryOptionTextActive: {
    color: PrimaryColor,
    fontWeight: "700",
  },

  // Subcategory picker
  subcatSelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    backgroundColor: "white",
  },
  subcatSelectorText: {
    flex: 1,
    color: "#1A1A1A",
    marginRight: 8,
    fontSize: 15,
  },
  subcatModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    alignItems: "stretch",
  },
  subcatModalContainer: {
    height: "70%",
    minHeight: 220,
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
    paddingBottom: 24,
  },
  subcatModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  subcatModalTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  subcatSearchWrap: { paddingHorizontal: 6, paddingVertical: 8 },
  subcatSearchInput: {
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: "#F8F8F8",
    color: "#1A1A1A",
  },
  subcatListItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subcatListText: { fontSize: 14, color: "#1A1A1A" },
  subcatListItemSelected: {
    backgroundColor: "#FFF4EC",
    borderRadius: 8,
  },
  subcatListTextSelected: { color: PrimaryColor, fontWeight: "700" },

  // Switch row
  switchContainer: {
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
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },

  // Save button
  saveButton: {
    backgroundColor: PrimaryColor,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  saveButtonGradient: {
    padding: 18,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },

  // Image upload
  imagePickerContainer: {
    borderWidth: 2,
    borderColor: "#EBEBEB",
    borderStyle: "dashed",
    borderRadius: 12,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  imagePickerContainerUploading: {
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
  changeImageButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  removeImageButton: {
    backgroundColor: "rgba(239,68,68,0.85)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholder: {
    alignItems: "center",
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
  imagePlaceholderTextUploading: {
    color: PrimaryColor,
  },
  imageHintText: {
    marginTop: 4,
    fontSize: 11,
    color: "#BBB",
  },

  // Leftover compat styles
  statsContainer: { flexDirection: "row", justifyContent: "space-between" },
  statCard: { flex: 1 },
  statNumber: { color: "white" },
  statLabel: { color: "rgba(255,255,255,0.7)" },
  actionButton: { flexDirection: "row", alignItems: "center" },
  toggleButton: {},
  editButton: {},
  deleteButton: {},
  actionButtonText: { fontSize: 11, marginLeft: 4 },
});
