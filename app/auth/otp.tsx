import { verifyOtp, safeGetItem } from "@/actions/auth.ts/action";
import BackButton from "@/components/common/BackButton";
import OTPTextInput from "react-native-otp-textinput";
import { useRouter } from "expo-router";
import React, { useRef, useState, useEffect } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Clipboard,
  Platform,
} from "react-native";
import * as ExpoClipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";

export default function OTP() {
  const otpInput = useRef<OTPTextInput>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<string | null>(null);
  const router = useRouter();

  // Loader animations
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  // Start animations when loading
  useEffect(() => {
    if (loading) {
      // Spinning animation
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ).start();

      // Pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [loading]);

  // Auto-detect clipboard paste for OTP
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const clipboardContent = await ExpoClipboard.getStringAsync();
        // Check if clipboard contains 4 digits
        if (clipboardContent && /^\d{4}$/.test(clipboardContent.trim())) {
          setCode(clipboardContent.trim());
          // Auto-fill the OTP input
          if (otpInput.current) {
            otpInput.current.setValue(clipboardContent.trim());
          }
        }
      } catch (error) {
        console.log("Clipboard check error:", error);
      }
    };

    // Check clipboard when component mounts
    checkClipboard();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleVerify = async () => {
    // clear previous error before attempting
    setErrorMsg(null);
    setRetryAfter(null);

    if (loading) return;
    setLoading(true);
    if (code.length !== 4) {
      setErrorMsg("Please enter all 4 digits");
      setLoading(false);
      return;
    }

    const phone = await safeGetItem("userPhone");
    if (!phone) {
      setErrorMsg(
        "Missing phone number. Please go back and enter your phone number again.",
      );
      setLoading(false);
      return;
    }

    try {
      const isNewUser = await verifyOtp({ phone, otp: code });
      if (isNewUser === true) {
        router.replace("/auth/complete-profile");
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      // show nicer UI messages for rate limit and others
      const data = err.response?.data;
      if (data?.retryAfter) {
        setRetryAfter(data.retryAfter);
      }
      setErrorMsg(data?.error || err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // when OTP code reaches 4 digits, auto-submit
  useEffect(() => {
    if (code.length === 4 && !loading) {
      handleVerify();
    }
  }, [code, loading]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <BackButton />
      <View style={styles.centerContent}>
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>We sent a 4-digit code via WhatsApp</Text>
        <Text style={styles.timerText}>Code expires in 15 minutes</Text>

        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
        {retryAfter && (
          <Text style={styles.retryText}>Try again after {retryAfter}</Text>
        )}

        <OTPTextInput
          ref={otpInput}
          handleTextChange={setCode}
          inputCount={4}
          containerStyle={{ width: "80%", alignSelf: "center" }}
          textInputStyle={styles.otpInput}
          keyboardType="numeric"
          autoFocus
        />

        {loading && (
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.spinner,
                { transform: [{ rotate: spin }, { scale: pulseValue }] },
              ]}
            >
              <Ionicons name="sync" size={22} color="#F97316" />
            </Animated.View>
            <Text style={styles.verifyingText}>Verifying...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    color: "#111827",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  timerText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 32,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  retryText: {
    color: "#F59E0B",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  otpInput: {
    width: 50,
    height: 55,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    fontSize: 20,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  verifyingText: {
    color: "#F97316",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 24,
  },
  spinner: {
    width: 20,
    height: 20,
  },
});
