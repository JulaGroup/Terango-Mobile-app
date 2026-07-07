import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard, { UniversalProduct } from "@/components/common/ProductCard";
import { freshFromFarmProducts } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";

const CARD_WIDTH = 160;

export default function FreshFromFarm() {
  const { addToCart, removeFromCart, updateQuantity, getQuantity } = useCart();

  const toUniversalProduct = (item: any): UniversalProduct => {
    const hasDiscount = typeof item.originalPrice === "number";
    return {
      id: item.id,
      name: item.name,
      price: hasDiscount ? item.originalPrice : item.price,
      discountedPrice: hasDiscount ? item.price : undefined,
      image: item.image,
      description: item.description,
      inStock: item.inStock,
    };
  };

  const handleAddToCart = (product: UniversalProduct) => {
    const raw = freshFromFarmProducts.find((p) => p.id === product.id);
    if (!raw) return;

    const cartItem = {
      id: String(product.id),
      name: raw.name,
      price: raw.price,
      discountedPrice: raw.originalPrice,
      description: `Fresh ${String(
        raw.category || "produce"
      ).toLowerCase()} - ${raw.organic ? "Organic" : "Farm Fresh"}`,
      vendorId: "7", // Default vendor ID for farm products
      vendorName: "Fresh Farm Market",
      entityType: "product",
      imageUrl: "", // Keep existing behavior
    };

    addToCart(cartItem);
    console.log("Added to cart:", raw.name, "from Fresh Farm Market");
  };

  const handleRemoveFromCart = (productId: string | number) => {
    const id = String(productId);
    const q = getQuantity(id);
    if (q > 1) {
      updateQuantity(id, q - 1);
    } else {
      removeFromCart(id);
    }
  };

  const renderProductCard = ({ item }: { item: any }) => (
    <View>
      <ProductCard
        product={toUniversalProduct(item)}
        cartQuantity={getQuantity(String(item.id))}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={() => handleRemoveFromCart(item.id)}
        cardWidth={CARD_WIDTH}
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
            See All
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
        ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
      />
    </View>
  );
}
