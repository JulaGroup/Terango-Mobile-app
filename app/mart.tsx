/**
 * Mart Page — Groceries, Pharmacy, Home Essentials & more.
 * Orange-themed header with back navigation, mart subcategory chips,
 * category grid, and featured store sections.
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
import LocalShops from "@/components/ui/home/LocalShops";
import VendorAwareProductCard from "@/components/common/VendorAwareProductCard";
import ActiveOrderBanner from "@/components/ui/home/ActiveOrderBanner";
import PromoBanner from "@/components/ui/home/PromoBanner";
import TeranGOPicks from "@/components/ui/home/TerangoPicks";
import { useMaintenance } from "@/context/MaintenanceContext";
import MaintenanceScreen from "@/components/common/MaintenanceScreen";

const { width } = Dimensions.get("window");
const CARD_W = (width - 32 - 9 * 3) / 4;

// ─── Types ────────────────────────────────────────────────────────────────────
interface MartCategory {
  id: string;
  name: string;
  imageUrl?: string;
  icon?: string;
}

interface TrendingProduct {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  shopId?: string;
  shop?: { id?: string; name?: string };
}

// ─── Mart filter chips ────────────────────────────────────────────────────────
const MART_FILTERS = [
  { id: "all", label: "All", icon: "grid-outline" as const },
  { id: "groceries", label: "Groceries", icon: "basket-outline" as const },
  { id: "pharmacy", label: "Pharmacy", icon: "medical-outline" as const },
  { id: "fresh", label: "Fresh", icon: "leaf-outline" as const },
  { id: "frozen", label: "Frozen", icon: "snow-outline" as const },
  { id: "snacks", label: "Snacks", icon: "pizza-outline" as const },
  { id: "drinks", label: "Drinks", icon: "wine-outline" as const },
  { id: "home", label: "Home Care", icon: "home-outline" as const },
  { id: "baby", label: "Baby", icon: "heart-outline" as const },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
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

// ─── Trending Product Card ─────────────────────────────────────────────────

// ─── Category card ────────────────────────────────────────────────────────────
const CategoryCard = ({
  item,
  onPress,
}: {
  item: MartCategory;
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
          <Ionicons name="storefront-outline" size={28} color="#ff6b00" />
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

// ─── Featured store card ──────────────────────────────────────────────────────
const FeaturedCategoryBanner = ({
  label,
  sub,
  icon,
  color,
  onPress,
}: {
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={{
      width: 148,
      backgroundColor: color,
      borderRadius: 16,
      padding: 14,
      height: 110,
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "flex-start",
      gap: 10,
    }}
  >
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.18)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Ionicons name={icon} size={20} color="#fff" />
    </View>
    <View style={{ gap: 2 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "800",
          color: "#fff",
          letterSpacing: 0.1,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 10.5,
          color: "rgba(255,255,255,0.75)",
          lineHeight: 14,
        }}
      >
        {sub}
      </Text>
    </View>
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

// ─── Mart Page ────────────────────────────────────────────────────────────────
export default function MartPage() {
  const { flags } = useMaintenance();
  const router = useRouter();
  const { addToCart, getQuantity, removeFromCart } = useCart();
  const { selectedAddress, setSelectedAddress } = useAddress();
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
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [categories, setCategories] = useState<MartCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>(
    [],
  );
  const [productsLoading, setProductsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const categoryPairs = useMemo(() => {
    const pairs: MartCategory[][] = [];
    for (let i = 0; i < categories.length; i += 2) {
      pairs.push(categories.slice(i, i + 2));
    }
    return pairs;
  }, [categories]);

  // Fetch subcategories for mart categories only (Groceries + Pharmacy + Home Essentials)
  const MART_CATEGORY_IDS = [
    "0908cba0-3afa-4518-baff-c318c7b49f56", // Groceries
    "b61f14eb-25e6-4faa-8807-53dc376565e5", // Pharmacy
    "ee51a540-afca-4450-8806-7b1255d88bec", // Home Essentials
  ];

  const fetchCategories = useCallback(async () => {
    try {
      setCatLoading(true);
      const results = await Promise.all(
        MART_CATEGORY_IDS.map((id) =>
          fetch(`${API_URL}/api/subcategories/category/${id}`).then((r) =>
            r.json(),
          ),
        ),
      );
      const merged: MartCategory[] = results.flatMap((d) =>
        Array.isArray(d) ? d : d.data || [],
      );
      setCategories(merged);
    } catch {
      setCategories([]);
    } finally {
      setCatLoading(false);
    }
  }, []);

  // const fetchTrendingProducts = useCallback(async () => {
  //   try {
  //     setProductsLoading(true);
  //     const res = await fetch(
  //       `${API_URL}/api/public/products/trending?limit=8`,
  //     );
  //     if (!res.ok) throw new Error();
  //     const data = await res.json();
  //     setTrendingProducts(Array.isArray(data) ? data : data.data || []);
  //   } catch {
  //     setTrendingProducts([]);
  //   } finally {
  //     setProductsLoading(false);
  //   }
  // }, []);

  useEffect(() => {
    fetchCategories();
    // fetchTrendingProducts();
  }, [
    refreshKey,
    fetchCategories,
    // fetchTrendingProducts
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

  if (flags.shopMaintenanceMode) {
    return <MaintenanceScreen serviceName="Shop Ordering" />;
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#ff6b00",
        paddingTop: Platform.OS === "android" ? 20 : 0,
      }}
    >
      {/* Orange top-bar (2 rows: location + search) */}
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
          {/* ── Page title ──────────────────── */}
          <View
            style={{
              backgroundColor: "#ff6b00",
              paddingHorizontal: 16,
              paddingBottom: 16,
              paddingTop: 4,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#fff" }}>
              Mart
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.85)",
                marginTop: 2,
              }}
            >
              Groceries, pharmacy, home essentials & more
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
            {/* ── Filter chips ────────────────── */}
            {/* <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 8,
              }}
              style={{ backgroundColor: "#fff" }}
            >
              {MART_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setActiveFilter(f.id)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor:
                      activeFilter === f.id ? "#ff6b00" : "#f5f5f5",
                    borderWidth: activeFilter === f.id ? 0 : 1,
                    borderColor: "#eee",
                  }}
                >
                  <Ionicons
                    name={f.icon}
                    size={13}
                    color={activeFilter === f.id ? "#fff" : "#555"}
                  />
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
            </ScrollView> */}

            {/* <Divider /> */}

            {/* ── Promo banners (free delivery + launch offer) ── */}
            <PromoBanner />

            {/* ── Featured category banners (1-row horizontal slider) ─── */}
            <SectionHeader title="Shop By Type" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 4,
                gap: 10,
              }}
            >
              <FeaturedCategoryBanner
                label="Groceries"
                sub="Fresh & everyday essentials"
                icon="basket-outline"
                color="#ff6b00"
                onPress={() => router.push("/AllCategoriesPage" as any)}
              />
              <FeaturedCategoryBanner
                label="Pharmacy"
                sub="Health & wellness products"
                icon="medical-outline"
                color="#1a1a1a"
                onPress={() => router.push("/AllCategoriesPage" as any)}
              />
              <FeaturedCategoryBanner
                label="Home Care"
                sub="Cleaning & household items"
                icon="home-outline"
                color="#e85d04"
                onPress={() => router.push("/AllCategoriesPage" as any)}
              />
              <FeaturedCategoryBanner
                label="Fresh Produce"
                sub="Vegetables, fruits & dairy"
                icon="leaf-outline"
                color="#333"
                onPress={() => router.push("/AllCategoriesPage" as any)}
              />
            </ScrollView>

            <Divider />

            {/* ── Browse all categories ─────── */}
            <SectionHeader title="All Categories" />
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
            <TeranGOPicks />
            <Divider />

            {/* ── Top Products (trending) ───────── */}
            {/* <SectionHeader
              title="Top Products"
              subtitle="Bestsellers near you"
              onSeeAll={() => router.push("/ViewAllStores" as any)}
            />
            {productsLoading ? (
              <FlatList
                data={[1, 2, 3, 4]}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                keyExtractor={(item) => `pr-sk-${item}`}
                renderItem={() => (
                  <View
                    style={{
                      width: 145,
                      height: 170,
                      backgroundColor: "#f0f0f0",
                      borderRadius: 14,
                    }}
                  />
                )}
              />
            ) : trendingProducts.length > 0 ? (
              <FlatList
                data={trendingProducts}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                keyExtractor={(p) => p.id}
                renderItem={({ item }) => (
                  <VendorAwareProductCard
                    product={{
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      discountedPrice: item.discountedPrice,
                      image: item.imageUrl,
                      inStock: true,
                    }}
                    cartQuantity={getQuantity(item.id)}
                    onAddToCart={() =>
                      addToCart({
                        id: item.id,
                        name: item.name,
                        price: item.discountedPrice || item.price,
                        imageUrl: item.imageUrl || "",
                        vendorId: item.shop?.id || item.shopId || "",
                        vendorName: item.shop?.name || "Store",
                        entityType: "SHOP",
                      })
                    }
                    onRemoveFromCart={() => removeFromCart(item.id)}
                    onPress={() =>
                      router.push({
                        pathname: "/product/[productId]",
                        params: { productId: item.id },
                      } as any)
                    }
                    cardWidth={145}
                    vendor={{
                      vendorId: item.shop?.id || item.shopId,
                      vendorType: "shop",
                      vendorName: item.shop?.name,
                    }}
                  />
                )}
              />
            ) : null}

            <Divider /> */}

            {/* ── Stores Near You (hideHeader: parent provides its own) ── */}
            <SectionHeader
              title="Stores Near You"
              subtitle="Shop from local stores"
              onSeeAll={() => router.push("/ViewAllStores" as any)}
            />
            <LocalShops refreshKey={refreshKey} hideHeader={true} />
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
