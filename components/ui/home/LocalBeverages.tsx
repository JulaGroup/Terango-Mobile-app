import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard, { UniversalProduct } from "@/components/common/ProductCard";
import { localBeveragesProducts } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";

const CARD_WIDTH = 160;

export default function LocalBeverages() {
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
    const raw = localBeveragesProducts.find((p) => p.id === product.id);
    if (!raw) return;

    const cartItem = {
      id: String(product.id),
      name: raw.name,
      price: raw.price,
      discountedPrice: raw.originalPrice,
      description: raw.description || "",
      vendorId: (raw.storeId || 8).toString(),
      vendorName: raw.storeName || "Local Store",
      entityType: "product",
      imageUrl: "", // Will be handled by ProductCard component
    };

    addToCart(cartItem);
    console.log(
      "Added to cart:",
      raw.name,
      "from store:",
      raw.storeName || "Local Store"
    );
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
          onPress={() => console.log("See All beverages")}
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
        ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
      />
    </View>
  );
}
