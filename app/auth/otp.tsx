import { verifyOtp } from "@/actions/auth.ts/action";
import BackButton from "@/components/common/BackButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OTPInputView from "@twotalltotems/react-native-otp-input";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function OTP() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleVerify = async () => {
    if (loading) return;
    setLoading(true);
    if (code.length !== 4) {
      alert("Please enter full OTP");
      return;
    }

    const phone = await AsyncStorage.getItem("userPhone");
    if (!phone) return alert("Missing phone number");

    try {
      const isNewUser = await verifyOtp({ phone: phone, otp: code });
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

        <OTPInputView
          pinCount={4}
          code={code}
          onCodeChanged={setCode}
          autoFocusOnLoad
          codeInputFieldStyle={styles.otpInput}
          style={{ width: "80%", height: 100, alignSelf: "center" }}
        />

        <TouchableOpacity
          disabled={loading}
          style={styles.button}
          onPress={handleVerify}
        >
          {loading ? (
            <Text style={styles.buttonText}>Loading...</Text>
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingTop: 80,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // Remove paddingTop so it doesn't push content down
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
