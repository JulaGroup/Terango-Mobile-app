import AsyncStorage from "@react-native-async-storage/async-storage";

export const debugAuthState = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    const userId = await AsyncStorage.getItem("userId");
    const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");
    const userPhone = await AsyncStorage.getItem("userPhone");

    console.log("🔍 Auth Debug State:");
    console.log("  - Token:", token ? "✅ Present" : "❌ Missing");
    console.log("  - UserId:", userId || "❌ Missing");
    console.log("  - IsLoggedIn:", isLoggedIn || "❌ Missing");
    console.log("  - UserPhone:", userPhone || "❌ Missing");

    if (token) {
      try {
        // Try to decode token to check if it's valid
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map(function (c) {
              return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
        );

        const decoded = JSON.parse(jsonPayload);
        console.log("  - Token expires:", new Date(decoded.exp * 1000));
        console.log(
          "  - Token valid:",
          decoded.exp * 1000 > Date.now() ? "✅ Yes" : "❌ Expired"
        );
      } catch {
        console.log("  - Token format:", "❌ Invalid");
      }
    }

    return { token, userId, isLoggedIn, userPhone };
  } catch (error) {
    console.error("Error checking auth state:", error);
    return null;
  }
};
