import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard from "./ProductCard";
import { traditionalMealsProducts } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";

export default function TraditionalMeals() {
  const { addToCart, removeFromCart } = useCart();

  const handleAddToCart = (productId: number) => {
    // Find the product to get its storeId, or use a default
    const product = traditionalMealsProducts.find((p) => p.id === productId);
    const storeId = product?.storeId || 5; // Default storeId if not found
    addToCart(productId, storeId);
    console.log("Added to cart:", productId, "from store:", storeId);
  };

  const handleRemoveFromCart = (productId: number) => {
    removeFromCart(productId);
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
              backgroundColor: "#8B4513",
              borderRadius: 8,
              padding: 8,
              marginRight: 12,
            }}
          >
            <Ionicons name="restaurant" size={20} color="#fff" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Traditional Gambian Meals
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#666",
                marginTop: 2,
              }}
            >
              Authentic flavors from The Gambia
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => console.log("View all traditional meals")}
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
          backgroundColor: "#FDF5E6",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          borderLeftWidth: 4,
          borderLeftColor: "#8B4513",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="heart" size={20} color="#8B4513" />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#8B4513",
              marginLeft: 8,
            }}
          >
            Heritage Recipes
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: "#A0522D",
            marginTop: 4,
            lineHeight: 16,
          }}
        >
          Prepared with love • Traditional spices • Authentic Gambian taste
        </Text>
      </View>

      {/* Products Horizontal Slider */}
      <FlatList
        data={traditionalMealsProducts}
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
