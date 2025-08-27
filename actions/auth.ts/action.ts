import axios from "axios";
import { API_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";

const safeSetItem = async (key: string, value: string) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.log(`AsyncStorage setItem error (${key}):`, e);
  }
};

export const safeGetItem = async (key: string) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.log(`AsyncStorage getItem error (${key}):`, e);
    return null;
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
    router.push("/auth/otp");
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
