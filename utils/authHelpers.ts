// Authentication helper utilities
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    const userData = await AsyncStorage.getItem("userData");
    if (!userData) return null;

    return JSON.parse(userData);
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

export const isLoggedIn = async (): Promise<boolean> => {
  try {
    const loggedIn = await AsyncStorage.getItem("isLoggedIn");
    const token = await AsyncStorage.getItem("token");
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
    await AsyncStorage.multiRemove([
      "isLoggedIn",
      "userData",
      "userId",
      "token",
      "refreshToken",
    ]);
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

  await AsyncStorage.multiSet([
    ["isLoggedIn", "true"],
    ["userData", JSON.stringify(testUser)],
    ["userId", testUser.id],
    ["token", "test-token-" + role.toLowerCase()],
  ]);

  console.log(`Test ${role} user set successfully`);
};
