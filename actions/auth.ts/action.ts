import axios from "axios";
import { API_URL } from "@/constants/config"; // if you store it separately
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
export const loginUser = async ({ phone }: { phone: string }) => {
  if (phone.length < 7) {
    alert("Enter a valid phone number");
    return;
  }
  try {
    const res = await axios.post(`${API_URL}/auth/send-otp`, {
      phone: `+220${phone}`,
    });
    console.log(res);
    if (res.status === 200) {
      await AsyncStorage.setItem("userPhone", `+220${phone}`); // save for next screen
      router.push("/auth/otp");
    } else {
      alert("Something went wrong. Please try again.");
    }
  } catch (err: any) {
    console.log(err);
    await AsyncStorage.setItem("userPhone", `+220${phone}`); // save for next screen

    router.push("/auth/otp");
    // alert(err.response?.data?.message || "Failed to send OTP.");
  }
};

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

    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("userPhone", phone);
    await AsyncStorage.setItem("isLoggedIn", "true");

    // Decode token to get userId
    const decoded: any = jwtDecode(token);
    const userId = decoded.userId;
    await AsyncStorage.setItem("userId", userId);

    return isNewUser;
  } catch (err: any) {
    console.error(err);
    throw new Error(err.response?.data?.message || "Invalid OTP");
  }
};
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
    const token = await AsyncStorage.getItem("token");

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
    console.error(err.response?.data || err.message);
    throw new Error(
      err.response?.data?.message || "Failed to complete profile"
    );
  }
};
