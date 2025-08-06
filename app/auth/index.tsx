import { loginUser } from "@/actions/auth.ts/action";
import { PrimaryColor } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";

import React, { useState } from "react";
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AuthScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) return;
    if (!phone) {
      alert("Please enter your phone number");
      return;
    }
    setLoading(true);
    try {
      await loginUser({ phone });
    } catch (err) {
      alert("Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      <View
        style={{
          marginBottom: 40,
          marginTop: 20,
          borderRadius: 12,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 24,
          elevation: 8,
        }}
      >
        <Image
          source={require("../../assets/images/splash2.png")}
          style={{
            width: 100,
            height: 100,
            resizeMode: "contain",
            alignSelf: "center",
          }}
        />
      </View>
      <Text style={styles.header}>Welcome</Text>
      <Text style={styles.subHeader}>Enter your phone number to continue</Text>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Phone number"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Loading..." : "Continue"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.or}>or</Text>

      <TouchableOpacity style={styles.socialButton}>
        <Ionicons name="logo-google" size={20} color="white" />
        <Text style={styles.socialText}>Continue with Google</Text>
      </TouchableOpacity>

      {Platform.OS === "ios" && (
        <TouchableOpacity style={styles.socialButton}>
          <Ionicons name="logo-apple" size={20} color="white" />
          <Text style={styles.socialText}>Continue with Apple</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 26,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
  },
  subHeader: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 40,
    marginTop: 6,
  },
  inputContainer: {
    gap: 16,
  },
  input: {
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: "#111827",
  },
  button: {
    marginTop: 30,
    backgroundColor: PrimaryColor,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  or: {
    textAlign: "center",
    marginTop: 20,
    color: "#9CA3AF",
  },
  socialButton: {
    marginTop: 16,
    flexDirection: "row",
    backgroundColor: "black",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  socialText: {
    color: "white",
    fontSize: 16,
  },
});
