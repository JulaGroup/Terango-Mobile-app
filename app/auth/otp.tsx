import { verifyOtp } from "@/actions/auth.ts/action";
import BackButton from "@/components/common/BackButton";
import * as SecureStore from "expo-secure-store";
import OTPTextInput from "react-native-otp-textinput";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function OTP() {
  const otpInput = useRef<OTPTextInput>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerify = async () => {
    if (loading) return;
    setLoading(true);
    if (code.length !== 4) {
      alert("Please enter full OTP");
      setLoading(false);
      return;
    }

    const phone = await SecureStore.getItemAsync("userPhone");
    if (!phone) {
      alert("Missing phone number");
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
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <BackButton />
      <View style={styles.centerContent}>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>We sent a code to your phone number</Text>

        <OTPTextInput
          ref={otpInput}
          handleTextChange={setCode}
          inputCount={4}
          containerStyle={{ width: "80%", alignSelf: "center" }}
          textInputStyle={styles.otpInput}
          keyboardType="numeric"
          autoFocus
        />

        <TouchableOpacity
          disabled={loading}
          style={styles.button}
          onPress={handleVerify}
        >
          <Text style={styles.buttonText}>
            {loading ? "Loading..." : "Verify"}
          </Text>
        </TouchableOpacity>
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
    marginBottom: 40,
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
  button: {
    backgroundColor: "#F97316",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    width: 200,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});
