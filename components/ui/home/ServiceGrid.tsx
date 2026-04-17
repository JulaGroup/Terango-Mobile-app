import React from "react";
import { Dimensions, Alert, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";

const { width } = Dimensions.get("window");
const COL = 5;
const CARD_SIZE = (width - 32 - (COL - 1) * 8) / COL;

export interface ServiceItem {
  id: string;
  label: string;
  image: number;
  route?: string;
  comingSoon?: boolean;
}

const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: "food",
    label: "Food",
    image: require("@/assets/images/food_icon.png"),
    route: "/food",
  },
  {
    id: "mart",
    label: "Mart",
    image: require("@/assets/images/mart_icon.png"),
    route: "/mart",
  },
  {
    id: "express",
    label: "Express",
    image: require("@/assets/images/express_icon.png"),
    route: "/custom-delivery",
    comingSoon: true,
  },
  {
    id: "yobu",
    label: "YoBu",
    image: require("@/assets/images/yobu_icon.png"),
    comingSoon: true,
  },
  {
    id: "shopping",
    label: "KërSpace",
    image: require("@/assets/images/kerrspace_icon (2).png"),
    comingSoon: true,
  },
];

interface ServiceGridProps {
  services?: ServiceItem[];
}

const ServiceCard = ({ item }: { item: ServiceItem }) => {
  const router = useRouter();

  const handlePress = () => {
    if (item.comingSoon) {
      Alert.alert(
        "Coming Soon",
        `${item.label} will be available soon. Stay tuned!`,
      );
      return;
    }
    if (item.route) router.push(item.route as any);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={{ alignItems: "center", width: CARD_SIZE }}
    >
      {/* Card */}
      <View
        style={{
          width: CARD_SIZE - 4,
          height: CARD_SIZE - 4,
          backgroundColor: item.comingSoon ? "#F5F5F5" : "#FFF5EE",
          borderRadius: 14,
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
          borderWidth: 1,
          borderColor: item.comingSoon
            ? "rgba(0,0,0,0.05)"
            : "rgba(255,107,0,0.12)",
        }}
      >
        <Image
          source={item.image}
          style={{
            width: 50,
            height: 50,
            opacity: item.comingSoon ? 0.3 : 1,
          }}
          contentFit="contain"
        />

        {/* Floating pill badge — Grab/Gojek style */}
        {item.comingSoon && (
          <View
            style={{
              position: "absolute",
              top: 7,
              alignSelf: "center",
              backgroundColor: PrimaryColor,
              borderRadius: 20,
              paddingHorizontal: 6,
              paddingVertical: 2.5,
            }}
          >
            <Text
              style={{
                fontSize: 7,
                fontWeight: "700",
                color: "#FFFFFF",
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}
            >
              Soon
            </Text>
          </View>
        )}
      </View>

      {/* Label */}
      <Text
        style={{
          marginTop: 5,
          fontSize: 11,
          fontWeight: "600",
          color: item.comingSoon ? "#C0C0C0" : "#1a1a1a",
          textAlign: "center",
        }}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
};

const ServiceGrid = ({ services = DEFAULT_SERVICES }: ServiceGridProps) => {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 18,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "flex-start",
        }}
      >
        {services.map((item) => (
          <ServiceCard key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
};

export default ServiceGrid;
