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
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useVendor } from "@/context/VendorContext";
import { menuApi, subCategoryApi } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";
import { useRealTime } from "@/hooks/useRealTime";
import { MEAL_TIMES, getSelectableMealTimes } from "@/constants/MealTimes";

const { width } = Dimensions.get("window");

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
        formData.preparationTime
      ),
      discountedPrice: validateField(
        "discountedPrice",
        formData.discountedPrice
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
      formData[field as keyof typeof formData] as string
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
        currentBusiness
      );
      setMenuItems([]);
      return;
    }

    try {
      setIsLoading(true);
      console.log("🍽️ Fetching menu items for restaurant:", currentBusiness.id);

      // Use the correct API endpoint that matches your VM system
      const response = await menuApi.getMenuItemsByRestaurant(
        currentBusiness.id
      );
      console.log("📋 Menu items response:", response);

      if (response?.data) {
        const menuItemsData = Array.isArray(response.data) ? response.data : [];
        console.log(
          "✅ Menu items data (from response.data):",
          menuItemsData.length,
          "items"
        );
        setMenuItems(menuItemsData);
      } else if (Array.isArray(response)) {
        console.log(
          "✅ Menu items data (direct array):",
          response.length,
          "items"
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
                  item.id === itemId ? { ...item, isAvailable } : item
                )
              );
              Alert.alert(
                "Success",
                `Menu item ${isAvailable ? "enabled" : "disabled"} successfully`
              );
            } catch (error) {
              console.error("Error updating availability:", error);
              Alert.alert(
                "Error",
                "Failed to update item availability. Please try again."
              );
            }
          },
        },
      ]
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
        "Please fix the errors in the form before saving."
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
        `Menu item ${editMode ? "updated" : "added"} successfully`
      );
    } catch (error) {
      console.error("Error saving menu item:", error);
      Alert.alert(
        "Error",
        `Failed to ${editMode ? "update" : "add"} menu item`
      );
    }
  };

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "" ||
      filterCategory === "All" ||
      item.mealTime === filterCategory; // Use mealTime from schema
    return matchesSearch && matchesCategory;
  });

  const getMenuSummary = () => {
    const availableItems = menuItems.filter((item) => item.isAvailable).length;
    const unavailableItems = menuItems.filter(
      (item) => !item.isAvailable
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
        }
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
          "Permission to access camera roll is required!"
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
      ]
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
            <Text style={styles.itemDescription} numberOfLines={2}>
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
              style={[styles.actionButton, styles.toggleButton]}
              onPress={() => toggleAvailability(item.id, !item.isAvailable)}
              accessibilityRole="button"
              accessibilityLabel={
                item.isAvailable ? "Disable item" : "Enable item"
              }
              accessibilityHint={`${
                item.isAvailable
                  ? "Makes this item unavailable"
                  : "Makes this item available"
              } for customers to order`}
            >
              <Ionicons
                name={item.isAvailable ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={item.isAvailable ? "#F44336" : "#4CAF50"}
              />
              {/* <Text style={styles.actionButtonText}>
                {item.isAvailable ? "Disable" : "Enable"}
              </Text> */}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEdit(item)}
              accessibilityRole="button"
              accessibilityLabel="Edit item"
              accessibilityHint="Opens form to edit this menu item"
            >
              <Ionicons name="create-outline" size={18} color="#2196F3" />
              {/* <Text style={styles.actionButtonText}>Edit</Text> */}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(item.id)}
              accessibilityRole="button"
              accessibilityLabel="Delete item"
              accessibilityHint="Permanently removes this menu item"
            >
              <Ionicons name="trash-outline" size={18} color="#F44336" />
              {/* <Text style={styles.actionButtonText}>Delete</Text> */}
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
    []
  );

  if (currentBusiness?.type !== "RESTAURANT") {
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
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View
            style={styles.statsContainer}
            accessibilityLabel={`Menu statistics: ${totalItems} total items, ${availableItems} available, ${unavailableItems} unavailable`}
          >
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalItems}</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: "#4CAF50" }]}>
                {availableItems}
              </Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: "#F44336" }]}>
                {unavailableItems}
              </Text>
              <Text style={styles.statLabel}>Unavailable</Text>
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
                filterCategory === subCat.name && styles.filterChipActive,
              ]}
              onPress={() => setFilterCategory(subCat.name)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${subCat.name}`}
              accessibilityHint={`${
                filterCategory === subCat.name
                  ? "Currently selected"
                  : "Tap to filter by this category"
              }`}
              accessibilityState={{ selected: filterCategory === subCat.name }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterCategory === subCat.name && styles.filterChipTextActive,
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
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
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
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalContent}>
              <LinearGradient
                colors={[PrimaryColor, "#1976D2"]}
                style={styles.modalHeader}
              >
                <Text style={styles.modalTitle}>
                  {editMode ? "Edit Menu Item" : "Add Menu Item"}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView
                style={styles.form}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Item Name *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedFields.name && styles.inputFocused,
                      formErrors.name &&
                        touchedFields.name &&
                        styles.inputError,
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
                            <Text style={styles.uploadingText}>
                              Uploading...
                            </Text>
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
                            imageLoading &&
                              styles.imagePlaceholderTextUploading,
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
                  <View
                    style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}
                  >
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

                  <View
                    style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}
                  >
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
                              100
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

                {/* Subcategory Selector (Optional) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Category (Subcategory - Optional)
                  </Text>
                  {loadingSubCategories ? (
                    <ActivityIndicator size="small" color={PrimaryColor} />
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <View style={styles.categorySelector}>
                        <TouchableOpacity
                          style={[
                            styles.categoryOption,
                            !formData.subCategoryId &&
                              styles.categoryOptionActive,
                          ]}
                          onPress={() =>
                            setFormData({
                              ...formData,
                              subCategoryId: "",
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.categoryOptionText,
                              !formData.subCategoryId &&
                                styles.categoryOptionTextActive,
                            ]}
                          >
                            None
                          </Text>
                        </TouchableOpacity>
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
                  <Text style={styles.switchLabel}>Available for Order</Text>
                  <Switch
                    value={formData.isAvailable}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isAvailable: value })
                    }
                    trackColor={{ false: "#767577", true: PrimaryColor }}
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                >
                  <LinearGradient
                    colors={[PrimaryColor, "#1976D2"]}
                    style={styles.saveButtonGradient}
                  >
                    <Text style={styles.saveButtonText}>
                      {editMode ? "Update Item" : "Add Item"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
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
  listContainer: {
    flex: 1,
    padding: 15,
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
  keyboardAvoidingView: {
    flex: 1,
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
  optionalText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7280",
  },
  discountPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  discountPreviewText: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "600",
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginTop: 6,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    color: "#1F2937",
  },
  inputFocused: {
    borderColor: PrimaryColor,
    borderWidth: 2,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: "#EF4444",
    borderWidth: 1.5,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
    paddingTop: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  categorySelector: {
    flexDirection: "row",
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  categoryOptionActive: {
    backgroundColor: PrimaryColor,
  },
  categoryOptionError: {
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  categoryIcon: {
    marginRight: 6,
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
  imagePickerContainerUploading: {
    borderColor: PrimaryColor,
    backgroundColor: "#f0f8ff",
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
    fontSize: 14,
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
    backgroundColor: "rgba(33, 150, 243, 0.9)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  removeImageButton: {
    backgroundColor: "rgba(244, 67, 54, 0.9)",
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
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  imagePlaceholderTextUploading: {
    color: PrimaryColor,
  },
  imageHintText: {
    marginTop: 4,
    fontSize: 12,
    color: "#888",
    fontWeight: "400",
  },
  // Menu item card styles
  flatListContent: {
    paddingBottom: 20,
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
    marginTop: 15,
    fontSize: 16,
    color: "#666",
  },
  menuItemCard: {
    backgroundColor: "white",
    borderRadius: 15,
    marginBottom: 15,
    width: (width - 45) / 2, // 2 columns with padding
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: "hidden",
  },
  itemImageContainer: {
    width: "100%",
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
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  availabilityBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableBadge: {
    backgroundColor: "rgba(76, 175, 80, 0.9)",
  },
  unavailableBadge: {
    backgroundColor: "rgba(244, 67, 54, 0.9)",
  },
  availabilityBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: PrimaryColor,
  },
  prepTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  prepTimeText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  itemActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleButton: {
    borderColor: "#E0E0E0",
    backgroundColor: "#F5F5F5",
  },
  editButton: {
    borderColor: "#2196F3",
    backgroundColor: "rgba(33, 150, 243, 0.05)",
  },
  deleteButton: {
    borderColor: "#F44336",
    backgroundColor: "rgba(244, 67, 54, 0.05)",
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
    color: "#666",
  },
});
