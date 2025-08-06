import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { API_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  mealTime?: string;
  preparationTime?: number;
  isAvailable?: boolean;
  subCategory?: {
    id: string;
    name: string;
  };
}

interface MenuData {
  breakfast: MenuItem[];
  lunch: MenuItem[];
  dinner: MenuItem[];
  snacks: MenuItem[];
  beverages: MenuItem[];
}

const MEAL_TIME_ICONS = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  snacks: "fast-food-outline",
  beverages: "wine-outline",
};

const MEAL_TIME_COLORS = {
  breakfast: ["#fbbf24", "#f59e0b"],
  lunch: ["#10b981", "#059669"],
  dinner: ["#8b5cf6", "#7c3aed"],
  snacks: ["#f97316", "#ea580c"],
  beverages: ["#06b6d4", "#0891b2"],
};

export default function ViewMenuItem() {
  const router = useRouter();
  const isInitialMount = useRef(true);

  const [menuData, setMenuData] = useState<MenuData>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
    beverages: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<{
    [key in keyof MenuData]: boolean;
  }>({
    breakfast: false,
    lunch: false,
    dinner: false,
    snacks: false,
    beverages: false,
  });

  useEffect(() => {
    fetchUserRestaurantAndMenuItems();
  }, []);

  // Auto-refresh when the screen comes into focus (e.g., when returning from add-menu-item)
  useFocusEffect(
    React.useCallback(() => {
      // Skip on initial mount, only refresh on subsequent focus events
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      // Refresh the data when returning to this screen
      fetchUserRestaurantAndMenuItems();
    }, [])
  );

  const fetchUserRestaurantAndMenuItems = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        setError("Authentication error. Please log in again.");
        return;
      }

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setError("Authentication error. Please log in again.");
        return;
      }

      console.log("Fetching vendor data for userId:", userId);

      // Fetch vendor data to get the user's restaurant
      const vendorResponse = await axios.get(
        `${API_URL}/api/vendors/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Vendor response:", vendorResponse.data);

      if (
        !vendorResponse.data ||
        !vendorResponse.data.restaurants ||
        vendorResponse.data.restaurants.length === 0
      ) {
        setError("No restaurant found. Please set up your restaurant first.");
        return;
      }

      const userRestaurant = vendorResponse.data.restaurants[0]; // Get the user's restaurant
      setRestaurant({ id: userRestaurant.id, name: userRestaurant.name });

      console.log("User restaurant:", userRestaurant);
      console.log("Fetching menu items for restaurant ID:", userRestaurant.id);

      // Fetch menu items for this restaurant
      const menuResponse = await axios.get(
        `${API_URL}/api/menuItem/restaurant/${userRestaurant.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Menu response:", menuResponse.data);

      // Group menu items by meal time
      const groupedData: MenuData = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
        beverages: [],
      };

      if (Array.isArray(menuResponse.data)) {
        menuResponse.data.forEach((item: MenuItem) => {
          const mealTime = item.mealTime || "lunch";
          if (groupedData[mealTime as keyof MenuData]) {
            groupedData[mealTime as keyof MenuData].push(item);
          } else {
            groupedData.lunch.push(item); // Default to lunch if unknown
          }
        });
      }

      setMenuData(groupedData);
      setError(null);
      console.log("Menu data grouped:", groupedData);
    } catch (error: any) {
      console.error("Error fetching restaurant and menu items:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      setError(
        `Failed to load data: ${error.response?.data?.message || error.message}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchUserRestaurantAndMenuItems(true);
  };

  const toggleSection = (mealTime: keyof MenuData) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [mealTime]: !prev[mealTime],
    }));
  };

  const toggleAllSections = () => {
    const allCollapsed = Object.values(collapsedSections).every(
      (collapsed) => collapsed
    );
    const newState = !allCollapsed;

    setCollapsedSections({
      breakfast: newState,
      lunch: newState,
      dinner: newState,
      snacks: newState,
      beverages: newState,
    });
  };

  const handleEditItem = (itemId: string) => {
    if (!restaurant) return;

    router.push({
      pathname: "/vendor-management/edit-menu-item",
      params: {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        itemId,
      },
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      "Delete Menu Item",
      "Are you sure you want to delete this menu item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              await axios.delete(`${API_URL}/api/menuItem/${itemId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              fetchUserRestaurantAndMenuItems();
              Alert.alert("Success", "Menu item deleted successfully");
            } catch (err) {
              console.error("Delete error:", err);
              Alert.alert("Error", "Failed to delete menu item");
            }
          },
        },
      ]
    );
  };

  const renderMenuItem = (item: MenuItem) => (
    <View key={item.id} style={styles.menuItemCard}>
      <View style={styles.menuItemImage}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={24} color="#9ca3af" />
          </View>
        )}
        <View style={styles.availabilityBadge}>
          <View
            style={[
              styles.availabilityDot,
              { backgroundColor: item.isAvailable ? "#10b981" : "#ef4444" },
            ]}
          />
        </View>
      </View>

      <View style={styles.menuItemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.itemMeta}>
          <Text style={styles.itemPrice}>GMD {item.price.toFixed(2)}</Text>
          {item.preparationTime && (
            <View style={styles.prepTimeContainer}>
              <Ionicons name="time-outline" size={12} color="#6b7280" />
              <Text style={styles.prepTime}>{item.preparationTime}min</Text>
            </View>
          )}
        </View>

        {item.subCategory && (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{item.subCategory.name}</Text>
          </View>
        )}
      </View>

      <View style={styles.menuItemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditItem(item.id)}
        >
          <Ionicons name="pencil" size={16} color="#10b981" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteItem(item.id)}
        >
          <Ionicons name="trash" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMealSection = (mealTime: keyof MenuData, items: MenuItem[]) => {
    if (items.length === 0) return null;

    const iconName = MEAL_TIME_ICONS[mealTime] as any;
    const colors = MEAL_TIME_COLORS[mealTime] as [string, string];
    const isCollapsed = collapsedSections[mealTime];

    return (
      <View key={mealTime} style={styles.mealSection}>
        <TouchableOpacity
          style={styles.mealHeader}
          onPress={() => toggleSection(mealTime)}
          activeOpacity={0.7}
        >
          <LinearGradient colors={colors} style={styles.mealIconContainer}>
            <Ionicons name={iconName} size={20} color="#fff" />
          </LinearGradient>
          <Text style={styles.mealTitle}>
            {mealTime.charAt(0).toUpperCase() + mealTime.slice(1)}
          </Text>
          <Text style={styles.mealCount}>({items.length})</Text>
          <View style={styles.collapseButton}>
            <Ionicons
              name={isCollapsed ? "chevron-down" : "chevron-up"}
              size={20}
              color="#6b7280"
            />
          </View>
        </TouchableOpacity>

        {!isCollapsed && (
          <View style={[styles.menuItemsList, { marginTop: 12 }]}>
            {items.map(renderMenuItem)}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading menu items...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchUserRestaurantAndMenuItems()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalItems = Object.values(menuData).reduce(
    (total, items) => total + items.length,
    0
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {restaurant?.name || "Restaurant"}
          </Text>
          <Text style={styles.headerSubtitle}>Menu Management</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            restaurant &&
            router.push({
              pathname: "/vendor-management/add-menu-item",
              params: {
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
              },
            })
          }
        >
          <Ionicons name="add" size={24} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={["#10b981", "#059669"]}
          style={styles.statsGradient}
        >
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalItems}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {Object.values(menuData).reduce(
                (total, items) =>
                  total +
                  items.filter((item: MenuItem) => item.isAvailable).length,
                0
              )}
            </Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {
                Object.keys(menuData).filter(
                  (key) => menuData[key as keyof MenuData].length > 0
                ).length
              }
            </Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Toggle All Button */}
      {totalItems > 0 && (
        <View style={styles.toggleAllContainer}>
          <TouchableOpacity
            style={styles.toggleAllButton}
            onPress={toggleAllSections}
          >
            <Ionicons
              name={
                Object.values(collapsedSections).every((collapsed) => collapsed)
                  ? "expand-outline"
                  : "contract-outline"
              }
              size={16}
              color="#10b981"
            />
            <Text style={styles.toggleAllText}>
              {Object.values(collapsedSections).every((collapsed) => collapsed)
                ? "Expand All"
                : "Collapse All"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {totalItems === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Menu Items</Text>
            <Text style={styles.emptyMessage}>
              Start building your menu by adding your first item!
            </Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() =>
                restaurant &&
                router.push({
                  pathname: "/vendor-management/add-menu-item",
                  params: {
                    restaurantId: restaurant.id,
                    restaurantName: restaurant.name,
                  },
                })
              }
            >
              <LinearGradient
                colors={["#10b981", "#059669"]}
                style={styles.addFirstGradient}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addFirstButtonText}>Add First Item</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.menuContainer}>
            {(Object.keys(menuData) as (keyof MenuData)[]).map((mealTime) =>
              renderMealSection(mealTime, menuData[mealTime])
            )}
          </View>
        )}
      </ScrollView>
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
  addButton: {
    padding: 8,
  },
  statsContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  statsGradient: {
    flexDirection: "row",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#fff",
    opacity: 0.3,
    marginHorizontal: 16,
  },
  toggleAllContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  toggleAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10b981",
    alignSelf: "center",
  },
  toggleAllText: {
    fontSize: 14,
    color: "#10b981",
    fontWeight: "500",
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
  },
  menuContainer: {
    padding: 16,
  },
  mealSection: {
    marginBottom: 20,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  mealIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  mealCount: {
    fontSize: 14,
    color: "#6b7280",
    marginRight: 8,
  },
  collapseButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "#f9fafb",
  },
  menuItemsList: {
    gap: 12,
  },
  menuItemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    position: "relative",
  },
  itemImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  availabilityBadge: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  availabilityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  menuItemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
    lineHeight: 20,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10b981",
  },
  prepTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  prepTime: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 4,
  },
  categoryTag: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: "#6b7280",
  },
  menuItemActions: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f9fafb",
    marginVertical: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  addFirstButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  addFirstGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  addFirstButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
