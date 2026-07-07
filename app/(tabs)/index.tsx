/**
 * TeranGO Super App Hub — Home Tab
 * Orange-themed Grab-style hub page.
 * Color palette: #ff6b00 (orange), #1a1a1a (black), #fff (white), #FFF5EE (light orange bg)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

// Hub-specific components
import HubHeader from "@/components/ui/home/HubHeader";
import ServiceGrid from "@/components/ui/home/ServiceGrid";
import HubDealBanners from "@/components/ui/home/HubDealBanners";

// Existing reusable components
import SearchBar from "@/components/common/SearchBar";
import PermissionHandler from "@/components/common/PermissionHandler";
import RestaurantNearYou from "@/components/ui/home/RestaurantNearYouNew";
import LocalShops from "@/components/ui/home/LocalShops";
import AdvertCard from "@/components/ui/home/AdvertCard";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "@/constants/config";
import { useCart } from "@/context/CartContext";
import VendorAwareMealItemCard from "@/components/common/VendorAwareMealItemCard";
import TeranGOPicks from "@/components/ui/home/TerangoPicks";

// ─── KërSpace Featured Section ──────────────────────────────────────────────
interface KerSpaceProperty {
  id: string;
  title: string;
  type: string;
  listingType: "FOR_SALE" | "FOR_RENT";
  price: number;
  currency: string;
  address: string;
  city: string;
  bedrooms: number | null;
  bathrooms: number | null;
  images: { url: string; isPrimary: boolean }[];
}

const formatKsPrice = (price: number, currency: string) => {
  if (price >= 1_000_000)
    return `${currency} ${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `${currency} ${(price / 1_000).toFixed(0)}K`;
  return `${currency} ${price.toLocaleString()}`;
};

// Module-level cache — persists across tab switches, cleared on full refresh
let _ksCache: { data: KerSpaceProperty[]; ts: number } | null = null;
const KS_TTL = 5 * 60 * 1000; // 5 minutes

const KerSpaceFeaturedSection = () => {
  const router = useRouter();
  const [properties, setProperties] = useState<KerSpaceProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = Date.now();
    if (_ksCache && now - _ksCache.ts < KS_TTL) {
      setProperties(_ksCache.data);
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/api/kerspace/properties?featured=true&limit=6`)
      .then((r) => r.json())
      .then((json) => {
        const data = json.data || [];
        _ksCache = { data, ts: Date.now() };
        setProperties(data);
      })
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && properties.length === 0) return null;

  return (
    <View style={{ paddingTop: 4, paddingBottom: 8 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          marginBottom: 14,
        }}
      >
        <View>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: "#1a1a1a",
                letterSpacing: -0.5,
              }}
            >
              Kër
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: "#ff6b00",
                letterSpacing: -0.5,
              }}
            >
              Space
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
            Real Estate · Gambia
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/kerspace" as any)}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: "#FFF5EE",
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 20,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#ff6b00" }}>
            Browse All
          </Text>
          <Ionicons name="arrow-forward" size={12} color="#ff6b00" />
        </TouchableOpacity>
      </View>

      {/* Skeleton */}
      {loading ? (
        <FlatList
          horizontal
          data={[1, 2, 3]}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          keyExtractor={(i) => `ks-sk-${i}`}
          renderItem={() => (
            <View
              style={{
                width: 220,
                height: 200,
                backgroundColor: "#f0f0f0",
                borderRadius: 16,
                marginRight: 12,
              }}
            />
          )}
        />
      ) : (
        <FlatList
          horizontal
          data={properties}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => {
            const img = item.images.find((i) => i.isPrimary) || item.images[0];
            return (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/kerspace/[id]",
                    params: { id: item.id },
                  } as any)
                }
                activeOpacity={0.92}
                style={{
                  width: 220,
                  marginRight: 12,
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: "#fff",
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                {/* Image + gradient */}
                <View style={{ height: 140, position: "relative" }}>
                  {img ? (
                    <Image
                      source={{ uri: img.url }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={300}
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: "#F5F0EB",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="home-outline" size={36} color="#C0A090" />
                    </View>
                  )}
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.72)"]}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 80,
                      justifyContent: "flex-end",
                      paddingHorizontal: 10,
                      paddingBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: "900",
                        letterSpacing: -0.3,
                      }}
                    >
                      {formatKsPrice(item.price, item.currency)}
                    </Text>
                  </LinearGradient>
                  {/* Listing type badge */}
                  <View
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      backgroundColor:
                        item.listingType === "FOR_SALE" ? "#1E3A5F" : "#5B2D8E",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 10,
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}
                    >
                      {item.listingType === "FOR_SALE"
                        ? "For Sale"
                        : "For Rent"}
                    </Text>
                  </View>
                </View>
                {/* Info */}
                <View style={{ padding: 10 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: "#1a1a1a",
                    }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      marginTop: 3,
                    }}
                  >
                    <Ionicons name="location-outline" size={11} color="#aaa" />
                    <Text
                      style={{ fontSize: 11, color: "#888" }}
                      numberOfLines={1}
                    >
                      {item.address}, {item.city}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

// ─── Trending Meal types ──────────────────────────────────────────────────────
interface TrendingMeal {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  description?: string;
  menu?: { restaurant?: { id?: string; name?: string } };
}

// ─── Trending Meals Section ───────────────────────────────────────────────────
const TrendingMealsSection = ({ refreshKey }: { refreshKey: number }) => {
  const router = useRouter();
  const { addToCart, removeFromCart, getQuantity } = useCart();
  const [meals, setMeals] = useState<TrendingMeal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/public/meals/trending?limit=8`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMeals(Array.isArray(data) ? data : data.data || []);
    } catch {
      setMeals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeals();
  }, [refreshKey, fetchMeals]);

  const handleMealPress = (id: string) => {
    router.push({ pathname: "/menuitem/[id]", params: { id } } as any);
  };

  return (
    <View style={{ paddingTop: 4, paddingBottom: 8 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          marginBottom: 12,
        }}
      >
        <View>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#1a1a1a" }}>
            Top Meals Near You
          </Text>
          <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Most ordered right now
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/food" as any)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#ff6b00" }}>
            See All
          </Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <FlatList
          data={[1, 2, 3, 4]}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          keyExtractor={(item) => `m-sk-${item}`}
          renderItem={() => (
            <View
              style={{
                width: 155,
                height: 175,
                backgroundColor: "#f0f0f0",
                borderRadius: 14,
                marginRight: 12,
              }}
            />
          )}
        />
      ) : meals.length > 0 ? (
        <FlatList
          data={meals}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <View style={{ width: 280, marginRight: 12 }}>
              <VendorAwareMealItemCard
                product={{
                  id: Number(item.id),
                  name: item.name,
                  price: item.price,
                  discountedPrice: item.discountedPrice,
                  image: item.imageUrl,
                  description: item.description,
                  inStock: true,
                }}
                cartQuantity={getQuantity(item.id)}
                onAddToCart={() =>
                  addToCart({
                    id: item.id,
                    name: item.name,
                    price: item.discountedPrice || item.price,
                    imageUrl: item.imageUrl || "",
                    vendorId: item.menu?.restaurant?.id || "",
                    vendorName: item.menu?.restaurant?.name || "Restaurant",
                    entityType: "RESTAURANT",
                  })
                }
                onRemoveFromCart={() => removeFromCart(item.id)}
                onPress={() => handleMealPress(item.id)}
                vendor={{
                  vendorId: item.menu?.restaurant?.id,
                  vendorType: "restaurant",
                  vendorName: item.menu?.restaurant?.name,
                }}
              />
            </View>
          )}
        />
      ) : (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Ionicons name="restaurant-outline" size={36} color="#ddd" />
          <Text style={{ color: "#bbb", marginTop: 6, fontSize: 13 }}>
            No trending meals found
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── Divider ─────────────────────────────────────────────────────────────────
export const Divider = () => (
  <View style={{ height: 8, backgroundColor: "#f5f5f5", marginVertical: 4 }} />
);

// ─── Quick Actions row (wallet / vouchers / rewards) ─────────────────────────
const QUICK_ACTIONS = [
  { icon: "💳", label: "TPay", sub: "Coming Soon" },
  { icon: "🎟️", label: "Vouchers", sub: "Coming Soon" },
  { icon: "⭐", label: "Rewards", sub: "Coming Soon" },
];

const QuickActions = () => {
  const actions = QUICK_ACTIONS;
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
      }}
    >
      {actions.map((a) => (
        <TouchableOpacity
          key={a.label}
          activeOpacity={0.8}
          style={{
            flex: 1,
            backgroundColor: "#FFF5EE",
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "rgba(255,107,0,0.12)",
          }}
        >
          <Text style={{ fontSize: 20 }}>{a.icon}</Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#1a1a1a",
              marginTop: 4,
            }}
          >
            {a.label}
          </Text>
          <Text style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>
            {a.sub}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── Main Hub Screen ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const showStickySearch = scrollY.interpolate({
    inputRange: [80, 110],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // The sticky search bar overlay sits on top of the header (location button,
  // notif bell, etc.) with zIndex 1000. It was previously given
  // `pointerEvents: "auto"` at ALL times (even while fully transparent before
  // scrolling), so on Android/iOS it silently swallowed every tap in that top
  // strip — including taps meant for the location button — and routed them to
  // "/search" instead. Track the real visibility in state (driven by the same
  // scroll offset) so we only let it capture touches once it has actually
  // faded in.
  const [stickySearchVisible, setStickySearchVisible] = useState(false);
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const visible = value >= 100;
      setStickySearchVisible((prev) => (prev === visible ? prev : visible));
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#ff6b00",
        paddingTop: Platform.OS === "android" ? 20 : 0,
      }}
    >
      {/* Sticky search bar (appears on scroll) */}
      <Animated.View
        style={{
          position: "absolute",
          top: Platform.OS === "android" ? 25 : Platform.OS === "web" ? 0 : 44,
          left: 0,
          right: 0,
          zIndex: 1000,
          opacity: showStickySearch,
          backgroundColor: "#ff6b00",
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
        pointerEvents={
          Platform.OS === "web" ? "none" : stickySearchVisible ? "auto" : "none"
        }
      >
        <SearchBar
          value=""
          onChangeText={() => {}}
          onPress={() => router.push("/search")}
          editable={false}
          fullWidth
        />
      </Animated.View>

      {/* Scrollable Content */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
            colors={["#ff6b00"]}
          />
        }
      >
        {/* ① Orange header (location + notif + profile) */}
        <HubHeader />

        {/* White body */}
        <View style={{ backgroundColor: "#fff" }}>
          {/* ② Search bar */}
          <View style={{ paddingVertical: 10 }}>
            <SearchBar
              value=""
              onChangeText={() => {}}
              onPress={() => router.push("/search")}
              editable={false}
            />
          </View>

          {/* ③ Service cards grid */}
          <ServiceGrid />

          {/* ④ Quick actions */}
          {/* <QuickActions /> */}

          {/* <Divider /> */}

          <Divider />

          {/* ⑥ Promo adverts from backend */}
          <AdvertCard position="HOME_TOP" refreshKey={refreshKey} />
          <Divider />

          <TeranGOPicks />
          <Divider />

          {/* ⑤ Deal banners */}
          <HubDealBanners />
          <Divider />

          {/* ⑦ Top Meals */}
          {/* <TrendingMealsSection refreshKey={refreshKey} /> */}

          {/* <Divider /> */}

          {/* ⑧ Restaurants Near You (component has its own header) */}
          <RestaurantNearYou refreshKey={refreshKey} />

          <Divider />

          {/* ⑨ Mid-page advert */}
          <AdvertCard
            position="HOME_AFTER_RESTAURANTS"
            refreshKey={refreshKey}
          />

          {/* <Divider /> */}

          {/* ⑩ KërSpace Featured Properties */}
          {/* <KerSpaceFeaturedSection /> */}

          <Divider />

          {/* ⑪ Stores / Mart (component has its own header) */}
          <LocalShops refreshKey={refreshKey} />
        </View>
      </Animated.ScrollView>

      {/* Permission Modals */}
      <PermissionHandler />
    </SafeAreaView>
  );
}
