import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { API_URL } from "@/constants/config";
import { useRouter } from "expo-router";

interface Shop {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  shopType?: string;
  rating?: number;
  totalReviews?: number;
  isActive: boolean;
  acceptsOrders: boolean;
  minimumOrderAmount?: number;
  products?: Product[];
}

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

// Skeleton Loader Component
const SkeletonLoader = ({
  width: skeletonWidth,
  height,
  style,
}: {
  width: number | string;
  height: number;
  style?: any;
}) => {
  return (
    <View
      style={[
        {
          width: skeletonWidth,
          height: height,
          backgroundColor: "#E0E0E0",
          borderRadius: 8,
        },
        style,
      ]}
    />
  );
};

const ShopCard = ({
  shop,
  onPress,
}: {
  shop: Shop;
  onPress: (shopId: string) => void;
}) => {
  return (
    <TouchableOpacity
      style={{
        width: 280,
        backgroundColor: "#fff",
        borderRadius: 16,
        marginRight: 16,
        elevation: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        overflow: "hidden",
        // Additional shadow for better distinction
        borderWidth: 0.5,
        borderColor: "rgba(0, 0, 0, 0.08)",
      }}
      onPress={() => onPress(shop.id)}
      activeOpacity={0.8}
    >
      {/* Shop Image */}
      <View style={{ height: 120, position: "relative" }}>
        {shop.imageUrl ? (
          <Image
            source={{ uri: shop.imageUrl }}
            style={{ width: "100%", height: "100%", resizeMode: "cover" }}
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#F3F4F6",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="storefront" size={32} color="#9CA3AF" />
          </View>
        )}

        {/* Status Badge */}
        <View
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            backgroundColor: shop.isActive
              ? "rgba(0,200,81,0.9)"
              : "rgba(239,68,68,0.9)",
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>
            {shop.isActive ? "Open" : "Closed"}
          </Text>
        </View>
      </View>

      {/* Shop Info */}
      <View style={{ padding: 16 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#1F2937",
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {shop.name}
        </Text>

        {shop.description ? (
          <Text
            style={{
              fontSize: 12,
              color: "#6B7280",
              marginBottom: 8,
              lineHeight: 16,
            }}
            numberOfLines={2}
          >
            {shop.description}
          </Text>
        ) : null}

        {/* Shop Type */}
        {shop.shopType && (
          <View
            style={{
              backgroundColor: "#F3F4F6",
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
              alignSelf: "flex-start",
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 10, color: "#6B7280", fontWeight: "500" }}>
              {shop.shopType}
            </Text>
          </View>
        )}

        {/* Rating and Location */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          {typeof shop.rating === "number" && shop.rating >= 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={{ fontSize: 12, color: "#6B7280", marginLeft: 2 }}>
                {shop.rating.toFixed(1)}
              </Text>
            </View>
          )}

          {typeof shop.address === "string" && (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="location" size={12} color="#6B7280" />
              <Text style={{ fontSize: 12, color: "#6B7280", marginLeft: 2 }}>
                {`${shop.city ?? ""}${shop.city && shop.address ? ", " : ""}${
                  shop.address ?? ""
                }`}
              </Text>
            </View>
          )}
        </View>

        {/* Minimum Order */}
        {typeof shop.minimumOrderAmount === "number" &&
          shop.minimumOrderAmount > 0 && (
            <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
              Min. order: D{shop.minimumOrderAmount.toFixed(2)}
            </Text>
          )}
      </View>
    </TouchableOpacity>
  );
};

export default function LocalShops() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShops = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/shops`);

      if (!response.ok) {
        throw new Error(`Failed to fetch shops: ${response.statusText}`);
      }

      const data = await response.json();
      setShops(data || []);
    } catch (err: any) {
      console.error("Error fetching shops:", err);
      setError(
        typeof err?.message === "string" ? err.message : "Failed to load shops"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleShopPress = (shopId: string) => {
    router.push(`/shop-details?shopId=${shopId}`);
  };

  const handleViewAll = () => {
    router.push("/ViewAllStores");
  };

  const renderShopCard = ({ item }: { item: Shop }) => {
    if (!item || typeof item !== "object") {
      console.warn("Invalid shop item:", item);
      return <View />; // return an empty View instead of null/string
    }
    return <ShopCard shop={item} onPress={handleShopPress} />;
  };

  const renderSkeletonCard = ({ item }: { item: number }) => (
    <View
      style={{
        width: 280,
        backgroundColor: "#fff",
        borderRadius: 16,
        marginRight: 16,
        padding: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }}
    >
      <SkeletonLoader
        width="100%"
        height={120}
        style={{ marginBottom: 12, borderRadius: 8 }}
      />
      <SkeletonLoader width="80%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="100%" height={12} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="60%" height={12} />
    </View>
  );

  if (error) {
    return (
      <View style={{ paddingVertical: 20 }}>
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
                backgroundColor: "#EF4444",
                borderRadius: 8,
                padding: 8,
                marginRight: 12,
              }}
            >
              <Ionicons name="storefront" size={20} color="#fff" />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Local Shops
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#666",
                  marginTop: 2,
                }}
              >
                Failed to load shops
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            marginHorizontal: 16,
            backgroundColor: "#FEF2F2",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            borderLeftWidth: 4,
            borderLeftColor: "#EF4444",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#EF4444",
                marginLeft: 8,
              }}
            >
              Unable to Load Shops
            </Text>
          </View>
          <Text
            style={{
              fontSize: 12,
              color: "#B91C1C",
              marginTop: 4,
              lineHeight: 16,
            }}
          >
            Please check your connection and try again.
          </Text>
        </View>

        <TouchableOpacity
          style={{
            marginHorizontal: 16,
            backgroundColor: PrimaryColor,
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: "center",
          }}
          onPress={fetchShops}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ marginVertical: 5 }}>
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
              backgroundColor: "#6366F1",
              borderRadius: 8,
              padding: 8,
              marginRight: 12,
            }}
          >
            <Ionicons name="storefront" size={20} color="#fff" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Stores
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#666",
                marginTop: 2,
              }}
            >
              Quality products near you
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleViewAll}
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
            View All
          </Text>
          <Ionicons name="chevron-forward" size={16} color={PrimaryColor} />
        </TouchableOpacity>
      </View>

      {/* Featured Badge */}
      <View
        style={{
          marginHorizontal: 16,
          backgroundColor: "#EFF6FF",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          borderLeftWidth: 4,
          borderLeftColor: "#6366F1",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="shield-checkmark" size={20} color="#6366F1" />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#6366F1",
              marginLeft: 8,
            }}
          >
            Verified Local Businesses
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: "#3730A3",
            marginTop: 4,
            lineHeight: 16,
          }}
        >
          Trusted local shops/stores • Quality products • Fast delivery
        </Text>
      </View>

      {/* Shops Horizontal Slider */}
      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          renderItem={renderSkeletonCard}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
          }}
          keyExtractor={(item, index) => index.toString()}
        />
      ) : (
        <FlatList
          data={shops}
          renderItem={renderShopCard}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            marginTop: 8,
            marginBottom: 30,
          }}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );
}
