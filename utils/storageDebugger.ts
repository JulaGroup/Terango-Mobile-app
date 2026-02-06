import { SecureStorage } from "@/utils/secureStorage";
import { SecureStorage } from "@/utils/secureStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * Debug utility to test storage capabilities on different platforms
 */
export class StorageDebugger {
  /**
   * Test all storage methods and report results
   */
  static async runStorageTests(): Promise<void> {
    console.log(`\n=== Storage Debug Test on ${Platform.OS} ===`);

    // Test SecureStore directly
    console.log("\n1. Testing SecureStore directly...");
    try {
      await SecureStorage.setItem("test_secure", "test_value");
      const secureValue = await SecureStorage.getItem("test_secure");
      console.log("✅ SecureStore works:", secureValue === "test_value");
      await SecureStorage.deleteItem("test_secure");
    } catch (error) {
      console.log("❌ SecureStore failed:", error);
    }

    // Test AsyncStorage directly
    console.log("\n2. Testing AsyncStorage directly...");
    try {
      await AsyncStorage.setItem("test_async", "test_value");
      const asyncValue = await AsyncStorage.getItem("test_async");
      console.log("✅ AsyncStorage works:", asyncValue === "test_value");
      await AsyncStorage.removeItem("test_async");
    } catch (error) {
      console.log("❌ AsyncStorage failed:", error);
    }

    // Test our custom SecureStorage utility
    console.log("\n3. Testing custom SecureStorage utility...");
    try {
      await SecureStorage.setItem("test_custom", "test_value");
      const customValue = await SecureStorage.getItem("test_custom");
      console.log(
        "✅ Custom SecureStorage works:",
        customValue === "test_value"
      );
      await SecureStorage.deleteItem("test_custom");
    } catch (error) {
      console.log("❌ Custom SecureStorage failed:", error);
    }

    // Test SecureStore availability
    console.log("\n4. Testing SecureStore availability...");
    const isAvailable = await SecureStorage.isAvailable();
    console.log(`SecureStore availability: ${isAvailable}`);

    console.log("\n=== Storage Debug Test Complete ===\n");
  }

  /**
   * Test authentication storage specifically
   */
  static async testAuthStorage(): Promise<void> {
    console.log(`\n=== Auth Storage Test on ${Platform.OS} ===`);

    const testPhone = "+2201234567";
    const testData = {
      userData: JSON.stringify({ id: "test", phone: testPhone }),
      isLoggedIn: "true",
      token: "test_token",
      userId: "test_user_id",
      userPhone: testPhone,
    };

    try {
      // Set all auth data
      console.log("Setting auth data...");
      for (const [key, value] of Object.entries(testData)) {
        await SecureStorage.setItem(key, value);
      }

      // Retrieve all auth data
      console.log("Retrieving auth data...");
      const retrievedData = await SecureStorage.getMultiple(
        Object.keys(testData)
      );

      let allSuccess = true;
      for (const [key, expectedValue] of Object.entries(testData)) {
        const actualValue = retrievedData[key];
        const success = actualValue === expectedValue;
        console.log(
          `${success ? "✅" : "❌"} ${key}: ${
            success ? "OK" : `Expected "${expectedValue}", got "${actualValue}"`
          }`
        );
        if (!success) allSuccess = false;
      }

      // Clean up
      console.log("Cleaning up...");
      await SecureStorage.clearAuthData();

      console.log(
        `\nAuth storage test: ${allSuccess ? "✅ PASSED" : "❌ FAILED"}`
      );
    } catch (error) {
      console.log("❌ Auth storage test failed:", error);
    }

    console.log("=== Auth Storage Test Complete ===\n");
  }

  /**
   * Log current auth state for debugging
   */
  static async logAuthState(): Promise<void> {
    console.log(`\n=== Current Auth State on ${Platform.OS} ===`);

    const authKeys = ["userData", "isLoggedIn", "token", "userId", "userPhone"];
    const authData = await SecureStorage.getMultiple(authKeys);

    for (const [key, value] of Object.entries(authData)) {
      console.log(`${key}: ${value || "null"}`);
    }

    console.log("=== Auth State Complete ===\n");
  }
}

export default StorageDebugger;
