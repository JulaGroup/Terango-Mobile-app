/**
 * KërSpace — Real Estate Home Screen
 * Industry-standard layout: featured slider, advert banners, type icon tabs,
 * trending section, all listings with list/card view toggle.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { API_URL } from "@/constants/config";
import AdvertCard from "@/components/ui/home/AdvertCard";
import { useMaintenance } from "@/context/MaintenanceContext";
import MaintenanceScreen from "@/components/common/MaintenanceScreen";

const { width } = Dimensions.get("window");
const ORANGE = "#ff6b00";
const DARK = "#1a1a1a";
const FEATURED_W = width - 80;
const FEATURED_GAP = 12;

// ─── Types ────────────────────────────────────────────────────────────────────
interface PropertyImage {
  id: string;
  url: string;
  isPrimary: boolean;
}
interface Property {
  id: string;
  title: string;
  type: string;
  listingType: "FOR_SALE" | "FOR_RENT";
  price: number;
  currency: string;
  negotiable: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  address: string;
  city: string;
  region: string | null;
  features: string[];
  furnished: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  status: string;
  viewCount: number;
  images: PropertyImage[];
}

const TYPE_LABELS: Record<string, string> = {
  HOUSE: "House",
  APARTMENT: "Apartment",
  OFFICE: "Office",
  LAND: "Land",
  COMMERCIAL: "Commercial",
  VILLA: "Villa",
};

const LISTING_TABS = [
  { key: "ALL", label: "All" },
  { key: "FOR_SALE", label: "For Sale" },
  { key: "FOR_RENT", label: "For Rent" },
];

const TYPE_FILTERS = [
  { key: "ALL", label: "All", icon: "apps-outline" as const },
  { key: "HOUSE", label: "House", icon: "home-outline" as const },
  { key: "APARTMENT", label: "Apartment", icon: "business-outline" as const },
  { key: "OFFICE", label: "Office", icon: "briefcase-outline" as const },
  { key: "LAND", label: "Land", icon: "leaf-outline" as const },
  { key: "VILLA", label: "Villa", icon: "umbrella-outline" as const },
  {
    key: "COMMERCIAL",
    label: "Commercial",
    icon: "storefront-outline" as const,
  },
];

const formatPrice = (price: number) => {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M`;
  return price.toLocaleString();
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonCard = () => {
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
  }, []);
  return (
    <Animated.View
      style={{ opacity: anim, marginBottom: 14, marginHorizontal: 16 }}
    >
      <View
        style={{ backgroundColor: "#E0E0E0", height: 195, borderRadius: 18 }}
      />
      <View style={{ paddingTop: 10, gap: 8 }}>
        <View
          style={{
            backgroundColor: "#E0E0E0",
            height: 14,
            borderRadius: 7,
            width: "65%",
          }}
        />
        <View
          style={{
            backgroundColor: "#E0E0E0",
            height: 11,
            borderRadius: 6,
            width: "45%",
          }}
        />
      </View>
    </Animated.View>
  );
};

// ─── Featured Slider ──────────────────────────────────────────────────────────
const FeaturedSlider = ({
  items,
  onPress,
}: {
  items: Property[];
  onPress: (id: string) => void;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeIdxRef = useRef(0);

  const startAutoPlay = useCallback((count: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (count <= 1) return;
    intervalRef.current = setInterval(() => {
      const next = (activeIdxRef.current + 1) % count;
      activeIdxRef.current = next;
      setActiveIdx(next);
      scrollRef.current?.scrollTo({
        x: next * (FEATURED_W + FEATURED_GAP),
        animated: true,
      });
    }, 3800);
  }, []);

  useEffect(() => {
    startAutoPlay(items.length);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [items.length, startAutoPlay]);

  if (items.length === 0) return null;

  return (
    <View style={{ marginBottom: 6 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        snapToInterval={FEATURED_W + FEATURED_GAP}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: FEATURED_GAP }}
        nestedScrollEnabled
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(
            e.nativeEvent.contentOffset.x / (FEATURED_W + FEATURED_GAP),
          );
          const clamped = Math.max(0, Math.min(idx, items.length - 1));
          activeIdxRef.current = clamped;
          setActiveIdx(clamped);
          startAutoPlay(items.length);
        }}
        scrollEventThrottle={16}
      >
        {items.map((item) => {
          const img = item.images.find((i) => i.isPrimary) || item.images[0];
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onPress(item.id)}
              activeOpacity={0.95}
              style={{
                width: FEATURED_W,
                height: 200,
                borderRadius: 20,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOpacity: 0.18,
                shadowRadius: 14,
                elevation: 7,
              }}
            >
              {/* Image */}
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
                  <Ionicons name="home-outline" size={60} color="#C0A090" />
                </View>
              )}

              {/* Top badges: For Sale/Rent + Featured left · Verified right */}
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  right: 12,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <View style={{ flexDirection: "row", gap: 6, flexShrink: 1 }}>
                  <View
                    style={{
                      backgroundColor:
                        item.listingType === "FOR_SALE" ? "#1E3A5F" : "#5B2D8E",
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 20,
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}
                    >
                      {item.listingType === "FOR_SALE"
                        ? "For Sale"
                        : "For Rent"}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: ORANGE,
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      borderRadius: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Ionicons name="star" size={10} color="#fff" />
                    <Text
                      style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}
                    >
                      Featured
                    </Text>
                  </View>
                </View>
                {item.isVerified && (
                  <View
                    style={{
                      backgroundColor: "rgba(0,0,0,0.45)",
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      borderRadius: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.2)",
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={11}
                      color="#4ADE80"
                    />
                    <Text
                      style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}
                    >
                      Verified
                    </Text>
                  </View>
                )}
              </View>

              {/* Bottom gradient — price pill · title · location (no overlap) */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.88)"]}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 140,
                  justifyContent: "flex-end",
                  paddingHorizontal: 14,
                  paddingBottom: 14,
                }}
              >
                {/* Price pill */}
                <View
                  style={{
                    alignSelf: "flex-start",
                    backgroundColor: ORANGE,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 10,
                    marginBottom: 7,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 18,
                      fontWeight: "900",
                      letterSpacing: -0.5,
                    }}
                  >
                    {item.currency} {formatPrice(item.price)}
                  </Text>
                  {item.negotiable && (
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.8)",
                        fontSize: 10,
                        fontWeight: "500",
                        marginTop: 1,
                      }}
                    >
                      Negotiable
                    </Text>
                  )}
                </View>
                {/* Title */}
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: "800",
                    marginBottom: 4,
                  }}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {/* Location */}
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color="rgba(255,255,255,0.7)"
                  />
                  <Text
                    style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}
                    numberOfLines={1}
                  >
                    {item.address}, {item.city}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Pagination dots */}
      {items.length > 1 && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 5,
            marginTop: 10,
          }}
        >
          {items.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIdx ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === activeIdx ? ORANGE : "#D0CCC8",
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Property Card (Grid view) ────────────────────────────────────────────────
const PropertyCard = ({
  item,
  onPress,
}: {
  item: Property;
  onPress: () => void;
}) => {
  const img = item.images.find((i) => i.isPrimary) || item.images[0];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: "#fff",
        borderRadius: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.09,
        shadowRadius: 10,
        elevation: 4,
        overflow: "hidden",
      }}
    >
      <View style={{ height: 200, position: "relative" }}>
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
            <Ionicons name="home-outline" size={48} color="#C0A090" />
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.55)"]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 90,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            flexDirection: "row",
            gap: 6,
          }}
        >
          <View
            style={{
              backgroundColor:
                item.listingType === "FOR_SALE" ? "#1E3A5F" : "#5B2D8E",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
              {item.listingType === "FOR_SALE" ? "For Sale" : "For Rent"}
            </Text>
          </View>
          {item.isFeatured && (
            <View
              style={{
                backgroundColor: "#FF9900",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                Featured
              </Text>
            </View>
          )}
        </View>
        {item.isVerified && (
          <View
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              backgroundColor: ORANGE,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Ionicons name="checkmark-circle" size={11} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
              Verified
            </Text>
          </View>
        )}
        <View style={{ position: "absolute", bottom: 10, left: 12 }}>
          <Text
            style={{
              color: "#fff",
              fontSize: 20,
              fontWeight: "800",
              letterSpacing: -0.5,
            }}
          >
            {item.currency} {formatPrice(item.price)}
          </Text>
          {item.negotiable && (
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
              Negotiable
            </Text>
          )}
        </View>
      </View>
      <View style={{ padding: 13 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: DARK,
            marginBottom: 3,
          }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginBottom: 10,
          }}
        >
          <Ionicons name="location-outline" size={13} color="#999" />
          <Text style={{ fontSize: 12, color: "#888" }} numberOfLines={1}>
            {item.address}, {item.city}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 14, flexWrap: "wrap" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="business-outline" size={13} color={ORANGE} />
            <Text style={{ fontSize: 12, color: "#666" }}>
              {TYPE_LABELS[item.type] || item.type}
            </Text>
          </View>
          {item.bedrooms != null && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Ionicons name="bed-outline" size={13} color={ORANGE} />
              <Text style={{ fontSize: 12, color: "#666" }}>
                {item.bedrooms}
              </Text>
            </View>
          )}
          {item.bathrooms != null && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <MaterialCommunityIcons
                name="bathtub-outline"
                size={14}
                color={ORANGE}
              />
              <Text style={{ fontSize: 12, color: "#666" }}>
                {item.bathrooms}
              </Text>
            </View>
          )}
          {item.area != null && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Ionicons name="resize-outline" size={13} color={ORANGE} />
              <Text style={{ fontSize: 12, color: "#666" }}>{item.area}m²</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Property List Row (compact list view) ────────────────────────────────────
const PropertyListRow = ({
  item,
  onPress,
}: {
  item: Property;
  onPress: () => void;
}) => {
  const img = item.images.find((i) => i.isPrimary) || item.images[0];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        flexDirection: "row",
        backgroundColor: "#fff",
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 14,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View style={{ width: 100, height: 90, flexShrink: 0 }}>
        {img ? (
          <Image
            source={{ uri: img.url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
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
            <Ionicons name="home-outline" size={24} color="#C0A090" />
          </View>
        )}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor:
              item.listingType === "FOR_SALE"
                ? "rgba(30,58,95,0.88)"
                : "rgba(91,45,142,0.88)",
            paddingVertical: 3,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 0.4,
            }}
          >
            {item.listingType === "FOR_SALE" ? "FOR SALE" : "FOR RENT"}
          </Text>
        </View>
      </View>
      <View style={{ flex: 1, padding: 10, justifyContent: "center" }}>
        <Text
          style={{ fontSize: 13, fontWeight: "700", color: DARK }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            marginTop: 2,
          }}
        >
          <Ionicons name="location-outline" size={11} color="#999" />
          <Text style={{ fontSize: 11, color: "#888" }} numberOfLines={1}>
            {item.address}, {item.city}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "800",
            color: ORANGE,
            marginTop: 4,
          }}
        >
          {item.currency} {formatPrice(item.price)}
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          {item.bedrooms != null && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <Ionicons name="bed-outline" size={11} color="#AAA" />
              <Text style={{ fontSize: 11, color: "#666" }}>
                {item.bedrooms}
              </Text>
            </View>
          )}
          {item.bathrooms != null && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <MaterialCommunityIcons
                name="bathtub-outline"
                size={12}
                color="#AAA"
              />
              <Text style={{ fontSize: 11, color: "#666" }}>
                {item.bathrooms}
              </Text>
            </View>
          )}
          {item.area != null && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <Ionicons name="resize-outline" size={11} color="#AAA" />
              <Text style={{ fontSize: 11, color: "#666" }}>{item.area}m²</Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ justifyContent: "center", paddingRight: 10 }}>
        <Ionicons name="chevron-forward" size={16} color="#CCC" />
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function KerSpaceScreen() {
  const { flags } = useMaintenance();
  const router = useRouter();

  // Data
  const [featured, setFeatured] = useState<Property[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [listingFilter, setListingFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  const fetchFeatured = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/kerspace/properties?featured=true&limit=8`,
      );
      const json = await res.json();
      setFeatured(json.data || []);
    } catch {}
  }, []);

  const fetchProperties = useCallback(
    async (pageNum = 1, replace = true) => {
      try {
        if (replace) setLoading(true);
        else setLoadingMore(true);
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: "12",
          sortBy: "createdAt",
        });
        if (search) params.append("search", search);
        if (listingFilter !== "ALL")
          params.append("listingType", listingFilter);
        if (typeFilter !== "ALL") params.append("type", typeFilter);
        const res = await fetch(`${API_URL}/api/kerspace/properties?${params}`);
        const json = await res.json();
        const data: Property[] = json.data || [];
        setTotalPages(json.meta?.totalPages || 1);
        setTotalCount(json.meta?.total || 0);
        setPage(pageNum);
        if (replace) setProperties(data);
        else setProperties((prev) => [...prev, ...data]);
      } catch {
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [search, listingFilter, typeFilter],
  );

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  useEffect(() => {
    fetchProperties(1, true);
  }, [fetchProperties]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFeatured();
    fetchProperties(1, true);
  }, [fetchFeatured, fetchProperties]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && page < totalPages) fetchProperties(page + 1, false);
  }, [loadingMore, page, totalPages, fetchProperties]);

  const navigateTo = (id: string) =>
    router.push({ pathname: "/kerspace/[id]", params: { id } } as any);

  if (flags.kerspaceMaintenanceMode) {
    return <MaintenanceScreen serviceName="KërSpace Real Estate" />;
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F7F4F0" }}
      edges={["top"]}
    >
      <StatusBar barStyle="dark-content" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: "#fff",
          shadowColor: "#000",
          shadowOpacity: 0.07,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 6,
        }}
      >
        {/* Brand row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 14,
            gap: 12,
          }}
        >
          {/* Back button — rounded square, not a naked icon */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              backgroundColor: "#F5F0EB",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="arrow-back" size={18} color={DARK} />
          </TouchableOpacity>

          {/* Wordmark */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "900",
                  color: DARK,
                  letterSpacing: -1,
                }}
              >
                Kër
              </Text>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "900",
                  color: ORANGE,
                  letterSpacing: -1,
                }}
              >
                Space
              </Text>
            </View>
            <Text
              style={{
                fontSize: 10,
                color: "#BBBBBB",
                letterSpacing: 1.8,
                fontWeight: "600",
                marginTop: -3,
              }}
            >
              REAL ESTATE · GAMBIA
            </Text>
          </View>

          {/* Live count badge */}
          <View
            style={{
              backgroundColor: "#FFF5EE",
              borderRadius: 14,
              paddingHorizontal: 11,
              paddingVertical: 7,
              alignItems: "center",
              minWidth: 52,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "900",
                color: ORANGE,
                letterSpacing: -0.5,
              }}
            >
              {totalCount > 0 ? totalCount : "—"}
            </Text>
            <Text
              style={{
                fontSize: 8,
                color: "#BBBBBB",
                fontWeight: "700",
                letterSpacing: 1,
                marginTop: 1,
              }}
            >
              LISTED
            </Text>
          </View>
        </View>

        {/* Search bar — pill style, elevated */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F7F4F0",
            borderRadius: 50,
            paddingHorizontal: 16,
            marginHorizontal: 16,
            marginBottom: 14,
            height: 48,
            gap: 10,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <Ionicons name="search-outline" size={19} color={ORANGE} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: DARK, height: "100%" }}
            placeholder="City, address, property type..."
            placeholderTextColor="#C0BAB5"
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={() => setSearch(searchInput)}
            returnKeyType="search"
          />
          {searchInput.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setSearchInput("");
                setSearch("");
              }}
            >
              <Ionicons name="close-circle" size={19} color="#CCC" />
            </TouchableOpacity>
          ) : (
            <View
              style={{
                width: 1,
                height: 20,
                backgroundColor: "#E0DDD9",
                marginHorizontal: 2,
              }}
            />
          )}
          {searchInput.length === 0 && (
            <Ionicons name="options-outline" size={19} color="#AAA" />
          )}
        </View>

        {/* Listing type tabs — underline indicator style */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            borderTopWidth: 1,
            borderTopColor: "rgba(0,0,0,0.05)",
          }}
        >
          {LISTING_TABS.map((tab) => {
            const active = listingFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setListingFilter(tab.key)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderBottomWidth: 2.5,
                  borderBottomColor: active ? ORANGE : "transparent",
                  marginBottom: -1,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: active ? "800" : "500",
                    color: active ? ORANGE : "#AAA",
                    letterSpacing: active ? -0.1 : 0,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Scrollable content via FlatList ─────────────────────────────── */}
      <FlatList
        data={loading ? [] : properties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          viewMode === "list" ? (
            <PropertyListRow item={item} onPress={() => navigateTo(item.id)} />
          ) : (
            <PropertyCard item={item} onPress={() => navigateTo(item.id)} />
          )
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ORANGE}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={ORANGE} style={{ marginVertical: 20 }} />
          ) : null
        }
        ListHeaderComponent={
          <View style={{ paddingTop: 16 }}>
            {/* ── Featured slider ───────────────────────────────────────── */}
            {featured.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    marginBottom: 12,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "800",
                        color: DARK,
                      }}
                    >
                      Featured
                    </Text>
                    <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                      Hand-picked by Teran
                      <Text style={{ fontWeight: "900", color: ORANGE }}>
                        GO
                      </Text>
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: "#FFF5EE",
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 20,
                    }}
                  >
                    <Ionicons name="star" size={12} color={ORANGE} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: ORANGE,
                      }}
                    >
                      {featured.length} listings
                    </Text>
                  </View>
                </View>
                <FeaturedSlider items={featured} onPress={navigateTo} />
              </View>
            )}

            {/* ── Top advert banner ─────────────────────────────────────── */}
            {/* <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
              <AdvertCard position="HOME_TOP" />
            </View> */}

            {/* ── Browse by type ────────────────────────────────────────── */}
            <View style={{ marginBottom: 28 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  marginBottom: 14,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "800", color: DARK }}>
                  Browse by Type
                </Text>
                {typeFilter !== "ALL" && (
                  <TouchableOpacity
                    onPress={() => setTypeFilter("ALL")}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 20,
                      backgroundColor: "#FFF5EE",
                    }}
                  >
                    <Ionicons name="close-circle" size={13} color={ORANGE} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: ORANGE,
                      }}
                    >
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                nestedScrollEnabled
              >
                {TYPE_FILTERS.map((f) => {
                  const active = typeFilter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => setTypeFilter(f.key)}
                      activeOpacity={0.8}
                      style={{
                        alignItems: "center",
                        gap: 6,
                        paddingVertical: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 20,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: active ? ORANGE : "#fff",
                          shadowColor: active ? ORANGE : "#000",
                          shadowOpacity: active ? 0.35 : 0.08,
                          shadowRadius: active ? 10 : 6,
                          shadowOffset: { width: 0, height: active ? 4 : 2 },
                          elevation: active ? 8 : 3,
                          borderWidth: active ? 0 : 1,
                          borderColor: "rgba(0,0,0,0.06)",
                        }}
                      >
                        <Ionicons
                          name={f.icon}
                          size={26}
                          color={active ? "#fff" : "#555"}
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: active ? "800" : "500",
                          color: active ? ORANGE : "#777",
                          letterSpacing: active ? 0.1 : 0,
                        }}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── Mid advert banner ─────────────────────────────────────── */}
            {/* <View style={{ paddingHorizontal: 16, marginBottom: 28 }}>
              <AdvertCard position="HOME_AFTER_RESTAURANTS" />
            </View> */}

            {/* ── All listings header + view toggle ─────────────────────── */}
            <View
              style={{
                paddingHorizontal: 16,
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <View>
                  <Text
                    style={{ fontSize: 18, fontWeight: "800", color: DARK }}
                  >
                    All Listings
                  </Text>
                  <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                    {loading
                      ? ""
                      : `${totalCount} ${totalCount === 1 ? "property" : "properties"}`}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 3,
                    backgroundColor: "#EDEAE6",
                    borderRadius: 10,
                    padding: 3,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setViewMode("card")}
                    style={{
                      padding: 7,
                      borderRadius: 8,
                      backgroundColor:
                        viewMode === "card" ? "#fff" : "transparent",
                    }}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={16}
                      color={viewMode === "card" ? ORANGE : "#999"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setViewMode("list")}
                    style={{
                      padding: 7,
                      borderRadius: 8,
                      backgroundColor:
                        viewMode === "list" ? "#fff" : "transparent",
                    }}
                  >
                    <Ionicons
                      name="list-outline"
                      size={16}
                      color={viewMode === "list" ? ORANGE : "#999"}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Active filter pills */}
              {(listingFilter !== "ALL" || typeFilter !== "ALL") && (
                <View
                  style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}
                >
                  {listingFilter !== "ALL" && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        backgroundColor: "#1E3A5F",
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 20,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {listingFilter === "FOR_SALE" ? "For Sale" : "For Rent"}
                      </Text>
                      <TouchableOpacity onPress={() => setListingFilter("ALL")}>
                        <Ionicons
                          name="close"
                          size={13}
                          color="rgba(255,255,255,0.8)"
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                  {typeFilter !== "ALL" && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        backgroundColor: ORANGE,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 20,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {TYPE_FILTERS.find((f) => f.key === typeFilter)?.label}
                      </Text>
                      <TouchableOpacity onPress={() => setTypeFilter("ALL")}>
                        <Ionicons
                          name="close"
                          size={13}
                          color="rgba(255,255,255,0.8)"
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Skeleton loading */}
            {loading && (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            )}

            {/* Empty state */}
            {!loading && properties.length === 0 && (
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: 48,
                  paddingHorizontal: 32,
                  marginHorizontal: 16,
                  backgroundColor: "#fff",
                  borderRadius: 20,
                  marginBottom: 16,
                  shadowColor: "#000",
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: "#FFF5EE",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <Ionicons name="home-outline" size={34} color={ORANGE} />
                </View>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "800",
                    color: DARK,
                    textAlign: "center",
                    marginBottom: 6,
                  }}
                >
                  No listings found
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#999",
                    textAlign: "center",
                    lineHeight: 19,
                  }}
                >
                  Try a different type or clear your filters
                </Text>
                {(listingFilter !== "ALL" || typeFilter !== "ALL") && (
                  <TouchableOpacity
                    onPress={() => {
                      setListingFilter("ALL");
                      setTypeFilter("ALL");
                    }}
                    style={{
                      marginTop: 18,
                      paddingHorizontal: 24,
                      paddingVertical: 10,
                      backgroundColor: ORANGE,
                      borderRadius: 24,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      Clear All Filters
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
