import React, { lazy, Suspense } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { PrimaryColor } from "@/constants/Colors";

// Lazy load vendor screens to keep app lightweight
const VendorDashboard = lazy(() => import("../../app/vendor/dashboard"));
const VendorOrders = lazy(() => import("../../app/vendor/orders"));
const VendorMenu = lazy(() => import("../../app/vendor/menu"));
const VendorProducts = lazy(() => import("../../app/vendor/products"));
const VendorProfile = lazy(() => import("../../app/vendor/products"));

const Tab = createBottomTabNavigator();

// Loading component for lazy loaded screens
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={PrimaryColor} />
  </View>
);

export default function VendorTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case "Dashboard":
              iconName = focused ? "analytics" : "analytics-outline";
              break;
            case "Orders":
              iconName = focused ? "receipt" : "receipt-outline";
              break;
            case "Menu":
              iconName = focused ? "restaurant" : "restaurant-outline";
              break;
            case "Products":
              iconName = focused ? "cube" : "cube-outline";
              break;
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
            default:
              iconName = "ellipse";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: PrimaryColor,
        tabBarInactiveTintColor: "gray",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0",
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
      })}
    >
      <Tab.Screen name="Dashboard" options={{ title: "Dashboard" }}>
        {() => (
          <Suspense fallback={<LoadingScreen />}>
            <VendorDashboard />
          </Suspense>
        )}
      </Tab.Screen>

      <Tab.Screen name="Orders" options={{ title: "Orders" }}>
        {() => (
          <Suspense fallback={<LoadingScreen />}>
            <VendorOrders />
          </Suspense>
        )}
      </Tab.Screen>

      <Tab.Screen name="Menu" options={{ title: "Menu" }}>
        {() => (
          <Suspense fallback={<LoadingScreen />}>
            <VendorMenu />
          </Suspense>
        )}
      </Tab.Screen>

      <Tab.Screen name="Products" options={{ title: "Products" }}>
        {() => (
          <Suspense fallback={<LoadingScreen />}>
            <VendorProducts />
          </Suspense>
        )}
      </Tab.Screen>

      <Tab.Screen name="Profile" options={{ title: "Profile" }}>
        {() => (
          <Suspense fallback={<LoadingScreen />}>
            <VendorProfile />
          </Suspense>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
});
