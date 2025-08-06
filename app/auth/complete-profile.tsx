// app/complete-profile.tsx
import { completeProfile } from "@/actions/auth.ts/action";
import { PrimaryColor } from "@/constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { UserCacheManager } from "@/utils/userCache";

export default function CompleteProfile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleComplete = async () => {
    console.log("Completing profile with:", { name, email });
    if (loading) return;
    setLoading(true);

    if (name && email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setLoading(false);
        return alert("Please enter a valid email address");
      }

      const nameRegex = /^[A-Za-z\s]+$/;
      if (!nameRegex.test(name) || name.length < 2) {
        setLoading(false);
        return alert("Please enter a valid name");
      }

      try {
        const userId = await AsyncStorage.getItem("userId");
        if (!userId) throw new Error("User ID not found");

        await completeProfile({ userId, name, email });

        // Cache the user data immediately after profile completion
        await UserCacheManager.cacheUserData({
          fullName: name,
          email: email,
          phone: "", // Will be updated when user adds phone
          isVerified: false, // New profiles start unverified
        });

        await AsyncStorage.setItem("isLoggedIn", "true");

        console.log("✅ Profile completed and cached successfully");
        router.replace("/(tabs)");
      } catch (err: any) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
      alert("Please fill all fields");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Text style={styles.title}>Complete Your Profile</Text>
      <TextInput
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholderTextColor="#9CA3AF"
      />
      <TextInput
        placeholder="Email Address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        placeholderTextColor="#9CA3AF"
      />

      <TouchableOpacity
        disabled={loading}
        style={styles.button}
        onPress={handleComplete}
      >
        {loading ? (
          <Text style={styles.buttonText}>Loading...</Text>
        ) : (
          <Text style={styles.buttonText}>Finish</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    color: "#111827",
    marginBottom: 40,
  },
  input: {
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: "#111827",
    marginBottom: 16,
  },
  button: {
    backgroundColor: PrimaryColor,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});
