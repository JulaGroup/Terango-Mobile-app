import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard, { UniversalProduct } from "@/components/common/ProductCard";
import { trendingNowProducts } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";

const CARD_WIDTH = 160;

export default function TrendingNow() {
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
      trendingNowProducts.map((item: any) => {
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
          onPress={() => console.log("See All trending items")}
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
