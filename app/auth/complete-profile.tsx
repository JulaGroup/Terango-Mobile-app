// app/complete-profile.tsx
import { completeProfile } from "@/actions/auth.ts/action";
import { PrimaryColor } from "@/constants/Colors";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { UserCacheManager } from "@/utils/userCache";
import TermsModal from "@/components/modals/TermsModal";

export default function CompleteProfile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const router = useRouter();

  // Show terms modal when component mounts (new user signup)
  useEffect(() => {
    // Check if user has already accepted terms
    checkTermsAcceptance();
  }, []);

  const checkTermsAcceptance = async () => {
    try {
      const accepted = await SecureStore.getItemAsync("termsAccepted");
      if (accepted === "true") {
        setTermsAccepted(true);
      } else {
        // Show terms modal for new users
        setTimeout(() => setShowTermsModal(true), 500);
      }
    } catch (error) {
      // If error, show terms modal to be safe
      setTimeout(() => setShowTermsModal(true), 500);
    }
  };

  const handleTermsAccept = async () => {
    try {
      await SecureStore.setItemAsync("termsAccepted", "true");
      setTermsAccepted(true);
      setShowTermsModal(false);
    } catch (error) {
      console.error("Error saving terms acceptance:", error);
    }
  };

  const handleTermsDecline = () => {
    setShowTermsModal(false);
    Alert.alert(
      "Terms Required",
      "You must accept the Terms and Conditions to use TeranGO. Would you like to review them again?",
      [
        {
          text: "Review Terms",
          onPress: () => setShowTermsModal(true),
        },
        {
          text: "Exit",
          style: "destructive",
          onPress: () => router.replace("/auth"),
        },
      ]
    );
  };

  const handleComplete = async () => {
    console.log("Completing profile with:", { name, email });

    // Check if terms are accepted first
    if (!termsAccepted) {
      Alert.alert(
        "Terms Required",
        "Please accept the Terms and Conditions to continue",
        [{ text: "OK", onPress: () => setShowTermsModal(true) }]
      );
      return;
    }

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
        const userId = await SecureStore.getItemAsync("userId");
        if (!userId) throw new Error("User ID not found");

        await completeProfile({ userId, name, email });

        // Cache the user data immediately after profile completion
        await UserCacheManager.cacheUserData({
          fullName: name,
          email: email,
          phone: "", // Will be updated when user adds phone
          isVerified: false, // New profiles start unverified
        });

        await SecureStore.setItemAsync("isLoggedIn", "true");

        console.log("✅ Profile completed and cached successfully");
        // Navigate to add home address onboarding
        router.replace("/auth/add-home-address");
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
        disabled={loading || !termsAccepted}
        style={[
          styles.button,
          (!termsAccepted || loading) && styles.buttonDisabled,
        ]}
        onPress={handleComplete}
      >
        {loading ? (
          <Text style={styles.buttonText}>Loading...</Text>
        ) : (
          <Text style={styles.buttonText}>
            {termsAccepted ? "Finish" : "Accept Terms to Continue"}
          </Text>
        )}
      </TouchableOpacity>

      {termsAccepted && (
        <TouchableOpacity
          style={styles.reviewTermsButton}
          onPress={() => setShowTermsModal(true)}
        >
          <Text style={styles.reviewTermsText}>Review Terms & Privacy</Text>
        </TouchableOpacity>
      )}

      {/* Terms and Conditions Modal */}
      <TermsModal
        visible={showTermsModal}
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
      />
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
  buttonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  reviewTermsButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  reviewTermsText: {
    color: PrimaryColor,
    fontSize: 15,
    fontWeight: "600",
  },
});
