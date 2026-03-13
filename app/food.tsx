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
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
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

const { width } = Dimensions.get("window");
const CARD_W = (width - 32 - 9 * 3) / 4; // 4-col grid

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
  { id: "all", label: "All" },
  { id: "fast-food", label: "Fast Food" },
  { id: "local", label: "Local Dishes" },
  { id: "african", label: "African" },
  { id: "street", label: "Street Food" },
  { id: "breakfast", label: "Breakfast" },
  { id: "bakery", label: "Bakery" },
  { id: "beverages", label: "Drinks" },
  { id: "desserts", label: "Desserts" },
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

// ─── Category card (lazy image) ───────────────────────────────────────────────
const CategoryCard = ({
  item,
  onPress,
}: {
  item: FoodCategory;
  onPress: (id: string, name: string) => void;
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  return (
    <TouchableOpacity
      onPress={() => onPress(item.id, item.name)}
      activeOpacity={0.78}
      style={{ width: CARD_W, alignItems: "center", marginBottom: 14 }}
    >
      <View
        style={{
          width: CARD_W,
          height: CARD_W,
          backgroundColor: "#FFF5EE",
          borderRadius: 14,
          overflow: "hidden",
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 1,
          borderColor: "rgba(255,107,0,0.1)",
        }}
      >
        {item.imageUrl ? (
          <>
            {!imgLoaded && <Skeleton w="100%" h={CARD_W} radius={14} />}
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: "100%", height: "100%", position: "absolute" }}
              contentFit="cover"
              onLoad={() => setImgLoaded(true)}
              transition={300}
            />
          </>
        ) : (
          <Ionicons name="restaurant-outline" size={28} color="#ff6b00" />
        )}
      </View>
      <Text
        numberOfLines={2}
        style={{
          marginTop: 5,
          fontSize: 11,
          fontWeight: "600",
          color: "#1a1a1a",
          textAlign: "center",
        }}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );
};

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
      <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#ff6b00" }}>
          See All
        </Text>
      </TouchableOpacity>
    )}
  </View>
);

const Divider = () => (
  <View style={{ height: 8, backgroundColor: "#f5f5f5", marginVertical: 4 }} />
);

// ─── Food Page ────────────────────────────────────────────────────────────────
export default function FoodPage() {
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
  const categoryPairs = useMemo(() => {
    const pairs: FoodCategory[][] = [];
    for (let i = 0; i < categories.length; i += 2) {
      pairs.push(categories.slice(i, i + 2));
    }
    return pairs;
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
              {FOOD_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => handleFilterPress(f.id, f.label)}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor:
                      activeFilter === f.id ? "#ff6b00" : "#f5f5f5",
                    borderWidth: activeFilter === f.id ? 0 : 1,
                    borderColor: "#eee",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: activeFilter === f.id ? "#fff" : "#555",
                    }}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Divider />

            {/* ── Promo banners (free delivery + launch offer) ── */}
            <PromoBanner />

            {/* ── Category grid (2-row horizontal slider) ──── */}
            <SectionHeader title="Browse by Category" />
            {catLoading ? (
              <FlatList
                horizontal
                data={[1, 2, 3, 4, 5, 6]}
                keyExtractor={(i) => `cat-sk-${i}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  gap: 10,
                }}
                renderItem={() => (
                  <View style={{ gap: 8 }}>
                    <View style={{ alignItems: "center" }}>
                      <Skeleton w={CARD_W} h={CARD_W} radius={14} />
                      <View style={{ marginTop: 5 }}>
                        <Skeleton w={CARD_W * 0.75} h={10} />
                      </View>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Skeleton w={CARD_W} h={CARD_W} radius={14} />
                      <View style={{ marginTop: 5 }}>
                        <Skeleton w={CARD_W * 0.75} h={10} />
                      </View>
                    </View>
                  </View>
                )}
              />
            ) : (
              <FlatList
                horizontal
                data={categoryPairs}
                keyExtractor={(_, i) => `cat-col-${i}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
                renderItem={({ item: pair }) => (
                  <View style={{ marginRight: 10 }}>
                    {pair.map((cat) => (
                      <CategoryCard
                        key={cat.id}
                        item={cat}
                        onPress={handleCategoryPress}
                      />
                    ))}
                  </View>
                )}
              />
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

            {/* ── Restaurants Near You ───────────────────── */}
            <SectionHeader
              title="Restaurants Near You"
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
