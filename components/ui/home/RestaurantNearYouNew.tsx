import { PrimaryColor } from "@/constants/Colors";
import { API_URL } from "@/constants/config";
import { getOperatingStatus } from "@/utils/openingHours";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Image,
  Animated,
} from "react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.75;

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
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let active = true;
    const pulse = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
    return () => {
      active = false;
      opacity.stopAnimation();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: skeletonWidth,
          height: height,
          backgroundColor: "#E0E0E0",
          borderRadius: 8,
          opacity: opacity,
        },
        style,
      ]}
    />
  );
};

// Restaurant Card Skeleton
const RestaurantCardSkeleton = () => {
  return (
    <View
      style={{
        width: CARD_WIDTH,
        backgroundColor: "#fff",
        borderRadius: 16,
        marginRight: 16,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Image Skeleton */}
      <SkeletonLoader width="100%" height={140} />

      {/* Content Skeleton */}
      <View style={{ padding: 16 }}>
        {/* Title */}
        <SkeletonLoader width="80%" height={16} style={{ marginBottom: 8 }} />

        {/* Description */}
        <SkeletonLoader width="100%" height={12} style={{ marginBottom: 4 }} />
        <SkeletonLoader width="70%" height={12} style={{ marginBottom: 12 }} />

        {/* Categories */}
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <SkeletonLoader
            width={60}
            height={20}
            style={{ marginRight: 6, borderRadius: 12 }}
          />
          <SkeletonLoader
            width={80}
            height={20}
            style={{ marginRight: 6, borderRadius: 12 }}
          />
          <SkeletonLoader width={50} height={20} style={{ borderRadius: 12 }} />
        </View>

        {/* Footer */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <SkeletonLoader width="50%" height={12} />
          <SkeletonLoader width="30%" height={12} />
        </View>
      </View>
    </View>
  );
};

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  address?: string;
  city?: string;
  rating?: number;
  isActive: boolean;
  acceptsOrders: boolean;
  openingHours?: any;
  createdAt: string;
  updatedAt: string;
  service: {
    id: string;
    name: string;
    type: string;
    location: string;
    imageUrl?: string;
    category: {
      id: string;
      name: string;
    };
    subCategory: {
      id: string;
      name: string;
    };
  };
  menus: {
    id: string;
    name: string;
    description?: string;
    items: {
      id: string;
      name: string;
      description?: string;
      price: number;
      isAvailable: boolean;
    }[];
  }[];
}

const RestaurantNearYou = ({
  refreshKey,
  hideHeader,
}: {
  refreshKey?: number;
  hideHeader?: boolean;
}) => {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/restaurants`);

      if (!response.ok) {
        throw new Error(`Failed to fetch restaurants: ${response.statusText}`);
      }

      const data = await response.json();
      const restaurantList = Array.isArray(data) ? data : data.data || [];
      setRestaurants(restaurantList);
    } catch (err: any) {
      setError(err.message || "Failed to load restaurants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [refreshKey, fetchRestaurants]);

  const getCuisineTypes = (restaurant: Restaurant): string[] => {
    const types: string[] = [];

    if (restaurant.service?.category?.name) {
      types.push(restaurant.service.category.name);
    }

    if (restaurant.service?.subCategory?.name) {
      types.push(restaurant.service.subCategory.name);
    }

    // Add menu-based categories
    restaurant.menus?.forEach((menu) => {
      if (menu.name && !types.includes(menu.name)) {
        types.push(menu.name);
      }
    });

    return types.slice(0, 3); // Limit to 3 categories
  };

  if (loading) {
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
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  Popular Restaurants
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#666",
                    marginTop: 2,
                  }}
                >
                  Loading delicious meals...
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#f0f0f0",
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <SkeletonLoader
                width={60}
                height={12}
                style={{ borderRadius: 6 }}
              />
            </View>
          </View>
        )}

        {/* Skeleton Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
          }}
        >
          <RestaurantCardSkeleton />
          <RestaurantCardSkeleton />
          <RestaurantCardSkeleton />
        </ScrollView>
      </View>
    );
  }

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
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  Popular Restaurants
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#666",
                    marginTop: 2,
                  }}
                >
                  Error loading restaurants
                </Text>
              </View>
            </View>
          </View>
        )}

        <View
          style={{
            height: 200,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text
            style={{
              marginTop: 10,
              color: "#EF4444",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchRestaurants}
            style={{
              marginTop: 12,
              backgroundColor: PrimaryColor,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (restaurants.length === 0) {
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
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  Popular Restaurants
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#666",
                    marginTop: 2,
                  }}
                >
                  No restaurants available
                </Text>
              </View>
            </View>
          </View>
        )}

        <View
          style={{
            height: 200,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <Ionicons name="restaurant-outline" size={48} color="#9CA3AF" />
          <Text
            style={{
              marginTop: 10,
              color: "#9CA3AF",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            No restaurants found in your area
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ paddingVertical: 4 }}>
      {!hideHeader && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            marginBottom: 1,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: "#1C1C1E",
                letterSpacing: -0.4,
              }}
            >
              Restaurants & Bakeries
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#8E8E93",
                marginTop: 2,
              }}
            >
              Delicious food at your fingertips
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/ViewAllRestaurants")}
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
                fontSize: 13,
                color: "#FF6B00",
                fontWeight: "600",
                marginRight: 2,
              }}
            >
              See all
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#FF6B00" />
          </TouchableOpacity>
        </View>
      )}

      {/* Restaurants Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
        }}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 16}
        snapToAlignment="center"
      >
        {restaurants.map((restaurant, index) => {
          const cuisineTypes = getCuisineTypes(restaurant);
          const isOpen = getOperatingStatus({
            openingHours: restaurant.openingHours,
            isActive: restaurant.isActive,
            acceptsOrders: restaurant.acceptsOrders,
          }).isOpen;

          // Prefer explicit address (city + address) when available, otherwise fall back to service.location or a placeholder
          const displayAddress =
            restaurant.address || restaurant.service?.location || "Location";

            return (
              <TouchableOpacity
                key={restaurant.id}
                style={{
                  width: CARD_WIDTH,
                  marginRight: index === restaurants.length - 1 ? 0 : 14,
                  marginVertical: 6,
                }}
                activeOpacity={0.9}
                onPress={() => {
                  router.push({
                    pathname: "/restaurant-details",
                    params: { restaurantId: restaurant.id },
                  });
                }}
              >
                {/* Cover image */}
                <View
                  style={{
                    height: 150,
                    borderRadius: 18,
                    overflow: "hidden",
                    backgroundColor: "#F2F2F4",
                  }}
                >
                  {restaurant.imageUrl || restaurant.service?.imageUrl ? (
                    <Image
                      source={{
                        uri: restaurant.imageUrl || restaurant.service?.imageUrl,
                      }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name="restaurant-outline"
                        size={40}
                        color="#CDCDD2"
                      />
                    </View>
                  )}
                  {!isOpen && (
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
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          Closed
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Info */}
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
                    {restaurant.name}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 5,
                    }}
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
                      {restaurant.rating && restaurant.rating > 0
                        ? restaurant.rating.toFixed(1)
                        : "New"}
                    </Text>
                    {cuisineTypes[0] ? (
                      <>
                        <Text
                          style={{
                            marginHorizontal: 6,
                            color: "#C7C7CC",
                            fontSize: 12,
                          }}
                        >
                          ·
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 13,
                            color: "#6B6B6E",
                            fontWeight: "500",
                          }}
                        >
                          {cuisineTypes[0]}
                        </Text>
                      </>
                    ) : null}
                    {displayAddress ? (
                      <>
                        <Text
                          style={{
                            marginHorizontal: 6,
                            color: "#C7C7CC",
                            fontSize: 12,
                          }}
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
        })}
      </ScrollView>
    </View>
  );
};

export default RestaurantNearYou;
