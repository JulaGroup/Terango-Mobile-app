import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { API_URL } from "@/constants/config";
import { getOperatingStatus } from "@/utils/openingHours";
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
  openingHours?: any;
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

const ShopCard = React.memo(
  ({ shop, onPress }: { shop: Shop; onPress: (shopId: string) => void }) => {
    const displayAddress = `${shop.address ?? ""}`;
    const isShopOpen = getOperatingStatus({
      openingHours: shop.openingHours,
      isActive: shop.isActive,
      acceptsOrders: shop.acceptsOrders,
    }).isOpen;

    return (
      <TouchableOpacity
        style={{ width: 280, marginRight: 14, marginVertical: 6 }}
        onPress={() => onPress(shop.id)}
        activeOpacity={0.9}
      >
        <View
          style={{
            height: 150,
            borderRadius: 18,
            overflow: "hidden",
            backgroundColor: "#F2F2F4",
          }}
        >
          {shop.imageUrl ? (
            <Image
              source={{ uri: shop.imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View
              style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
            >
              <Ionicons name="storefront" size={38} color="#CDCDD2" />
            </View>
          )}
          {!isShopOpen && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(255,255,255,0.5)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  backgroundColor: "rgba(0,0,0,0.78)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                  Closed
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ paddingTop: 10, paddingHorizontal: 2 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#1C1C1E",
              letterSpacing: -0.2,
            }}
          >
            {shop.name}
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}
          >
            <Ionicons name="star" size={13} color="#F5A623" />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#1C1C1E",
                marginLeft: 3,
              }}
            >
              {shop.rating && shop.rating > 0 ? shop.rating.toFixed(1) : "New"}
            </Text>
            {shop.shopType ? (
              <>
                <Text
                  style={{ marginHorizontal: 6, color: "#C7C7CC", fontSize: 12 }}
                >
                  ·
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 13, color: "#6B6B6E", fontWeight: "500" }}
                >
                  {shop.shopType}
                </Text>
              </>
            ) : null}
            {displayAddress ? (
              <>
                <Text
                  style={{ marginHorizontal: 6, color: "#C7C7CC", fontSize: 12 }}
                >
                  ·
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 13,
                    color: "#6B6B6E",
                    fontWeight: "500",
                    flexShrink: 1,
                  }}
                >
                  {displayAddress}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

export default function LocalShops({
  refreshKey,
  hideHeader,
}: {
  refreshKey?: number;
  hideHeader?: boolean;
}) {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShops = async () => {
    try {
      setLoading(true);
      setError(null);
      // Small random jitter to avoid thundering herd when many components refetch at once
      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(Math.random() * 200)),
      );

      // Retry logic with exponential backoff for transient failures (DB pool blips, network)
      const maxRetries = 3;
      let attempt = 0;
      let lastErr: any = null;

      while (attempt < maxRetries) {
        attempt += 1;

        // Timeout via AbortController
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

        try {
          const response = await fetch(`${API_URL}/api/shops`, {
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (!response.ok) {
            throw new Error(
              `Failed to fetch shops: ${response.status} ${response.statusText}`,
            );
          }

          const data = await response.json();

          // Handle both array and object responses
          const shopsArray = Array.isArray(data)
            ? data
            : data.shops || data.data || [];

          setShops(shopsArray);
          // Cache for offline/fallback use
          try {
            await AsyncStorage.setItem(
              "cached_shops",
              JSON.stringify(shopsArray),
            );
          } catch (cacheErr) {
            console.warn("Failed to cache shops:", cacheErr);
          }
          lastErr = null;
          break; // success
        } catch (err: any) {
          lastErr = err;
          console.warn(
            `fetchShops attempt ${attempt} failed:`,
            err?.message || err,
          );

          // If aborted by timeout, set a specific message
          if (err?.name === "AbortError") {
            lastErr = new Error("Request timed out");
          }

          // Exponential backoff before next attempt (skip wait after last attempt)
          if (attempt < maxRetries) {
            const backoff = 500 * Math.pow(2, attempt - 1); // 500ms, 1000ms, ...
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          }
        }
      }

      if (lastErr) {
        // Try to load cached shops if available before throwing
        try {
          const cached = await AsyncStorage.getItem("cached_shops");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log("Using cached shops due to fetch failure");
              setShops(parsed);
              setError("Using offline cached data");
              return;
            }
          }
        } catch (cacheErr) {
          console.warn("Failed to read cached shops:", cacheErr);
        }

        throw lastErr;
      }
    } catch (err: any) {
      console.error("Error fetching shops:", err);
      setError(
        typeof err?.message === "string" ? err.message : "Failed to load shops",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [refreshKey]);

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
        {!hideHeader && (
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
        )}

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
      {!hideHeader && (
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
                width: 4,
                height: 38,
                borderRadius: 2,
                backgroundColor: "#6366F1",
                marginRight: 10,
              }}
            />
            <View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#111827",
                }}
              >
                Stores
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#6B7280",
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
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: "#979797FF",
                fontWeight: "500",
                marginRight: 4,
              }}
            >
              See All
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#979797FF" />
          </TouchableOpacity>
        </View>
      )}

      {!hideHeader && (
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
      )}

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
          ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
          keyExtractor={(item, index) => index.toString()}
        />
      ) : shops.length > 0 ? (
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
          ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
          keyExtractor={(item) => item.id}
        />
      ) : (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 20,
            alignItems: "center",
          }}
        >
          <Ionicons name="storefront-outline" size={48} color="#9CA3AF" />
          <Text
            style={{
              fontSize: 16,
              color: "#6B7280",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            No shops available
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#9CA3AF",
              marginTop: 4,
              textAlign: "center",
            }}
          >
            Check back later for local shops
          </Text>
        </View>
      )}
    </View>
  );
}
