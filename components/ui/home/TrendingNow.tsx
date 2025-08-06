import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard from "./ProductCard";
import { trendingNowProducts } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";

export default function TrendingNow() {
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
              backgroundColor: "#E74C3C",
              borderRadius: 8,
              padding: 8,
              marginRight: 12,
            }}
          >
            <Ionicons name="trending-up" size={20} color="#fff" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Trending Now
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#666",
                marginTop: 2,
              }}
            >
              What&apos;s hot in The Gambia
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => console.log("View all trending items")}
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
          backgroundColor: "#FFEBEE",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          borderLeftWidth: 4,
          borderLeftColor: "#E74C3C",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="flame" size={20} color="#E74C3C" />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#E74C3C",
              marginLeft: 8,
            }}
          >
            Hot Right Now
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: "#C62828",
            marginTop: 4,
            lineHeight: 16,
          }}
        >
          Most popular items trending across The Gambia this week
        </Text>
      </View>

      {/* Products Horizontal Slider */}
      <FlatList
        data={trendingNowProducts}
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
