import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import { API_URL } from "@/constants/config";

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

export default function ViewAllStores() {
  const router = useRouter();
  const { cartItems } = useCart();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/shops`);
      if (!response.ok) {
        throw new Error(`Failed to fetch shops: ${response.statusText}`);
      }
      const data = await response.json();
      const shopList = Array.isArray(data) ? data : data.data || [];
      setShops(shopList);
    } catch (err: any) {
      console.error("Error fetching shops:", err);
      setError(err.message || "Failed to load shops");
    } finally {
      setLoading(false);
    }
  };

  const filteredShops = shops.filter((shop) =>
    shop.name.toLowerCase().includes(search.toLowerCase())
  );

  // Generate random rating and review count if not available
  const getRandomRating = () => (Math.random() * (5.0 - 3.5) + 3.5).toFixed(1);
  const getRandomReviewCount = () =>
    Math.floor(Math.random() * (500 - 50) + 50);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Stores</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push("/cart")}
        >
          <Ionicons name="cart" size={22} color="#333" />
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
          placeholder="Search stores..."
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
          <TouchableOpacity onPress={fetchShops} style={styles.retryButton}>
            <Text style={{ color: "#fff" }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredShops.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={{ color: "#888" }}>No stores found.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        >
          {filteredShops.map((shop) => {
            const rating = shop.rating || parseFloat(getRandomRating());
            const reviewCount = shop.totalReviews || getRandomReviewCount();

            return (
              <TouchableOpacity
                key={shop.id}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/shop-details",
                    params: { shopId: shop.id },
                  })
                }
              >
                {/* Image */}
                <View style={styles.imageContainer}>
                  {shop.imageUrl ? (
                    <Image
                      source={{ uri: shop.imageUrl }}
                      style={styles.image}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="storefront" size={40} color="#ccc" />
                    </View>
                  )}

                  {/* Status Badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: shop.isActive
                          ? "rgba(0,200,81,0.9)"
                          : "rgba(239,68,68,0.9)",
                      },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {shop.isActive ? "Open" : "Closed"}
                    </Text>
                  </View>

                  {/* Rating Badge */}
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                  </View>
                </View>

                {/* Info */}
                <View style={styles.infoContainer}>
                  <Text style={styles.name} numberOfLines={1}>
                    {shop.name}
                  </Text>
                  <Text style={styles.desc} numberOfLines={2}>
                    {shop.description || "Quality products served fresh"}
                  </Text>

                  {/* Shop Type */}
                  {shop.shopType && (
                    <View style={styles.shopTypeBadge}>
                      <Text style={styles.shopTypeBadgeText}>
                        {shop.shopType}
                      </Text>
                    </View>
                  )}

                  {/* Minimum Order */}
                  {shop.minimumOrderAmount && shop.minimumOrderAmount > 0 && (
                    <Text style={styles.minOrderText}>
                      Min. order: D{shop.minimumOrderAmount.toFixed(2)}
                    </Text>
                  )}

                  {/* Footer */}
                  <View style={styles.footerRow}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                      }}
                    >
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#666"
                      />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {shop.address || shop.city || "Location"}
                      </Text>
                    </View>
                    <Text style={styles.reviewText}>{reviewCount} reviews</Text>
                  </View>

                  {/* Accepts Orders Badge */}
                  {shop.acceptsOrders && (
                    <View style={styles.acceptsOrdersBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color="#27AE60"
                      />
                      <Text style={styles.acceptsOrdersText}>
                        Accepts Orders
                      </Text>
                    </View>
                  )}
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
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
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
    borderColor: "rgba(0, 0, 0, 0.08)",
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
  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  ratingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: { color: "#fff", fontSize: 10, fontWeight: "600", marginLeft: 2 },
  infoContainer: { padding: 16 },
  name: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 4 },
  desc: { fontSize: 12, color: "#6B7280", marginBottom: 8, lineHeight: 16 },
  shopTypeBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  shopTypeBadgeText: { fontSize: 10, color: "#6B7280", fontWeight: "500" },
  minOrderText: { fontSize: 11, color: "#9CA3AF", marginBottom: 8 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: { fontSize: 12, color: "#6B7280", marginLeft: 4 },
  reviewText: { fontSize: 12, color: "#6B7280" },
  acceptsOrdersBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  acceptsOrdersText: {
    fontSize: 10,
    color: "#27AE60",
    fontWeight: "500",
    marginLeft: 4,
  },
});
