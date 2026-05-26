/**
 * Food Page — Dedicated food discovery page.
 * Orange-themed header with back navigation, food subcategories, lazy-load
 * category grid, and sections: Top Meals, Cheap Eats, Restaurants Near You.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_URL } from "@/constants/config";
import { useCart } from "@/context/CartContext";
import { useAddress } from "@/context/AddressContext";
import Cart from "@/components/common/Cart";
import SearchBar from "@/components/common/SearchBar";
import SearchModal from "@/components/common/SearchModal";
import LocationModal from "@/components/common/LocationModal";
import RestaurantNearYou from "@/components/ui/home/RestaurantNearYouNew";
import VendorAwareProductCard from "@/components/common/VendorAwareProductCard";
import ActiveOrderBanner from "@/components/ui/home/ActiveOrderBanner";
import PromoBanner from "@/components/ui/home/PromoBanner";
import { useMaintenance } from "@/context/MaintenanceContext";
import MaintenanceScreen from "@/components/common/MaintenanceScreen";

const { width } = Dimensions.get("window");
const CARD_W = (width - 32 - 9 * 3) / 4; // 4-col grid
const CAT_W = (width - 32 - 8 * 3) / 4;
const CAT_H = Math.round(CAT_W * 1.25);

// ─── Types ────────────────────────────────────────────────────────────────────
interface FoodCategory {
  id: string;
  name: string;
  imageUrl?: string;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  isAvailable: boolean;
  menu?: { restaurant?: { id?: string; name?: string } };
}

// ─── Food subcategory filter chips ───────────────────────────────────────────
const FOOD_FILTERS = [
  { id: "all", label: "All", icon: "apps-outline" },
  { id: "fast-food", label: "Fast Food", icon: "fast-food-outline" },
  { id: "local", label: "Local Dishes", icon: "leaf-outline" },
  { id: "african", label: "African", icon: "earth-outline" },
  { id: "street", label: "Street Food", icon: "walk-outline" },
  { id: "breakfast", label: "Breakfast", icon: "sunny-outline" },
  { id: "bakery", label: "Bakery", icon: "cafe-outline" },
  { id: "beverages", label: "Drinks", icon: "wine-outline" },
  { id: "desserts", label: "Desserts", icon: "ice-cream-outline" },
];

const CRAVINGS = [
  "Benachin",
  "Domoda",
  "Shawarma",
  "Afra",
  "Yassa",
  "Thiébou Jën",
  "Soup",
];

// ─── Skeleton pulse ───────────────────────────────────────────────────────────
const Skeleton = ({
  w,
  h,
  radius = 8,
}: {
  w: number | string;
  h: number;
  radius?: number;
}) => {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim]);
  return (
    <Animated.View
      style={{
        width: w as any,
        height: h,
        backgroundColor: "#e8e8e8",
        borderRadius: radius,
        opacity: anim,
      }}
    />
  );
};

// ─── Category card — 3-col grid with gradient overlay ────────────────────────
const CategoryCard3Col = ({
  item,
  onPress,
}: {
  item: FoodCategory;
  onPress: (id: string, name: string) => void;
}) => (
  <TouchableOpacity
    onPress={() => onPress(item.id, item.name)}
    activeOpacity={0.8}
    style={{
      width: CAT_W,
      height: CAT_H,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: "#FFF5EE",
    }}
  >
    {item.imageUrl ? (
      <Image
        source={{ uri: item.imageUrl }}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={300}
      />
    ) : (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="restaurant-outline" size={32} color="#ff6b00" />
      </View>
    )}
    <LinearGradient
      colors={["transparent", "rgba(0,0,0,0.72)"]}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: CAT_H * 0.55,
        justifyContent: "flex-end",
        padding: 8,
      }}
    >
      <Text
        numberOfLines={2}
        style={{
          color: "#fff",
          fontSize: 11,
          fontWeight: "700",
          lineHeight: 14,
        }}
      >
        {item.name}
      </Text>
    </LinearGradient>
  </TouchableOpacity>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({
  title,
  subtitle,
  onSeeAll,
}: {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}) => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      paddingHorizontal: 16,
      marginTop: 20,
      marginBottom: 12,
    }}
  >
    <View>
      <Text style={{ fontSize: 17, fontWeight: "700", color: "#1a1a1a" }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          {subtitle}
        </Text>
      )}
    </View>
    {onSeeAll && (
      <TouchableOpacity
        onPress={onSeeAll}
        activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center" }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#ff6b00" }}>
          See All
        </Text>
        <Ionicons name="chevron-forward" size={14} color="#ff6b00" />
      </TouchableOpacity>
    )}
  </View>
);

const Divider = () => (
  <View style={{ height: 8, backgroundColor: "#f5f5f5", marginVertical: 4 }} />
);

// ─── Food Page ────────────────────────────────────────────────────────────────
export default function FoodPage() {
  const { flags } = useMaintenance();
  const router = useRouter();
  const { selectedAddress, setSelectedAddress } = useAddress();
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [topMeals, setTopMeals] = useState<MenuItem[]>([]);
  const [mealsLoading, setMealsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { addToCart, getQuantity, removeFromCart } = useCart();
  const displayAddress = useMemo(() => {
    if (!selectedAddress) return "Set Delivery Location";
    if (selectedAddress.id === "current")
      return selectedAddress.addressLine || "Current Location";
    const parts = [selectedAddress.addressLine, selectedAddress.city].filter(
      Boolean,
    );
    const full = parts.join(", ");
    return full.length > 28 ? `${full.substring(0, 28)}\u2026` : full;
  }, [selectedAddress]);
  const categoryRows = useMemo(() => {
    const rows: FoodCategory[][] = [];
    for (let i = 0; i < categories.length; i += 4) {
      rows.push(categories.slice(i, i + 4));
    }
    return rows;
  }, [categories]);

  const fetchCategories = useCallback(async () => {
    try {
      setCatLoading(true);
      const res = await fetch(
        `${API_URL}/api/subcategories/category/095eb4ff-362f-455b-90eb-a1df9f86e442`,
      );
      const data = await res.json();
      const list: FoodCategory[] = Array.isArray(data) ? data : data.data || [];
      setCategories(list);
    } catch {
      setCategories([]);
    } finally {
      setCatLoading(false);
    }
  }, []);

  // const fetchMeals = useCallback(async () => {
  //   try {
  //     setMealsLoading(true);
  //     const res = await fetch(`${API_URL}/api/public/meals/trending?limit=8`);
  //     if (!res.ok) throw new Error();
  //     const data = await res.json();
  //     const all: MenuItem[] = Array.isArray(data) ? data : data.data || [];
  //     setTopMeals(all.slice(0, 8));
  //   } catch {
  //     // Silently fail — section remains empty
  //   } finally {
  //     setMealsLoading(false);
  //   }
  // }, []);

  useEffect(() => {
    fetchCategories();
    // fetchMeals();
  }, [
    refreshKey,
    fetchCategories,
    //  fetchMeals
  ]);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleCategoryPress = (id: string, name: string) => {
    router.push({
      pathname: "/SubCategoryView",
      params: { subCategoryId: id, subCategoryName: name },
    } as any);
  };

  const handleFilterPress = useCallback(
    (filterId: string, filterLabel: string) => {
      setActiveFilter(filterId);
      if (filterId === "all") {
        router.push("/ViewAllRestaurants" as any);
        return;
      }
      const match = categories.find((cat) => {
        const catName = cat.name.toLowerCase();
        const label = filterLabel.toLowerCase();
        return (
          catName.includes(label) ||
          label.includes(catName) ||
          label.split(" ").some((w) => w.length > 3 && catName.includes(w))
        );
      });
      if (match) {
        router.push({
          pathname: "/SubCategoryView",
          params: { subCategoryId: match.id, subCategoryName: match.name },
        } as any);
      } else {
        router.push("/ViewAllRestaurants" as any);
      }
    },
    [categories, router],
  );

  const handleMealPress = (id: string) => {
    router.push({ pathname: "/menuitem/[id]", params: { id } } as any);
  };

  if (flags.restaurantMaintenanceMode) {
    return <MaintenanceScreen serviceName="Restaurant Ordering" />;
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#ff6b00",
        paddingTop: Platform.OS === "android" ? 20 : 0,
      }}
    >
      {/* ── Fixed orange top-bar (2 rows) ────────────── */}
      <View
        style={{
          backgroundColor: "#ff6b00",
          paddingHorizontal: 16,
          paddingBottom: 10,
          paddingTop: 6,
          gap: 10,
        }}
      >
        {/* Row 1: Back · Location · Cart */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: "rgba(255,255,255,0.22)",
              padding: 8,
              borderRadius: 10,
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Delivery location — tappable, opens full modal */}
          <TouchableOpacity
            onPress={() => setLocationModalVisible(true)}
            activeOpacity={0.8}
            style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
          >
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.25)",
                borderRadius: 8,
                padding: 5,
                marginRight: 8,
              }}
            >
              <Ionicons name="location-sharp" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: "400",
                }}
              >
                Deliver to
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14,
                    color: "#fff",
                    fontWeight: "700",
                    flex: 1,
                  }}
                >
                  {displayAddress}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color="#fff"
                  style={{ marginLeft: 4 }}
                />
              </View>
            </View>
          </TouchableOpacity>

          <Cart />
        </View>

        {/* Row 2: Search bar */}
        <SearchBar
          value=""
          onChangeText={() => {}}
          onPress={() => setSearchModalVisible(true)}
          editable={false}
          fullWidth
        />
      </View>

      {/* ── Scrollable content ────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: "#ff6b00" }}
        contentContainerStyle={{ paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
            colors={["#ff6b00"]}
          />
        }
      >
        <View style={{ backgroundColor: "#ff6b00" }}>
          {/* ── Page title ──────────────────────────────── */}
          <View
            style={{
              backgroundColor: "#ff6b00",
              paddingHorizontal: 16,
              paddingBottom: 16,
              paddingTop: 4,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#fff" }}>
              Food
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.85)",
                marginTop: 2,
              }}
            >
              Restaurants, local dishes & more
            </Text>
          </View>

          {/* ── White content card — swoosh ── */}
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
            }}
          >
            {/* ── Filter chips ────────────────────────────── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 8,
              }}
              style={{ backgroundColor: "#fff" }}
            >
              {FOOD_FILTERS.map((f) => {
                const isActive = activeFilter === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => handleFilterPress(f.id, f.label)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 14,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: isActive ? "#ff6b00" : "#f5f5f5",
                      borderWidth: isActive ? 0 : 1,
                      borderColor: "#eee",
                      gap: 5,
                    }}
                  >
                    <Ionicons
                      name={f.icon as any}
                      size={15}
                      color={isActive ? "#fff" : "#888"}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isActive ? "#fff" : "#555",
                      }}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Divider />

            {/* ── Promo banners (free delivery + launch offer) ── */}
            <PromoBanner />

            {/* ── Category grid (3-col) ──── */}
            <SectionHeader title="Categories" />
            {catLoading ? (
              <View style={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
                {[0, 1].map((ri) => (
                  <View key={ri} style={{ flexDirection: "row", gap: 8 }}>
                    {[0, 1, 2, 3].map((ci) => (
                      <Skeleton key={ci} w={CAT_W} h={CAT_H} radius={14} />
                    ))}
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
                {categoryRows.map((row, ri) => (
                  <View
                    key={`row-${ri}`}
                    style={{ flexDirection: "row", gap: 8 }}
                  >
                    {row.map((cat) => (
                      <CategoryCard3Col
                        key={cat.id}
                        item={cat}
                        onPress={handleCategoryPress}
                      />
                    ))}
                    {row.length < 4 &&
                      Array.from({ length: 4 - row.length }).map((_, j) => (
                        <View key={`empty-${j}`} style={{ width: CAT_W }} />
                      ))}
                  </View>
                ))}
              </View>
            )}

            <Divider />

            {/* ── Top Meals ──────────────────────────────── */}
            {/* <SectionHeader
            title="Top Meals"
            subtitle="Most ordered by customers"
            onSeeAll={() => router.push("/ViewAllRestaurants" as any)}
          />
          {mealsLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={{ width: 170 }}>
                  <Skeleton w={170} h={110} radius={14} />
                  <View style={{ marginTop: 8 }}>
                    <Skeleton w={120} h={12} />
                    <View style={{ marginTop: 5 }}>
                      <Skeleton w={70} h={12} />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : topMeals.length > 0 ? (
            <FlatList
              data={topMeals}
              keyExtractor={(m) => m.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              renderItem={({ item }) => (
                <VendorAwareProductCard
                  product={{
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    discountedPrice: item.discountedPrice,
                    image: item.imageUrl,
                    inStock: item.isAvailable ?? true,
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
                  cardWidth={160}
                  vendor={{
                    vendorId: item.menu?.restaurant?.id,
                    vendorType: "restaurant",
                    vendorName: item.menu?.restaurant?.name,
                  }}
                />
              )}
            />
          ) : (
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 20,
                alignItems: "center",
              }}
            >
              <Ionicons name="restaurant-outline" size={40} color="#ddd" />
              <Text style={{ color: "#bbb", marginTop: 8, fontSize: 13 }}>
                Meals loading…
              </Text>
            </View>
          )}

          <Divider /> */}

            {/* ── Restaurants & Bakeries Near You ───────────────────── */}
            <SectionHeader
              title="Restaurants & Bakeries Near You"
              subtitle="Order from local favourites"
              onSeeAll={() => router.push("/ViewAllRestaurants" as any)}
            />
            <RestaurantNearYou refreshKey={refreshKey} hideHeader={true} />
          </View>
        </View>
      </ScrollView>

      {/* Live order tracker — visible only when there are active orders */}
      <ActiveOrderBanner />

      {/* Search Modal */}
      <SearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        initialQuery=""
      />

      {/* Location Modal */}
      <LocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onSelectAddress={(addr) => {
          setSelectedAddress(addr);
          setLocationModalVisible(false);
        }}
        currentAddress={selectedAddress?.addressLine || ""}
      />
    </SafeAreaView>
  );
}
