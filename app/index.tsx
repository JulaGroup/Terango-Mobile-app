import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";

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
          console.log("User is logged in, redirecting to main tabs");
          router.replace("/(tabs)");
        } else {
          console.log("User not logged in, allow browsing");
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
  );
}
