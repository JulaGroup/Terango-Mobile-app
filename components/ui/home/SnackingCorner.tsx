import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard from "./ProductCard";
import { snackingCornerProducts } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";

export default function SnackingCorner() {
  const handleAddToCart = (productId: number) => {
    console.log("Added to cart:", productId);
    // TODO: Implement cart functionality
  };

  const handleRemoveFromCart = (productId: number) => {
    console.log("Removed from cart:", productId);
    // TODO: Implement cart functionality
  };

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
              backgroundColor: PrimaryColor,
              borderRadius: 8,
              padding: 8,
              marginRight: 12,
            }}
          >
            <Ionicons name="fast-food" size={20} color="#fff" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Snacking Corner
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#666",
                marginTop: 2,
              }}
            >
              Quick bites & beverages
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

      {/* Products Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingRight: 32,
        }}
      >
        {snackingCornerProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
            onRemoveFromCart={handleRemoveFromCart}
            compact={true}
          />
        ))}
      </ScrollView>
    </View>
  );
}
