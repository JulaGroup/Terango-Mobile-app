import React, { useEffect, useState } from "react";
import { StatusBar, View, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function VendorManagementLayout() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkVendorAuth = async () => {
      try {
        // Check if user is logged in
        const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");
        const userData = await AsyncStorage.getItem("userData");

        if (!isLoggedIn || !userData) {
          // Not logged in, redirect to auth
          router.replace("/auth");
          return;
        }

        // Check if user is a vendor
        const parsedUser = JSON.parse(userData);
        if (parsedUser?.role !== "VENDOR") {
          // Not a vendor, redirect to main tabs
          router.replace("/(tabs)");
          return;
        }

        // User is authenticated and is a vendor
        setIsAuthorized(true);
      } catch (error) {
        console.error("Vendor auth check error:", error);
        // On error, redirect to auth
        router.replace("/auth");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkVendorAuth();
  }, []);

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // Only render the stack if user is authorized
  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#f8fafc" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="shops" />
        <Stack.Screen name="restaurants" />
        <Stack.Screen name="pharmacies" />
        <Stack.Screen name="orders" />
        <Stack.Screen name="analytics" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}
