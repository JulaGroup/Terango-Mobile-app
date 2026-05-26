import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import { API_URL } from "@/constants/config";
import { getOperatingStatus } from "@/utils/openingHours";

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  address?: string;
  city?: string;
  isActive: boolean;
  acceptsOrders: boolean;
  openingHours?: any;
  service?: {
    id?: string;
    name?: string;
    location?: string;
    imageUrl?: string;
    category?: { id?: string; name: string };
    subCategory?: { id?: string; name: string };
  };
  menus?: {
    id: string;
    name: string;
    items?: { id: string; name: string; price: number; isAvailable: boolean }[];
  }[];
}

export default function ViewAllRestaurants() {
  const router = useRouter();
  const { cartItems } = useCart();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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
      const restaurantList = Array.isArray(data) ? data : data.data || [];
      setRestaurants(restaurantList);
    } catch (err: any) {
      console.error("Error fetching restaurants:", err);
      setError(err.message || "Failed to load restaurants");
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  const getCuisineTypes = (restaurant: Restaurant): string[] => {
    const types: string[] = [];
    if (restaurant.service?.category?.name)
      types.push(restaurant.service.category.name);
    if (restaurant.service?.subCategory?.name)
      types.push(restaurant.service.subCategory.name);
    restaurant.menus?.forEach((menu) => {
      if (menu.name && !types.includes(menu.name)) types.push(menu.name);
    });
    return types.slice(0, 3);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar barStyle="light-content" backgroundColor="#ff6b00" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Restaurants & Bakeries</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push("/cart")}
        >
          <Ionicons name="cart-outline" size={22} color="#fff" />
          {cartItems.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons
          name="search"
          size={22}
          color="#888"
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search ..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={{ color: PrimaryColor }}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Text style={{ color: "#EF4444" }}>{error}</Text>
          <TouchableOpacity
            onPress={fetchRestaurants}
            style={styles.retryButton}
          >
            <Text style={{ color: "#fff" }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredRestaurants.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={{ color: "#888" }}>No restaurants found.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        >
          {filteredRestaurants.map((restaurant) => {
            const cuisineTypes = getCuisineTypes(restaurant);
            const displayAddress =
              restaurant.address || restaurant.service?.location || "Location";
            const isOpen = getOperatingStatus({
              openingHours: restaurant.openingHours,
              isActive: restaurant.isActive,
              acceptsOrders: restaurant.acceptsOrders,
            }).isOpen;

            return (
              <TouchableOpacity
                key={restaurant.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/restaurant-details",
                    params: { restaurantId: restaurant.id },
                  })
                }
              >
                {/* Image */}
                <View style={styles.imageContainer}>
                  {restaurant.imageUrl || restaurant.service?.imageUrl ? (
                    <Image
                      source={{
                        uri:
                          restaurant.imageUrl || restaurant.service?.imageUrl,
                      }}
                      style={styles.image}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons
                        name="restaurant-outline"
                        size={40}
                        color="#ccc"
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.activeBadge,
                      { backgroundColor: isOpen ? "#27AE60" : "#EF4444" },
                    ]}
                  >
                    <Text style={styles.activeBadgeText}>
                      {isOpen ? "OPEN" : "CLOSED"}
                    </Text>
                  </View>
                </View>

                {/* Info */}
                <View style={styles.infoContainer}>
                  <Text style={styles.name} numberOfLines={1}>
                    {restaurant.name}
                  </Text>
                  <Text style={styles.desc} numberOfLines={2}>
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
                    {cuisineTypes.map((category, index) => (
                      <View key={index} style={styles.cuisineBadge}>
                        <Text style={styles.cuisineBadgeText}>{category}</Text>
                      </View>
                    ))}
                  </ScrollView>

                  {/* Footer */}
                  <View style={styles.footerRow}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: PrimaryColor,
                          marginRight: 6,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#6B7280",
                          fontWeight: "500",
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {displayAddress}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: "#ff6b00",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#333" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: PrimaryColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 18,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.08)",
  },
  imageContainer: {
    height: 140,
    backgroundColor: "#f8f8f8",
    position: "relative",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  activeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeBadgeText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  infoContainer: { padding: 16 },
  name: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 4 },
  desc: { fontSize: 12, color: "#666", marginBottom: 8, lineHeight: 16 },
  cuisineBadge: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  cuisineBadgeText: { fontSize: 10, color: "#666", fontWeight: "500" },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationText: { fontSize: 12, color: "#666", marginLeft: 4 },
});
