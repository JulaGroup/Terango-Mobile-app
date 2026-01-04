import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useVendor } from "@/context/VendorContext";
import { vendorApi } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";
import { useLocation } from "@/hooks/useLocation";
import { AddressService } from "@/services/AddressService";
import TimePickerInput from "@/components/common/TimePickerInput";

interface BusinessHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export default function VendorProfile() {
  const router = useRouter();
  const { vendor, currentBusiness, logoutVendor, refreshVendorData } =
    useVendor();
  const { getCurrentLocation } = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(currentBusiness?.logoUrl);

  // Cloudinary configuration - matching menu.tsx and products.tsx
  const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
  const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

  // Cloudinary upload function
  const handleImageUpload = async (
    imageUri: string
  ): Promise<string | null> => {
    try {
      // Compress and resize image using ImageManipulator
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1000 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Create FormData for Cloudinary upload
      const formData = new FormData();
      formData.append("file", {
        uri: manipulatedImage.uri,
        type: "image/jpeg",
        name: "business-logo.jpg",
      } as any);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

      const uploadResponse = await fetch(cloudinaryUrl, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      });

      const uploadData = await uploadResponse.json();

      if (uploadData.secure_url) {
        console.log("Image uploaded to Cloudinary:", uploadData.secure_url);
        return uploadData.secure_url;
      } else {
        throw new Error("No secure_url in Cloudinary response");
      }
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      Alert.alert("Error", "Failed to upload image to Cloudinary");
      return null;
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    name: currentBusiness?.name || "",
    description: currentBusiness?.description || "",
    address: currentBusiness?.address || "",
    city: (currentBusiness as any)?.city || "",
    phone: currentBusiness?.phone || "",
    email: currentBusiness?.email || "",
    website: currentBusiness?.website || "",
    isActive: currentBusiness?.isActive || false,
    latitude: currentBusiness?.latitude ?? null,
    longitude: currentBusiness?.longitude ?? null,
  });

  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([
    { day: "Monday", isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { day: "Tuesday", isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { day: "Wednesday", isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { day: "Thursday", isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { day: "Friday", isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { day: "Saturday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
    { day: "Sunday", isOpen: false, openTime: "09:00", closeTime: "17:00" },
  ]);

  useEffect(() => {
    console.log("🔍 PROFILE PAGE - Current Business Data:", {
      businessId: currentBusiness?.id,
      businessType: currentBusiness?.type,
      businessName: currentBusiness?.name,
      description: currentBusiness?.description,
      logoUrl: currentBusiness?.logoUrl,
      address: currentBusiness?.address,
      phone: currentBusiness?.phone,
      email: currentBusiness?.email,
      website: currentBusiness?.website,
      isActive: currentBusiness?.isActive,
      openingHours: (currentBusiness as any)?.openingHours,
      fullBusinessObject: currentBusiness,
    });

    if (currentBusiness) {
      console.log("✅ Setting form data from currentBusiness");
      setFormData({
        name: currentBusiness.name,
        description: currentBusiness.description || "",
        address: currentBusiness.address || "",
        city: (currentBusiness as any).city || "",
        phone: currentBusiness.phone || "",
        email: currentBusiness.email || "",
        website: currentBusiness.website || "",
        isActive: currentBusiness.isActive,
        latitude: currentBusiness.latitude ?? null,
        longitude: currentBusiness.longitude ?? null,
      });
      setProfileImage(currentBusiness.logoUrl);

      // Load business hours from currentBusiness if available
      const openingHours = (currentBusiness as any)?.openingHours;
      if (openingHours && typeof openingHours === "object") {
        console.log("📅 Loading business hours from API:", openingHours);
        const daysOfWeek = [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ];
        const loadedHours = daysOfWeek.map((day) => {
          const dayData = openingHours[day];
          const dayCapitalized = day.charAt(0).toUpperCase() + day.slice(1);

          if (dayData) {
            return {
              day: dayCapitalized,
              isOpen: !dayData.closed,
              openTime: dayData.open || "09:00",
              closeTime: dayData.close || "18:00",
            };
          }

          return {
            day: dayCapitalized,
            isOpen: day !== "sunday",
            openTime: "09:00",
            closeTime: day === "saturday" ? "17:00" : "18:00",
          };
        });
        setBusinessHours(loadedHours);
        console.log("✅ Business hours loaded:", loadedHours);
      }

      console.log("📝 Form data set:", {
        name: currentBusiness.name,
        description: currentBusiness.description,
        logoUrl: currentBusiness.logoUrl,
        city: (currentBusiness as any).city,
        latitude: currentBusiness.latitude,
        longitude: currentBusiness.longitude,
      });
    } else {
      console.log("❌ No currentBusiness available");
    }
  }, [currentBusiness]);

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
        setImageLoading(true);

        try {
          // Upload to Cloudinary and get secure URL
          const cloudinaryUrl = await handleImageUpload(result.assets[0].uri);

          if (cloudinaryUrl) {
            setProfileImage(cloudinaryUrl);

            // Save the logo URL to backend immediately
            if (currentBusiness) {
              try {
                if (currentBusiness.type === "RESTAURANT") {
                  await vendorApi.updateRestaurantImage(
                    currentBusiness.id,
                    cloudinaryUrl
                  );
                } else if (currentBusiness.type === "SHOP") {
                  await vendorApi.updateShop(currentBusiness.id, {
                    imageUrl: cloudinaryUrl,
                  });
                }
                Alert.alert("Success", "Business logo updated successfully!");
                await refreshVendorData();
              } catch (saveError) {
                console.error("Error saving logo to backend:", saveError);
                Alert.alert(
                  "Error",
                  "Image uploaded but failed to save to profile"
                );
              }
            }
          }
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          Alert.alert("Error", "Failed to upload image");
        }

        setImageLoading(false);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setImageLoading(false);
      Alert.alert("Error", "Failed to update business image");
    }
  };

  const handleGetCurrentLocation = async () => {
    if (!isEditing) {
      return;
    }

    try {
      setLocationLoading(true);

      const location = await getCurrentLocation();

      if (!location) {
        Alert.alert(
          "Location Error",
          "Unable to get your current location. Please check permissions and try again."
        );
        return;
      }

      console.log("📍 Got current location for business:", location);

      // Get structured address with city
      const addressData =
        await AddressService.getStructuredAddressFromCoordinates(
          location.latitude,
          location.longitude
        );

      console.log("📍 Reverse geocoded address data:", addressData);

      // Check if we got valid address data (not just coordinates)
      const isValidAddress =
        addressData &&
        addressData.address &&
        !addressData.address.match(/^[\d\.\-\s,]+$/); // Don't accept if it's just coordinates

      // Always update coordinates (even if geocoding failed)
      const updatedData: any = {
        latitude: location.latitude,
        longitude: location.longitude,
      };

      // Only update address/city if we got valid geocoded data
      if (isValidAddress && addressData) {
        updatedData.address = addressData.address;
        if (addressData.city) {
          updatedData.city = addressData.city;
        }
      }

      setFormData((prev) => ({
        ...prev,
        ...updatedData,
      }));

      if (isValidAddress && addressData) {
        Alert.alert(
          "Location Updated ✓",
          `Business location has been set!\n\n📍 Address: ${
            addressData.address
          }\n🏙️ City: ${
            addressData.city || "N/A"
          }\n\n📌 Coordinates: ${location.latitude.toFixed(
            6
          )}, ${location.longitude.toFixed(6)}`
        );
      } else {
        Alert.alert(
          "Coordinates Set ✓",
          `GPS coordinates have been captured!\n\n📌 Latitude: ${location.latitude.toFixed(
            6
          )}\n📌 Longitude: ${location.longitude.toFixed(
            6
          )}\n\n⚠️ Could not retrieve address automatically (network error).\n\nPlease enter your address and city manually below, then click Save.`
        );
      }
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert(
        "Error",
        "Failed to fetch your current location. Please check your internet connection and try again."
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);

      if (!currentBusiness) {
        Alert.alert("Error", "No business selected");
        return;
      }

      console.log("📋 Current business hours state:", businessHours);

      // Convert businessHours array to openingHours object format
      const openingHours: Record<
        string,
        { open: string; close: string; closed: boolean }
      > = {};
      businessHours.forEach((day) => {
        const dayName = day.day.toLowerCase();
        openingHours[dayName] = {
          open: day.openTime,
          close: day.closeTime,
          closed: !day.isOpen,
        };
      });

      console.log(
        "🕒 Converted openingHours:",
        JSON.stringify(openingHours, null, 2)
      );

      const updateData = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        isActive: formData.isActive,
        imageUrl: profileImage,
        latitude: formData.latitude ?? undefined,
        longitude: formData.longitude ?? undefined,
        openingHours: openingHours, // Add business hours
      };

      console.log(
        "💾 Saving profile with data:",
        JSON.stringify(updateData, null, 2)
      );
      console.log("🏢 Business type:", currentBusiness.type);
      console.log("🆔 Business ID:", currentBusiness.id);

      // Update based on business type
      let response;
      if (currentBusiness.type === "RESTAURANT") {
        console.log("📡 Calling updateRestaurantDetails API...");
        response = await vendorApi.updateRestaurantDetails(
          currentBusiness.id,
          updateData
        );
        console.log("✅ Restaurant update response:", response);
      } else if (currentBusiness.type === "SHOP") {
        console.log("📡 Calling updateShop API...");
        response = await vendorApi.updateShop(currentBusiness.id, updateData);
        console.log("✅ Shop update response:", response);
      } else {
        // For pharmacy or other types, you might need to add a similar API call
        console.log("⚠️ Pharmacy update not implemented yet");
      }

      console.log("🔄 Refreshing vendor data...");
      // Refresh vendor data to get updated info
      await refreshVendorData();
      console.log("✅ Vendor data refreshed");

      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error: any) {
      console.error("❌ Error updating profile:", error);
      console.error("❌ Error details:", error.response?.data || error.message);
      console.error("❌ Full error object:", JSON.stringify(error, null, 2));
      Alert.alert(
        "Error",
        `Failed to update profile: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBusinessHourChange = (
    index: number,
    field: keyof BusinessHours,
    value: any
  ) => {
    const updatedHours = [...businessHours];
    updatedHours[index] = { ...updatedHours[index], [field]: value };
    setBusinessHours(updatedHours);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logoutVendor },
    ]);
  };

  const getBusinessName = () => {
    if (currentBusiness?.name) {
      return currentBusiness.name;
    }
    return "Your Business";
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Header */}
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
          <Text style={styles.headerTitle}>{getBusinessName()}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Ionicons
              name={isEditing ? "close" : "pencil"}
              size={20}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Business Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Profile</Text>
          <View style={styles.imageSection}>
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={handleImagePicker}
              disabled={!isEditing}
            >
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="business" size={40} color="#666" />
                  <Text style={styles.placeholderText}>No Image</Text>
                </View>
              )}

              {imageLoading && (
                <View style={styles.imageOverlay}>
                  <ActivityIndicator size="large" color={PrimaryColor} />
                </View>
              )}

              {isEditing && (
                <View style={styles.editImageOverlay}>
                  <Ionicons name="camera" size={20} color="white" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.businessName}>{formData.name}</Text>
            <Text style={styles.vendorEmail}>{vendor?.email}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: formData.isActive ? "#4CAF50" : "#F44336" },
              ]}
            >
              <Text style={styles.statusText}>
                {formData.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
        </View>

        {/* Business Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Business Name</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              editable={isEditing}
              placeholder="Enter business name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                !isEditing && styles.disabledInput,
              ]}
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              editable={isEditing}
              placeholder="Describe your business"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={formData.address}
              onChangeText={(text) =>
                setFormData({ ...formData, address: text })
              }
              editable={isEditing}
              placeholder="Enter business address"
            />

            <View style={styles.locationRow}>
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  (!isEditing || locationLoading) &&
                    styles.locationButtonDisabled,
                ]}
                onPress={handleGetCurrentLocation}
                disabled={!isEditing || locationLoading}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="navigate-outline" size={16} color="white" />
                    <Text style={styles.locationButtonText}>
                      Use my location
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {formData.latitude !== null && formData.longitude !== null && (
                <View style={styles.coordinatePill}>
                  <Ionicons name="location" size={14} color={PrimaryColor} />
                  <Text style={styles.coordinateText}>{formData.address}</Text>
                </View>
              )}
            </View>

            {formData.latitude === null || formData.longitude === null ? (
              <Text style={styles.locationHint}>
                Set accurate coordinates so customers receive correct delivery
                fees.
              </Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>City</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              editable={isEditing}
              placeholder="Enter city (auto-filled with GPS)"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              editable={isEditing}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              editable={isEditing}
              placeholder="Enter email address"
              keyboardType="email-address"
            />
          </View>

          {/* <View style={styles.field}>
            <Text style={styles.fieldLabel}>Website</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={formData.website}
              onChangeText={(text) =>
                setFormData({ ...formData, website: text })
              }
              editable={isEditing}
              placeholder="Enter website URL"
              keyboardType="url"
            />
          </View> */}

          {/* <View style={styles.switchField}>
            <Text style={styles.fieldLabel}>Business Active</Text>
            <Switch
              value={formData.isActive}
              onValueChange={(value) =>
                setFormData({ ...formData, isActive: value })
              }
              disabled={!isEditing}
              trackColor={{ false: "#767577", true: PrimaryColor }}
            />
          </View> */}
        </View>

        {/* Business Hours */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Business Hours</Text>
            <Text style={styles.sectionSubtitle}>Set your operating hours</Text>
          </View>

          {businessHours.map((day, index) => (
            <View key={day.day} style={styles.dayRowContainer}>
              <View style={styles.dayInfoRow}>
                <View style={styles.dayNameContainer}>
                  <Text style={styles.dayName}>{day.day}</Text>
                  {!day.isOpen && (
                    <Text style={styles.closedLabel}>Closed</Text>
                  )}
                </View>

                <Switch
                  value={day.isOpen}
                  onValueChange={(value) =>
                    handleBusinessHourChange(index, "isOpen", value)
                  }
                  disabled={!isEditing}
                  trackColor={{ false: "#E5E7EB", true: PrimaryColor }}
                  ios_backgroundColor="#E5E7EB"
                />
              </View>

              {day.isOpen && (
                <View style={styles.timeInputsRow}>
                  <View style={styles.timePickerGroup}>
                    <Text style={styles.timeLabel}>Opens</Text>
                    <TimePickerInput
                      value={day.openTime}
                      onChange={(time) =>
                        handleBusinessHourChange(index, "openTime", time)
                      }
                      disabled={!isEditing}
                      placeholder="09:00"
                    />
                  </View>
                  <View style={styles.timePickerGroup}>
                    <Text style={styles.timeLabel}>Closes</Text>
                    <TimePickerInput
                      value={day.closeTime}
                      onChange={(time) =>
                        handleBusinessHourChange(index, "closeTime", time)
                      }
                      disabled={!isEditing}
                      placeholder="18:00"
                    />
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                isLoading && styles.saveButtonDisabled,
              ]}
              onPress={handleSaveProfile}
              disabled={isLoading}
            >
              <LinearGradient
                colors={
                  isLoading ? ["#ccc", "#999"] : [PrimaryColor, "#1976D2"]
                }
                style={styles.saveButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="save" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#F44336" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  editButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: "white",
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  imageSection: {
    alignItems: "center",
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 4,
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
  editImageOverlay: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: PrimaryColor,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  businessName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
    textAlign: "center",
  },
  vendorEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  disabledInput: {
    backgroundColor: "#f8f9fa",
    color: "#666",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  switchField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dayRowContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dayInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  dayNameContainer: {
    flex: 1,
  },
  dayName: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "600",
    marginBottom: 2,
  },
  closedLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  timeInputsRow: {
    flexDirection: "column",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  timePickerGroup: {
    width: "100%",
  },
  timeLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  arrowIcon: {
    marginHorizontal: 4,
    marginTop: 18,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    width: 60,
    textAlign: "center",
    backgroundColor: "#f8f9fa",
  },
  actionButtons: {
    padding: 16,
  },
  saveButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FED7D7",
  },
  logoutButtonText: {
    color: "#F44336",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  locationRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: PrimaryColor,
  },
  locationButtonDisabled: {
    backgroundColor: "#9aa4ae",
  },
  locationButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  coordinatePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coordinateText: {
    marginLeft: 6,
    color: PrimaryColor,
    fontWeight: "600",
  },
  locationHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
  },
});
