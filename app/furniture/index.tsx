/**
 * Furniture Marketplace — List Screen
 * Matches TeranPro / KërSpace UI: ORANGE + DARK palette,
 * featured slider, 3-row category slider, listing cards.
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

const { width } = Dimensions.get("window");
const ORANGE = "#ff6b00";
const DARK = "#1a1a1a";
const FEATURED_W = width - 32;
const CARD_RADIUS = 18;

// ─── Types ────────────────────────────────────────────────────────────────────
interface FurnitureCategory {
  id: string;
  name: string;
  icon: string | null;
  _count?: { listings: number };
}

interface FurnitureListing {
  id: string;
  name: string;
  description: string | null;
  imageUrls: string[];
  categoryId: string;
  category: { id: string; name: string; icon: string | null };
  listingPrice: number;
  condition: string;
  brand: string | null;
  color: string | null;
  city: string | null;
  isFeatured: boolean;
  isVerified: boolean;
  stock: number;
  tags: string[];
}

const CONDITION_LABELS: Record<string, string> = {
  NEW: "New",
  USED_LIKE_NEW: "Like New",
  USED_GOOD: "Good",
  USED_FAIR: "Fair",
};

const CONDITION_COLORS: Record<string, [string, string]> = {
  NEW: ["#d1fae5", "#065f46"],
  USED_LIKE_NEW: ["#dbeafe", "#1e40af"],
  USED_GOOD: ["#fef9c3", "#854d0e"],
  USED_FAIR: ["#ffedd5", "#9a3412"],
};

const fmtPrice = (n: number) => {
  if (n >= 1000) return `D${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `D${n}`;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
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
  items: FurnitureListing[];
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
        {items.map((item) => {
          const img = item.imageUrls[0];
          const condBg = CONDITION_COLORS[item.condition]?.[0] ?? "#f3f4f6";
          const condTxt = CONDITION_COLORS[item.condition]?.[1] ?? "#374151";
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.92}
              onPress={() => onPress(item.id)}
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
                  <Ionicons name="bed-outline" size={52} color="#D0C0B0" />
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
              {/* Badges */}
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
                {item.isVerified && (
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
              {/* Condition badge */}
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  backgroundColor: condBg,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{ color: condTxt, fontSize: 11, fontWeight: "700" }}
                >
                  {CONDITION_LABELS[item.condition] ?? item.condition}
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
                  {item.name}
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
                      {item.city ?? "Gambia"}
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
                      {fmtPrice(item.listingPrice)}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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

// ─── Category Row (3-row slider) ──────────────────────────────────────────────
const CategorySlider = ({
  categories,
  activeId,
  onSelect,
}: {
  categories: FurnitureCategory[];
  activeId: string;
  onSelect: (id: string) => void;
}) => {
  const allItems = [
    { id: "ALL", name: "All", icon: "grid-outline", _count: { listings: 0 } },
    ...categories,
  ];
  const ROWS = 3;
  const columns: (typeof allItems)[][] = [];
  for (let i = 0; i < allItems.length; i += ROWS) {
    columns.push(allItems.slice(i, i + ROWS));
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
    >
      {columns.map((col, colIdx) => (
        <View key={colIdx} style={{ flexDirection: "column", gap: 8 }}>
          {col.map((cat) => {
            const active = activeId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => onSelect(cat.id)}
                activeOpacity={0.75}
                style={{
                  width: 92,
                  paddingVertical: 7,
                  paddingHorizontal: 4,
                  borderRadius: 14,
                  backgroundColor: active ? ORANGE : "#fff",
                  alignItems: "center",
                  gap: 4,
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Ionicons
                  name={(cat.icon as any) ?? "cube-outline"}
                  size={18}
                  color={active ? "#fff" : ORANGE}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: active ? "#fff" : DARK,
                    textAlign: "center",
                  }}
                  numberOfLines={2}
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
};

// ─── Listing Card ─────────────────────────────────────────────────────────────
const ListingCard = ({
  item,
  onPress,
}: {
  item: FurnitureListing;
  onPress: () => void;
}) => {
  const img = item.imageUrls[0];
  const condBg = CONDITION_COLORS[item.condition]?.[0] ?? "#f3f4f6";
  const condTxt = CONDITION_COLORS[item.condition]?.[1] ?? "#374151";
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
            <Ionicons name="bed-outline" size={52} color="#D0C0B0" />
          </View>
        )}
        {/* Overlay badges */}
        <View
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            flexDirection: "row",
            gap: 6,
          }}
        >
          {item.isFeatured && (
            <View
              style={{
                backgroundColor: ORANGE,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 16,
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
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 16,
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
        {/* Condition badge */}
        <View
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            backgroundColor: condBg,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: condTxt, fontSize: 10, fontWeight: "700" }}>
            {CONDITION_LABELS[item.condition] ?? item.condition}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={{ padding: 14, gap: 6 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "800",
            color: DARK,
            letterSpacing: -0.2,
          }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {item.category?.icon && (
            <Ionicons name={item.category.icon as any} size={12} color="#888" />
          )}
          <Text style={{ fontSize: 12, color: "#888" }}>
            {item.category?.name}
          </Text>
          {item.brand ? (
            <Text style={{ fontSize: 12, color: "#aaa" }}>· {item.brand}</Text>
          ) : null}
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="location-outline" size={13} color="#aaa" />
            <Text style={{ fontSize: 12, color: "#888" }}>
              {item.city ?? "Gambia"}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: ORANGE,
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>
              {fmtPrice(item.listingPrice)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FurnitureScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("ALL");
  const [categories, setCategories] = useState<FurnitureCategory[]>([]);
  const [featured, setFeatured] = useState<FurnitureListing[]>([]);
  const [listings, setListings] = useState<FurnitureListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/furniture/categories`);
      const json = await res.json();
      setCategories(json.data ?? []);
    } catch (e) {
      // silent
    }
  }, []);

  const fetchListings = useCallback(
    async (pg = 1, replace = true) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      try {
        const params = new URLSearchParams({
          page: String(pg),
          limit: "20",
          ...(activeCategoryId !== "ALL" && { categoryId: activeCategoryId }),
          ...(debouncedSearch && { search: debouncedSearch }),
        });
        const res = await fetch(`${API_URL}/api/furniture/listings?${params}`);
        const json = await res.json();
        const items: FurnitureListing[] =
          json.data?.listings ?? json.data ?? [];
        const meta = json.data?.meta ?? json.meta;
        if (replace) {
          setListings(items);
          setFeatured(items.filter((i) => i.isFeatured));
        } else {
          setListings((prev) => [...prev, ...items]);
        }
        setPage(pg);
        setHasMore(meta ? pg < meta.totalPages : items.length === 20);
      } catch (e) {
        // silent
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [activeCategoryId, debouncedSearch],
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchListings(1, true);
  }, [fetchListings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategories();
    fetchListings(1, true);
  }, [fetchCategories, fetchListings]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore) fetchListings(page + 1, false);
  }, [loadingMore, hasMore, page, fetchListings]);

  const goToDetail = (id: string) => router.push(`/furniture/${id}` as any);

  const nonFeatured = listings.filter((i) => !i.isFeatured);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F6F3" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F6F3" />

      <FlatList
        data={loading ? [] : nonFeatured}
        keyExtractor={(i) => i.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[ORANGE]}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            {/* Hero header */}
            <Animated.View
              style={{
                opacity: headerOpacity,
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={{
                    padding: 6,
                    borderRadius: 20,
                    backgroundColor: "#fff",
                  }}
                >
                  <Ionicons name="arrow-back" size={20} color={DARK} />
                </TouchableOpacity>
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "900",
                      color: DARK,
                      letterSpacing: -0.5,
                    }}
                  >
                    Furniture
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: "#888", fontWeight: "500" }}
                  >
                    Marketplace
                  </Text>
                </View>
                <View style={{ width: 32 }} />
              </View>
            </Animated.View>

            {/* Search bar */}
            <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#fff",
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  gap: 8,
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <Ionicons name="search-outline" size={17} color="#aaa" />
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: DARK, padding: 0 }}
                  placeholder="Search furniture, brand, city…"
                  placeholderTextColor="#bbb"
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={17} color="#bbb" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Category slider */}
            {categories.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <CategorySlider
                  categories={categories}
                  activeId={activeCategoryId}
                  onSelect={(id) => setActiveCategoryId(id)}
                />
              </View>
            )}

            {/* Featured slider */}
            {!loading && featured.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{ fontSize: 17, fontWeight: "800", color: DARK }}
                  >
                    Featured
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Ionicons name="star" size={13} color={ORANGE} />
                    <Text
                      style={{ fontSize: 12, color: ORANGE, fontWeight: "700" }}
                    >
                      Top picks
                    </Text>
                  </View>
                </View>
                <FeaturedSlider items={featured} onPress={goToDetail} />
              </View>
            )}

            {/* All listings header */}
            {!loading && (
              <View
                style={{
                  paddingHorizontal: 16,
                  marginBottom: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: "800", color: DARK }}>
                  {activeCategoryId === "ALL"
                    ? "All Listings"
                    : (categories.find((c) => c.id === activeCategoryId)
                        ?.name ?? "Listings")}
                </Text>
                <Text style={{ fontSize: 12, color: "#999" }}>
                  {listings.length} items
                </Text>
              </View>
            )}

            {/* Skeleton */}
            {loading && (
              <View style={{ marginTop: 8 }}>
                {[1, 2, 3].map((k) => (
                  <SkeletonCard key={k} />
                ))}
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <ListingCard item={item} onPress={() => goToDetail(item.id)} />
        )}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={ORANGE} style={{ marginVertical: 20 }} />
          ) : !loading && listings.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Ionicons name="bed-outline" size={64} color="#D0C0B0" />
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: DARK,
                  marginTop: 12,
                }}
              >
                No listings found
              </Text>
              <Text style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>
                Try a different category or search
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
