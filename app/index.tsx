import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { API_URL } from "@/constants/config";

export default function Index() {
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const seen = await AsyncStorage.getItem("hasSeenOnboarding");
        if (!seen) {
          router.replace("/onboarding");
          return;
        }

        const loggedIn = await AsyncStorage.getItem("isLoggedIn");
        if (loggedIn) {
          // Check if user is a vendor
          console.log("User is logged in, checking vendor status...");

          let userData = await AsyncStorage.getItem("userData");
          const userId = await AsyncStorage.getItem("userId");
          const token = await AsyncStorage.getItem("token");

          console.log("Stored userData:", userData);
          console.log("Stored userId:", userId);
          console.log("Stored token:", token ? "exists" : "missing");

          // If we don't have userData but have userId and token, fetch it from API
          if (!userData && userId && token) {
            console.log("No user data found, fetching from API...");
            try {
              const response = await fetch(
                `${API_URL}/api/users/${userId}/profile`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              if (response.ok) {
                const profileData = await response.json();
                console.log("Profile data from API:", profileData);

                // Store the user data for future use
                await AsyncStorage.setItem(
                  "userData",
                  JSON.stringify(profileData.user)
                );
                userData = JSON.stringify(profileData.user);
                console.log("User data stored successfully");
              } else {
                console.log("Failed to fetch profile data:", response.status);
              }
            } catch (error) {
              console.log("Error fetching profile data:", error);
            }
          }

          if (userData) {
            const parsedUser = JSON.parse(userData);
            console.log("Checking user role:", parsedUser?.role);

            // All logged-in users (vendors and customers) go to main tabs
            // Vendors can access vendor-management through the profile tab
            console.log("User is logged in, redirecting to main tabs");
            router.replace("/(tabs)");
          } else {
            console.log("Regular user, redirecting to tabs");
            // Regular users go to tabs
            router.replace("/(tabs)");
          }
        } else {
          console.log(
            "User not logged in, redirecting to home tabs (allow browsing)"
          );
          // Allow users to browse without logging in
          router.replace("/(tabs)");
        }
      } catch (error) {
        console.error("AsyncStorage error:", error);
        router.replace("/auth"); // fallback route
      }
    };

    checkStatus();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  ); // or loading spinner
}
