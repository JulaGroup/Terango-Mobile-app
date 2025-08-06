import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard from "./ProductCard";
import { weeklyDealsProducts } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";

export default function WeeklyDeals() {
  const handleAddToCart = (productId: number) => {
    console.log("Added to cart:", productId);
    // TODO: Implement cart functionality
  };

  const handleRemoveFromCart = (productId: number) => {
    console.log("Removed from cart:", productId);
    // TODO: Implement cart functionality
  };

  const renderProductCard = ({ item }: { item: any }) => (
    <View style={{ marginRight: 16 }}>
      <ProductCard
        product={item}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
        compact={true}
      />
    </View>
  );

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
              backgroundColor: "#9C27B0",
              borderRadius: 8,
              padding: 8,
              marginRight: 12,
            }}
          >
            <Ionicons name="pricetag" size={20} color="#fff" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Weekly Deals
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#666",
                marginTop: 2,
              }}
            >
              Limited time offers
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => console.log("View all weekly deals")}
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: PrimaryColor,
              marginRight: 4,
            }}
          >
            View All
          </Text>
          <Ionicons name="chevron-forward" size={16} color={PrimaryColor} />
        </TouchableOpacity>
      </View>

      {/* Featured Badge */}
      <View
        style={{
          marginHorizontal: 16,
          backgroundColor: "#F3E5F5",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          borderLeftWidth: 4,
          borderLeftColor: "#9C27B0",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="timer" size={20} color="#9C27B0" />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#9C27B0",
              marginLeft: 8,
            }}
          >
            Ends This Week
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: "#7B1FA2",
            marginTop: 4,
            lineHeight: 16,
          }}
        >
          Special discounts on essential items • Limited time only
        </Text>
      </View>

      {/* Products Horizontal Slider */}
      <FlatList
        data={weeklyDealsProducts}
        renderItem={renderProductCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
        }}
        ItemSeparatorComponent={() => <View style={{ width: 0 }} />}
      />
    </View>
  );
}
