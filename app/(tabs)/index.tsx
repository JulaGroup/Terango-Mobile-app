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

// Hub-specific components
import HubHeader from "@/components/ui/home/HubHeader";
import ServiceGrid from "@/components/ui/home/ServiceGrid";
import HubDealBanners from "@/components/ui/home/HubDealBanners";

// Existing reusable components
import SearchModal from "@/components/common/SearchModal";
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
const QuickActions = () => {
  const actions = [
    { icon: "💳", label: "TPay", sub: "Coming Soon" },
    { icon: "🎟️", label: "Vouchers", sub: "Coming Soon" },
    { icon: "⭐", label: "Rewards", sub: "Coming Soon" },
  ];
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
  const [searchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const showStickySearch = scrollY.interpolate({
    inputRange: [80, 110],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

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
          pointerEvents: Platform.OS === "web" ? "none" : "auto",
        }}
      >
        <SearchBar
          value=""
          onChangeText={() => {}}
          onPress={() => setSearchModalVisible(true)}
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
              onPress={() => setSearchModalVisible(true)}
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

          <Divider />

          {/* ⑩ Stores / Mart (component has its own header) */}
          <LocalShops refreshKey={refreshKey} />
        </View>
      </Animated.ScrollView>

      {/* Permission Modals */}
      <PermissionHandler />

      {/* Search Modal */}
      <SearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        initialQuery={searchText}
      />
    </SafeAreaView>
  );
}
