import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Switch,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

interface VendorSettings {
  notifications: {
    orderAlerts: boolean;
    promotionalEmails: boolean;
    weeklyReports: boolean;
    customerReviews: boolean;
  };
  business: {
    autoAcceptOrders: boolean;
    minimumOrderAmount: number;
    maxDeliveryRadius: number;
    preparationTime: number;
  };
  payment: {
    acceptCashOnDelivery: boolean;
    acceptMobilePayment: boolean;
    acceptBankTransfer: boolean;
  };
}

export default function VendorSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<VendorSettings>({
    notifications: {
      orderAlerts: true,
      promotionalEmails: false,
      weeklyReports: true,
      customerReviews: true,
    },
    business: {
      autoAcceptOrders: false,
      minimumOrderAmount: 50,
      maxDeliveryRadius: 10,
      preparationTime: 30,
    },
    payment: {
      acceptCashOnDelivery: true,
      acceptMobilePayment: true,
      acceptBankTransfer: false,
    },
  });

  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [tempBusinessSettings, setTempBusinessSettings] = useState(
    settings.business
  );

  const updateNotificationSetting = (
    key: keyof VendorSettings["notifications"],
    value: boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  const updatePaymentSetting = (
    key: keyof VendorSettings["payment"],
    value: boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        [key]: value,
      },
    }));
  };

  const saveBusinessSettings = () => {
    setSettings((prev) => ({
      ...prev,
      business: tempBusinessSettings,
    }));
    setShowBusinessModal(false);
    Alert.alert("Success", "Business settings updated successfully!");
  };

  const resetToDefaults = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to default values?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setSettings({
              notifications: {
                orderAlerts: true,
                promotionalEmails: false,
                weeklyReports: true,
                customerReviews: true,
              },
              business: {
                autoAcceptOrders: false,
                minimumOrderAmount: 50,
                maxDeliveryRadius: 10,
                preparationTime: 30,
              },
              payment: {
                acceptCashOnDelivery: true,
                acceptMobilePayment: true,
                acceptBankTransfer: false,
              },
            });
            Alert.alert("Success", "Settings reset to defaults!");
          },
        },
      ]
    );
  };

  const SettingRow = ({
    icon,
    title,
    subtitle,
    value,
    onToggle,
    colors = ["#6B7280", "#4B5563"],
  }: {
    icon: string;
    title: string;
    subtitle: string;
    value: boolean;
    onToggle: (value: boolean) => void;
    colors?: [string, string];
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIconContainer}>
        <LinearGradient colors={colors} style={styles.settingIconGradient}>
          <Ionicons name={icon as any} size={20} color="#fff" />
        </LinearGradient>
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#E5E7EB", true: "#10B981" }}
        thumbColor={value ? "#fff" : "#9CA3AF"}
      />
    </View>
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
          <Text style={styles.headerTitle}>Vendor Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your preferences</Text>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
          <Ionicons name="refresh-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <LinearGradient
                colors={["#8B5CF6", "#7C3AED"]}
                style={styles.sectionIcon}
              >
                <Ionicons name="notifications" size={20} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.sectionTitle}>Notification Settings</Text>
          </View>

          <View style={styles.settingsContainer}>
            <SettingRow
              icon="notifications-outline"
              title="Order Alerts"
              subtitle="Get notified when you receive new orders"
              value={settings.notifications.orderAlerts}
              onToggle={(value) =>
                updateNotificationSetting("orderAlerts", value)
              }
              colors={["#F59E0B", "#D97706"]}
            />

            <SettingRow
              icon="mail-outline"
              title="Promotional Emails"
              subtitle="Receive marketing and promotional emails"
              value={settings.notifications.promotionalEmails}
              onToggle={(value) =>
                updateNotificationSetting("promotionalEmails", value)
              }
              colors={["#3B82F6", "#2563EB"]}
            />

            <SettingRow
              icon="bar-chart-outline"
              title="Weekly Reports"
              subtitle="Get weekly performance and analytics reports"
              value={settings.notifications.weeklyReports}
              onToggle={(value) =>
                updateNotificationSetting("weeklyReports", value)
              }
              colors={["#10B981", "#059669"]}
            />

            <SettingRow
              icon="star-outline"
              title="Customer Reviews"
              subtitle="Get notified about new customer reviews"
              value={settings.notifications.customerReviews}
              onToggle={(value) =>
                updateNotificationSetting("customerReviews", value)
              }
              colors={["#EC4899", "#DB2777"]}
            />
          </View>
        </View>

        {/* Business Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <LinearGradient
                colors={["#F97316", "#EA580C"]}
                style={styles.sectionIcon}
              >
                <Ionicons name="business" size={20} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.sectionTitle}>Business Settings</Text>
          </View>

          <View style={styles.settingsContainer}>
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.settingIconGradient}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#fff"
                  />
                </LinearGradient>
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Auto Accept Orders</Text>
                <Text style={styles.settingSubtitle}>
                  Automatically accept incoming orders
                </Text>
              </View>
              <Switch
                value={settings.business.autoAcceptOrders}
                onValueChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    business: { ...prev.business, autoAcceptOrders: value },
                  }))
                }
                trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                thumbColor={
                  settings.business.autoAcceptOrders ? "#fff" : "#9CA3AF"
                }
              />
            </View>

            <TouchableOpacity
              style={styles.settingRowButton}
              onPress={() => {
                setTempBusinessSettings(settings.business);
                setShowBusinessModal(true);
              }}
            >
              <View style={styles.settingIconContainer}>
                <LinearGradient
                  colors={["#3B82F6", "#2563EB"]}
                  style={styles.settingIconGradient}
                >
                  <Ionicons name="settings-outline" size={20} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Business Configuration</Text>
                <Text style={styles.settingSubtitle}>
                  Min order: D{settings.business.minimumOrderAmount}, Radius:{" "}
                  {settings.business.maxDeliveryRadius}km, Prep:{" "}
                  {settings.business.preparationTime}min
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.sectionIcon}
              >
                <Ionicons name="card" size={20} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
          </View>

          <View style={styles.settingsContainer}>
            <SettingRow
              icon="cash-outline"
              title="Cash on Delivery"
              subtitle="Accept cash payments on delivery"
              value={settings.payment.acceptCashOnDelivery}
              onToggle={(value) =>
                updatePaymentSetting("acceptCashOnDelivery", value)
              }
              colors={["#22C55E", "#16A34A"]}
            />

            <SettingRow
              icon="phone-portrait-outline"
              title="Mobile Payment"
              subtitle="Accept mobile money payments"
              value={settings.payment.acceptMobilePayment}
              onToggle={(value) =>
                updatePaymentSetting("acceptMobilePayment", value)
              }
              colors={["#3B82F6", "#2563EB"]}
            />

            <SettingRow
              icon="card-outline"
              title="Bank Transfer"
              subtitle="Accept bank transfer payments"
              value={settings.payment.acceptBankTransfer}
              onToggle={(value) =>
                updatePaymentSetting("acceptBankTransfer", value)
              }
              colors={["#8B5CF6", "#7C3AED"]}
            />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <LinearGradient
                colors={["#EF4444", "#DC2626"]}
                style={styles.sectionIcon}
              >
                <Ionicons name="shield" size={20} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.sectionTitle}>Account & Security</Text>
          </View>

          <View style={styles.settingsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                Alert.alert(
                  "Coming Soon",
                  "Change password feature coming soon!"
                )
              }
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="key-outline" size={20} color="#6B7280" />
              </View>
              <Text style={styles.actionText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                Alert.alert(
                  "Coming Soon",
                  "Two-factor authentication coming soon!"
                )
              }
            >
              <View style={styles.actionIconContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#6B7280"
                />
              </View>
              <Text style={styles.actionText}>Two-Factor Authentication</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                Alert.alert("Coming Soon", "Data export feature coming soon!")
              }
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="download-outline" size={20} color="#6B7280" />
              </View>
              <Text style={styles.actionText}>Export My Data</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerAction]}
              onPress={() =>
                Alert.alert(
                  "Coming Soon",
                  "Account deactivation feature coming soon!"
                )
              }
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.actionText, styles.dangerText]}>
                Deactivate Account
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Business Settings Modal */}
      <Modal
        visible={showBusinessModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBusinessModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Business Configuration</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowBusinessModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Minimum Order Amount (GMD)</Text>
              <TextInput
                style={styles.input}
                value={tempBusinessSettings.minimumOrderAmount.toString()}
                onChangeText={(text) =>
                  setTempBusinessSettings((prev) => ({
                    ...prev,
                    minimumOrderAmount: parseInt(text) || 0,
                  }))
                }
                keyboardType="numeric"
                placeholder="Enter minimum order amount"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Maximum Delivery Radius (km)
              </Text>
              <TextInput
                style={styles.input}
                value={tempBusinessSettings.maxDeliveryRadius.toString()}
                onChangeText={(text) =>
                  setTempBusinessSettings((prev) => ({
                    ...prev,
                    maxDeliveryRadius: parseInt(text) || 0,
                  }))
                }
                keyboardType="numeric"
                placeholder="Enter delivery radius"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preparation Time (minutes)</Text>
              <TextInput
                style={styles.input}
                value={tempBusinessSettings.preparationTime.toString()}
                onChangeText={(text) =>
                  setTempBusinessSettings((prev) => ({
                    ...prev,
                    preparationTime: parseInt(text) || 0,
                  }))
                }
                keyboardType="numeric"
                placeholder="Enter preparation time"
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowBusinessModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={saveBusinessSettings}
            >
              <Text style={styles.modalSaveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  resetButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionIconContainer: {
    marginRight: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  settingsContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  settingRowButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  settingIconContainer: {
    marginRight: 12,
  },
  settingIconGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dangerAction: {
    borderBottomWidth: 0,
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2937",
  },
  dangerText: {
    color: "#EF4444",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#10B981",
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
