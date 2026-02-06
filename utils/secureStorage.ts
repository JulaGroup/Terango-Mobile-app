import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * Enhanced secure storage utility with automatic fallback to AsyncStorage
 * Handles Android SecureStore issues gracefully and uses AsyncStorage on web
 */

interface StorageOptions {
  requireAuthentication?: boolean;
  keychainService?: string;
  sharedPreferencesName?: string;
  encrypt?: boolean;
}

export class SecureStorage {
  private static logError = (operation: string, key: string, error: any) => {
    console.log(
      `SecureStore ${operation} error (${key}) on ${Platform.OS}:`,
      error,
    );
    console.log(`Falling back to AsyncStorage for ${key}`);
  };

  /**
   * Set an item in secure storage with AsyncStorage fallback
   */
  static async setItem(
    key: string,
    value: string,
    options?: StorageOptions,
  ): Promise<void> {
    // Use AsyncStorage directly on web since SecureStore doesn't work
    if (Platform.OS === "web") {
      try {
        await AsyncStorage.setItem(key, value);
        return;
      } catch (error) {
        console.error(`AsyncStorage setItem error (${key}):`, error);
        throw new Error(`Failed to store ${key} on web: ${error}`);
      }
    }

    try {
      await SecureStore.setItemAsync(key, value, options);
    } catch (error) {
      this.logError("setItem", key, error);
      try {
        await AsyncStorage.setItem(key, value);
      } catch (asyncError) {
        console.error(`AsyncStorage setItem error (${key}):`, asyncError);
        throw new Error(
          `Failed to store ${key} on ${Platform.OS}: ${asyncError}`,
        );
      }
    }
  }

  /**
   * Get an item from secure storage with AsyncStorage fallback
   */
  static async getItem(
    key: string,
    options?: StorageOptions,
  ): Promise<string | null> {
    // Use AsyncStorage directly on web since SecureStore doesn't work
    if (Platform.OS === "web") {
      try {
        return await AsyncStorage.getItem(key);
      } catch (error) {
        console.error(`AsyncStorage getItem error (${key}):`, error);
        return null;
      }
    }

    try {
      return await SecureStore.getItemAsync(key, options);
    } catch (error) {
      this.logError("getItem", key, error);
      try {
        return await AsyncStorage.getItem(key);
      } catch (asyncError) {
        console.error(`AsyncStorage getItem error (${key}):`, asyncError);
        return null;
      }
    }
  }

  /**
   * Delete an item from secure storage with AsyncStorage fallback
   */
  static async deleteItem(
    key: string,
    options?: StorageOptions,
  ): Promise<void> {
    // Use AsyncStorage directly on web since SecureStore doesn't work
    if (Platform.OS === "web") {
      try {
        await AsyncStorage.removeItem(key);
        return;
      } catch (error) {
        console.error(`AsyncStorage deleteItem error (${key}):`, error);
        throw new Error(`Failed to delete ${key} on web: ${error}`);
      }
    }

    try {
      await SecureStore.deleteItemAsync(key, options);
    } catch (error) {
      this.logError("deleteItem", key, error);
      try {
        await AsyncStorage.removeItem(key);
      } catch (asyncError) {
        console.error(`AsyncStorage removeItem error (${key}):`, asyncError);
      }
    }
  }

  /**
   * Check if SecureStore is available on the current platform
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // Try a simple operation to test SecureStore availability
      await SecureStore.isAvailableAsync();
      return true;
    } catch (error) {
      console.log("SecureStore not available on this platform:", error);
      return false;
    }
  }

  /**
   * Clear all authentication-related data
   */
  static async clearAuthData(): Promise<void> {
    const authKeys = ["userData", "isLoggedIn", "token", "userId", "userPhone"];

    for (const key of authKeys) {
      await this.deleteItem(key);
    }
  }

  /**
   * Get multiple items at once with fallback
   */
  static async getMultiple(
    keys: string[],
  ): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};

    for (const key of keys) {
      result[key] = await this.getItem(key);
    }

    return result;
  }

  /**
   * Set multiple items at once with fallback
   */
  static async setMultiple(keyValuePairs: [string, string][]): Promise<void> {
    for (const [key, value] of keyValuePairs) {
      await this.setItem(key, value);
    }
  }
}

export default SecureStorage;
