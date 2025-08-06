import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";

interface AdBannerProps {
  title: string;
  buttonText: string;
  backgroundColor?: string;
  onPress: () => void;
}

export default function AdBanner({
  title,
  buttonText,
  backgroundColor = PrimaryColor,
  onPress,
}: AdBannerProps) {
  const handlePress = () => {
    Alert.alert(
      "Coming Soon",
      `${title} feature is coming soon! Stay tuned for exciting updates.`,
      [{ text: "OK", style: "default" }]
    );
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
      <TouchableOpacity
        style={{
          width: "100%",
          height: 80,
          backgroundColor: backgroundColor,
          borderRadius: 12,
          overflow: "hidden",
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#fff",
                marginBottom: 4,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#fff",
                opacity: 0.9,
              }}
            >
              Tap to explore amazing offers
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 14,
                fontWeight: "600",
                marginRight: 6,
              }}
            >
              {buttonText}
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </View>
        </View>

        {/* Decorative elements */}
        <View
          style={{
            position: "absolute",
            right: -20,
            top: -20,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          }}
        />
        <View
          style={{
            position: "absolute",
            right: 20,
            bottom: -10,
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: "rgba(255, 255, 255, 0.15)",
          }}
        />
      </TouchableOpacity>
    </View>
  );
}
