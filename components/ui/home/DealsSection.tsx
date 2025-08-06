import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { dealsData } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";

const { width } = Dimensions.get("window");
const DEAL_CARD_WIDTH = width * 0.75;

export default function DealsSection() {
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
              backgroundColor: "#E74C3C",
              borderRadius: 8,
              padding: 8,
              marginRight: 12,
            }}
          >
            <Ionicons name="flash" size={20} color="#fff" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Hot Deals
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#666",
                marginTop: 2,
              }}
            >
              Limited time offers
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

      {/* Deals Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
        }}
        decelerationRate="fast"
        snapToInterval={DEAL_CARD_WIDTH + 16}
        snapToAlignment="start"
      >
        {dealsData.map((deal, index) => (
          <TouchableOpacity
            key={deal.id}
            style={{
              width: DEAL_CARD_WIDTH,
              height: 140,
              marginRight: index === dealsData.length - 1 ? 0 : 16,
              borderRadius: 16,
              overflow: "hidden",
              elevation: 6,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              backgroundColor: deal.backgroundColor,
            }}
            activeOpacity={0.9}
          >
            <View
              style={{
                flex: 1,
                padding: 20,
                justifyContent: "space-between",
              }}
            >
              <View>
                <View
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    alignSelf: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    {deal.discount}
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#fff",
                    marginBottom: 4,
                    lineHeight: 22,
                  }}
                >
                  {deal.title}
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    color: "#fff",
                    opacity: 0.9,
                    lineHeight: 18,
                  }}
                >
                  {deal.subtitle}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: "600",
                    marginRight: 4,
                  }}
                >
                  Shop Now
                </Text>
                <Ionicons name="arrow-forward" size={12} color="#fff" />
              </View>
            </View>

            {/* Decorative circles */}
            <View
              style={{
                position: "absolute",
                right: -30,
                top: -30,
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
              }}
            />
            <View
              style={{
                position: "absolute",
                right: 10,
                bottom: -20,
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "rgba(255, 255, 255, 0.12)",
              }}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
