import { PrimaryColor } from "@/constants/Colors";
import { API_URL } from "@/constants/config";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
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
    const pulse = () => {
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
  isActive: boolean;
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

const RestaurantNearYou = () => {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/restaurants`);

      if (!response.ok) {
        throw new Error(`Failed to fetch restaurants: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle both array response and object with data property
      const restaurantList = Array.isArray(data) ? data : data.data || [];

      // Debug each restaurant's image data
      restaurantList.forEach((restaurant: Restaurant) => {
        console.log(`Restaurant ${restaurant.name}:`, {
          restaurantImageUrl: restaurant.imageUrl,
          serviceImageUrl: restaurant.service?.imageUrl,
          hasImage: !!(restaurant.imageUrl || restaurant.service?.imageUrl),
        });
      });

      setRestaurants(restaurantList);
    } catch (err: any) {
      console.error("Error fetching restaurants:", err);
      setError(err.message || "Failed to load restaurants");
    } finally {
      setLoading(false);
    }
  };

  const getRandomRating = () => {
    return (Math.random() * (5.0 - 3.5) + 3.5).toFixed(1);
  };

  const getRandomReviewCount = () => {
    return Math.floor(Math.random() * (500 - 50) + 50);
  };

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
                backgroundColor: PrimaryColor,
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
                backgroundColor: PrimaryColor,
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
                backgroundColor: PrimaryColor,
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
              backgroundColor: PrimaryColor,
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
              Delicious meals delivered
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
            View All
          </Text>
          <Ionicons name="chevron-forward" size={12} color={PrimaryColor} />
        </TouchableOpacity>
      </View>

      {/* Restaurants Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
        }}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 16}
        snapToAlignment="start"
      >
        {restaurants.slice(0, 8).map((restaurant, index) => {
          const rating = getRandomRating();
          const reviewCount = getRandomReviewCount();
          const cuisineTypes = getCuisineTypes(restaurant);

          return (
            <TouchableOpacity
              key={restaurant.id}
              style={{
                width: CARD_WIDTH,
                backgroundColor: "#fff",
                borderRadius: 16,
                marginRight: index === restaurants.length - 1 ? 0 : 16,
                marginVertical: 8,
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
              activeOpacity={0.85}
              onPress={() => {
                router.push({
                  pathname: "/restaurant-details",
                  params: { restaurantId: restaurant.id },
                });
              }}
            >
              {/* Restaurant Image */}
              <View
                style={{
                  height: 140,
                  backgroundColor: "#f8f8f8",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {restaurant.imageUrl || restaurant.service?.imageUrl ? (
                  <Image
                    source={{
                      uri: restaurant.imageUrl || restaurant.service?.imageUrl,
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      resizeMode: "cover",
                    }}
                    onError={(error) => {
                      console.log(
                        "Failed to load image for:",
                        restaurant.name,
                        "Error:",
                        error
                      );
                    }}
                    onLoad={() => {
                      console.log(
                        "Successfully loaded image for:",
                        restaurant.name
                      );
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: "100%",
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#f8f8f8",
                    }}
                  >
                    <Ionicons
                      name="restaurant-outline"
                      size={40}
                      color="#ccc"
                    />
                  </View>
                )}

                {/* Active Status Badge */}
                {restaurant.isActive && (
                  <View
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      backgroundColor: "#27AE60",
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: "600",
                      }}
                    >
                      OPEN
                    </Text>
                  </View>
                )}

                {/* Rating Badge */}
                <View
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: "600",
                      marginLeft: 2,
                    }}
                  >
                    {rating}
                  </Text>
                </View>
              </View>

              {/* Restaurant Info */}
              <View style={{ padding: 16 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#333",
                    marginBottom: 4,
                  }}
                  numberOfLines={1}
                >
                  {restaurant.name}
                </Text>

                <Text
                  style={{
                    fontSize: 12,
                    color: "#666",
                    marginBottom: 8,
                    lineHeight: 16,
                  }}
                  numberOfLines={2}
                >
                  {restaurant.description ||
                    restaurant.service?.name ||
                    "Delicious food served fresh"}
                </Text>

                {/* Categories */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 12 }}
                >
                  {cuisineTypes.map((category, catIndex) => (
                    <View
                      key={catIndex}
                      style={{
                        backgroundColor: "#f0f0f0",
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        marginRight: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#666",
                          fontWeight: "500",
                        }}
                      >
                        {category}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                {/* Footer Info */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#666",
                        marginLeft: 4,
                      }}
                      numberOfLines={1}
                    >
                      {restaurant.service?.location || "Location"}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: 12,
                      color: "#666",
                    }}
                  >
                    {reviewCount} reviews
                  </Text>
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
