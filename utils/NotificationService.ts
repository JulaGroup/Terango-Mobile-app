import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { API_URL } from "@/constants/config";

export async function registerForPushNotificationsAsync() {
  try {
    if (!Constants.isDevice) return null;

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // Save token locally
    await SecureStore.setItemAsync("expoPushToken", token);

    // Send to backend if logged in
    const jwt = await SecureStore.getItemAsync("token");
    if (jwt) {
      try {
        await fetch(`${API_URL}/api/push-tokens`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ expoPushToken: token }),
        });
      } catch (e) {
        console.log("Failed to register push token on backend:", e);
      }
    }

    return token;
  } catch (e) {
    console.log("Push registration failed:", e);
    return null;
  }
}
