import axios from "axios";
import { API_URL } from "@/constants/config";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { registerForPushNotificationsAsync } from "@/utils/NotificationService";
import { SecureStorage } from "@/utils/secureStorage";

// Enhanced SecureStore operations using our custom utility
const safeSetItem = async (key: string, value: string) => {
  try {
    await SecureStorage.setItem(key, value);
  } catch (error) {
    console.error(`Failed to store ${key}:`, error);
    throw error;
  }
};

export const safeGetItem = async (key: string) => {
  try {
    return await SecureStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to get ${key}:`, error);
    return null;
  }
};

const safeDeleteItem = async (key: string) => {
  try {
    await SecureStorage.deleteItem(key);
  } catch (error) {
    console.error(`Failed to delete ${key}:`, error);
  }
};

// Login user and send OTP
export const loginUser = async ({ phone }: { phone: string }) => {
  if (phone.length < 7) {
    alert("Enter a valid phone number");
    return;
  }

  try {
    const res = await axios.post(`${API_URL}/auth/send-otp`, {
      phone: `+220${phone}`,
    });

    if (res.status === 200) {
      await safeSetItem("userPhone", `+220${phone}`);
      router.push("/auth/otp");
    } else {
      alert("Something went wrong. Please try again.");
    }
  } catch (err: any) {
    console.log("Login error:", err);
    await safeSetItem("userPhone", `+220${phone}`);
    router.replace("/auth/otp");
  }
};

// Verify OTP
export const verifyOtp = async ({
  phone,
  otp,
}: {
  phone: string;
  otp: string;
}) => {
  try {
    const res = await axios.post(`${API_URL}/auth/verify-otp`, {
      phone,
      code: otp,
    });

    const { token, isNewUser } = res.data;

    await safeSetItem("token", token);
    await safeSetItem("userPhone", phone);
    await safeSetItem("isLoggedIn", "true");

    // Decode token to get userId
    const decoded: any = jwtDecode(token);
    const userId = decoded.userId;
    await safeSetItem("userId", userId);

    // Register push token with backend when user verifies
    registerForPushNotificationsAsync().catch(() => {});

    return isNewUser;
  } catch (err: any) {
    console.error("OTP verification error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Invalid OTP");
  }
};

// Complete profile
export const completeProfile = async ({
  userId,
  name,
  email,
}: {
  userId: string;
  name: string;
  email: string;
}) => {
  try {
    const token = await safeGetItem("token");

    const res = await axios.post(
      `${API_URL}/api/users/${userId}/profile`,
      { name, email },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res.data;
  } catch (err: any) {
    console.error("Complete profile error:", err.response?.data || err.message);
    throw new Error(
      err.response?.data?.message || "Failed to complete profile"
    );
  }
};
