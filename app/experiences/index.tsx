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
const RAIL_W = Math.round(SCREEN_W * 0.78);
const H_PAD = 20;

function eventDate(exp: Experience): string | null {
  if (exp.capacityType !== "FIXED_EVENT" || !exp.eventStartAt) return null;
  return new Date(exp.eventStartAt).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
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
      setError("Couldn't load events. Pull to retry.");
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
  const featured = useMemo(() => filtered.slice(0, 6), [filtered]);

  const fromPrice = (exp: Experience) => {
    const prices = (exp.options || []).map((o) => o.price).filter(Boolean);
    return prices.length ? Math.min(...prices) : null;
  };

  const toggleFav = (id: string) => setFavs((p) => ({ ...p, [id]: !p[id] }));
  const goto = (id: string) =>
    router.push({ pathname: "/experiences/[id]" as any, params: { id } });

  // ── Large featured card (horizontal rail) ──
  const FeaturedCard = ({ exp }: { exp: Experience }) => {
    const price = fromPrice(exp);
    const date = eventDate(exp);
    const fav = !!favs[exp.id];
    return (
      <TouchableOpacity
        style={[s.featCard, { width: RAIL_W }]}
        activeOpacity={0.92}
        onPress={() => goto(exp.id)}
      >
        <View style={s.featImgWrap}>
          {exp.imageUrl ? (
            <Image source={{ uri: exp.imageUrl }} style={s.featImg} />
          ) : (
            <LinearGradient
              colors={["#FFB877", PrimaryColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.featImg, s.imgFallback]}
            >
              <Ionicons
                name={iconForCategory(exp.category)}
                size={44}
                color="rgba(255,255,255,0.9)"
              />
            </LinearGradient>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.65)"]}
            style={s.featScrim}
          />
          {!!exp.category && (
            <View style={s.catTag}>
              <Text style={s.catTagText}>{exp.category}</Text>
            </View>
          )}
          <TouchableOpacity
            style={s.heart}
            onPress={() => toggleFav(exp.id)}
            hitSlop={8}
          >
            <Ionicons
              name={fav ? "heart" : "heart-outline"}
              size={18}
              color={fav ? "#FF3B5C" : "#fff"}
            />
          </TouchableOpacity>
          <View style={s.featOverlay}>
            <Text style={s.featName} numberOfLines={2}>
              {exp.name}
            </Text>
            <View style={s.featMetaRow}>
              <Ionicons name="location-sharp" size={12} color="#fff" />
              <Text style={s.featMeta} numberOfLines={1}>
                {date ? `${date} · ` : ""}
                {exp.city || exp.address || "The Gambia"}
              </Text>
            </View>
          </View>
        </View>
        <View style={s.featFooter}>
          <Text style={s.priceFrom}>
            {price != null ? `From ` : ""}
            <Text style={s.priceVal}>
              {price != null ? `D${price}` : "Free"}
            </Text>
          </Text>
          <View style={s.ctaMini}>
            <Text style={s.ctaMiniText}>Get tickets</Text>
            <Ionicons name="arrow-forward" size={13} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── List row card (full width) ──
  const ListCard = ({ exp }: { exp: Experience }) => {
    const price = fromPrice(exp);
    const date = eventDate(exp);
    const fav = !!favs[exp.id];
    return (
      <TouchableOpacity
        style={s.row}
        activeOpacity={0.92}
        onPress={() => goto(exp.id)}
      >
        <View style={s.rowImgWrap}>
          {exp.imageUrl ? (
            <Image source={{ uri: exp.imageUrl }} style={s.rowImg} />
          ) : (
            <LinearGradient
              colors={["#FFB877", PrimaryColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.rowImg, s.imgFallback]}
            >
              <Ionicons
                name={iconForCategory(exp.category)}
                size={26}
                color="rgba(255,255,255,0.9)"
              />
            </LinearGradient>
          )}
          {date && (
            <View style={s.rowDateChip}>
              <Text style={s.rowDateText}>{date}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rowName} numberOfLines={2}>
            {exp.name}
          </Text>
          <View style={s.rowMetaRow}>
            <Ionicons name="location-outline" size={13} color="#8A8F98" />
            <Text style={s.rowMeta} numberOfLines={1}>
              {exp.city || exp.address || "The Gambia"}
            </Text>
          </View>
          <View style={s.rowBottom}>
            <Text style={s.rowPrice}>
              {price != null ? `D${price}` : "Free"}
            </Text>
            <TouchableOpacity onPress={() => toggleFav(exp.id)} hitSlop={8}>
              <Ionicons
                name={fav ? "heart" : "heart-outline"}
                size={18}
                color={fav ? "#FF3B5C" : "#C2C6CE"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchExperiences(true);
            }}
            tintColor={PrimaryColor}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#1C1C1E" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>Discover</Text>
            <Text style={s.bigTitle}>Amazing Events</Text>
          </View>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search" size={18} color="#9AA0A8" />
          <TextInput
            style={s.searchInput}
            placeholder="Search events, venues…"
            placeholderTextColor="#9AA0A8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#C2C6CE" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
        >
          <Chip
            label="All"
            icon="apps"
            active={!activeCat}
            onPress={() => setActiveCat(null)}
          />
          {EXPERIENCE_CATEGORIES.map((c) => (
            <Chip
              key={c.label}
              label={c.label}
              icon={c.icon}
              active={activeCat === c.label}
              onPress={() =>
                setActiveCat((p) => (p === c.label ? null : c.label))
              }
            />
          ))}
        </ScrollView>

        {/* Loading */}
        {loading ? (
          <View style={{ paddingHorizontal: H_PAD, gap: 14, marginTop: 8 }}>
            <Skeleton style={{ height: 220, borderRadius: 20 }} />
            <Skeleton style={{ height: 96, borderRadius: 18 }} />
            <Skeleton style={{ height: 96, borderRadius: 18 }} />
          </View>
        ) : error ? (
          <View style={s.empty}>
            <Ionicons name="cloud-offline-outline" size={40} color="#CBD0D8" />
            <Text style={s.emptyText}>{error}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={40} color="#CBD0D8" />
            <Text style={s.emptyText}>
              {isFiltering ? "No events match your search." : "No events yet."}
            </Text>
          </View>
        ) : (
          <>
            {/* Featured rail (only when not filtering) */}
            {!isFiltering && featured.length > 0 && (
              <>
                <SectionHeader title="Popular Events 🔥" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: H_PAD,
                    gap: 14,
                    paddingBottom: 4,
                  }}
                >
                  {featured.map((exp) => (
                    <FeaturedCard key={exp.id} exp={exp} />
                  ))}
                </ScrollView>
              </>
            )}

            {/* All / results list */}
            <SectionHeader
              title={isFiltering ? "Results" : "Upcoming Events"}
            />
            <View style={{ paddingHorizontal: H_PAD, gap: 14 }}>
              {filtered.map((exp) => (
                <ListCard key={exp.id} exp={exp} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.chip, active && s.chipActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={15} color={active ? "#fff" : PrimaryColor} />
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: "#1C1C1E",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 14,
  elevation: 3,
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...CARD_SHADOW,
  },
  greeting: { fontSize: 13, color: "#8A8F98", fontWeight: "600" },
  bigTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1C1C1E",
    letterSpacing: -0.5,
    marginTop: 1,
  },
  searchWrap: {
    marginHorizontal: H_PAD,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    ...CARD_SHADOW,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1C1C1E", fontWeight: "500" },
  chipsRow: {
    paddingHorizontal: H_PAD,
    gap: 8,
    paddingVertical: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#EEF0F3",
  },
  chipActive: { backgroundColor: PrimaryColor, borderColor: PrimaryColor },
  chipText: { fontSize: 13, fontWeight: "700", color: "#1C1C1E" },
  chipTextActive: { color: "#fff" },

  sectionHeader: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1C1C1E",
    letterSpacing: -0.3,
  },

  // Featured
  featCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    ...CARD_SHADOW,
  },
  featImgWrap: { height: 180, position: "relative" },
  featImg: { width: "100%", height: "100%" },
  imgFallback: { alignItems: "center", justifyContent: "center" },
  featScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
  },
  catTag: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  catTagText: { fontSize: 11, fontWeight: "800", color: PrimaryColor },
  heart: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  featOverlay: { position: "absolute", left: 14, right: 14, bottom: 12 },
  featName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  featMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  featMeta: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600" },
  featFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  priceFrom: { fontSize: 12, color: "#8A8F98", fontWeight: "600" },
  priceVal: { fontSize: 16, fontWeight: "900", color: "#1C1C1E" },
  ctaMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PrimaryColor,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  ctaMiniText: { color: "#fff", fontSize: 12.5, fontWeight: "800" },

  // List row
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 10,
    ...CARD_SHADOW,
  },
  rowImgWrap: { width: 96, height: 96, borderRadius: 14, overflow: "hidden" },
  rowImg: { width: "100%", height: "100%" },
  rowDateChip: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  rowDateText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  rowName: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#1C1C1E",
    letterSpacing: -0.2,
    paddingTop: 2,
  },
  rowMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  rowMeta: { flex: 1, fontSize: 12.5, color: "#8A8F98", fontWeight: "500" },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  rowPrice: { fontSize: 16, fontWeight: "900", color: PrimaryColor },

  empty: { alignItems: "center", paddingVertical: 70, gap: 12 },
  emptyText: { color: "#9AA0A8", fontWeight: "600", fontSize: 14 },
});
