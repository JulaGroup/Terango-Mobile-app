import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard from "./ProductCard";
import { freshFromFarmProducts } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";

export default function FreshFromFarm() {
  const { addToCart, removeFromCart } = useCart();

  const handleAddToCart = (productId: number) => {
    // Find the product to get its details
    const product = freshFromFarmProducts.find((p) => p.id === productId);
    if (!product) return;

    const cartItem = {
      id: productId.toString(),
      name: product.name,
      price: product.price,
      description: `Fresh ${product.category.toLowerCase()} - ${
        product.organic ? "Organic" : "Farm Fresh"
      }`,
      restaurantId: "7", // Default shop ID for farm products
      restaurantName: "Fresh Farm Market",
      imageUrl: "", // Will be handled by ProductCard component
    };

    addToCart(cartItem);
    console.log("Added to cart:", product.name, "from Fresh Farm Market");
  };

  const handleRemoveFromCart = (productId: number) => {
    removeFromCart(productId.toString());
    console.log("Removed from cart:", productId);
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
              backgroundColor: "#27AE60",
              borderRadius: 8,
              padding: 8,
              marginRight: 12,
            }}
          >
            <Ionicons name="leaf" size={20} color="#fff" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Fresh from the Farm
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#666",
                marginTop: 2,
              }}
            >
              Organic & fresh produce
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

      {/* Quality Banner */}
      <View
        style={{
          marginHorizontal: 16,
          backgroundColor: "#E8F5E8",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          borderLeftWidth: 4,
          borderLeftColor: "#27AE60",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#27AE60",
              marginLeft: 8,
            }}
          >
            Farm Fresh Guarantee
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: "#4A5D4A",
            marginTop: 4,
            lineHeight: 16,
          }}
        >
          Picked fresh daily from local farms • No pesticides • 100% organic
          options available
        </Text>
      </View>

      {/* Products Horizontal Slider */}
      <FlatList
        data={freshFromFarmProducts}
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
