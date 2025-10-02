// Example: Updated SubCategoryView with Infinite Scroll Integration
// This shows how to replace the existing data fetching with infinite scroll

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

// Import the infinite scroll components
import RestaurantList from "@/components/common/RestaurantList";
import ShopList from "@/components/common/ShopList";
import ProductList from "@/components/common/ProductList";
import MenuItemList from "@/components/common/MenuItemList";

const { width } = Dimensions.get("window");

const SubCategoryViewUpdated = () => {
  const { subCategoryId, categoryName, subCategoryName } =
    useLocalSearchParams();

  // Tab management
  const [activeTab, setActiveTab] = useState("restaurants");
  const [searchQuery, setSearchQuery] = useState("");

  // Available tabs based on subcategory type
  const tabs = [
    { id: "restaurants", name: "Restaurants", icon: "restaurant" },
    { id: "shops", name: "Shops", icon: "storefront" },
    { id: "products", name: "Products", icon: "cube" },
    { id: "menuItems", name: "Menu Items", icon: "fast-food" },
  ];

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.activeTab]}
          onPress={() => setActiveTab(tab.id)}
        >
          <Ionicons
            name={tab.icon as any}
            size={20}
            color={activeTab === tab.id ? "#007AFF" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText,
            ]}
          >
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContent = () => {
    const commonProps = {
      searchQuery,
      subCategoryId: subCategoryId as string,
    };

    switch (activeTab) {
      case "restaurants":
        return <RestaurantList {...commonProps} />;
      case "shops":
        return <ShopList {...commonProps} />;
      case "products":
        return <ProductList {...commonProps} />;
      case "menuItems":
        return <MenuItemList {...commonProps} />;
      default:
        return <RestaurantList {...commonProps} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{subCategoryName || categoryName}</Text>
        <Text style={styles.subtitle}>Browse {activeTab} in this category</Text>
      </View>

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Content with Infinite Scroll */}
      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: "#f0f8ff",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
    color: "#666",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
});

export default SubCategoryViewUpdated;
