import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard, { UniversalProduct } from "@/components/common/ProductCard";
import { gadgetTechProducts } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";

const CARD_WIDTH = 160;

export default function GadgetTechZone() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const getCartQuantity = useCallback(
    (id: string | number) => quantities[String(id)] ?? 0,
    [quantities]
  );

  const handleAddToCart = useCallback((product: UniversalProduct) => {
    setQuantities((prev) => {
      const key = String(product.id);
      return { ...prev, [key]: (prev[key] ?? 0) + 1 };
    });
  }, []);

  const handleRemoveFromCart = useCallback((productId: string | number) => {
    setQuantities((prev) => {
      const key = String(productId);
      const next = (prev[key] ?? 0) - 1;
      if (next <= 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: next };
    });
  }, []);

  const listData = useMemo(
    () =>
      gadgetTechProducts.map((item: any) => {
        const hasDiscount = typeof item.originalPrice === "number";
        const product: UniversalProduct = {
          id: item.id,
          name: item.name,
          price: hasDiscount ? item.originalPrice : item.price,
          discountedPrice: hasDiscount ? item.price : undefined,
          image: item.image,
          description: item.description,
          inStock: item.inStock,
        };
        return { raw: item, product };
      }),
    []
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
              backgroundColor: "#2C5AA0",
              borderRadius: 8,
              padding: 8,
              marginRight: 12,
            }}
          >
            <Ionicons name="phone-portrait" size={20} color="#fff" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Gadget & Tech Zone
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#666",
                marginTop: 2,
              }}
            >
              Latest gadgets & accessories
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

      {/* Products Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingRight: 32,
        }}
      >
        {listData.map((item) => (
          <View key={String(item.product.id)} style={{ marginRight: 16 }}>
            <ProductCard
              product={item.product}
              cartQuantity={getCartQuantity(item.product.id)}
              onAddToCart={handleAddToCart}
              onRemoveFromCart={() => handleRemoveFromCart(item.product.id)}
              cardWidth={CARD_WIDTH}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
