import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MealItemCard, {
  UniversalProduct as UniversalMealProduct,
} from "@/components/common/MealItemCard";
import { traditionalMealsProducts } from "@/constants/fakeData";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";

export default function TraditionalMeals() {
  const { addToCart, removeFromCart, updateQuantity, getQuantity } = useCart();

  const toUniversalMeal = (item: any): UniversalMealProduct => {
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

  const handleAddToCart = (product: UniversalMealProduct) => {
    const raw = traditionalMealsProducts.find((p) => p.id === product.id);
    if (!raw) return;

    const cartItem = {
      id: String(product.id),
      name: raw.name,
      price: raw.price,
      discountedPrice: raw.originalPrice,
      description: raw.description || "",
      vendorId: (raw.storeId || 5).toString(),
      vendorName: raw.storeName || "Traditional Kitchen",
      entityType: "product",
      imageUrl: "", // Will be handled by ProductCard component
    };

    addToCart(cartItem);
    console.log(
      "Added to cart:",
      raw.name,
      "from store:",
      raw.storeName || "Traditional Kitchen"
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
      <MealItemCard
        product={toUniversalMeal(item)}
        cartQuantity={getQuantity(String(item.id))}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={() => handleRemoveFromCart(item.id)}
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
          onPress={() => console.log("See All traditional meals")}
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
        ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
      />
    </View>
  );
}
