import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  ScrollView,
  FlatList,
  Image,
  TextInput,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { vendorApi } from "@/lib/api";
import CloudinaryImageUploader from "@/components/common/CloudinaryImageUploader";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  minimumOrderAmount?: number;
  imageUrl?: string;
  isActive: boolean;
  acceptsOrders?: boolean;
  rating?: number;
  totalReviews?: number;
  openingHours?: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  totalOrders?: number;
  menuItemsCount?: number;
}

export default function RestaurantManagement() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProfileImage, setEditingProfileImage] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [showOperatingHoursModal, setShowOperatingHoursModal] = useState(false);

  // Form state for editing restaurant details
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    minimumOrderAmount: "",
    isActive: true,
    acceptsOrders: true,
  });

  // Form state for operating hours
  const [hoursForm, setHoursForm] = useState({
    monday: { open: "09:00", close: "22:00", closed: false },
    tuesday: { open: "09:00", close: "22:00", closed: false },
    wednesday: { open: "09:00", close: "22:00", closed: false },
    thursday: { open: "09:00", close: "22:00", closed: false },
    friday: { open: "09:00", close: "22:00", closed: false },
    saturday: { open: "09:00", close: "22:00", closed: false },
    sunday: { open: "09:00", close: "22:00", closed: true },
  });

  const fetchRestaurants = useCallback(async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        Alert.alert("Error", "Please log in again");
        return;
      }

      const response = await vendorApi.getVendorByUserId(userId);
      if (response && response.restaurants) {
        const restaurantList = response.restaurants || [];
        setRestaurants(restaurantList);

        // Auto-select the first restaurant if available and none is selected
        if (restaurantList.length > 0 && !selectedRestaurant) {
          setSelectedRestaurant(restaurantList[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      Alert.alert("Error", "Failed to fetch restaurants");
    } finally {
      setLoading(false);
    }
  }, [selectedRestaurant]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleProfileImageUpload = async (imageUrl: string) => {
    try {
      if (!selectedRestaurant) return;

      // Update the restaurant image via API
      await vendorApi.updateRestaurantImage(selectedRestaurant.id, imageUrl);

      // Update local state
      setSelectedRestaurant({
        ...selectedRestaurant,
        imageUrl: imageUrl,
      });

      // Update the restaurants list
      setRestaurants((prev) =>
        prev.map((restaurant) =>
          restaurant.id === selectedRestaurant.id
            ? { ...restaurant, imageUrl: imageUrl }
            : restaurant
        )
      );

      setEditingProfileImage(false);
      Alert.alert("Success", "Restaurant image updated successfully!");
    } catch (error) {
      console.error("Error updating restaurant image:", error);
      Alert.alert("Error", "Failed to update restaurant image");
    }
  };

  // Initialize edit form with current restaurant data
  const initializeEditForm = useCallback(() => {
    if (selectedRestaurant) {
      setEditForm({
        name: selectedRestaurant.name || "",
        description: selectedRestaurant.description || "",
        phone: selectedRestaurant.phone || "",
        email: selectedRestaurant.email || "",
        website: selectedRestaurant.website || "",
        address: selectedRestaurant.address || "",
        city: selectedRestaurant.city || "",
        state: selectedRestaurant.state || "",
        minimumOrderAmount:
          selectedRestaurant.minimumOrderAmount?.toString() || "0",
        isActive: selectedRestaurant.isActive || true,
        acceptsOrders: selectedRestaurant.acceptsOrders || true,
      });

      if (selectedRestaurant.openingHours) {
        setHoursForm(selectedRestaurant.openingHours);
      }
    }
  }, [selectedRestaurant]);

  // Handle restaurant details update
  const handleUpdateDetails = async () => {
    try {
      if (!selectedRestaurant) return;

      const updateData = {
        ...editForm,
        minimumOrderAmount: parseFloat(editForm.minimumOrderAmount) || 0,
      };

      const updatedRestaurant = await vendorApi.updateRestaurantDetails(
        selectedRestaurant.id,
        updateData
      );

      // Update local state
      setSelectedRestaurant(updatedRestaurant);
      setRestaurants((prev) =>
        prev.map((restaurant) =>
          restaurant.id === selectedRestaurant.id
            ? updatedRestaurant
            : restaurant
        )
      );

      setShowEditDetailsModal(false);
      Alert.alert("Success", "Restaurant details updated successfully!");
    } catch (error) {
      console.error("Error updating restaurant details:", error);
      Alert.alert("Error", "Failed to update restaurant details");
    }
  };

  // Handle operating hours update
  const handleUpdateHours = async () => {
    try {
      if (!selectedRestaurant) return;

      const updatedRestaurant = await vendorApi.updateRestaurantHours(
        selectedRestaurant.id,
        hoursForm
      );

      // Update local state
      setSelectedRestaurant(updatedRestaurant);
      setRestaurants((prev) =>
        prev.map((restaurant) =>
          restaurant.id === selectedRestaurant.id
            ? updatedRestaurant
            : restaurant
        )
      );

      setShowOperatingHoursModal(false);
      Alert.alert("Success", "Operating hours updated successfully!");
    } catch (error) {
      console.error("Error updating operating hours:", error);
      Alert.alert("Error", "Failed to update operating hours");
    }
  };

  const selectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/vendor-management")}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Restaurant Management</Text>
            <Text style={styles.headerSubtitle}>Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading restaurants...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedRestaurant && restaurants.length === 0) {
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
            <Text style={styles.headerTitle}>Restaurant Management</Text>
            <Text style={styles.headerSubtitle}>
              Manage your restaurant menu
            </Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Restaurant Found</Text>
          <Text style={styles.emptyDescription}>
            Please set up your restaurant first to manage menu items.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedRestaurant) {
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
            <Text style={styles.headerTitle}>Restaurant Management</Text>
            <Text style={styles.headerSubtitle}>
              Select a restaurant to manage
            </Text>
          </View>
        </View>

        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.restaurantCard}
              onPress={() => selectRestaurant(item)}
            >
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{item.name}</Text>
                <Text style={styles.restaurantDescription}>
                  {item.description}
                </Text>
                <Text style={styles.restaurantStats}>
                  {item.menuItemsCount} menu items • {item.totalOrders} orders
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContainer}
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
          onPress={() => {
            setSelectedRestaurant(null);
            router.back();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{selectedRestaurant.name}</Text>
          <Text style={styles.headerSubtitle}>Restaurant Settings</Text>
        </View>
      </View>

      {/* Restaurant Profile Section */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <TouchableOpacity
              style={styles.profileImageWrapper}
              onPress={() => setEditingProfileImage(true)}
              activeOpacity={0.8}
            >
              {selectedRestaurant.imageUrl ? (
                <Image
                  source={{ uri: selectedRestaurant.imageUrl }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="restaurant" size={40} color="#9CA3AF" />
                  <Text style={styles.placeholderText}>Add Photo</Text>
                </View>
              )}
              <View style={styles.editImageOverlay}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{selectedRestaurant.name}</Text>
            <Text style={styles.profileDescription}>
              {selectedRestaurant.description || "No description available"}
            </Text>

            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setEditingProfileImage(true)}
            >
              <Ionicons name="camera-outline" size={16} color="#10B981" />
              <Text style={styles.editProfileText}>Update Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Restaurant Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Restaurant Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Ionicons name="storefront-outline" size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Restaurant Name</Text>
                <Text style={styles.infoValue}>{selectedRestaurant.name}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#6B7280"
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.infoValue}>
                  {selectedRestaurant.description || "No description set"}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {selectedRestaurant.address || "No address set"}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>
                  {selectedRestaurant.phone || "No phone number set"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              initializeEditForm();
              setShowEditDetailsModal(true);
            }}
          >
            <Ionicons name="create-outline" size={24} color="#10B981" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Edit Restaurant Details</Text>
              <Text style={styles.actionDescription}>
                Update name, description, and contact info
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              initializeEditForm();
              setShowOperatingHoursModal(true);
            }}
          >
            <Ionicons name="time-outline" size={24} color="#3B82F6" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Operating Hours</Text>
              <Text style={styles.actionDescription}>
                Set your restaurant&apos;s opening hours
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          {/* <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="car-outline" size={24} color="#F59E0B" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Delivery Settings</Text>
              <Text style={styles.actionDescription}>
                Configure delivery zones and fees
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity> */}

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="notifications-outline" size={24} color="#8B5CF6" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Notifications</Text>
              <Text style={styles.actionDescription}>
                Manage order and system notifications
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile Image Upload Modal */}
      <Modal
        visible={editingProfileImage}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingProfileImage(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Restaurant Image</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setEditingProfileImage(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.imageUploadContainer}>
              <Text style={styles.imageUploadLabel}>Restaurant Image</Text>
              <CloudinaryImageUploader
                onImageUploaded={handleProfileImageUpload}
                currentImageUrl={selectedRestaurant?.imageUrl}
                placeholder="Upload Restaurant Image"
              />
              <Text style={styles.imageUploadHint}>
                This image will be shown in your restaurant profile and details
                page
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Restaurant Details Modal */}
      <Modal
        visible={showEditDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditDetailsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Restaurant Details</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowEditDetailsModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Basic Information */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={20} color="#10B981" />
                <Text style={styles.formSectionTitle}>Basic Information</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Restaurant Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.name}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, name: text })
                  }
                  placeholder="Enter restaurant name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={editForm.description}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, description: text })
                  }
                  placeholder="Tell customers about your restaurant"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Contact Information */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="call" size={20} color="#3B82F6" />
                <Text style={styles.formSectionTitle}>Contact Information</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.phone}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, phone: text })
                  }
                  placeholder="Restaurant phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.email}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, email: text })
                  }
                  placeholder="restaurant@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Website</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.website}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, website: text })
                  }
                  placeholder="https://your-website.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Location */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location" size={20} color="#EF4444" />
                <Text style={styles.formSectionTitle}>Location</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Address</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.address}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, address: text })
                  }
                  placeholder="Full street address"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 2, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>City</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.city}
                    onChangeText={(text) =>
                      setEditForm({ ...editForm, city: text })
                    }
                    placeholder="City"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>State</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.state}
                    onChangeText={(text) =>
                      setEditForm({ ...editForm, state: text })
                    }
                    placeholder="State"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            {/* Business Settings */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="settings" size={20} color="#8B5CF6" />
                <Text style={styles.formSectionTitle}>Business Settings</Text>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Min. Order Amount (D)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.minimumOrderAmount}
                    onChangeText={(text) =>
                      setEditForm({ ...editForm, minimumOrderAmount: text })
                    }
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.switchGroup}>
                <View style={styles.switchItem}>
                  <View>
                    <Text style={styles.switchLabel}>Restaurant Active</Text>
                    <Text style={styles.switchDescription}>
                      Customers can see your restaurant
                    </Text>
                  </View>
                  <Switch
                    value={editForm.isActive}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, isActive: value })
                    }
                    trackColor={{ false: "#F3F4F6", true: "#10B981" }}
                    thumbColor={editForm.isActive ? "#fff" : "#f4f3f4"}
                  />
                </View>

                <View style={styles.switchItem}>
                  <View>
                    <Text style={styles.switchLabel}>Accept Orders</Text>
                    <Text style={styles.switchDescription}>
                      Allow customers to place orders
                    </Text>
                  </View>
                  <Switch
                    value={editForm.acceptsOrders}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, acceptsOrders: value })
                    }
                    trackColor={{ false: "#F3F4F6", true: "#10B981" }}
                    thumbColor={editForm.acceptsOrders ? "#fff" : "#f4f3f4"}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.cancelButton]}
                onPress={() => setShowEditDetailsModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionButton, styles.saveButton]}
                onPress={handleUpdateDetails}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Operating Hours Modal */}
      <Modal
        visible={showOperatingHoursModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOperatingHoursModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Operating Hours</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowOperatingHoursModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View style={styles.hoursHeaderSection}>
              <Ionicons name="time" size={32} color="#3B82F6" />
              <Text style={styles.hoursDescription}>
                Set your restaurant operating hours for each day of the week
              </Text>
            </View>

            <View style={styles.formSection}>
              {Object.keys(hoursForm).map((day) => (
                <View key={day} style={styles.dayRow}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayInfo}>
                      <Text style={styles.dayName}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Text>
                      <Text style={styles.dayStatus}>
                        {hoursForm[day as keyof typeof hoursForm].closed
                          ? "Closed"
                          : `${
                              hoursForm[day as keyof typeof hoursForm].open
                            } - ${
                              hoursForm[day as keyof typeof hoursForm].close
                            }`}
                      </Text>
                    </View>
                    <Switch
                      value={!hoursForm[day as keyof typeof hoursForm].closed}
                      onValueChange={(value) =>
                        setHoursForm({
                          ...hoursForm,
                          [day]: {
                            ...hoursForm[day as keyof typeof hoursForm],
                            closed: !value,
                          },
                        })
                      }
                      trackColor={{ false: "#F3F4F6", true: "#10B981" }}
                      thumbColor={
                        !hoursForm[day as keyof typeof hoursForm].closed
                          ? "#fff"
                          : "#f4f3f4"
                      }
                    />
                  </View>

                  {!hoursForm[day as keyof typeof hoursForm].closed && (
                    <View style={styles.timeInputs}>
                      <View style={styles.timeInputGroup}>
                        <Text style={styles.timeLabel}>Open</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={hoursForm[day as keyof typeof hoursForm].open}
                          onChangeText={(time) =>
                            setHoursForm({
                              ...hoursForm,
                              [day]: {
                                ...hoursForm[day as keyof typeof hoursForm],
                                open: time,
                              },
                            })
                          }
                          placeholder="09:00"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>

                      <Text style={styles.timeSeparator}>to</Text>

                      <View style={styles.timeInputGroup}>
                        <Text style={styles.timeLabel}>Close</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={hoursForm[day as keyof typeof hoursForm].close}
                          onChangeText={(time) =>
                            setHoursForm({
                              ...hoursForm,
                              [day]: {
                                ...hoursForm[day as keyof typeof hoursForm],
                                close: time,
                              },
                            })
                          }
                          placeholder="22:00"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>
                  )}

                  {hoursForm[day as keyof typeof hoursForm].closed && (
                    <View style={styles.closedIndicator}>
                      <Text style={styles.closedText}>Closed</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.cancelButton]}
                onPress={() => setShowOperatingHoursModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionButton, styles.saveButton]}
                onPress={handleUpdateHours}
              >
                <Text style={styles.saveButtonText}>Save Hours</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  addButton: {
    backgroundColor: "#10B981",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 24,
  },
  listContainer: {
    padding: 16,
  },
  restaurantCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  restaurantDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  restaurantStats: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
  },
  menuItemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemInfo: {
    marginBottom: 8,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  menuItemDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
    marginTop: 4,
  },
  menuItemMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  menuItemCategory: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  menuItemTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalCloseButton: {
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  modalContent: {
    flex: 1,
    paddingTop: 16,
  },
  formContainer: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1F2937",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryChipSelected: {
    backgroundColor: "#10B981",
  },
  categoryChipText: {
    fontSize: 14,
    color: "#6B7280",
  },
  categoryChipTextSelected: {
    color: "#fff",
  },
  subcategorySelector: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subcategorySelectorText: {
    fontSize: 16,
    color: "#1F2937",
  },
  subcategoryList: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  subcategoryChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  subcategoryChipSelected: {
    backgroundColor: "#10B981",
  },
  subcategoryChipText: {
    fontSize: 12,
    color: "#6B7280",
  },
  subcategoryChipTextSelected: {
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  menuActionsContainer: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  viewMenuButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewMenuContent: {
    flex: 1,
  },
  viewMenuTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 8,
    marginBottom: 4,
  },
  viewMenuDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  addMenuButton: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addMenuText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
  },
  profileSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImageWrapper: {
    position: "relative",
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#10B981",
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: 10,
    color: "#10B981",
    marginTop: 4,
    fontWeight: "600",
  },
  editImageOverlay: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#10B981",
    borderRadius: 14,
    padding: 6,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  profileDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  profileStats: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  imageUploadContainer: {
    padding: 20,
  },
  imageUploadLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  imageUploadButton: {
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  imageUploadHint: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  actionsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Form Styles
  formSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#10B981",
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FAFAFA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  switchGroup: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    gap: 16,
    marginTop: 8,
  },
  switchItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  switchDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
    marginBottom: 24,
    marginHorizontal: 16,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  saveButton: {
    backgroundColor: "#10B981",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  // Operating Hours Styles
  hoursHeaderSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  hoursDescription: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 16,
    lineHeight: 22,
    textAlign: "center",
    fontStyle: "italic",
  },
  dayRow: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  dayStatus: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  timeInputs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 8,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10B981",
    marginBottom: 8,
    textAlign: "center",
  },
  timeInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    backgroundColor: "#FAFAFA",
    textAlign: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeSeparator: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 20,
  },
  closedIndicator: {
    paddingVertical: 16,
    alignItems: "center",
  },
  closedText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "600",
    fontStyle: "italic",
  },
});
