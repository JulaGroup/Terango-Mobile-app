import { SecureStorage } from "@/utils/secureStorage";
import { Platform } from "react-native";

export const debugAuthState = async () => {
  try {
    console.log(`🔍 Auth Debug State (${Platform.OS}):`);

    // Test SecureStorage availability first
    const isSecureStoreAvailable = await SecureStorage.isAvailable();
    console.log(
      `  - SecureStore Available: ${
        isSecureStoreAvailable ? "✅ Yes" : "❌ No"
      }`
    );

    const token = await SecureStorage.getItem("token");
    const userId = await SecureStorage.getItem("userId");
    const isLoggedIn = await SecureStorage.getItem("isLoggedIn");
    const userPhone = await SecureStorage.getItem("userPhone");
    const userData = await SecureStorage.getItem("userData");

    console.log("  - Token:", token ? "✅ Present" : "❌ Missing");
    console.log("  - UserId:", userId || "❌ Missing");
    console.log("  - IsLoggedIn:", isLoggedIn || "❌ Missing");
    console.log("  - UserPhone:", userPhone || "❌ Missing");
    console.log("  - UserData:", userData ? "✅ Present" : "❌ Missing");

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

    return { token, userId, isLoggedIn, userPhone, userData };
  } catch (error) {
    console.error(`❌ Error checking auth state on ${Platform.OS}:`, error);
    return null;
  }
};

export const testStorageCompatibility = async () => {
  console.log(`🔧 Testing Storage Compatibility (${Platform.OS}):`);

  const testKey = "test_compatibility";
  const testValue = "test_value_123";

  try {
    // Test write operation
    await SecureStorage.setItem(testKey, testValue);
    console.log("  - Write test: ✅ Success");

    // Test read operation
    const retrievedValue = await SecureStorage.getItem(testKey);
    const readSuccess = retrievedValue === testValue;
    console.log(`  - Read test: ${readSuccess ? "✅ Success" : "❌ Failed"}`);

    if (!readSuccess) {
      console.log(`    Expected: "${testValue}", Got: "${retrievedValue}"`);
    }

    // Test delete operation
    await SecureStorage.deleteItem(testKey);
    const afterDelete = await SecureStorage.getItem(testKey);
    const deleteSuccess = afterDelete === null;
    console.log(
      `  - Delete test: ${deleteSuccess ? "✅ Success" : "❌ Failed"}`
    );

    return readSuccess && deleteSuccess;
  } catch (error) {
    console.log(`  - Storage test failed: ❌ ${error}`);
    return false;
  }
};
