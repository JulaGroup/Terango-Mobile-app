import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  StatusBar,
  Animated,
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
  discountedPrice?: number;
  imageUrl?: string;
}

export default function ViewAllStores() {
  const router = useRouter();
  const { cartItems } = useCart();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    if (!loading) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [loading, skeletonOpacity]);

  const SkeletonBox = ({
    w,
    h,
    style,
  }: {
    w: number | string;
    h: number;
    style?: any;
  }) => (
    <Animated.View
      style={[
        {
          width: w,
          height: h,
          backgroundColor: "#E5E7EB",
          borderRadius: 8,
          opacity: skeletonOpacity,
        },
        style,
      ]}
    />
  );

  const renderSkeletonCards = () => (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
    >
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.card, { overflow: "hidden" }]}>
          <SkeletonBox w="100%" h={140} style={{ borderRadius: 0 }} />
          <View style={{ padding: 16 }}>
            <SkeletonBox w="65%" h={16} style={{ marginBottom: 10 }} />
            <SkeletonBox w="100%" h={12} style={{ marginBottom: 6 }} />
            <SkeletonBox w="75%" h={12} style={{ marginBottom: 14 }} />
            <SkeletonBox
              w="40%"
              h={20}
              style={{ borderRadius: 8, marginBottom: 12 }}
            />
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <SkeletonBox w="55%" h={12} />
              <SkeletonBox w="25%" h={12} />
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

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
    shop.name.toLowerCase().includes(search.toLowerCase()),
  );

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
        <Text style={styles.headerTitle}>All Stores</Text>
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
          placeholder="Search stores..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Content */}
      {loading ? (
        renderSkeletonCards()
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color="#EF4444"
            style={{ marginBottom: 12 }}
          />
          <Text
            style={{
              color: "#EF4444",
              fontSize: 14,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {error}
          </Text>
          <TouchableOpacity onPress={fetchShops} style={styles.retryButton}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredShops.length === 0 ? (
        <View style={styles.loadingContainer}>
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: "#FFF0E6",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="storefront-outline"
              size={48}
              color={PrimaryColor}
            />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#1a1a1a",
              marginBottom: 6,
            }}
          >
            No stores found
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center" }}>
            {search
              ? `No results for "${search}"`
              : "Check back later for local stores"}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        >
          {filteredShops.map((shop) => {
            const isOpen = shop.isActive && shop.acceptsOrders;

            return (
              <TouchableOpacity
                key={shop.id}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => router.push(`/shop-details?shopId=${shop.id}`)}
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
                        backgroundColor: isOpen
                          ? "rgba(0,200,81,0.9)"
                          : "rgba(239,68,68,0.9)",
                      },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {isOpen ? "OPEN" : "CLOSED"}
                    </Text>
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
                  {/* {shop.minimumOrderAmount !== undefined && (
                    <Text style={styles.minOrderText}>
                      Min. order: D{shop.minimumOrderAmount.toFixed(2)}
                    </Text>
                  )} */}

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
                        {`${shop.city?.trim() ?? ""}${
                          shop.city && shop.address ? ", " : ""
                        }${shop.address?.trim() ?? "Location"}`}
                      </Text>
                    </View>
                    {/* <Text style={styles.reviewText}>{reviewCount} reviews</Text> */}
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
    fontSize: 20,
    fontWeight: "bold",
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
