import React, { useState, useEffect, useCallback } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/constants/config";

const MEAL_TIMES = [
  { id: "breakfast", name: "Breakfast" },
  { id: "lunch", name: "Lunch" },
  { id: "dinner", name: "Dinner" },
  { id: "snacks", name: "Snacks" },
  { id: "beverages", name: "Beverages" },
];

export default function EditMenuItem() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { itemId, restaurantName } = params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
  const [existingImageUrl, setExistingImageUrl] = useState<string>("");

  const fetchMenuItem = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Error", "Authentication error. Please log in again.");
        return;
      }

      const response = await axios.get(`${API_URL}/api/menuItem/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const menuItem = response.data;
      console.log("Fetched menu item:", menuItem);

      setFormData({
        name: menuItem.name || "",
        description: menuItem.description || "",
        price: menuItem.price?.toString() || "",
        subCategoryId: menuItem.subCategoryId || "",
        mealTime: menuItem.mealTime || "",
        preparationTime: menuItem.preparationTime?.toString() || "",
        isAvailable: menuItem.isAvailable ?? true,
      });

      if (menuItem.imageUrl) {
        setExistingImageUrl(menuItem.imageUrl);
        setUploadedImageUrl(menuItem.imageUrl);
      }
    } catch (error: any) {
      console.error("Error fetching menu item:", error);
      Alert.alert(
        "Error",
        `Failed to load menu item: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (itemId) {
      fetchMenuItem();
    }
  }, [itemId, fetchMenuItem]);

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Sorry, we need camera roll permissions to make this work!"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        await uploadImage(imageUri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", {
        uri: imageUri,
        type: "image/jpeg",
        name: "menu-item-image.jpg",
      } as any);

      const response = await axios.post(
        `${API_URL}/api/upload/image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data && response.data.secure_url) {
        setUploadedImageUrl(response.data.secure_url);
        console.log("Image uploaded successfully:", response.data.secure_url);
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      Alert.alert(
        "Upload Error",
        `Failed to upload image: ${
          error.response?.data?.message || error.message
        }`
      );
      setSelectedImage(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Validation Error", "Please enter a menu item name");
      return;
    }

    if (!formData.price.trim() || isNaN(Number(formData.price))) {
      Alert.alert("Validation Error", "Please enter a valid price");
      return;
    }

    if (!formData.mealTime) {
      Alert.alert("Validation Error", "Please select a meal time");
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Error", "Authentication error. Please log in again.");
        return;
      }

      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        subCategoryId: formData.subCategoryId || null,
        mealTime: formData.mealTime,
        preparationTime: formData.preparationTime
          ? parseInt(formData.preparationTime)
          : null,
        isAvailable: formData.isAvailable,
        imageUrl: uploadedImageUrl || existingImageUrl || "",
      };

      console.log("Updating menu item with data:", updateData);

      const response = await axios.put(
        `${API_URL}/api/menuItem/${itemId}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Update response:", response.data);

      Alert.alert("Success", "Menu item updated successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Error updating menu item:", error);
      console.error("Error response:", error.response?.data);
      Alert.alert(
        "Error",
        `Failed to update menu item: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading menu item...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
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
            <Text style={styles.headerTitle}>Edit Menu Item</Text>
            <Text style={styles.headerSubtitle}>{restaurantName}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Image Upload Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Item Image</Text>
            <TouchableOpacity
              style={styles.imageUploadContainer}
              onPress={pickImage}
              disabled={uploading}
            >
              {selectedImage || existingImageUrl ? (
                <Image
                  source={{ uri: selectedImage || existingImageUrl }}
                  style={styles.uploadedImage}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera" size={32} color="#9ca3af" />
                  <Text style={styles.imagePlaceholderText}>
                    Tap to add image
                  </Text>
                </View>
              )}
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholder="Enter menu item name"
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
                placeholder="Enter item description"
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

          {/* Meal Time Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meal Time *</Text>
            <View style={styles.mealTimeContainer}>
              {MEAL_TIMES.map((mealTime) => (
                <TouchableOpacity
                  key={mealTime.id}
                  style={[
                    styles.mealTimeButton,
                    formData.mealTime === mealTime.id &&
                      styles.mealTimeButtonSelected,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, mealTime: mealTime.id })
                  }
                >
                  <Text
                    style={[
                      styles.mealTimeButtonText,
                      formData.mealTime === mealTime.id &&
                        styles.mealTimeButtonTextSelected,
                    ]}
                  >
                    {mealTime.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Additional Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preparation Time (minutes)</Text>
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

            {/* Availability Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Availability</Text>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  formData.isAvailable && styles.toggleButtonActive,
                ]}
                onPress={() =>
                  setFormData({
                    ...formData,
                    isAvailable: !formData.isAvailable,
                  })
                }
              >
                <View
                  style={[
                    styles.toggleIndicator,
                    formData.isAvailable && styles.toggleIndicatorActive,
                  ]}
                />
                <Text
                  style={[
                    styles.toggleText,
                    formData.isAvailable && styles.toggleTextActive,
                  ]}
                >
                  {formData.isAvailable ? "Available" : "Unavailable"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button - Fixed positioning */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            <LinearGradient
              colors={saving ? ["#9ca3af", "#6b7280"] : ["#10b981", "#059669"]}
              style={styles.submitGradient}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={20} color="#fff" />
              )}
              <Text style={styles.submitButtonText}>
                {saving ? "Updating..." : "Save Changes"}
              </Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  imageUploadContainer: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  imagePlaceholder: {
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
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
    color: "#1f2937",
    backgroundColor: "#fff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  mealTimeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mealTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  mealTimeButtonSelected: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  mealTimeButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  mealTimeButtonTextSelected: {
    color: "#fff",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  toggleButtonActive: {
    backgroundColor: "#d1fae5",
    borderColor: "#10b981",
  },
  toggleIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#9ca3af",
    marginRight: 12,
  },
  toggleIndicatorActive: {
    backgroundColor: "#10b981",
  },
  toggleText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
  },
  toggleTextActive: {
    color: "#10b981",
  },
  submitContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
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
