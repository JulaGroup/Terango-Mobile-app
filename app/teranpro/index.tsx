/**
 * TeranPro — Professional Services List Screen
 * Matches KërSpace UI/UX: ORANGE + DARK palette, featured slider,
 * category filter tabs, search bar, infinite-scroll service cards.
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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { API_URL } from "@/constants/config";
import { useMaintenance } from "@/context/MaintenanceContext";
import MaintenanceScreen from "@/components/common/MaintenanceScreen";

const { width } = Dimensions.get("window");
const ORANGE = "#ff6b00";
const DARK = "#1a1a1a";
const FEATURED_W = width - 32;
const CARD_RADIUS = 18;

// ─── Types ───────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  _count?: { services: number };
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  imageUrls: string[];
  categoryId: string;
  category: { id: string; name: string; icon: string | null };
  city: string | null;
  address: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  priceUnit: string | null;
  rating: number;
  totalReviews: number;
  isFeatured: boolean;
  isVerified: boolean;
  tags: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatPrice = (
  from: number | null,
  to: number | null,
  unit: string | null,
) => {
  if (!from && !to) return "Price on request";
  const fmtNum = (n: number) =>
    n >= 1000 ? `D${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `D${n}`;
  if (from && to && from !== to) return `${fmtNum(from)} – ${fmtNum(to)}`;
  const val = from || to;
  if (!val) return "Price on request";
  return unit ? `${fmtNum(val)} / ${unit}` : fmtNum(val);
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = () => {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);
  return (
    <Animated.View
      style={{ opacity: pulse, marginHorizontal: 16, marginBottom: 16 }}
    >
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: CARD_RADIUS,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ height: 190, backgroundColor: "#EEE9E4" }} />
        <View style={{ padding: 13, gap: 8 }}>
          <View
            style={{
              height: 14,
              backgroundColor: "#EEE9E4",
              borderRadius: 7,
              width: "70%",
            }}
          />
          <View
            style={{
              height: 11,
              backgroundColor: "#EEE9E4",
              borderRadius: 6,
              width: "50%",
            }}
          />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            <View
              style={{
                height: 11,
                backgroundColor: "#EEE9E4",
                borderRadius: 6,
                width: 60,
              }}
            />
            <View
              style={{
                height: 11,
                backgroundColor: "#EEE9E4",
                borderRadius: 6,
                width: 50,
              }}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Featured Slider ──────────────────────────────────────────────────────────
const FeaturedSlider = ({
  items,
  onPress,
}: {
  items: Service[];
  onPress: (id: string) => void;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (items.length < 2) return;
    timerRef.current = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % items.length;
        scrollRef.current?.scrollTo({ x: next * FEATURED_W, animated: true });
        return next;
      });
    }, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items.length]);

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        snapToInterval={FEATURED_W}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / FEATURED_W);
          setActiveIdx(idx);
        }}
      >
        {items.map((svc) => {
          const img = svc.imageUrls[0];
          return (
            <TouchableOpacity
              key={svc.id}
              activeOpacity={0.92}
              onPress={() => onPress(svc.id)}
              style={{
                width: FEATURED_W,
                borderRadius: 20,
                overflow: "hidden",
              }}
            >
              {img ? (
                <Image
                  source={{ uri: img }}
                  style={{ width: FEATURED_W, height: 210 }}
                  contentFit="cover"
                  transition={300}
                />
              ) : (
                <View
                  style={{
                    width: FEATURED_W,
                    height: 210,
                    backgroundColor: "#F5F0EB",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="construct-outline"
                    size={52}
                    color="#D0C0B0"
                  />
                </View>
              )}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.72)"]}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 120,
                  borderRadius: 20,
                }}
              />
              {/* Badges row */}
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
                    backgroundColor: ORANGE,
                    paddingHorizontal: 9,
                    paddingVertical: 4,
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
                {svc.isVerified && (
                  <View
                    style={{
                      backgroundColor: "rgba(0,160,80,0.9)",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={11} color="#fff" />
                    <Text
                      style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}
                    >
                      Verified
                    </Text>
                  </View>
                )}
              </View>
              {/* Category pill — FeaturedSlider */}
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {svc.category?.icon && (
                  <Ionicons
                    name={svc.category.icon as any}
                    size={10}
                    color="#fff"
                  />
                )}
                <Text
                  style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}
                >
                  {svc.category?.name || ""}
                </Text>
              </View>
              {/* Bottom info */}
              <View
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 14,
                  right: 14,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "800",
                    letterSpacing: -0.3,
                    marginBottom: 4,
                  }}
                  numberOfLines={1}
                >
                  {svc.name}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name="location-outline"
                      size={12}
                      color="rgba(255,255,255,0.8)"
                    />
                    <Text
                      style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}
                      numberOfLines={1}
                    >
                      {svc.city || svc.address || "Gambia"}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: ORANGE,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 14,
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}
                    >
                      {formatPrice(svc.priceFrom, svc.priceTo, svc.priceUnit)}
                    </Text>
                  </View>
                </View>
              </View>
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

// ─── Service Card ─────────────────────────────────────────────────────────────
const ServiceCard = ({
  item,
  onPress,
}: {
  item: Service;
  onPress: () => void;
}) => {
  const img = item.imageUrls[0];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: "#fff",
        borderRadius: CARD_RADIUS,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.09,
        shadowRadius: 10,
        elevation: 4,
        overflow: "hidden",
      }}
    >
      {/* Image */}
      <View style={{ height: 190, position: "relative" }}>
        {img ? (
          <Image
            source={{ uri: img }}
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
            <Ionicons name="construct-outline" size={52} color="#D0C0B0" />
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.45)"]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
          }}
        />
        {/* Top badges */}
        <View
          style={{
            position: "absolute",
            top: 11,
            left: 11,
            flexDirection: "row",
            gap: 5,
          }}
        >
          {item.isFeatured && (
            <View
              style={{
                backgroundColor: "#FF9900",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Ionicons name="star" size={9} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                Featured
              </Text>
            </View>
          )}
          {item.isVerified && (
            <View
              style={{
                backgroundColor: "rgba(0,160,80,0.9)",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Ionicons name="checkmark-circle" size={10} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                Verified
              </Text>
            </View>
          )}
        </View>
        {/* Category top-right — ServiceCard */}
        <View
          style={{
            position: "absolute",
            top: 11,
            right: 11,
            backgroundColor: "rgba(0,0,0,0.5)",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          {item.category?.icon && (
            <Ionicons name={item.category.icon as any} size={10} color="#fff" />
          )}
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>
            {item.category?.name}
          </Text>
        </View>
        {/* Price bottom-left */}
        <View style={{ position: "absolute", bottom: 10, left: 12 }}>
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontWeight: "800",
              letterSpacing: -0.3,
            }}
          >
            {formatPrice(item.priceFrom, item.priceTo, item.priceUnit)}
          </Text>
        </View>
      </View>

      {/* Card body */}
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
          {item.name}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginBottom: 8,
          }}
        >
          <Ionicons name="location-outline" size={12} color="#999" />
          <Text style={{ fontSize: 12, color: "#888" }} numberOfLines={1}>
            {item.city || item.address || "Gambia"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {/* Rating */}
          {item.rating > 0 && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Ionicons name="star" size={12} color="#FFB800" />
              <Text style={{ fontSize: 12, color: "#666", fontWeight: "700" }}>
                {item.rating.toFixed(1)}
              </Text>
              {item.totalReviews > 0 && (
                <Text style={{ fontSize: 11, color: "#AAA" }}>
                  ({item.totalReviews})
                </Text>
              )}
            </View>
          )}
          {/* Tags */}
          {item.tags.slice(0, 2).map((tag) => (
            <View
              key={tag}
              style={{
                backgroundColor: "#FFF5EE",
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 10, color: ORANGE, fontWeight: "600" }}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TeranProScreen() {
  const { flags } = useMaintenance();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Service[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/teranpro/categories`);
      const json = await res.json();
      setCategories(json.data || []);
    } catch {}
  }, []);

  const fetchFeatured = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/teranpro/services?featured=true&limit=8`,
      );
      const json = await res.json();
      setFeatured(json.data || []);
    } catch {}
  }, []);

  const fetchServices = useCallback(
    async (pageNum = 1, replace = true) => {
      try {
        if (replace) setLoading(true);
        else setLoadingMore(true);
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: "12",
        });
        if (search) params.append("search", search);
        if (selectedCategory !== "ALL")
          params.append("categoryId", selectedCategory);
        const res = await fetch(`${API_URL}/api/teranpro/services?${params}`);
        const json = await res.json();
        const data: Service[] = json.data || [];
        setTotalPages(json.meta?.totalPages || 1);
        setTotalCount(json.meta?.total || 0);
        setPage(pageNum);
        if (replace) setServices(data);
        else setServices((prev) => [...prev, ...data]);
      } catch {
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [search, selectedCategory],
  );

  useEffect(() => {
    fetchCategories();
    fetchFeatured();
  }, [fetchCategories, fetchFeatured]);

  useEffect(() => {
    fetchServices(1, true);
  }, [fetchServices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFeatured();
    fetchServices(1, true);
  }, [fetchFeatured, fetchServices]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && page < totalPages) fetchServices(page + 1, false);
  }, [loadingMore, page, totalPages, fetchServices]);

  const navigateTo = (id: string) =>
    router.push({ pathname: "/teranpro/[id]", params: { id } } as any);

  if (flags.teranproMaintenanceMode) {
    return <MaintenanceScreen serviceName="TeranPro Services" />;
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F7F4F0" }}
      edges={["top"]}
    >
      <StatusBar barStyle="dark-content" />

      {/* ── Header ──────────────────────────────────────────────────── */}
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
                Teran
              </Text>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "900",
                  color: ORANGE,
                  letterSpacing: -1,
                }}
              >
                Pro
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
              PROFESSIONAL SERVICES · GAMBIA
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

        {/* Search bar */}
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
            placeholder="Search services, plumbers, designers..."
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
            <>
              <View
                style={{
                  width: 1,
                  height: 20,
                  backgroundColor: "#E0DDD9",
                  marginHorizontal: 2,
                }}
              />
              <Ionicons name="options-outline" size={19} color="#AAA" />
            </>
          )}
        </View>
      </View>

      {/* ── Main FlatList ────────────────────────────────────────────── */}
      <FlatList
        data={loading ? [] : services}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ServiceCard item={item} onPress={() => navigateTo(item.id)} />
        )}
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
        ListEmptyComponent={
          !loading ? (
            <View
              style={{
                alignItems: "center",
                paddingTop: 60,
                paddingHorizontal: 40,
              }}
            >
              <Ionicons name="construct-outline" size={56} color="#D0CCC8" />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: DARK,
                  marginTop: 16,
                }}
              >
                No services found
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#AAA",
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                Try a different search or category filter
              </Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={{ paddingTop: 16 }}>
            {/* ── Skeleton loading ──────────────────────────────────── */}
            {loading && (
              <View>
                {[1, 2, 3].map((k) => (
                  <SkeletonCard key={k} />
                ))}
              </View>
            )}

            {/* ── Featured Slider ───────────────────────────────────── */}
            {!loading && featured.length > 0 && (
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
                      style={{ fontSize: 18, fontWeight: "800", color: DARK }}
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
                      style={{ fontSize: 12, fontWeight: "600", color: ORANGE }}
                    >
                      {featured.length} services
                    </Text>
                  </View>
                </View>
                <FeaturedSlider items={featured} onPress={navigateTo} />
              </View>
            )}

            {/* ── Browse by Category grid ───────────────────────────── */}
            {categories.length > 0 && (
              <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <Text
                    style={{ fontSize: 18, fontWeight: "800", color: DARK }}
                  >
                    Browse by Category
                  </Text>
                  {selectedCategory !== "ALL" && (
                    <TouchableOpacity
                      onPress={() => setSelectedCategory("ALL")}
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
                {/* 3-row horizontal slider */}
                {(() => {
                  // Build flat list: "ALL" cell first, then real categories
                  const allItems = [
                    {
                      id: "ALL",
                      name: "All",
                      icon: "grid-outline",
                      _count: undefined,
                    } as Category & { _count?: { services: number } },
                    ...categories,
                  ];
                  // Chunk into columns of 3
                  const ROWS = 3;
                  const CELL_W = 88;
                  const columns: (typeof allItems)[] = [];
                  for (let i = 0; i < allItems.length; i += ROWS) {
                    columns.push(allItems.slice(i, i + ROWS));
                  }
                  return (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 10, paddingRight: 4 }}
                    >
                      {columns.map((col, colIdx) => (
                        <View key={colIdx} style={{ gap: 10 }}>
                          {col.map((cat) => {
                            const active = selectedCategory === cat.id;
                            return (
                              <TouchableOpacity
                                key={cat.id}
                                onPress={() =>
                                  setSelectedCategory(
                                    active && cat.id !== "ALL" ? "ALL" : cat.id,
                                  )
                                }
                                style={{
                                  width: CELL_W,
                                  alignItems: "center",
                                  paddingVertical: 12,
                                  paddingHorizontal: 6,
                                  borderRadius: 18,
                                  backgroundColor: active ? ORANGE : "#fff",
                                  shadowColor: "#000",
                                  shadowOpacity: 0.07,
                                  shadowRadius: 6,
                                  elevation: 3,
                                  gap: 5,
                                }}
                              >
                                <View
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 13,
                                    backgroundColor: active
                                      ? "rgba(255,255,255,0.22)"
                                      : "#FFF5EE",
                                    justifyContent: "center",
                                    alignItems: "center",
                                  }}
                                >
                                  <Ionicons
                                    name={
                                      (cat.icon || "construct-outline") as any
                                    }
                                    size={20}
                                    color={active ? "#fff" : ORANGE}
                                  />
                                </View>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: active ? "#fff" : DARK,
                                    textAlign: "center",
                                  }}
                                  numberOfLines={1}
                                >
                                  {cat.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                    </ScrollView>
                  );
                })()}
              </View>
            )}

            {/* ── All Services header ───────────────────────────────── */}
            {!loading && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "800", color: DARK }}>
                  {selectedCategory !== "ALL"
                    ? categories.find((c) => c.id === selectedCategory)?.name ||
                      "Services"
                    : "All Services"}
                </Text>
                <Text style={{ fontSize: 12, color: "#AAA" }}>
                  {totalCount} found
                </Text>
              </View>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
