// app/complete-profile.tsx
import { completeProfile } from "@/actions/auth.ts/action";
import { PrimaryColor } from "@/constants/Colors";
import { SecureStorage } from "@/utils/secureStorage";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserCacheManager } from "@/utils/userCache";
import TermsModal from "@/components/modals/TermsModal";

export default function CompleteProfile() {
  const [name, setName] = useState("");
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
      const accepted = await SecureStorage.getItem("termsAccepted");
      if (accepted === "true") {
        setTermsAccepted(true);
      } else {
        setShowTermsModal(true);
      }
    } catch (error) {
      console.error("Error checking terms acceptance:", error);
      setShowTermsModal(true);
    }
  };

  const handleTermsAccept = async () => {
    try {
      await SecureStorage.setItem("termsAccepted", "true");
      setTermsAccepted(true);
      setShowTermsModal(false);
    } catch (error) {
      console.error("Error saving terms acceptance:", error);
    }
  };

  const handleTermsDecline = () => {
    Alert.alert(
      "Terms Required",
      "You must accept the Terms and Conditions to use TeranGO.",
      [
        {
          text: "Review Again",
          onPress: () => setShowTermsModal(true),
        },
        {
          text: "Exit",
          style: "destructive",
          onPress: () => router.replace("/auth"),
        },
      ],
    );
  };

  const handleComplete = async () => {
    console.log("Completing profile with:", { name });

    // Check if terms are accepted first
    if (!termsAccepted) {
      Alert.alert(
        "Terms Required",
        "Please accept the Terms and Conditions to continue",
        [{ text: "OK", onPress: () => setShowTermsModal(true) }],
      );
      return;
    }

    if (loading) return;
    setLoading(true);

    if (name) {
      const nameRegex = /^[A-Za-z\s]+$/;
      if (!nameRegex.test(name) || name.length < 2) {
        setLoading(false);
        return alert("Please enter a valid name (minimum 2 characters)");
      }

      try {
        const userId = await SecureStorage.getItem("userId");
        if (!userId) throw new Error("User ID not found");

        await completeProfile({ userId, name });

        // Cache the user data immediately after profile completion
        await UserCacheManager.cacheUserData({
          fullName: name,
          phone: "", // Will be updated when user adds phone
          isVerified: false, // New profiles start unverified
        });

        await SecureStorage.setItem("isLoggedIn", "true");

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
      alert("Please enter your full name");
    }
  };

  const canContinue = name.trim().length >= 2;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Two steps follow verification — name, then address. Saying so up
              front stops the second one feeling like the app moving the goal
              posts. */}
          <View style={styles.stepRow}>
            <View style={styles.stepDotActive} />
            <View style={styles.stepDot} />
            <Text style={styles.stepText}>Step 1 of 2</Text>
          </View>

          <View style={styles.hero}>
            <View style={styles.markWrap}>
              <Text style={styles.mark}>
                Teran<Text style={styles.markAccent}>GO</Text>
              </Text>
            </View>

            <Text style={styles.title}>Welcome aboard</Text>
            {/* Says why the field exists. A bare "Full Name" on a stranger's
                first screen asks for personal data with no reason given. */}
            <Text style={styles.subtitle}>
              What should we call you? Your name is what vendors and riders see
              when they bring your order.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="e.g. Muhammed Darboe"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleComplete}
              />
            </View>
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            disabled={loading}
            style={[
              styles.button,
              (!canContinue || loading) && styles.buttonDisabled,
            ]}
            onPress={handleComplete}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* The terms line is permanent rather than appearing only after
              acceptance — someone deciding whether to accept is exactly who
              needs the link. */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setShowTermsModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={termsAccepted ? "checkmark-circle" : "information-circle-outline"}
              size={15}
              color={termsAccepted ? "#10B981" : "#9CA3AF"}
            />
            <Text style={styles.termsText}>
              {termsAccepted
                ? "You've accepted our Terms & Privacy Policy"
                : "Read our Terms & Privacy Policy"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms and Conditions Modal */}
      <TermsModal
        visible={showTermsModal}
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },

  stepRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepDotActive: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: PrimaryColor,
  },
  stepDot: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
  },
  stepText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },

  hero: { marginTop: 36 },
  markWrap: { marginBottom: 20 },
  mark: { fontSize: 22, fontWeight: "800", color: "#1A3C34" },
  markAccent: { color: PrimaryColor, fontWeight: "800" },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    marginTop: 10,
  },

  field: { marginTop: 32 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#111827",
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PrimaryColor,
    borderRadius: 14,
    paddingVertical: 17,
    marginTop: 24,
  },
  buttonDisabled: { backgroundColor: "#E5E7EB" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  termsText: { fontSize: 12.5, color: "#9CA3AF" },
});
