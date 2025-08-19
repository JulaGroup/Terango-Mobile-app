import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard from "./ProductCard";
import { localBeveragesProducts } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";

export default function LocalBeverages() {
  const { addToCart, removeFromCart } = useCart();

  const handleAddToCart = (productId: number) => {
    // Find the product to get its details
    const product = localBeveragesProducts.find((p) => p.id === productId);
    if (!product) return;

    const cartItem = {
      id: productId.toString(),
      name: product.name,
      price: product.price,
      description: product.description || "",
      restaurantId: (product.storeId || 8).toString(),
      restaurantName: product.storeName || "Local Store",
      imageUrl: "", // Will be handled by ProductCard component
    };

    addToCart(cartItem);
    console.log(
      "Added to cart:",
      product.name,
      "from store:",
      product.storeName || "Local Store"
    );
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
              backgroundColor: "#20B2AA",
              borderRadius: 8,
              padding: 8,
              marginRight: 12,
            }}
          >
            <Ionicons name="water" size={20} color="#fff" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Local Beverages
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#666",
                marginTop: 2,
              }}
            >
              Refreshing traditional drinks
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => console.log("View all beverages")}
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
          backgroundColor: "#E0F8FF",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          borderLeftWidth: 4,
          borderLeftColor: "#20B2AA",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="leaf" size={20} color="#20B2AA" />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#20B2AA",
              marginLeft: 8,
            }}
          >
            Natural & Refreshing
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: "#008B8B",
            marginTop: 4,
            lineHeight: 16,
          }}
        >
          Made from natural ingredients • Rich in vitamins • Traditionally
          prepared
        </Text>
      </View>

      {/* Products Horizontal Slider */}
      <FlatList
        data={localBeveragesProducts}
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
