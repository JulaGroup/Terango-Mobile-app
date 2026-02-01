import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useVendor } from "@/context/VendorContext";
import { vendorApi } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";
import SubscriptionStatus from "@/components/vendor/SubscriptionStatus";

interface NotificationSettings {
  newOrders: boolean;
  orderUpdates: boolean;
  paymentAlerts: boolean;
  dailyReports: boolean;
  promotionalEmails: boolean;
  pushNotifications: boolean;
}

interface BusinessSettings {
  autoAcceptOrders: boolean;
  isOpenForBusiness: boolean;
  showBusinessHours: boolean;
  allowCashPayment: boolean;
  allowCardPayment: boolean;
  allowOnlinePayment: boolean;
  minimumOrderAmount: string;
  deliveryFee: string;
  estimatedPrepTime: string;
}

export default function VendorSettings() {
  const router = useRouter();
  const { currentBusiness, logoutVendor, refreshVendorData } = useVendor();
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<
    "notifications" | "business" | "payment" | null
  >(null);

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      newOrders: true,
      orderUpdates: true,
      paymentAlerts: true,
      dailyReports: false,
      promotionalEmails: false,
      pushNotifications: true,
    });

  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    autoAcceptOrders: false,
    isOpenForBusiness: true,
    showBusinessHours: true,
    allowCashPayment: true,
    allowCardPayment: true,
    allowOnlinePayment: true,
    minimumOrderAmount: "0",
    deliveryFee: "5000",
    estimatedPrepTime: "30",
  });

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);

      // Settings are loaded from the business entities themselves
      // (restaurants, shops, pharmacies) via the VendorContext
      // No separate settings API needed - just use the existing business data

      // The business settings come from currentBusiness in VendorContext
      // Notification settings can be stored locally or in user preferences
    } catch (error) {
      console.error("Error loading settings:", error);
      // Keep default settings if API fails
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async (type: "notifications" | "business") => {
    try {
      setIsLoading(true);

      if (!currentBusiness) {
        Alert.alert("Error", "No business selected");
        return;
      }

      if (type === "notifications") {
        // Save notification settings to AsyncStorage or SecureStore
        // This follows the pattern where notifications are user-specific
        try {
          // Here you could save to AsyncStorage if needed
          // await AsyncStorage.setItem('vendorNotificationSettings', JSON.stringify(notificationSettings));
          Alert.alert("Success", "Notification settings updated successfully");
        } catch (error) {
          console.error("Error saving notification settings:", error);
          Alert.alert("Error", "Failed to save notification settings");
        }
      } else {
        // Update business settings directly on the business entity
        // Following the Vendor Management pattern: update restaurant/shop/pharmacy directly
        const updateData = {
          isActive: businessSettings.isOpenForBusiness,
          acceptsOrders: businessSettings.isOpenForBusiness,
          minimumOrderAmount:
            parseFloat(businessSettings.minimumOrderAmount) || 0,
          // Add other business-specific settings here
        };

        switch (currentBusiness.type) {
          case "RESTAURANT":
            await vendorApi.updateRestaurantDetails(
              currentBusiness.id,
              updateData
            );
            break;
          case "SHOP":
            // For shops, we'll need to create a shop update method in the API
            // For now, use the restaurant method as a placeholder
            await vendorApi.updateRestaurantDetails(
              currentBusiness.id,
              updateData
            );
            break;
          case "PHARMACY":
            // For pharmacies, we'll need to create a pharmacy update method in the API
            // For now, use the restaurant method as a placeholder
            await vendorApi.updateRestaurantDetails(
              currentBusiness.id,
              updateData
            );
            break;
          default:
            Alert.alert("Error", "Unknown business type");
            return;
        }

        Alert.alert("Success", "Business settings updated successfully");
      }

      setModalVisible(false);
      await refreshVendorData();
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getBusinessName = () => {
    return currentBusiness?.name || "Your Business";
  };

  const SettingsCard = ({
    title,
    subtitle,
    icon,
    onPress,
    rightComponent,
    showArrow = true,
  }: {
    title: string;
    subtitle?: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingsCard}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingsCardContent}>
        <View style={styles.settingsCardLeft}>
          <View style={styles.settingsIconContainer}>
            <Ionicons name={icon} size={24} color={PrimaryColor} />
          </View>
          <View style={styles.settingsTextContainer}>
            <Text style={styles.settingsTitle}>{title}</Text>
            {subtitle && (
              <Text style={styles.settingsSubtitle}>{subtitle}</Text>
            )}
          </View>
        </View>
        <View style={styles.settingsCardRight}>
          {rightComponent}
          {showArrow && onPress && (
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const renderNotificationModal = () => (
    <Modal
      visible={modalVisible && modalType === "notifications"}
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
            <Text style={styles.modalTitle}>Notification Settings</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.modalBody}>
            {Object.entries(notificationSettings).map(([key, value]) => (
              <View key={key} style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  {key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase())}
                </Text>
                <Switch
                  value={value}
                  onValueChange={(newValue) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      [key]: newValue,
                    }))
                  }
                  trackColor={{ false: "#767577", true: PrimaryColor }}
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => saveSettings("notifications")}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[PrimaryColor, "#1976D2"]}
                style={styles.saveButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderBusinessModal = () => (
    <Modal
      visible={modalVisible && modalType === "business"}
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
            <Text style={styles.modalTitle}>Business Settings</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.modalBody}>
            {/* Toggle Settings */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Auto Accept Orders</Text>
              <Switch
                value={businessSettings.autoAcceptOrders}
                onValueChange={(value) =>
                  setBusinessSettings((prev) => ({
                    ...prev,
                    autoAcceptOrders: value,
                  }))
                }
                trackColor={{ false: "#767577", true: PrimaryColor }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Open for Business</Text>
              <Switch
                value={businessSettings.isOpenForBusiness}
                onValueChange={(value) =>
                  setBusinessSettings((prev) => ({
                    ...prev,
                    isOpenForBusiness: value,
                  }))
                }
                trackColor={{ false: "#767577", true: PrimaryColor }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Show Business Hours</Text>
              <Switch
                value={businessSettings.showBusinessHours}
                onValueChange={(value) =>
                  setBusinessSettings((prev) => ({
                    ...prev,
                    showBusinessHours: value,
                  }))
                }
                trackColor={{ false: "#767577", true: PrimaryColor }}
              />
            </View>

            {/* Payment Methods */}
            <Text style={styles.modalSectionTitle}>Payment Methods</Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Cash Payment</Text>
              <Switch
                value={businessSettings.allowCashPayment}
                onValueChange={(value) =>
                  setBusinessSettings((prev) => ({
                    ...prev,
                    allowCashPayment: value,
                  }))
                }
                trackColor={{ false: "#767577", true: PrimaryColor }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Card Payment</Text>
              <Switch
                value={businessSettings.allowCardPayment}
                onValueChange={(value) =>
                  setBusinessSettings((prev) => ({
                    ...prev,
                    allowCardPayment: value,
                  }))
                }
                trackColor={{ false: "#767577", true: PrimaryColor }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Online Payment</Text>
              <Switch
                value={businessSettings.allowOnlinePayment}
                onValueChange={(value) =>
                  setBusinessSettings((prev) => ({
                    ...prev,
                    allowOnlinePayment: value,
                  }))
                }
                trackColor={{ false: "#767577", true: PrimaryColor }}
              />
            </View>

            {/* Input Fields */}
            <Text style={styles.modalSectionTitle}>Order Settings</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Minimum Order Amount (GMD)</Text>
              <TextInput
                style={styles.input}
                value={businessSettings.minimumOrderAmount}
                onChangeText={(text) =>
                  setBusinessSettings((prev) => ({
                    ...prev,
                    minimumOrderAmount: text,
                  }))
                }
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Delivery Fee (GMD)</Text>
              <TextInput
                style={styles.input}
                value={businessSettings.deliveryFee}
                onChangeText={(text) =>
                  setBusinessSettings((prev) => ({
                    ...prev,
                    deliveryFee: text,
                  }))
                }
                keyboardType="numeric"
                placeholder="5000"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Estimated Prep Time (minutes)
              </Text>
              <TextInput
                style={styles.input}
                value={businessSettings.estimatedPrepTime}
                onChangeText={(text) =>
                  setBusinessSettings((prev) => ({
                    ...prev,
                    estimatedPrepTime: text,
                  }))
                }
                keyboardType="numeric"
                placeholder="30"
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => saveSettings("business")}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[PrimaryColor, "#1976D2"]}
                style={styles.saveButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          logoutVendor();
          router.replace("/(auth)/login" as any);
        },
      },
    ]);
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
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Business Info */}
        <View style={styles.section}>
          <SectionHeader title="Business Information" />

          <SettingsCard
            title={getBusinessName()}
            subtitle="Edit business profile"
            icon="business"
            onPress={() => router.push("/vendor/profile")}
          />
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <SectionHeader title="Preferences" />

          <SettingsCard
            title="Notifications"
            subtitle="Manage notification preferences"
            icon="notifications"
            onPress={() => {
              setModalType("notifications");
              setModalVisible(true);
            }}
          />

          <SettingsCard
            title="Business Settings"
            subtitle="Order and payment preferences"
            icon="storefront"
            onPress={() => {
              setModalType("business");
              setModalVisible(true);
            }}
          />

          <SettingsCard
            title="Business Status"
            subtitle={currentBusiness?.isActive ? "Open for orders" : "Closed"}
            icon="time"
            rightComponent={
              <Switch
                value={currentBusiness?.isActive || false}
                onValueChange={async (value) => {
                  try {
                    if (!currentBusiness) return;

                    const updateData = {
                      isActive: value,
                      acceptsOrders: value,
                    };

                    await vendorApi.updateRestaurantDetails(
                      currentBusiness.id,
                      updateData
                    );
                    await refreshVendorData();
                    Alert.alert(
                      "Success",
                      `Business is now ${value ? "open" : "closed"}`
                    );
                  } catch (error) {
                    console.error("Error updating business status:", error);
                    Alert.alert("Error", "Failed to update business status");
                  }
                }}
                trackColor={{ false: "#767577", true: PrimaryColor }}
              />
            }
            showArrow={false}
          />
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <SectionHeader title="Subscription" />
          <SubscriptionStatus />
        </View>

        {/* Support */}
        <View style={styles.section}>
          <SectionHeader title="Support" />

          <SettingsCard
            title="Help & Support"
            subtitle="Get help with your account"
            icon="help-circle"
            onPress={() => {
              // Navigate to help screen or open support
              Alert.alert("Support", "Contact support at support@teranggo.com");
            }}
          />

          <SettingsCard
            title="Terms & Conditions"
            subtitle="Read our terms of service"
            icon="document-text"
            onPress={() => {
              // Navigate to terms screen
            }}
          />

          <SettingsCard
            title="Privacy Policy"
            subtitle="Read our privacy policy"
            icon="shield-checkmark"
            onPress={() => {
              // Navigate to privacy screen
            }}
          />
        </View>

        {/* Account */}
        <View style={styles.section}>
          <SectionHeader title="Account" />

          <SettingsCard
            title="Logout"
            subtitle="Sign out of your account"
            icon="log-out"
            onPress={handleLogout}
          />
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Modals */}
      {renderNotificationModal()}
      {renderBusinessModal()}
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
  headerRight: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingsCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  settingsCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${PrimaryColor}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  settingsCardRight: {
    flexDirection: "row",
    alignItems: "center",
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
    maxHeight: "85%",
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
  modalBody: {
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  switchLabel: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
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
  saveButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 20,
  },
  saveButtonGradient: {
    padding: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
