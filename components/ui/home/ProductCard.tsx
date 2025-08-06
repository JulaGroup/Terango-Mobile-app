import React, { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    price: number;
    originalPrice?: number;
    image: any;
    category?: string;
    inStock: boolean;
    quantity: number;
    unit?: string;
    organic?: boolean;
    freshness?: string;
    rating?: number;
    description?: string;
    popular?: boolean;
    healthy?: boolean;
    local?: boolean;
    traditional?: boolean;
    spiceLevel?: string;
    refreshing?: boolean;
    fresh?: boolean;
    vitaminC?: boolean;
    spicy?: boolean;
    cooling?: boolean;
    adult?: boolean;
    vegetarian?: boolean;
  };
  onAddToCart?: (productId: number) => void;
  onRemoveFromCart?: (productId: number) => void;
  compact?: boolean;
}

export default function ProductCard({
  product,
  onAddToCart,
  onRemoveFromCart,
  compact = false,
}: ProductCardProps) {
  const [quantity, setQuantity] = useState(product.quantity || 0);

  const handleAdd = () => {
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    onAddToCart?.(product.id);
  };

  const handleRemove = () => {
    if (quantity > 0) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      onRemoveFromCart?.(product.id);
    }
  };

  const cardWidth = compact ? 160 : CARD_WIDTH;

  return (
    <View
      style={{
        width: cardWidth,
        backgroundColor: "#fff",
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 8,
        marginBottom: 16,
        overflow: "hidden",
        // Additional shadow for better distinction
        borderWidth: 0.5,
        borderColor: "rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Product Image */}
      <View
        style={{
          position: "relative",
          height: 120,
          backgroundColor: "#f8f9fa",
        }}
      >
        <Image
          source={product.image}
          style={{
            width: "100%",
            height: "100%",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
          resizeMode="cover"
        />

        {/* Badges */}
        {(product.organic ||
          product.popular ||
          product.healthy ||
          product.local) && (
          <View
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            {product.organic && (
              <View
                style={{
                  backgroundColor: "#27AE60",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                  marginBottom: 2,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: "bold",
                  }}
                >
                  ORGANIC
                </Text>
              </View>
            )}
            {product.popular && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#FF6B35",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                  marginBottom: 2,
                }}
              >
                <Ionicons name="star" size={10} color="#fff" />
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: "bold",
                    marginLeft: 2,
                  }}
                >
                  HOT
                </Text>
              </View>
            )}
            {product.healthy && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#2ECC71",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                  marginBottom: 2,
                }}
              >
                <Ionicons name="leaf" size={10} color="#fff" />
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: "bold",
                    marginLeft: 2,
                  }}
                >
                  HEALTHY
                </Text>
              </View>
            )}
            {product.local && (
              <View
                style={{
                  backgroundColor: "#8B4513",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: "bold",
                  }}
                >
                  LOCAL
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Discount Badge */}
        {product.originalPrice && product.originalPrice > product.price && (
          <View
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              backgroundColor: "#E74C3C",
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 9,
                fontWeight: "bold",
              }}
            >
              {Math.round(
                ((product.originalPrice - product.price) /
                  product.originalPrice) *
                  100
              )}
              % OFF
            </Text>
          </View>
        )}

        {/* Out of Stock Overlay */}
        {!product.inStock && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              justifyContent: "center",
              alignItems: "center",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 12,
                fontWeight: "bold",
              }}
            >
              OUT OF STOCK
            </Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={{ padding: 10 }}>
        {/* Category */}
        {product.category && (
          <Text
            style={{
              fontSize: 10,
              color: "#666",
              fontWeight: "500",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            {product.category}
          </Text>
        )}

        {/* Product Name */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: "#333",
            lineHeight: 16,
            marginBottom: 6,
          }}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        {/* Special Attributes */}
        {(product.freshness || product.spiceLevel || product.rating) && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginBottom: 4,
            }}
          >
            {product.freshness && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 8,
                  marginBottom: 2,
                }}
              >
                <Ionicons name="leaf-outline" size={12} color="#27AE60" />
                <Text
                  style={{
                    fontSize: 10,
                    color: "#666",
                    marginLeft: 2,
                  }}
                >
                  {product.freshness}
                </Text>
              </View>
            )}
            {product.spiceLevel && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 8,
                  marginBottom: 2,
                }}
              >
                <Ionicons name="flame-outline" size={12} color="#E74C3C" />
                <Text
                  style={{
                    fontSize: 10,
                    color: "#666",
                    marginLeft: 2,
                  }}
                >
                  {product.spiceLevel}
                </Text>
              </View>
            )}
            {product.rating && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 8,
                  marginBottom: 2,
                }}
              >
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text
                  style={{
                    fontSize: 10,
                    color: "#666",
                    marginLeft: 2,
                  }}
                >
                  {product.rating}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Description */}
        {product.description && !compact && (
          <Text
            style={{
              fontSize: 11,
              color: "#888",
              marginBottom: 6,
              lineHeight: 14,
            }}
            numberOfLines={1}
          >
            {product.description}
          </Text>
        )}

        {/* Price Row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 2,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "baseline",
              flexWrap: "wrap",
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "bold",
                color: PrimaryColor,
              }}
            >
              D{product.price.toFixed(2)}
            </Text>
            {product.unit && (
              <Text
                style={{
                  fontSize: 10,
                  color: "#666",
                }}
              >
                {" "}
                {product.unit}
              </Text>
            )}
            {product.originalPrice && product.originalPrice > product.price && (
              <Text
                style={{
                  fontSize: 11,
                  color: "#999",
                  textDecorationLine: "line-through",
                  marginLeft: 4,
                }}
              >
                D{product.originalPrice.toFixed(2)}
              </Text>
            )}
          </View>

          {/* Add to Cart Button */}
          {product.inStock ? (
            quantity === 0 ? (
              <TouchableOpacity
                onPress={handleAdd}
                style={{
                  backgroundColor: PrimaryColor,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: PrimaryColor,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 5,
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
                  borderRadius: 18,
                  paddingHorizontal: 3,
                  paddingVertical: 3,
                  minWidth: 70,
                }}
              >
                <TouchableOpacity
                  onPress={handleRemove}
                  style={{
                    backgroundColor: "#fff",
                    width: 26,
                    height: 26,
                    borderRadius: 13,
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
                  <Ionicons name="remove" size={14} color={PrimaryColor} />
                </TouchableOpacity>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#333",
                    marginHorizontal: 8,
                    minWidth: 16,
                    textAlign: "center",
                  }}
                >
                  {quantity}
                </Text>
                <TouchableOpacity
                  onPress={handleAdd}
                  style={{
                    backgroundColor: "#fff",
                    width: 26,
                    height: 26,
                    borderRadius: 13,
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
                  <Ionicons name="add" size={14} color={PrimaryColor} />
                </TouchableOpacity>
              </View>
            )
          ) : (
            <View
              style={{
                backgroundColor: "#f0f0f0",
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  color: "#999",
                  fontWeight: "500",
                }}
              >
                Unavailable
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
