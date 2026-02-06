import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PrimaryColor } from "@/constants/Colors";

const COOKIE_CONSENT_KEY = "cookie_consent_accepted";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on web
    if (Platform.OS !== "web") return;

    checkCookieConsent();
  }, []);

  const checkCookieConsent = async () => {
    try {
      const consent = await AsyncStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        setVisible(true);
      }
    } catch (error) {
      console.error("Error checking cookie consent:", error);
    }
  };

  const acceptCookies = async () => {
    try {
      await AsyncStorage.setItem(COOKIE_CONSENT_KEY, "true");
      setVisible(false);
    } catch (error) {
      console.error("Error saving cookie consent:", error);
    }
  };

  // Don't render on mobile or if already accepted
  if (Platform.OS !== "web" || !visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.text}>
          We use cookies and local storage to enhance your experience, analyze
          site usage, and provide personalized content. By continuing to use
          TeranGO, you agree to our use of cookies.
        </Text>
        <TouchableOpacity style={styles.button} onPress={acceptCookies}>
          <Text style={styles.buttonText}>Accept & Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "fixed" as any,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    padding: 20,
    zIndex: 9999,
    borderTopWidth: 1,
    borderTopColor: PrimaryColor,
  },
  content: {
    maxWidth: 1200,
    marginHorizontal: "auto" as any,
    flexDirection: "row" as any,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as any,
    gap: 16,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    minWidth: 200,
  },
  button: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
