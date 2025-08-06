import { PrimaryColor } from "@/constants/Colors";
import { stores } from "@/constants/fakeData";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.7;

const StoresNearYou = () => {
  const router = useRouter();

  return (
    <View style={{ paddingVertical: 20 }}>
      {/* Section Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          marginBottom: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              backgroundColor: "#8E44AD",
              borderRadius: 8,
              padding: 8,
              marginRight: 12,
            }}
          >
            <Ionicons name="storefront" size={20} color="#fff" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Stores Near You
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#666",
                marginTop: 2,
              }}
            >
              Everything you need
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#f0f0f0",
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: PrimaryColor,
              fontWeight: "600",
              marginRight: 4,
            }}
          >
            View All
          </Text>
          <Ionicons name="chevron-forward" size={12} color={PrimaryColor} />
        </TouchableOpacity>
      </View>

      {/* Stores Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
        }}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 16}
        snapToAlignment="start"
      >
        {stores.slice(0, 8).map((store, index) => (
          <TouchableOpacity
            key={store.id}
            style={{
              width: CARD_WIDTH,
              backgroundColor: "#fff",
              borderRadius: 16,
              marginRight: index === stores.length - 1 ? 0 : 16,
              elevation: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.18,
              shadowRadius: 10,
              overflow: "hidden",
              // Additional shadow for better distinction
              borderWidth: 0.5,
              borderColor: "rgba(0, 0, 0, 0.05)",
            }}
            activeOpacity={0.9}
            onPress={() => {
              // TODO: Navigate to store details
              console.log("Navigate to store:", store.id);
            }}
          >
            {/* Store Image Placeholder */}
            <View
              style={{
                height: 120,
                backgroundColor: "#f8f8f8",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
              }}
            >
              <Ionicons name="storefront-outline" size={36} color="#ccc" />

              {/* Rating Badge */}
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: "600",
                    marginLeft: 2,
                  }}
                >
                  {store.rating}
                </Text>
              </View>
            </View>

            {/* Store Info */}
            <View style={{ padding: 16 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#333",
                  marginBottom: 4,
                }}
                numberOfLines={1}
              >
                {store.name}
              </Text>

              <Text
                style={{
                  fontSize: 12,
                  color: "#666",
                  marginBottom: 8,
                  lineHeight: 16,
                }}
                numberOfLines={2}
              >
                {store.description}
              </Text>

              {/* Categories */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                {store.categories.map((category, catIndex) => (
                  <View
                    key={catIndex}
                    style={{
                      backgroundColor: "#f0f0f0",
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      marginRight: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#666",
                        fontWeight: "500",
                      }}
                    >
                      {category}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              {/* Footer Info */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#666",
                      marginLeft: 4,
                    }}
                  >
                    {store.openingHours.split(" - ")[0]}
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 12,
                    color: "#666",
                  }}
                >
                  {store.reviewsCount} reviews
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default StoresNearYou;
