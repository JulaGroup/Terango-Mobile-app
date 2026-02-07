import React, { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { router } from "expo-router";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface BrowseProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    discountedPrice?: number;
    imageUrl?: string;
    shopName?: string;
    shop?: { name: string; id: string };
    _count?: { orderItems: number };
    inStock?: boolean;
    isAvailable?: boolean;
  };
  onAddToCart?: () => void;
  compact?: boolean;
}

export default function BrowseProductCard({
  product,
  onAddToCart,
  compact = false,
}: BrowseProductCardProps) {
  const [quantity, setQuantity] = useState(0);
  const isAvailable =
    product.inStock !== false && product.isAvailable !== false;
  const hasDiscount =
    product.discountedPrice && product.discountedPrice < product.price;
  const finalPrice = hasDiscount ? product.discountedPrice : product.price;
  const shopName = product.shopName || product.shop?.name || "Local Shop";

  const handleAdd = () => {
    setQuantity(quantity + 1);
    onAddToCart?.();
  };

  const handleRemove = () => {
    if (quantity > 0) {
      setQuantity(quantity - 1);
    }
  };

  const handleProductPress = () => {
    router.push({
      pathname: "/product/[productId]",
      params: { productId: product.id },
    });
  };

  const cardWidth = compact ? 160 : CARD_WIDTH;

  return (
    <TouchableOpacity
      onPress={handleProductPress}
      activeOpacity={0.7}
      style={{
        width: cardWidth,
        backgroundColor: "#fff",
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 16,
        overflow: "hidden",
        borderWidth: 0.5,
        borderColor: "rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Product Image */}
      <View
        style={{
          position: "relative",
          height: 140,
          backgroundColor: "#f8f9fa",
        }}
      >
        <Image
          source={product.imageUrl || "https://via.placeholder.com/300"}
          style={{
            width: "100%",
            height: "100%",
          }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />

        {/* Discount Badge */}
        {hasDiscount && (
          <View
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "#EF4444",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 10,
                fontWeight: "bold",
              }}
            >
              {Math.round(
                ((product.price - product.discountedPrice!) / product.price) *
                  100
              )}
              % OFF
            </Text>
          </View>
        )}

        {/* Popular Badge */}
        {product._count && product._count.orderItems > 10 && (
          <View
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FF6B35",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons name="flame" size={12} color="#fff" />
            <Text
              style={{
                color: "#fff",
                fontSize: 9,
                fontWeight: "bold",
                marginLeft: 3,
              }}
            >
              HOT
            </Text>
          </View>
        )}

        {/* Out of Stock Overlay */}
        {!isAvailable && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 11,
                fontWeight: "bold",
              }}
            >
              OUT OF STOCK
            </Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={{ padding: 12 }}>
        {/* Shop Name */}
        <Text
          style={{
            fontSize: 10,
            color: "#9CA3AF",
            fontWeight: "500",
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {shopName}
        </Text>

        {/* Product Name */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: "#1F2937",
            lineHeight: 18,
            marginBottom: 8,
            minHeight: 36,
          }}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        {/* Price Row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                flexWrap: "wrap",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: PrimaryColor,
                }}
              >
                ₨{finalPrice?.toFixed(2)}
              </Text>
              {hasDiscount && (
                <Text
                  style={{
                    fontSize: 12,
                    color: "#9CA3AF",
                    textDecorationLine: "line-through",
                    marginLeft: 6,
                  }}
                >
                  ₨{product.price.toFixed(2)}
                </Text>
              )}
            </View>
          </View>

          {/* Add to Cart Button */}
          {isAvailable &&
            (quantity === 0 ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleAdd();
                }}
                style={{
                  backgroundColor: PrimaryColor,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: PrimaryColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#f8f9fa",
                  borderRadius: 16,
                  paddingHorizontal: 4,
                  paddingVertical: 4,
                }}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  style={{
                    backgroundColor: "#fff",
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="remove" size={12} color={PrimaryColor} />
                </TouchableOpacity>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#333",
                    marginHorizontal: 8,
                    minWidth: 12,
                    textAlign: "center",
                  }}
                >
                  {quantity}
                </Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleAdd();
                  }}
                  style={{
                    backgroundColor: "#fff",
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={12} color={PrimaryColor} />
                </TouchableOpacity>
              </View>
            ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}
