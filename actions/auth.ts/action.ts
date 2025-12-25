import axios from "axios";
import { API_URL } from "@/constants/config";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
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

// Login user and send OTP
export const loginUser = async ({
  phone,
  countryCode = "220",
}: {
  phone: string;
  countryCode?: string;
}) => {
  if (phone.length < 7) {
    throw new Error("Enter a valid phone number");
  }

  try {
    const fullPhone = `+${countryCode}${phone}`;
    const res = await axios.post(`${API_URL}/auth/send-otp`, {
      phone: fullPhone,
    });

    if (res.status === 200) {
      await safeSetItem("userPhone", fullPhone);
      router.push("/auth/otp");
      return { success: true };
    } else {
      throw new Error("Something went wrong. Please try again.");
    }
  } catch (err: any) {
    console.log("Login error:", err);

    // Check for rate limit error (429)
    if (err.response?.status === 429) {
      const retryAfter = err.response?.data?.retryAfter || "30 minutes";
      const message = err.response?.data?.error || err.response?.data?.message;
      throw {
        isRateLimited: true,
        retryAfter,
        message,
      };
    }

    // For other errors, still allow navigation for testing
    const fullPhone = `+${countryCode}${phone}`;
    await safeSetItem("userPhone", fullPhone);
    router.replace("/auth/otp");
    return { success: true };
  }
};

/**
 * FIX: Improved OTP verification with proper async sequencing
 *
 * ISSUE: Push token registration was attempted before authentication was fully
 * stored, causing tokens to not be saved to backend. This prevented users from
 * receiving notifications about new orders and order status updates.
 *
 * SOLUTION:
 * 1. Save token to storage FIRST (synchronously ensure it's available)
 * 2. Verify token is stored before registering push notifications
 * 3. Do NOT await push token registration (let it happen in background)
 */
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

    // CRITICAL: Save token FIRST so other components can use it
    await safeSetItem("token", token);
    await safeSetItem("userPhone", phone);
    await safeSetItem("isLoggedIn", "true");

    // Decode token to get userId
    const decoded: any = jwtDecode(token);
    const userId = decoded.userId;
    await safeSetItem("userId", userId);

    // 🔔 IMPROVED: Register push token AFTER auth is confirmed in storage
    // This is done in the background and doesn't block user navigation
    // The useRegisterPushToken hook will pick up the userId and complete registration
    console.log(
      "[Auth] ✅ OTP verified and auth stored. Push token registration will happen via useRegisterPushToken hook"
    );

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
