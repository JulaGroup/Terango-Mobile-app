import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";
import axios, { isAxiosError } from "axios";
import { API_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface MenuItemFormProps {
  // For editing existing items
  existingItem?: {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string;
  };
  // For determining which vendor type we're adding to
  vendorType: "restaurants" | "shops" | "pharmacies";
  vendorId: string;
}

export default function MenuItemForm({
  existingItem,
  vendorType,
  vendorId,
}: MenuItemFormProps) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState(existingItem?.name || "");
  const [description, setDescription] = useState(
    existingItem?.description || ""
  );
  const [price, setPrice] = useState(existingItem?.price?.toString() || "");
  const [category, setCategory] = useState(existingItem?.category || "");
  const [image, setImage] = useState<string | null>(
    existingItem?.imageUrl || null
  );

  // UI state
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Handle image picking
  const pickImage = async () => {
    try {
      // Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to select an image."
        );
        return;
      }

      // Launch the image library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Use MediaTypeOptions instead of MediaType
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Reduced quality for faster uploads
        exif: false, // Don't include metadata
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        // Store the URI
        setImage(selectedAsset.uri);
        console.log("Selected image URI:", selectedAsset.uri);

        // Log additional information about the image
        console.log("Image width:", selectedAsset.width);
        console.log("Image height:", selectedAsset.height);
        console.log("Image type:", selectedAsset.type);
        console.log("Image fileSize:", selectedAsset.fileSize);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick an image. Please try again.");
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Validate inputs
      if (!name || !price || !category) {
        Alert.alert("Missing Fields", "Please fill out all required fields.");
        return;
      }

      setLoading(true);

      // Get token for API authentication
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Authentication Error", "Please log in again.");
        setLoading(false);
        return;
      }

      // Create a FormData object for both create and update requests
      const formData = new FormData();

      // Add basic fields
      formData.append("name", name);
      formData.append("price", price);

      if (description) {
        formData.append("description", description);
      }

      if (category) {
        formData.append("category", category);
      }

      // Add the appropriate vendor ID field
      if (vendorType === "restaurants") {
        formData.append("restaurantId", vendorId);
      } else if (vendorType === "shops") {
        formData.append("shopId", vendorId);
      } else if (vendorType === "pharmacies") {
        formData.append("pharmacyId", vendorId);
      }

      // Handle image
      if (image) {
        if (!image.startsWith("http")) {
          // If this is a local image (not URL), we need to attach it as a file
          console.log("Preparing image for upload:", image);
          setImageUploading(true);

          try {
            // Get the file name from the URI
            const uriParts = image.split("/");
            const fileName =
              uriParts[uriParts.length - 1] || `image-${Date.now()}.jpg`;

            // Append the image file to the form data
            formData.append("image", {
              uri: image,
              type: "image/jpeg",
              name: fileName,
            } as any);

            console.log("Image attached to form data");
          } catch (imageError) {
            console.error("Error preparing image:", imageError);
            Alert.alert(
              "Error",
              "There was an issue with the image. Please try selecting another one."
            );
            setLoading(false);
            setImageUploading(false);
            return;
          } finally {
            setImageUploading(false);
          }
        } else if (existingItem && image === existingItem.imageUrl) {
          // If image is unchanged (still the URL), no need to include it
          console.log("Using existing image URL, no upload needed");
        }
      }

      // Set up request headers for multipart/form-data
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      };

      const isUpdate = !!existingItem?.id;
      console.log("Submitting menu item with form data");

      // Make the API request (create or update)
      let response;

      if (isUpdate && existingItem?.id) {
        // Update existing menu item
        console.log(`Updating menu item with ID: ${existingItem.id}`);
        response = await axios.put(
          `${API_URL}/api/menu-items/${existingItem.id}`,
          formData,
          { headers }
        );
      } else {
        // Create new menu item
        console.log("Creating new menu item");
        response = await axios.post(`${API_URL}/api/menu-items`, formData, {
          headers,
        });
      }

      console.log("Menu item saved successfully:", response.data);

      // Show success message and navigate back
      Alert.alert(
        "Success",
        `Menu item ${existingItem ? "updated" : "added"} successfully.`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Error saving menu item:", error);

      // Get detailed error information if available
      let errorMessage = "Failed to save menu item. Please try again.";

      if (isAxiosError(error) && error.response) {
        console.error("API error response:", error.response.data);

        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.formContainer}>
        {/* Image picker section */}
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={pickImage}
          activeOpacity={0.8}
        >
          {imageUploading ? (
            <View style={styles.imagePlaceholder}>
              <ActivityIndicator size="large" color={PrimaryColor} />
              <Text style={styles.imagePlaceholderText}>
                Uploading image...
              </Text>
            </View>
          ) : image ? (
            <>
              <Image source={{ uri: image }} style={styles.image} />
              <View style={styles.imageOverlay}>
                <TouchableOpacity
                  style={styles.changeImageBtn}
                  onPress={pickImage}
                >
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={50} color="#A1A1AA" />
              <Text style={styles.imagePlaceholderText}>
                Tap to select an image
              </Text>
            </View>
          )}

          {imageUploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color={PrimaryColor} />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Form fields */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Name*</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter item name"
            placeholderTextColor="#A1A1AA"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter item description"
            placeholderTextColor="#A1A1AA"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Price (D)*</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            placeholderTextColor="#A1A1AA"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Category*</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="Enter category"
            placeholderTextColor="#A1A1AA"
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>
              {existingItem ? "Update Menu Item" : "Add Menu Item"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  formContainer: {
    padding: 16,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: "#71717A",
    fontSize: 16,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(0,0,0,0.3)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
  },
  changeImageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PrimaryColor,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingText: {
    color: "#FFF",
    marginTop: 8,
    fontSize: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: PrimaryColor,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
