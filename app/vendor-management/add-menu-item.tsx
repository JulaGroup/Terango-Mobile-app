import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/constants/config";

interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
}

interface MealTime {
  id: string;
  name: string;
}

const MEAL_TIMES = [
  { id: "breakfast", name: "Breakfast" },
  { id: "lunch", name: "Lunch" },
  { id: "dinner", name: "Dinner" },
  { id: "snacks", name: "Snacks" },
  { id: "beverages", name: "Beverages" },
];

export default function AddMenuItem() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    subCategoryId: "",
    mealTime: "",
    preparationTime: "",
    isAvailable: true,
  });

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");

  useEffect(() => {
    fetchUserRestaurant();
    fetchSubCategories();
  }, []);

  const fetchUserRestaurant = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      const token = await AsyncStorage.getItem("token");

      if (!userId || !token) {
        Alert.alert("Error", "Authentication error. Please log in again.");
        return;
      }

      const vendorResponse = await axios.get(
        `${API_URL}/api/vendors/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (vendorResponse.data?.restaurants?.length > 0) {
        const userRestaurant = vendorResponse.data.restaurants[0];
        setRestaurant({ id: userRestaurant.id, name: userRestaurant.name });
      } else {
        Alert.alert(
          "Error",
          "No restaurant found. Please set up your restaurant first."
        );
      }
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      Alert.alert("Error", "Failed to load restaurant information");
    }
  };

  const fetchSubCategories = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/subcategories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubCategories(response.data);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return "";

    setUploading(true);
    try {
      // Create FormData for Cloudinary upload
      const formData = new FormData();
      formData.append("file", {
        uri: selectedImage,
        type: "image/jpeg",
        name: "menu-item.jpg",
      } as any);
      formData.append("upload_preset", "unsigned_preset");

      const cloudName = "dkpi5ij2t";
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      const uploadResponse = await axios.post(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadedImageUrl(uploadResponse.data.secure_url);
      setUploading(false);
      return uploadResponse.data.secure_url;
    } catch (error) {
      setUploading(false);
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Failed to upload image");
      return "";
    }
  };

  const selectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera roll permissions");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter menu item name");
      return;
    }
    if (!formData.price.trim()) {
      Alert.alert("Error", "Please enter price");
      return;
    }
    if (!formData.subCategoryId) {
      Alert.alert("Error", "Please select a category");
      return;
    }
    if (!formData.mealTime) {
      Alert.alert("Error", "Please select meal time");
      return;
    }
    if (!restaurant) {
      Alert.alert("Error", "Restaurant information not available");
      return;
    }

    setLoading(true);

    try {
      // Upload image to Cloudinary first
      let imageUrl = "";
      if (selectedImage) {
        imageUrl = await handleImageUpload();
      }

      const token = await AsyncStorage.getItem("token");

      const menuItemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        restaurantId: restaurant.id,
        subCategoryId: formData.subCategoryId,
        imageUrl: imageUrl,
        mealTime: formData.mealTime,
        preparationTime: parseInt(formData.preparationTime) || 15,
        isAvailable: formData.isAvailable,
      };

      await axios.post(`${API_URL}/api/menuItem`, menuItemData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Success", "Menu item added successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Error adding menu item:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to add menu item"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Add Menu Item</Text>
            <Text style={styles.headerSubtitle}>
              {restaurant?.name || "Restaurant"}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            {/* Image Upload Section */}
            <View style={styles.imageSection}>
              <Text style={styles.sectionLabel}>Menu Item Photo</Text>
              <TouchableOpacity
                style={styles.imageUploadArea}
                onPress={selectImage}
              >
                {selectedImage ? (
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.uploadedImage}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={32} color="#9ca3af" />
                    <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                  </View>
                )}
                {uploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Basic Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Item Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="e.g., Grilled Chicken Salad"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholder="Describe your menu item..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price (GMD) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.price}
                  onChangeText={(text) =>
                    setFormData({ ...formData, price: text })
                  }
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Category Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipContainer}
              >
                {subCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.chip,
                      formData.subCategoryId === category.id &&
                        styles.chipSelected,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, subCategoryId: category.id })
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        formData.subCategoryId === category.id &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Meal Time Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Meal Time *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipContainer}
              >
                {MEAL_TIMES.map((mealTime) => (
                  <TouchableOpacity
                    key={mealTime.id}
                    style={[
                      styles.chip,
                      formData.mealTime === mealTime.id && styles.chipSelected,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, mealTime: mealTime.id })
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        formData.mealTime === mealTime.id &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {mealTime.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Additional Options */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Additional Options</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Preparation Time (minutes)
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.preparationTime}
                  onChangeText={(text) =>
                    setFormData({ ...formData, preparationTime: text })
                  }
                  placeholder="15"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                />
              </View>

              <TouchableOpacity
                style={styles.toggleContainer}
                onPress={() =>
                  setFormData({
                    ...formData,
                    isAvailable: !formData.isAvailable,
                  })
                }
              >
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Available for Order</Text>
                  <Text style={styles.toggleDescription}>
                    Customers can order this item
                  </Text>
                </View>
                <View
                  style={[
                    styles.toggle,
                    formData.isAvailable && styles.toggleActive,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      formData.isAvailable && styles.toggleKnobActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={["#10b981", "#059669"]}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Add Menu Item</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  imageSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  imageUploadArea: {
    height: 300,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    position: "relative",
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#9ca3af",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  section: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#1f2937",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  chipContainer: {
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipSelected: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  chipTextSelected: {
    color: "#fff",
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2937",
  },
  toggleDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#d1d5db",
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: "#10b981",
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  submitButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
