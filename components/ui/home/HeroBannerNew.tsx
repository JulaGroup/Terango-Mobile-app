import React from "react";
import {
  View,
  Text,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { heroBanners } from "@/constants/fakeData";

const { width } = Dimensions.get("window");
const BANNER_WIDTH = width - 32;
const BANNER_HEIGHT = 160;

export default function HeroBanner() {
  const handleBannerPress = (bannerTitle: string) => {
    Alert.alert(
      "Coming Soon",
      `${bannerTitle} feature is coming soon! We're working hard to bring you the best experience.`,
      [{ text: "OK", style: "default" }]
    );
  };

  return (
    <View style={{ paddingVertical: 20 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        decelerationRate="fast"
        snapToInterval={BANNER_WIDTH + 16}
        snapToAlignment="start"
      >
        {heroBanners.map((banner, index) => (
          <TouchableOpacity
            key={banner.id}
            style={{
              width: BANNER_WIDTH,
              height: BANNER_HEIGHT,
              marginRight: index === heroBanners.length - 1 ? 0 : 16,
              borderRadius: 16,
              overflow: "hidden",
              elevation: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              backgroundColor: banner.backgroundColor,
            }}
            activeOpacity={0.9}
            onPress={() => handleBannerPress(banner.title)}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                paddingHorizontal: 24,
                paddingVertical: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: banner.textColor,
                  marginBottom: 8,
                  lineHeight: 28,
                }}
              >
                {banner.title}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: banner.textColor,
                  opacity: 0.9,
                  lineHeight: 20,
                  marginBottom: 16,
                }}
              >
                {banner.subtitle}
              </Text>

              {/* Action Button */}
              <View
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  alignSelf: "flex-start",
                }}
              >
                <Text
                  style={{
                    color: banner.textColor,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  Coming Soon
                </Text>
              </View>

              {/* Decorative elements */}
              <View
                style={{
                  position: "absolute",
                  right: -20,
                  top: -20,
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  right: 20,
                  bottom: -10,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                }}
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
