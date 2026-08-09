import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  RefreshControl,
  TextInput,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryColor } from "@/constants/Colors";
import { experienceApi, Experience } from "@/lib/api";
import {
  EXPERIENCE_CATEGORIES,
  iconForCategory,
} from "@/constants/experienceCategories";
import { Skeleton } from "@/components/ui/Skeleton";

const { width: SCREEN_W } = Dimensions.get("window");
const RAIL_W = Math.round(SCREEN_W * 0.72);

export default function ExperiencesScreen() {
  const router = useRouter();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [favs, setFavs] = useState<Record<string, boolean>>({});

  const fetchExperiences = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const data = await experienceApi.list();
      setExperiences(Array.isArray(data) ? data : []);
    } catch {
      setError("Couldn't load experiences. Pull to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExperiences();
  }, [fetchExperiences]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return experiences.filter((e) => {
      if (activeCat && (e.category || "") !== activeCat) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q) ||
        (e.address || e.city || "").toLowerCase().includes(q)
      );
    });
  }, [experiences, query, activeCat]);

  const isFiltering = !!activeCat || query.trim().length > 0;

  const fromPrice = (exp: Experience) => {
    const prices = (exp.options || []).map((o) => o.price).filter(Boolean);
    return prices.length ? Math.min(...prices) : null;
  };

  const toggleFav = (id: string) =>
    setFavs((p) => ({ ...p, [id]: !p[id] }));

  const goto = (id: string) =>
    router.push({ pathname: "/experiences/[id]" as any, params: { id } });

  const renderCard = (exp: Experience, wide: boolean) => {
    const price = fromPrice(exp);
    const fav = !!favs[exp.id];
    return (
      <TouchableOpacity
        key={exp.id}
        style={[styles.card, wide ? { width: RAIL_W } : { width: SCREEN_W - 32 }]}
        activeOpacity={0.93}
        onPress={() => goto(exp.id)}
      >
        <View style={[styles.cardImageWrap, { height: wide ? 150 : 180 }]}>
          {exp.imageUrl ? (
            <Image source={{ uri: exp.imageUrl }} style={styles.cardImage} />
          ) : (
            <LinearGradient
              colors={["#FFB877", PrimaryColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardImage}
            >
              <Ionicons
                name={iconForCategory(exp.category)}
                size={40}
                color="rgba(255,255,255,0.9)"
              />
            </LinearGradient>
          )}
          {!!exp.category && (
            <View style={styles.tagPill}>
              <Text style={styles.tagPillText}>{exp.category}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.heart}
            activeOpacity={0.8}
            onPress={() => toggleFav(exp.id)}
          >
            <Ionicons
              name={fav ? "heart" : "heart-outline"}
              size={17}
              color={fav ? "#EF4444" : "#0F172A"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>
            {exp.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="location" size={13} color={PrimaryColor} />
            <Text style={styles.metaText} numberOfLines={1}>
              {exp.address || exp.city || "The Gambia"}
            </Text>
          </View>
          <View style={styles.cardFooter}>
            <Text>
              {price != null ? (
                <>
                  <Text style={styles.priceValue}>D{price}</Text>
                  <Text style={styles.priceUnit}> / {exp.unitLabel}</Text>
                </>
              ) : (
                <Text style={styles.priceValue}>Book</Text>
              )}
            </Text>
            <View style={styles.capChip}>
              <Ionicons name="people" size={12} color={PrimaryColor} />
              <Text style={styles.capChipText}>
                {exp.totalUnits} {exp.unitLabel}s
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

      {/* Orange brand header — title, promise, and the search bar inside it */}
      <LinearGradient
        colors={[PrimaryColor, "#FF8A34"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrap}
      >
        <SafeAreaView edges={["top", "left", "right"]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Experiences</Text>
              <Text style={styles.pageTagline}>
                Activities, events and tours across The Gambia
              </Text>
            </View>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search experiences, places"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchExperiences(true);
            }}
            colors={[PrimaryColor]}
            tintColor={PrimaryColor}
          />
        }
      >
        {/* Categories */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Categories</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 20 }}
        >
          {/* "All" resets the category — no separate filter button needed */}
          <TouchableOpacity
            style={styles.catItem}
            activeOpacity={0.85}
            onPress={() => setActiveCat(null)}
          >
            <View
              style={[styles.catCircle, !activeCat && styles.catCircleActive]}
            >
              <Ionicons
                name="apps"
                size={23}
                color={!activeCat ? "#fff" : PrimaryColor}
              />
            </View>
            <Text
              style={[styles.catLabel, !activeCat && styles.catLabelActive]}
              numberOfLines={1}
            >
              All
            </Text>
          </TouchableOpacity>

          {EXPERIENCE_CATEGORIES.map((cat) => {
            const active = activeCat === cat.label;
            return (
              <TouchableOpacity
                key={cat.label}
                style={styles.catItem}
                activeOpacity={0.85}
                onPress={() => setActiveCat(active ? null : cat.label)}
              >
                <View
                  style={[styles.catCircle, active && styles.catCircleActive]}
                >
                  <Ionicons
                    name={cat.icon}
                    size={24}
                    color={active ? "#fff" : PrimaryColor}
                  />
                </View>
                <Text
                  style={[styles.catLabel, active && styles.catLabelActive]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <>
            {/* Horizontal rail placeholder */}
            <View style={styles.sectionHead}>
              <Skeleton style={{ width: 150, height: 20 }} />
            </View>
            <ScrollView
              horizontal
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
            >
              {[0, 1].map((i) => (
                <View key={i} style={[styles.skeletonCard, { width: RAIL_W }]}>
                  <Skeleton style={styles.skeletonImgRail} radius={0} />
                  <View style={{ padding: 13 }}>
                    <Skeleton style={{ height: 15, width: "70%" }} />
                    <Skeleton
                      style={{ height: 12, width: "45%", marginTop: 8 }}
                    />
                    <Skeleton
                      style={{ height: 16, width: "35%", marginTop: 12 }}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Vertical list placeholder */}
            <View style={styles.sectionHead}>
              <Skeleton style={{ width: 120, height: 20 }} />
            </View>
            <View style={{ paddingHorizontal: 16 }}>
              {[0, 1].map((i) => (
                <View key={i} style={styles.skeletonCard}>
                  <Skeleton style={styles.skeletonImg} radius={0} />
                  <View style={{ padding: 13 }}>
                    <Skeleton style={{ height: 15, width: "60%" }} />
                    <Skeleton
                      style={{ height: 12, width: "40%", marginTop: 8 }}
                    />
                    <Skeleton
                      style={{ height: 16, width: "30%", marginTop: 12 }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : error ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="cloud-offline-outline" size={44} color="#CBD5E1" />
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Featured rail — only in the default (unfiltered) view */}
            {!isFiltering && experiences.length > 0 && (
              <>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Popular right now</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
                >
                  {experiences.map((e) => renderCard(e, true))}
                </ScrollView>
              </>
            )}

            {/* All / filtered results */}
            <View style={styles.sectionHead}>
              <View style={styles.resultsTitleRow}>
                <Text style={styles.sectionTitle}>
                  {activeCat || "All experiences"}
                </Text>
                {isFiltering && (
                  <Text style={styles.resultsCount}>
                    {filtered.length}{" "}
                    {filtered.length === 1 ? "result" : "results"}
                  </Text>
                )}
              </View>
              {isFiltering && (
                <TouchableOpacity
                  style={styles.clearChip}
                  activeOpacity={0.8}
                  onPress={() => {
                    setQuery("");
                    setActiveCat(null);
                  }}
                >
                  <Text style={styles.clearChipText}>Clear</Text>
                  <Ionicons name="close" size={13} color={PrimaryColor} />
                </TouchableOpacity>
              )}
            </View>
            <View style={{ paddingHorizontal: 16 }}>
              {filtered.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyBadge}>
                    <Ionicons
                      name={
                        activeCat
                          ? iconForCategory(activeCat)
                          : "sparkles-outline"
                      }
                      size={30}
                      color={PrimaryColor}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {experiences.length === 0 ? "Nothing here yet" : "No matches"}
                  </Text>
                  <Text style={styles.emptyText}>
                    {experiences.length === 0
                      ? "New experiences are coming soon."
                      : `No experiences in ${activeCat || "this search"} yet.`}
                  </Text>
                </View>
              ) : (
                filtered.map((e) => renderCard(e, false))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  pageTagline: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    marginTop: 3,
    lineHeight: 17,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    marginTop: 16,
    shadowColor: "#7C2D12",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#0F172A" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  resultsTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultsCount: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
  clearChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF5EE",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  clearChipText: { color: PrimaryColor, fontWeight: "700", fontSize: 12.5 },
  catItem: { alignItems: "center", width: 66 },
  catCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFF5EE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 7,
  },
  catCircleActive: {
    backgroundColor: PrimaryColor,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 5,
  },
  catLabel: { fontSize: 11.5, color: "#475569", fontWeight: "600" },
  catLabelActive: { color: PrimaryColor, fontWeight: "800" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 4,
  },
  cardImageWrap: {
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  tagPill: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: PrimaryColor,
    textTransform: "capitalize",
  },
  heart: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { padding: 13 },
  cardName: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  metaText: { fontSize: 12.5, color: "#64748B", fontWeight: "500", flex: 1 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 11,
  },
  priceValue: { fontSize: 17, fontWeight: "900", color: PrimaryColor },
  priceUnit: { fontSize: 12.5, color: "#94A3B8", fontWeight: "600" },
  capChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF5EE",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
  },
  capChipText: { color: PrimaryColor, fontWeight: "700", fontSize: 11.5 },
  emptyWrap: { alignItems: "center", paddingTop: 30, paddingHorizontal: 40 },
  emptyBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFF5EE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  skeletonCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  skeletonImg: { width: "100%", height: 180 },
  skeletonImgRail: { width: "100%", height: 150 },
});
