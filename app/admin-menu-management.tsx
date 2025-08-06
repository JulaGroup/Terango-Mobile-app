import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { menuApi, subCategoryApi } from "@/lib/api";
import { LinearGradient } from "expo-linear-gradient";
import { uploadMenuItemImage } from "@/utils/cloudinaryUpload";
import * as ImagePicker from "expo-image-picker";

interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  preparationTime: number;
  image?: string;
  subCategoryId?: string;
}

export default function AdminMenuManagement() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [uploading, setUploading] = useState(false);

  const [newMenuItem, setNewMenuItem] = useState({
    name: "",
    description: "",
    price: "",
    category: "Lunch",
    preparationTime: "15",
    subCategoryId: "",
    imageUri: "",
  });

  useEffect(() => {
    fetchSubCategories();
  }, []);

  const fetchSubCategories = async () => {
    try {
      const response = await subCategoryApi.getAllSubCategories();
      setSubCategories(response || []);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setUploading(true);

        try {
          console.log("Uploading image:", imageUri);
          const cloudinaryUrl = await uploadMenuItemImage(imageUri);
          console.log("Upload successful:", cloudinaryUrl);

          setNewMenuItem({ ...newMenuItem, imageUri: cloudinaryUrl ?? "" });
          Alert.alert("Success", "Image uploaded successfully!");
        } catch (uploadError) {
          console.error("Upload failed:", uploadError);
          Alert.alert(
            "Upload Failed",
            "Could not upload image. Please try again."
          );
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Could not pick image");
    }
  };

  const handleAddMenuItem = async () => {
    try {
      if (!newMenuItem.name || !newMenuItem.price) {
        Alert.alert("Error", "Please fill in all required fields");
        return;
      }

      const menuItemData = {
        name: newMenuItem.name,
        description: newMenuItem.description,
        price: parseFloat(newMenuItem.price),
        category: newMenuItem.category,
        preparationTime: parseInt(newMenuItem.preparationTime) || 15,
        isAvailable: true,
        subCategoryId: newMenuItem.subCategoryId,
        image: newMenuItem.imageUri,
        // For demo purposes, assign to a default restaurant
        restaurantId: "default-restaurant-id",
      };

      console.log("Adding menu item:", menuItemData);

      const response = await menuApi.createMenuItem(menuItemData);

      if (response) {
        Alert.alert("Success", "Menu item added successfully!");
        setShowAddModal(false);

        // Reset form
        setNewMenuItem({
          name: "",
          description: "",
          price: "",
          category: "Lunch",
          preparationTime: "15",
          subCategoryId: "",
          imageUri: "",
        });
      }
    } catch (error) {
      console.error("Error adding menu item:", error);
      Alert.alert("Error", "Failed to add menu item. Please try again.");
    }
  };

  const selectedSubCategory = subCategories.find(
    (sc) => sc.id === newMenuItem.subCategoryId
  );

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
          <Text style={styles.headerTitle}>Admin Menu Management</Text>
          <Text style={styles.headerSubtitle}>
            Add menu items with Cloudinary upload
          </Text>
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <LinearGradient
          colors={["#FEF3C7", "#FCD34D"]}
          style={styles.infoBannerGradient}
        >
          <Ionicons name="shield-checkmark" size={20} color="#D97706" />
          <Text style={styles.infoBannerText}>
            Admin Panel: Add and manage menu items for all vendors
          </Text>
        </LinearGradient>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.actionGradient}
            >
              <Ionicons name="add-circle" size={32} color="#FFF" />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Add New Menu Item</Text>
                <Text style={styles.actionSubtitle}>
                  Create with Cloudinary image upload
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>47</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Restaurants</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>8</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Menu Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Menu Item</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAddModal(false)}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formContainer}>
                {/* Image Upload Section */}
                <View style={styles.imageSection}>
                  <Text style={styles.inputLabel}>Item Image</Text>
                  <TouchableOpacity
                    style={styles.imageUploadArea}
                    onPress={pickImage}
                    disabled={uploading}
                  >
                    {newMenuItem.imageUri ? (
                      <Image
                        source={{ uri: newMenuItem.imageUri }}
                        style={styles.uploadedImage}
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons
                          name={uploading ? "cloud-upload" : "camera"}
                          size={40}
                          color={uploading ? "#3B82F6" : "#9CA3AF"}
                        />
                        <Text style={styles.imagePlaceholderText}>
                          {uploading ? "Uploading..." : "Tap to add image"}
                        </Text>
                        <Text style={styles.imagePlaceholderSubtext}>
                          Direct Cloudinary upload
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Item Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newMenuItem.name}
                    onChangeText={(text) =>
                      setNewMenuItem({ ...newMenuItem, name: text })
                    }
                    placeholder="Enter menu item name"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={newMenuItem.description}
                    onChangeText={(text) =>
                      setNewMenuItem({ ...newMenuItem, description: text })
                    }
                    placeholder="Enter description"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Price ($) *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newMenuItem.price}
                    onChangeText={(text) =>
                      setNewMenuItem({ ...newMenuItem, price: text })
                    }
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    Preparation Time (minutes)
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={newMenuItem.preparationTime}
                    onChangeText={(text) =>
                      setNewMenuItem({ ...newMenuItem, preparationTime: text })
                    }
                    placeholder="15"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => {
                      // For demo purposes, we'll cycle through categories
                      const categories = [
                        "Lunch",
                        "Dinner",
                        "Breakfast",
                        "Snacks",
                        "Beverages",
                      ];
                      const currentIndex = categories.indexOf(
                        newMenuItem.category
                      );
                      const nextIndex = (currentIndex + 1) % categories.length;
                      setNewMenuItem({
                        ...newMenuItem,
                        category: categories[nextIndex],
                      });
                    }}
                  >
                    <Text style={styles.selectText}>
                      {newMenuItem.category}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {subCategories.length > 0 && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Subcategory</Text>
                    <TouchableOpacity
                      style={styles.selectInput}
                      onPress={() => {
                        // For demo purposes, cycle through subcategories
                        const currentIndex = subCategories.findIndex(
                          (sc) => sc.id === newMenuItem.subCategoryId
                        );
                        const nextIndex =
                          currentIndex === -1
                            ? 0
                            : (currentIndex + 1) % subCategories.length;
                        setNewMenuItem({
                          ...newMenuItem,
                          subCategoryId: subCategories[nextIndex].id,
                        });
                      }}
                    >
                      <Text style={styles.selectText}>
                        {selectedSubCategory
                          ? selectedSubCategory.name
                          : "Select subcategory"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddMenuItem}
                activeOpacity={0.8}
                disabled={uploading}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.addButtonGradient}
                >
                  <Text style={styles.addButtonText}>Add Item</Text>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
    color: "#92400E",
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  actionCard: {
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFF",
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: "#DCFCE7",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  modalContent: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  imageSection: {
    marginBottom: 20,
  },
  imageUploadArea: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    overflow: "hidden",
  },
  uploadedImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  imagePlaceholderText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 12,
  },
  imagePlaceholderSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFF",
  },
  selectText: {
    fontSize: 16,
    color: "#1F2937",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
  },
  addButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});
