import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard, { UniversalProduct } from "@/components/common/ProductCard";
import { weeklyDealsProducts } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";

const CARD_WIDTH = 160;

export default function WeeklyDeals() {
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
      weeklyDealsProducts.map((item: any) => {
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

  const renderProductCard = ({ item }: { item: any }) => (
    <View style={{ marginRight: 16 }}>
      <ProductCard
        product={item.product}
        cartQuantity={getCartQuantity(item.product.id)}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={() => handleRemoveFromCart(item.product.id)}
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
          onPress={() => console.log("See All weekly deals")}
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
            See All
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
        data={listData}
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
