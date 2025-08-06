import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { popularStoresData } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";

const { width } = Dimensions.get("window");
const STORE_CARD_WIDTH = width * 0.8;

export default function PopularStores() {
  return (
    <View style={{ paddingVertical: 20, paddingBottom: 40 }}>
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
              Popular Stores
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#666",
                marginTop: 2,
              }}
            >
              Top-rated nearby stores
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
        snapToInterval={STORE_CARD_WIDTH + 16}
        snapToAlignment="start"
      >
        {popularStoresData.map((store, index) => (
          <TouchableOpacity
            key={store.id}
            style={{
              width: STORE_CARD_WIDTH,
              backgroundColor: "#fff",
              borderRadius: 16,
              marginRight: index === popularStoresData.length - 1 ? 0 : 16,
              elevation: 6,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              overflow: "hidden",
            }}
            activeOpacity={0.9}
          >
            {/* Store Image Placeholder */}
            <View
              style={{
                height: 120,
                backgroundColor: "#f8f8f8",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="storefront-outline" size={40} color="#ccc" />
            </View>

            {/* Store Info */}
            <View style={{ padding: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#333",
                    flex: 1,
                    marginRight: 8,
                  }}
                  numberOfLines={1}
                >
                  {store.name}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#E8F5E8",
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Ionicons name="star" size={12} color="#27AE60" />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#27AE60",
                      marginLeft: 2,
                    }}
                  >
                    {store.rating}
                  </Text>
                </View>
              </View>

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

              {/* Delivery Info */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
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
                    {store.deliveryTime}
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 12,
                    color: store.deliveryFee.includes("Free")
                      ? "#27AE60"
                      : "#666",
                    fontWeight: "500",
                  }}
                >
                  {store.deliveryFee}
                </Text>
              </View>

              {/* Discount Banner */}
              {store.discount && (
                <View
                  style={{
                    backgroundColor: "#FFF3E0",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: PrimaryColor,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="pricetag" size={12} color={PrimaryColor} />
                    <Text
                      style={{
                        fontSize: 12,
                        color: PrimaryColor,
                        fontWeight: "600",
                        marginLeft: 4,
                      }}
                    >
                      {store.discount}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
