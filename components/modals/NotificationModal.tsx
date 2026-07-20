import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { API_URL } from "@/constants/config";
import { SecureStorage } from "@/utils/secureStorage";

interface NotificationSettings {
  pushNotifications: boolean;
  orderUpdates: boolean;
  promotions: boolean;
  newRestaurants: boolean;
  deliveryUpdates: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

const defaultSettings: NotificationSettings = {
  pushNotifications: true,
  orderUpdates: true,
  promotions: false,
  newRestaurants: false,
  deliveryUpdates: true,
  emailNotifications: false,
  smsNotifications: true,
};

export default function NotificationModal({
  visible,
  onClose,
}: NotificationModalProps) {
  const [settings, setSettings] =
    useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const savedSettings = await SecureStorage.getItem("notificationSettings");
      const merged = savedSettings
        ? { ...defaultSettings, ...JSON.parse(savedSettings) }
        : defaultSettings;
      setSettings(merged);

      // Marketing toggles are the source of truth server-side (they control
      // whether the backend's engagement/marketing scheduler pushes to this
      // user at all) — fetch the real value rather than trusting the local
      // cache, which can drift if the user changed it on another device.
      const token = await SecureStorage.getItem("token");
      if (token) {
        const response = await axios.get(
          `${API_URL}/api/notifications/preferences`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const marketingOptOut = response.data?.marketingOptOut ?? false;
        setSettings((prev) => ({
          ...prev,
          promotions: !marketingOptOut,
          newRestaurants: !marketingOptOut,
        }));
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      await SecureStorage.setItem(
        "notificationSettings",
        JSON.stringify(settings)
      );

      const token = await SecureStorage.getItem("token");
      if (token) {
        // Both marketing toggles map to the single server-side flag today —
        // enabling either re-enables engagement/promotional push.
        await axios.patch(
          `${API_URL}/api/notifications/preferences`,
          { marketingOptOut: !(settings.promotions || settings.newRestaurants) },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }

      Alert.alert("Success", "Notification preferences saved successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving notification settings:", error);
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings((prev) => {
      // Keep both marketing toggles in sync since they share one backend
      // flag — otherwise one could look "off" while the user still gets
      // marketing push because the other toggle is still on.
      if (key === "promotions" || key === "newRestaurants") {
        return { ...prev, promotions: value, newRestaurants: value };
      }
      return { ...prev, [key]: value };
    });
  };

  const NotificationItem = ({
    title,
    subtitle,
    icon,
    value,
    onToggle,
    disabled = false,
  }: {
    title: string;
    subtitle: string;
    icon: string;
    value: boolean;
    onToggle: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View style={[styles.settingItem, disabled && styles.disabledItem]}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, disabled && styles.disabledIcon]}>
          <Ionicons
            name={icon as any}
            size={20}
            color={disabled ? "#D1D5DB" : "#FF6B35"}
          />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
            {title}
          </Text>
          <Text
            style={[styles.settingSubtitle, disabled && styles.disabledText]}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#E5E7EB", true: "#FFE0B2" }}
        thumbColor={value ? "#FF6B35" : "#9CA3AF"}
        disabled={disabled}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <TouchableOpacity
            onPress={saveSettings}
            style={[styles.saveButton, loading && styles.disabledButton]}
            disabled={loading}
          >
            <Text
              style={[styles.saveButtonText, loading && styles.disabledText]}
            >
              {loading ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Push Notifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Push Notifications</Text>
            <Text style={styles.sectionSubtitle}>
              Control what notifications you receive on your device
            </Text>

            <NotificationItem
              title="Push Notifications"
              subtitle="Enable or disable all push notifications"
              icon="notifications-outline"
              value={settings.pushNotifications}
              onToggle={(value) => updateSetting("pushNotifications", value)}
            />

            <NotificationItem
              title="Order Updates"
              subtitle="Get notified about your order status"
              icon="receipt-outline"
              value={settings.orderUpdates}
              onToggle={(value) => updateSetting("orderUpdates", value)}
              disabled={!settings.pushNotifications}
            />

            <NotificationItem
              title="Delivery Updates"
              subtitle="Track your delivery in real-time"
              icon="bicycle-outline"
              value={settings.deliveryUpdates}
              onToggle={(value) => updateSetting("deliveryUpdates", value)}
              disabled={!settings.pushNotifications}
            />
          </View>

          {/* Marketing Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Marketing & Promotions</Text>
            <Text style={styles.sectionSubtitle}>
              Stay updated with deals and new restaurants
            </Text>

            <NotificationItem
              title="Promotions & Deals"
              subtitle="Get notified about special offers and discounts"
              icon="pricetag-outline"
              value={settings.promotions}
              onToggle={(value) => updateSetting("promotions", value)}
              disabled={!settings.pushNotifications}
            />

            <NotificationItem
              title="New Restaurants"
              subtitle="Discover new restaurants in your area"
              icon="restaurant-outline"
              value={settings.newRestaurants}
              onToggle={(value) => updateSetting("newRestaurants", value)}
              disabled={!settings.pushNotifications}
            />
          </View>

          {/* Communication Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Communication Preferences</Text>
            <Text style={styles.sectionSubtitle}>
              Choose how you&apos;d like to be contacted
            </Text>

            <NotificationItem
              title="Email Notifications"
              subtitle="Receive updates via email"
              icon="mail-outline"
              value={settings.emailNotifications}
              onToggle={(value) => updateSetting("emailNotifications", value)}
            />

            <NotificationItem
              title="SMS Notifications"
              subtitle="Receive important updates via SMS"
              icon="chatbubble-outline"
              value={settings.smsNotifications}
              onToggle={(value) => updateSetting("smsNotifications", value)}
            />
          </View>

          {/* Information */}
          <View style={styles.infoSection}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#6B7280"
            />
            <Text style={styles.infoText}>
              You can change these settings anytime. Some notifications may
              still be sent for security and account-related purposes.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  saveButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#D1D5DB",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  disabledItem: {
    opacity: 0.6,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  disabledIcon: {
    backgroundColor: "#F3F4F6",
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  disabledText: {
    color: "#D1D5DB",
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  infoText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    flex: 1,
    marginLeft: 8,
  },
});
