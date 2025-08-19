import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ScrollView,
  Animated,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import axios from "axios";
import { API_URL } from "@/constants/config";
import { Ionicons } from "@expo/vector-icons";
import VendorApplicationAPI from "../../lib/vendorApplicationAPI";

export default function ProfilePage() {
  const [user, setUser] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    role?: string;
    avatarUrl?: string;
    isVerified?: boolean;
    addresses?: any[];
    preferences?: any;
  } | null>(null);
  const [vendorApplication, setVendorApplication] = useState<{
    status: string;
    businessName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Animated skeleton loader
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;

  // Fetch user data function (extracted to be reusable)
  const fetchUserData = useCallback(async (isRefresh = false) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      const token = await AsyncStorage.getItem("token");
      const userPhone = await AsyncStorage.getItem("userPhone");

      if (!userId || !token) {
        // Not logged in - set loading to false and user to null
        if (!isRefresh) setLoading(false);
        setUser(null);
        return;
      }

      // User has credentials, try to fetch their data
      try {
        const response = await axios.get(
          `${API_URL}/api/users/${userId}/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Profile data fetched successfully:", response.data);
        const profileData = response.data;
        const userData = profileData.user;

        // Store user data for other parts of the app
        await AsyncStorage.setItem("userData", JSON.stringify(userData));

        setUser({
          fullName: userData?.fullName,
          email: userData?.email,
          phone: userData?.phone || userPhone,
          role: userData?.role,
          avatarUrl: userData?.avatarUrl || profileData?.avatarUrl,
          isVerified: userData?.isVerified,
          addresses: profileData?.addresses || [],
          preferences: profileData?.preferences || {},
        });

        // Fetch vendor application status if user is not already a vendor
        if (userData?.role !== "VENDOR") {
          try {
            const applicationResponse =
              await VendorApplicationAPI.getUserApplication(token);
            if (applicationResponse?.application) {
              const applicationData = {
                status: applicationResponse.application.status,
                businessName: applicationResponse.application.businessName,
              };
              setVendorApplication(applicationData);

              // Show notification for approved vendors about web portal
              if (applicationData.status === "APPROVED" && !isRefresh) {
                Alert.alert(
                  "Vendor Account Approved!",
                  `Congratulations! Your vendor application for "${applicationData.businessName}" has been approved. You can now manage your business through our vendor web portal.`,
                  [
                    {
                      text: "Learn More",
                      onPress: () =>
                        Alert.alert(
                          "Vendor Web Portal",
                          "Visit our vendor web portal on your computer or tablet to manage your products, view orders, and track your business analytics. The web portal provides better tools for business management.",
                          [{ text: "OK" }]
                        ),
                    },
                    {
                      text: "OK",
                      style: "cancel",
                    },
                  ]
                );
              }
            }
          } catch (error: any) {
            // If no application found (404), that's fine - user hasn't applied yet
            if (!error.message?.includes("No application found")) {
              console.log("Error fetching vendor application:", error);
            }
          }
        }
      } catch (apiError: any) {
        console.log("API call failed:", apiError);

        // Check if it's an authentication error (401/403)
        if (
          apiError.response?.status === 401 ||
          apiError.response?.status === 403
        ) {
          // Token is invalid/expired - clear auth data and redirect to login
          console.log("Authentication failed - clearing auth data");
          await AsyncStorage.multiRemove([
            "token",
            "userId",
            "userPhone",
            "isLoggedIn",
            "userData",
          ]);
          setUser(null);
          // Don't show error alert for auth failures - just silently handle it
        } else {
          // Other API errors - show error message
          // Alert.alert("Error", "Failed to load user data. Please try again.");
          setUser(null);
        }
      }
    } catch (error) {
      console.log("Failed to fetch user data:", error);
      // General error (e.g., AsyncStorage issues) - just set user to null
      setUser(null);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, []);

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData(true);
    setRefreshing(false);
  };

  useEffect(() => {
    // Start skeleton animation
    const skeletonAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    if (loading) {
      skeletonAnimation.start();
    } else {
      skeletonAnimation.stop();
    }

    return () => skeletonAnimation.stop();
  }, [loading, skeletonOpacity]);

  const SkeletonBox = ({
    width,
    height,
    style,
  }: {
    width: number;
    height: number;
    style?: any;
  }) => (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: "#E5E7EB",
          borderRadius: 8,
          opacity: skeletonOpacity,
        },
        style,
      ]}
    />
  );

  useEffect(() => {
    fetchUserData();
  }, [router, fetchUserData]);

  // Refresh profile data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );

  // Auto-redirect vendors to their dashboard
  useEffect(() => {
    if (user && user.role === "VENDOR") {
      console.log("User is a vendor, considering auto-redirect to dashboard");
    }
  }, [user]);

  const handleLogout = async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        onPress: async () => {
          await AsyncStorage.multiRemove([
            "token",
            "userId",
            "userPhone",
            "location",

            "isLoggedIn",
            "hasSeenOnboarding",
          ]);
          router.replace("/auth");
        },
        style: "destructive",
      },
    ]);
  };

  const handleBecomeVendor = () => {
    if (vendorApplication) {
      switch (vendorApplication.status) {
        case "PENDING":
          Alert.alert(
            "Application Submitted",
            `Your vendor application for "${vendorApplication.businessName}" is currently being reviewed. We'll notify you once a decision has been made.`,
            [{ text: "OK" }]
          );
          break;
        case "APPROVED":
          // Redirect approved vendors to web portal information
          Alert.alert(
            "Vendor Account Approved!",
            `Congratulations! Your vendor account for "${vendorApplication.businessName}" is active. Please visit our vendor web portal to manage your business.`,
            [
              {
                text: "Learn More",
                onPress: () =>
                  Alert.alert(
                    "Vendor Web Portal",
                    "Visit our vendor web portal on your computer or tablet to:\n\n• Manage your products and inventory\n• View and process orders\n• Track sales and analytics\n• Update store settings\n\nThe web portal provides better tools for business management than the mobile app.",
                    [{ text: "Got it!" }]
                  ),
              },
              { text: "OK" },
            ]
          );
          break;
        case "REJECTED":
          Alert.alert(
            "Application Not Approved",
            "Unfortunately, your vendor application was not approved. You can submit a new application if you'd like to try again.",
            [
              { text: "Cancel" },
              {
                text: "Apply Again",
                onPress: () =>
                  Alert.alert(
                    "New Application",
                    "To submit a new vendor application, please contact our support team who will guide you through the process.",
                    [{ text: "OK" }]
                  ),
              },
            ]
          );
          break;
        case "WAITING_LIST":
          Alert.alert(
            "Application on Waiting List",
            `Your vendor application for "${vendorApplication.businessName}" has been placed on our waiting list. We'll contact you when a spot becomes available.`,
            [{ text: "OK" }]
          );
          break;
        default:
          // Fallback for new applications
          showVendorApplicationInfo();
      }
    } else {
      // No application exists, show the default dialog
      showVendorApplicationInfo();
    }
  };

  const showVendorApplicationInfo = () => {
    Alert.alert(
      "Become a Vendor",
      "Ready to start selling on TeranGo? Join thousands of vendors serving customers across The Gambia!",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Apply Now",
          onPress: () => {
            Alert.alert(
              "Vendor Application",
              "To become a vendor on TeranGo, please contact our team who will guide you through the application process and requirements.",
              [
                {
                  text: "Contact Support",
                  onPress: () =>
                    Alert.alert(
                      "Contact Information",
                      "Please contact us at:\n\nEmail: vendors@terango.gm\nPhone: +220 XXX XXXX\n\nOur team will help you get started!",
                      [{ text: "Got it!" }]
                    ),
                },
                { text: "Cancel", style: "cancel" },
              ]
            );
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: "person-outline",
      title: "Edit Profile",
      subtitle: "Update your personal information",
      onPress: () =>
        Alert.alert("Coming Soon", "Profile editing feature coming soon!"),
    },
    {
      icon: "card-outline",
      title: "Payment Methods",
      subtitle: "Manage your payment options",
      onPress: () => Alert.alert("Coming Soon", "Payment methods coming soon!"),
    },
    {
      icon: "location-outline",
      title: "Addresses",
      subtitle: "Manage delivery addresses",
      onPress: () =>
        Alert.alert("Coming Soon", "Address management coming soon!"),
    },
    {
      icon: "receipt-outline",
      title: "Order History",
      subtitle: "View your past orders",
      onPress: () => Alert.alert("Coming Soon", "Order history coming soon!"),
    },
    {
      icon: "notifications-outline",
      title: "Notifications",
      subtitle: "Manage your notification preferences",
      onPress: () =>
        Alert.alert("Coming Soon", "Notification settings coming soon!"),
    },
    {
      icon: "help-circle-outline",
      title: "Help & Support",
      subtitle: "Get help or contact support",
      onPress: () => Alert.alert("Coming Soon", "Help center coming soon!"),
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.centeredContent}
          showsVerticalScrollIndicator={false}
        >
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />

          {/* Enhanced Skeleton Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Animated.View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: "#E5E7EB",
                    opacity: skeletonOpacity,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <View style={styles.pulseCenter}>
                  <Animated.View
                    style={[styles.pulseRing, { opacity: skeletonOpacity }]}
                  />
                  <View style={styles.pulseCore} />
                </View>
              </Animated.View>
            </View>

            <View style={styles.welcomeSection}>
              <SkeletonBox
                width={120}
                height={16}
                style={{ marginBottom: 8, borderRadius: 4 }}
              />
              <SkeletonBox
                width={180}
                height={24}
                style={{ marginBottom: 12, borderRadius: 6 }}
              />
              <SkeletonBox
                width={140}
                height={32}
                style={{ borderRadius: 20 }}
              />
            </View>

            <View style={styles.profileInfo}>
              {[1, 2, 3].map((item) => (
                <View key={item} style={styles.infoRow}>
                  <SkeletonBox
                    width={20}
                    height={20}
                    style={{ borderRadius: 10 }}
                  />
                  <View style={styles.infoText}>
                    <SkeletonBox
                      width={80}
                      height={12}
                      style={{ marginBottom: 4, borderRadius: 3 }}
                    />
                    <SkeletonBox
                      width={160}
                      height={16}
                      style={{ borderRadius: 4 }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Enhanced Skeleton Vendor CTA */}
          <Animated.View
            style={[
              styles.vendorCTA,
              {
                backgroundColor: "#FFE4D6",
                opacity: skeletonOpacity,
              },
            ]}
          >
            <View style={styles.vendorCTAContent}>
              <SkeletonBox
                width={52}
                height={52}
                style={{ borderRadius: 26, marginRight: 16 }}
              />
              <View style={styles.vendorCTAText}>
                <SkeletonBox
                  width={140}
                  height={19}
                  style={{ marginBottom: 4, borderRadius: 4 }}
                />
                <SkeletonBox
                  width={200}
                  height={14}
                  style={{ borderRadius: 3 }}
                />
              </View>
            </View>
          </Animated.View>

          {/* Enhanced Skeleton Menu Items */}
          <View style={styles.menuSection}>
            <SkeletonBox
              width={150}
              height={20}
              style={{ marginBottom: 16, borderRadius: 5 }}
            />
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Animated.View
                key={item}
                style={[
                  styles.menuItem,
                  {
                    backgroundColor: "#F9FAFB",
                    opacity: skeletonOpacity,
                  },
                ]}
              >
                <View style={styles.menuItemLeft}>
                  <SkeletonBox
                    width={44}
                    height={44}
                    style={{ borderRadius: 22, marginRight: 16 }}
                  />
                  <View>
                    <SkeletonBox
                      width={120}
                      height={16}
                      style={{ marginBottom: 4, borderRadius: 4 }}
                    />
                    <SkeletonBox
                      width={180}
                      height={13}
                      style={{ borderRadius: 3 }}
                    />
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Skeleton Footer */}
          <View style={styles.footer}>
            <SkeletonBox
              width={100}
              height={14}
              style={{ marginBottom: 4, borderRadius: 3 }}
            />
            <SkeletonBox width={200} height={12} style={{ borderRadius: 3 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // If user is not logged in, show login prompt
  if (!user && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.centeredContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#FF6B35"]}
              tintColor="#FF6B35"
            />
          }
        >
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />

          {/* Login Prompt Card */}
          <View style={styles.loginPromptCard}>
            <View style={styles.loginIconContainer}>
              <Ionicons
                name="person-circle-outline"
                size={80}
                color="#FF6B35"
              />
            </View>

            <Text style={styles.loginPromptTitle}>Welcome to TeranGo!</Text>
            <Text style={styles.loginPromptSubtitle}>
              Sign in to access your profile, track orders, and enjoy
              personalized features.
            </Text>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push("/auth")}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Sign In / Sign Up</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.browseText}>
              You can continue browsing without an account
            </Text>
          </View>

          {/* Guest Features Card */}
          <View style={styles.guestFeaturesCard}>
            <Text style={styles.guestFeaturesTitle}>What you can do:</Text>

            <View style={styles.featureItem}>
              <Ionicons name="restaurant-outline" size={24} color="#FF6B35" />
              <Text style={styles.featureText}>
                Browse restaurants and menus
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="storefront-outline" size={24} color="#FF6B35" />
              <Text style={styles.featureText}>Explore shops and products</Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="search-outline" size={24} color="#FF6B35" />
              <Text style={styles.featureText}>
                Search for items and categories
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="location-outline" size={24} color="#FF6B35" />
              <Text style={styles.featureText}>Find nearby vendors</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.centeredContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF6B35"]}
            tintColor="#FF6B35"
          />
        }
      >
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        {/* Profile Card - Enhanced */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.fullName?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
          </View>

          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userNameLarge}>{user?.fullName || "User"}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user?.role === "VENDOR" ? "🏪 Vendor Account" : "👤 Customer"}
              </Text>
            </View>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#FF6B35" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>
                  {user?.fullName || "Not available"}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#FF6B35" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>
                  {user?.email || "Not available"}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#FF6B35" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>
                  {user?.phone || "Not available"}
                </Text>
              </View>
            </View>
          </View>
        </View>
        {/* Vendor CTA - Dynamic based on application status */}
        {user?.role !== "VENDOR" && (
          <TouchableOpacity
            style={[
              styles.vendorCTA,
              vendorApplication?.status === "PENDING" &&
                styles.vendorCTAPending,
              vendorApplication?.status === "APPROVED" &&
                styles.vendorCTAApproved,
              vendorApplication?.status === "REJECTED" &&
                styles.vendorCTARejected,
              vendorApplication?.status === "WAITING_LIST" &&
                styles.vendorCTAWaiting,
            ]}
            onPress={handleBecomeVendor}
          >
            <View style={styles.vendorCTAContent}>
              <View style={styles.vendorCTAIcon}>
                <Ionicons
                  name={
                    vendorApplication?.status === "PENDING"
                      ? "time-outline"
                      : vendorApplication?.status === "APPROVED"
                      ? "checkmark-circle-outline"
                      : vendorApplication?.status === "REJECTED"
                      ? "close-circle-outline"
                      : vendorApplication?.status === "WAITING_LIST"
                      ? "hourglass-outline"
                      : "storefront"
                  }
                  size={24}
                  color="#fff"
                />
              </View>
              <View style={styles.vendorCTAText}>
                <Text style={styles.vendorCTATitle}>
                  {vendorApplication?.status === "PENDING"
                    ? "Application Pending"
                    : vendorApplication?.status === "APPROVED"
                    ? "Manage Your Business"
                    : vendorApplication?.status === "REJECTED"
                    ? "Application Rejected"
                    : vendorApplication?.status === "WAITING_LIST"
                    ? "On Waiting List"
                    : "Become a Vendor"}
                </Text>
                <Text style={styles.vendorCTASubtitle}>
                  {vendorApplication?.status === "PENDING"
                    ? "Your application is being reviewed"
                    : vendorApplication?.status === "APPROVED"
                    ? "Access vendor management dashboard"
                    : vendorApplication?.status === "REJECTED"
                    ? "Tap to apply again"
                    : vendorApplication?.status === "WAITING_LIST"
                    ? "We'll notify you when a spot opens"
                    : "Start selling and grow your business with TeranGo"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
        {/* Menu Items - Updated Colors */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon as any} size={20} color="#FF6B35" />
                </View>
                <View>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
        {/* Development Tools - Only show in development
        {__DEV__ && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>🛠️ Development Tools</Text>
            <View style={styles.devButtonContainer}>
              <TouchableOpacity
                style={[styles.devButton, { backgroundColor: "#3b82f6" }]}
                onPress={async () => {
                  const { setTestUser } = await import("@/utils/authHelpers");
                  await setTestUser("USER");
                  Alert.alert("Test User Set", "Restart app to see changes");
                }}
              >
                <Text style={styles.devButtonText}>Test Regular User</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.devButton, { backgroundColor: "#10b981" }]}
                onPress={async () => {
                  const { setTestUser } = await import("@/utils/authHelpers");
                  await setTestUser("VENDOR");
                  Alert.alert("Test Vendor Set", "Restart app to see changes");
                }}
              >
                <Text style={styles.devButtonText}>Test Vendor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.devButton, { backgroundColor: "#ef4444" }]}
                onPress={async () => {
                  const { clearAuthData } = await import("@/utils/authHelpers");
                  await clearAuthData();
                  Alert.alert("Auth Cleared", "Restart app to see changes");
                }}
              >
                <Text style={styles.devButtonText}>Clear Auth</Text>
              </TouchableOpacity>
            </View>
          </View>
        )} */}
        {/* Logout Button - Updated Colors */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFFFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>TeranGo v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Making deliveries easier in The Gambia
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  centeredContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#FF6B35",
    fontWeight: "600",
    fontSize: 16,
  },

  // Profile Card Styles - Enhanced
  profileCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  // Welcome Section
  welcomeSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  welcomeText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  userNameLarge: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  roleBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  roleBadgeText: {
    fontSize: 14,
    color: "#FF6B35",
    fontWeight: "600",
  },

  profileInfo: {
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingVertical: 8,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  // Vendor CTA Styles - Orange Theme
  vendorCTA: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    backgroundColor: "#FF6B35",
    overflow: "hidden",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  vendorCTAContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 22,
  },
  vendorCTAIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  vendorCTAText: {
    flex: 1,
  },
  vendorCTATitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  vendorCTASubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },

  // Vendor CTA Status-specific Styles
  vendorCTAPending: {
    backgroundColor: "#F59E0B", // Amber for pending
    shadowColor: "#F59E0B",
  },
  vendorCTAApproved: {
    backgroundColor: "#22C55E", // Green for approved
    shadowColor: "#22C55E",
  },
  vendorCTARejected: {
    backgroundColor: "#EF4444", // Red for rejected
    shadowColor: "#EF4444",
  },
  vendorCTAWaiting: {
    backgroundColor: "#8B5CF6", // Purple for waiting list
    shadowColor: "#8B5CF6",
  },

  // Menu Styles - Orange Theme
  menuSection: {
    marginHorizontal: 20,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
    paddingLeft: 4,
  },
  menuItem: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    marginBottom: 10,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  // Logout Button - Matching Vendor Button Style
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35",
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 18,
    borderRadius: 20,
    gap: 8,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: "#D1D5DB",
    textAlign: "center",
  },

  // Skeleton Styles - Modern Animated
  pulseCenter: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  pulseCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF6B35",
  },

  // Login Prompt Styles
  loginPromptCard: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  loginIconContainer: {
    marginBottom: 20,
  },
  loginPromptTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  loginPromptSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35",
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 16,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  browseText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  guestFeaturesCard: {
    backgroundColor: "#fff",
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  guestFeaturesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: "#374151",
    flex: 1,
  },
  // Development styles
  devButtonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  devButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    minWidth: 100,
  },
  devButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
