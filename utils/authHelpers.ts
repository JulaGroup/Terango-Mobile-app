// Authentication helper utilities
import * as SecureStore from "expo-secure-store";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "USER" | "VENDOR" | "ADMIN";
  isVerified: boolean;
  avatarUrl?: string;
}

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userData = await SecureStore.getItemAsync("userData");
    if (!userData) return null;

    return JSON.parse(userData);
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

export const isLoggedIn = async (): Promise<boolean> => {
  try {
    const loggedIn = await SecureStore.getItemAsync("isLoggedIn");
    const token = await SecureStore.getItemAsync("token");
    return loggedIn === "true" && !!token;
  } catch (error) {
    console.error("Error checking login status:", error);
    return false;
  }
};

export const isVendor = async (): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    return user?.role === "VENDOR";
  } catch (error) {
    console.error("Error checking vendor status:", error);
    return false;
  }
};

export const clearAuthData = async (): Promise<void> => {
  try {
    try {
      await SecureStore.deleteItemAsync("userData");
      await SecureStore.deleteItemAsync("isLoggedIn");
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("userId");
      await SecureStore.deleteItemAsync("userPhone");
    } catch (e) {
      console.log("SecureStore clear failed, falling back to AsyncStorage:", e);
      // @ts-ignore
      const AS = (await import("@react-native-async-storage/async-storage"))
        .default;
      await AS.multiRemove([
        "userData",
        "isLoggedIn",
        "token",
        "userId",
        "userPhone",
      ]);
    }
    console.log("Auth data cleared successfully");
  } catch (error) {
    console.error("Error clearing auth data:", error);
  }
};

// Development helper to test different user states
export const setTestUser = async (role: "USER" | "VENDOR" | "ADMIN") => {
  const testUser: User = {
    id: "test-" + role.toLowerCase(),
    fullName: `Test ${role}`,
    email: `test${role.toLowerCase()}@terango.com`,
    phone: "+2203000000",
    role,
    isVerified: true,
    avatarUrl: "https://via.placeholder.com/100",
  };

  try {
    const token = `test-token-${role.toLowerCase()}`;
    await SecureStore.setItemAsync("userData", JSON.stringify(testUser));
    await SecureStore.setItemAsync("isLoggedIn", "true");
    await SecureStore.setItemAsync("token", token);
    await SecureStore.setItemAsync("userId", testUser.id);
    await SecureStore.setItemAsync("userPhone", testUser.phone);
  } catch (e) {
    console.log("SecureStore set failed, falling back to AsyncStorage:", e);
    // @ts-ignore
    const AS = (await import("@react-native-async-storage/async-storage"))
      .default;
    await AS.multiSet([
      ["userData", JSON.stringify(testUser)],
      ["isLoggedIn", "true"],
      ["token", `test-token-${role.toLowerCase()}`],
      ["userId", testUser.id],
      ["userPhone", testUser.phone],
    ]);
  }

  console.log(`Test ${role} user set successfully`);
};
