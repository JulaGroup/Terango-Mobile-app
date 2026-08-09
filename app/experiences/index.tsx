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

const { width: SCREEN_W } = Dimensions.get("window");

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  karting: "car-sport",
  racing: "speedometer",
  adventure: "trail-sign",
  nightlife: "wine",
  sports: "football",
  wellness: "flower",
  spa: "flower",
  tours: "map",
  tour: "map",
  gaming: "game-controller",
  arts: "color-palette",
  art: "color-palette",
  music: "musical-notes",
  food: "restaurant",
  events: "sparkles",
};

function iconFor(cat?: string): keyof typeof Ionicons.glyphMap {
  if (!cat) return "sparkles";
  return CATEGORY_ICONS[cat.toLowerCase()] || "sparkles";
}

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

  const categories = useMemo(() => {
    const set = new Set<string>();
    experiences.forEach((e) => e.category && set.add(e.category));
    return Array.from(set);
  }, [experiences]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return experiences.filter((e) => {
      if (activeCat && e.category !== activeCat) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q) ||
        (e.address || e.city || "").toLowerCase().includes(q)
      );
    });
  }, [experiences, query, activeCat]);

  const fromPrice = (exp: Experience) => {
    const prices = (exp.options || []).map((o) => o.price).filter(Boolean);
    return prices.length ? Math.min(...prices) : null;
  };
  const durationRange = (exp: Experience) => {
    const ds = (exp.options || []).map((o) => o.durationMins).filter(Boolean);
    if (!ds.length) return null;
    const min = Math.min(...ds);
    const max = Math.max(...ds);
    return min === max ? `${min} min` : `${min}–${max} min`;
  };

  const renderCard = (exp: Experience) => {
    const price = fromPrice(exp);
    const dur = durationRange(exp);
    const fav = !!favs[exp.id];
    return (
      <TouchableOpacity
        key={exp.id}
        style={styles.card}
        activeOpacity={0.93}
        onPress={() =>
          router.push({
            pathname: "/experiences/[id]" as any,
            params: { id: exp.id },
          })
        }
      >
        <View style={styles.cardImageWrap}>
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
                name={iconFor(exp.category)}
                size={44}
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
            onPress={() => setFavs((p) => ({ ...p, [exp.id]: !p[exp.id] }))}
          >
            <Ionicons
              name={fav ? "heart" : "heart-outline"}
              size={18}
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
              {exp.address || exp.city || "TeranGO"}
            </Text>
            {!!dur && (
              <>
                <View style={styles.metaDot} />
                <Ionicons name="time" size={13} color={PrimaryColor} />
                <Text style={styles.metaText}>{dur}</Text>
              </>
            )}
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.priceText}>
              {price != null ? (
                <>
                  <Text style={styles.priceValue}>D{price}</Text>
                  <Text style={styles.priceUnit}> / {exp.unitLabel}</Text>
                </>
              ) : (
                "Book now"
              )}
            </Text>
            <View style={styles.bookBtn}>
              <Text style={styles.bookBtnText}>Book</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>DISCOVER</Text>
          <Text style={styles.title}>Experiences</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search experiences, places"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

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
        {categories.length > 0 && (
          <View style={{ marginTop: 6 }}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Categories</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 18 }}
            >
              {categories.map((cat) => {
                const active = activeCat === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={styles.catItem}
                    activeOpacity={0.85}
                    onPress={() => setActiveCat(active ? null : cat)}
                  >
                    <View
                      style={[styles.catCircle, active && styles.catCircleActive]}
                    >
                      <Ionicons
                        name={iconFor(cat)}
                        size={24}
                        color={active ? "#fff" : PrimaryColor}
                      />
                    </View>
                    <Text
                      style={[styles.catLabel, active && { color: PrimaryColor }]}
                      numberOfLines={1}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* List */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>
            {activeCat ? activeCat : "Explore experiences"}
          </Text>
          {(activeCat || query) && (
            <TouchableOpacity
              onPress={() => {
                setActiveCat(null);
                setQuery("");
              }}
            >
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {loading ? (
            [1, 2].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonImg} />
                <View style={styles.skeletonLineWide} />
                <View style={styles.skeletonLine} />
              </View>
            ))
          ) : error ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="cloud-offline-outline" size={44} color="#CBD5E1" />
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyBadge}>
                <Ionicons name="sparkles-outline" size={32} color={PrimaryColor} />
              </View>
              <Text style={styles.emptyTitle}>
                {experiences.length === 0
                  ? "Nothing here yet"
                  : "No matches"}
              </Text>
              <Text style={styles.emptyText}>
                {experiences.length === 0
                  ? "New experiences are coming soon."
                  : "Try a different search or category."}
              </Text>
            </View>
          ) : (
            filtered.map(renderCard)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 12,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    color: PrimaryColor,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  searchRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#0F172A" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  clearText: { color: PrimaryColor, fontWeight: "700", fontSize: 13 },
  catItem: { alignItems: "center", width: 64 },
  catCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#FFF5EE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  catCircleActive: { backgroundColor: PrimaryColor },
  catLabel: { fontSize: 12, color: "#475569", fontWeight: "600" },
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
    width: SCREEN_W - 32,
    height: 180,
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
  cardBody: { padding: 14 },
  cardName: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  metaText: { fontSize: 12.5, color: "#64748B", fontWeight: "500" },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 5,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  priceText: { fontSize: 14 },
  priceValue: { fontSize: 18, fontWeight: "900", color: PrimaryColor },
  priceUnit: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
  bookBtn: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
  },
  bookBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  emptyWrap: { alignItems: "center", paddingTop: 50, paddingHorizontal: 40 },
  emptyBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF5EE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
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
  skeletonImg: { width: "100%", height: 180, backgroundColor: "#EEF2F6" },
  skeletonLineWide: {
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EEF2F6",
    margin: 14,
    marginBottom: 8,
    width: "60%",
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 14,
    marginBottom: 16,
    width: "40%",
  },
});
