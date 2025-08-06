import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard from "./ProductCard";
import { terangoPicksProducts } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";

export default function TerangoPicks() {
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
              backgroundColor: "#FF6B35",
              borderRadius: 8,
              padding: 8,
              marginRight: 12,
            }}
          >
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              TeranGo Picks
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#666",
                marginTop: 2,
              }}
            >
              Curated selections just for you
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => console.log("View all TeranGo picks")}
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
          backgroundColor: "#FFF4E6",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          borderLeftWidth: 4,
          borderLeftColor: "#FF6B35",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="trophy" size={20} color="#FF6B35" />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#FF6B35",
              marginLeft: 8,
            }}
          >
            Editor&apos;s Choice
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: "#E65100",
            marginTop: 4,
            lineHeight: 16,
          }}
        >
          Handpicked products showcasing the best of Gambian culture and quality
        </Text>
      </View>

      {/* Products Horizontal Slider */}
      <FlatList
        data={terangoPicksProducts}
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
