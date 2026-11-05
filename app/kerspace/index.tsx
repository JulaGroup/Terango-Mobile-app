/**
 * KërSpace — Real Estate home (customer).
 * Homely-style layout with the KërSpace indigo/purple brand: search, property
 * type chips, a Recommended rail and a Nearby/All list with saveable cards.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { kerspaceApi, Property } from "@/lib/api";
import { useMaintenance } from "@/context/MaintenanceContext";
import MaintenanceScreen from "@/components/common/MaintenanceScreen";
import {
  KerSpace as K,
  listingTypeLabel,
  listingTypeColor,
  money,
} from "@/constants/kerspace";
import { getSavedIds, toggleSaved, SavedProperty } from "@/utils/kerspaceSaved";

const { width } = Dimensions.get("window");
const COL_GAP = 12;
const GRID_W = (width - 16 * 2 - COL_GAP) / 2;

const TYPES = [
  { key: "ALL", label: "All", icon: "grid" },
  { key: "HOUSE", label: "House", icon: "home" },
  { key: "VILLA", label: "Villa", icon: "business" },
  { key: "APARTMENT", label: "Apartment", icon: "business-outline" },
  { key: "OFFICE", label: "Office", icon: "briefcase" },
  { key: "LAND", label: "Land", icon: "map" },
  { key: "COMMERCIAL", label: "Commercial", icon: "storefront" },
];

const LISTING_TABS = [
  { key: "ALL", label: "All" },
  { key: "FOR_SALE", label: "Buy" },
  { key: "FOR_RENT", label: "Rent" },
];

export default function KerSpaceHome() {
  const router = useRouter();
  const { flags } = useMaintenance();

  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [featured, setFeatured] = useState<Property[]>([]);
  const [items, setItems] = useState<Property[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [beds, setBeds] = useState("");

  const baseParams = useCallback(
    (p: number) => ({
      page: p,
      limit: 10,
      sortBy: "createdAt",
      listingType: listingType === "ALL" ? undefined : listingType,
      type: type === "ALL" ? undefined : type,
      search: search.trim() || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      bedrooms: beds || undefined,
    }),
    [listingType, type, search, minPrice, maxPrice, beds],
  );

  const loadFirst = useCallback(async () => {
    try {
      const [feat, list] = await Promise.all([
        kerspaceApi.list({ featured: true, limit: 8 }),
        kerspaceApi.list(baseParams(1)),
      ]);
      setFeatured(feat?.data ?? []);
      setItems(list?.data ?? []);
      setTotalPages(list?.meta?.totalPages ?? 1);
      setPage(1);
    } catch {
      /* keep */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [baseParams]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const list = await kerspaceApi.list(baseParams(next));
      setItems((prev) => [...prev, ...(list?.data ?? [])]);
      setPage(next);
    } catch {
      /* keep */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, page, totalPages, baseParams]);

  // Reload when filters change
  useEffect(() => {
    setLoading(true);
    loadFirst();
  }, [listingType, type, minPrice, maxPrice, beds]); // eslint-disable-line

  useFocusEffect(
    useCallback(() => {
      getSavedIds().then(setSavedIds);
    }, []),
  );

  const onToggleSave = async (p: Property) => {
    const now = await toggleSaved(p as SavedProperty);
    setSavedIds((prev) =>
      now ? [...prev, p.id] : prev.filter((x) => x !== p.id),
    );
  };

  const openDetail = (id: string) =>
    router.push({ pathname: "/kerspace/[id]", params: { id } });

  if (flags?.kerspaceMaintenanceMode) {
    return <MaintenanceScreen serviceName="KërSpace" />;
  }

  const Header = (
    <View>
      {/* Brand header */}
      <LinearGradient
        colors={[K.primary, K.primaryDark]}
        style={s.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={s.heroTop}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={s.brand}>KërSpace</Text>
            <Text style={s.brandSub}>Find your space</Text>
          </View>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => router.push("/kerspace/saved" as any)}
          >
            <Ionicons name="heart" size={19} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchRow}>
          <View style={s.search}>
            <Ionicons name="search" size={18} color={K.inkLight} />
            <TextInput
              style={s.searchInput}
              placeholder="Search area, city, property…"
              placeholderTextColor={K.inkLight}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              onSubmitEditing={() => {
                setLoading(true);
                loadFirst();
              }}
            />
          </View>
          <TouchableOpacity style={s.filterBtn} onPress={() => setFilterOpen(true)}>
            <Ionicons name="options" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Listing type tabs */}
      <View style={s.listingTabs}>
        {LISTING_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.listingTab, listingType === t.key && s.listingTabOn]}
            onPress={() => setListingType(t.key)}
          >
            <Text
              style={[
                s.listingTabText,
                listingType === t.key && s.listingTabTextOn,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Property type chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={TYPES}
        keyExtractor={(t) => t.key}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        style={{ marginTop: 4 }}
        renderItem={({ item: t }) => {
          const on = type === t.key;
          return (
            <TouchableOpacity
              style={[s.typeChip, on && s.typeChipOn]}
              onPress={() => setType(t.key)}
            >
              <Ionicons
                name={t.icon as any}
                size={15}
                color={on ? "#fff" : K.primary}
              />
              <Text style={[s.typeChipText, on && s.typeChipTextOn]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Recommended rail */}
      {featured.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Recommended</Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={featured}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            renderItem={({ item }) => (
              <FeaturedCard
                p={item}
                saved={savedIds.includes(item.id)}
                onPress={() => openDetail(item.id)}
                onSave={() => onToggleSave(item)}
              />
            )}
          />
        </View>
      )}

      <View style={[s.sectionHead, { marginTop: 20 }]}>
        <Text style={s.sectionTitle}>
          {search ? "Results" : "Available properties"}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      {loading ? (
        <FlatList
          data={[0, 1, 2, 3, 4, 5]}
          keyExtractor={(i) => String(i)}
          numColumns={2}
          ListHeaderComponent={Header}
          columnWrapperStyle={{ paddingHorizontal: 16, gap: COL_GAP }}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          renderItem={() => <SkeletonCard />}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          numColumns={2}
          ListHeaderComponent={Header}
          columnWrapperStyle={{ paddingHorizontal: 16, gap: COL_GAP }}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadFirst();
              }}
              tintColor={K.primary}
            />
          }
          renderItem={({ item }) => (
            <GridCard
              p={item}
              saved={savedIds.includes(item.id)}
              onPress={() => openDetail(item.id)}
              onSave={() => onToggleSave(item)}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="home-outline" size={40} color={K.inkLight} />
              <Text style={s.emptyTitle}>No properties found</Text>
              <Text style={s.emptySub}>Try adjusting your search or filters.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={K.primary} style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      )}

      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        minPrice={minPrice}
        maxPrice={maxPrice}
        beds={beds}
        setMinPrice={setMinPrice}
        setMaxPrice={setMaxPrice}
        setBeds={setBeds}
        onApply={() => {
          setFilterOpen(false);
          setLoading(true);
          loadFirst();
        }}
        onReset={() => {
          setMinPrice("");
          setMaxPrice("");
          setBeds("");
        }}
      />
    </SafeAreaView>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────
function Specs({ p, light }: { p: Property; light?: boolean }) {
  const c = light ? "rgba(255,255,255,0.9)" : K.inkMid;
  return (
    <View style={s.specs}>
      {p.bedrooms != null && (
        <View style={s.spec}>
          <Ionicons name="bed-outline" size={13} color={c} />
          <Text style={[s.specText, { color: c }]}>{p.bedrooms}</Text>
        </View>
      )}
      {p.bathrooms != null && (
        <View style={s.spec}>
          <Ionicons name="water-outline" size={13} color={c} />
          <Text style={[s.specText, { color: c }]}>{p.bathrooms}</Text>
        </View>
      )}
      {p.area != null && (
        <View style={s.spec}>
          <Ionicons name="resize-outline" size={13} color={c} />
          <Text style={[s.specText, { color: c }]}>{p.area} m²</Text>
        </View>
      )}
    </View>
  );
}

function HeartBtn({ saved, onPress }: { saved: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.heart} onPress={onPress} hitSlop={8}>
      <Ionicons
        name={saved ? "heart" : "heart-outline"}
        size={18}
        color={saved ? "#EF4444" : "#fff"}
      />
    </TouchableOpacity>
  );
}

function FeaturedCard({
  p,
  saved,
  onPress,
  onSave,
}: {
  p: Property;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
}) {
  const img = p.images?.find((i) => i.isPrimary) || p.images?.[0];
  return (
    <TouchableOpacity style={s.featCard} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: img?.url }} style={s.featImg} contentFit="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.75)"]}
        style={s.featOverlay}
      />
      <View style={s.featTop}>
        <View
          style={[s.pill, { backgroundColor: listingTypeColor(p.listingType) }]}
        >
          <Text style={s.pillText}>{listingTypeLabel(p.listingType)}</Text>
        </View>
        <HeartBtn saved={saved} onPress={onSave} />
      </View>
      <View style={s.featBottom}>
        <Text style={s.featTitle} numberOfLines={1}>
          {p.title}
        </Text>
        <Text style={s.featLoc} numberOfLines={1}>
          <Ionicons name="location" size={11} color="#fff" /> {p.city}
        </Text>
        <View style={s.featRow}>
          <Text style={s.featPrice}>
            {money(p.price, p.currency)}
            {p.listingType === "FOR_RENT" ? "/mo" : ""}
          </Text>
        </View>
        <Specs p={p} light />
      </View>
    </TouchableOpacity>
  );
}

// A listing owned by no agent but verified is TeranGO's own curated listing.
export function TrustBadge({ p }: { p: Property }) {
  const teranGO = !p.agentId && p.isVerified;
  if (teranGO) {
    return (
      <View style={[s.trust, { backgroundColor: "#111827" }]}>
        <Ionicons name="shield-checkmark" size={11} color="#fff" />
        <Text style={s.trustText}>TeranGO</Text>
      </View>
    );
  }
  if (p.isVerified) {
    return (
      <View style={[s.trust, { backgroundColor: K.primary }]}>
        <Ionicons name="checkmark-circle" size={11} color="#fff" />
        <Text style={s.trustText}>Verified</Text>
      </View>
    );
  }
  return null;
}

function GridCard({
  p,
  saved,
  onPress,
  onSave,
}: {
  p: Property;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
}) {
  const img = p.images?.find((i) => i.isPrimary) || p.images?.[0];
  return (
    <TouchableOpacity
      style={[s.grid, { width: GRID_W }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={s.gridImgWrap}>
        <Image source={{ uri: img?.url }} style={s.gridImg} contentFit="cover" />
        <View style={s.gridImgTop}>
          <View
            style={[s.pill, { backgroundColor: listingTypeColor(p.listingType) }]}
          >
            <Text style={s.pillText}>{listingTypeLabel(p.listingType)}</Text>
          </View>
          <HeartBtn saved={saved} onPress={onSave} />
        </View>
        <View style={s.gridImgBottom}>
          <TrustBadge p={p} />
        </View>
      </View>
      <View style={s.gridBody}>
        <Text style={s.gridPrice} numberOfLines={1}>
          {money(p.price, p.currency)}
          {p.listingType === "FOR_RENT" ? "/mo" : ""}
        </Text>
        <Text style={s.gridTitle} numberOfLines={1}>
          {p.title}
        </Text>
        <Text style={s.gridLoc} numberOfLines={1}>
          <Ionicons name="location-outline" size={11} color={K.inkLight} />{" "}
          {p.city}
        </Text>
        <Specs p={p} />
      </View>
    </TouchableOpacity>
  );
}

function SkeletonCard() {
  return (
    <View style={[s.grid, { width: GRID_W }]}>
      <View style={[s.gridImgWrap, { backgroundColor: "#E9EAF2" }]} />
      <View style={s.gridBody}>
        <View style={[s.skel, { width: "60%", height: 16 }]} />
        <View style={[s.skel, { width: "90%", height: 12, marginTop: 8 }]} />
        <View style={[s.skel, { width: "50%", height: 12, marginTop: 6 }]} />
      </View>
    </View>
  );
}

// ─── Filter modal ─────────────────────────────────────────────────────────────
function FilterModal({
  open,
  onClose,
  minPrice,
  maxPrice,
  beds,
  setMinPrice,
  setMaxPrice,
  setBeds,
  onApply,
  onReset,
}: any) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.modalBg} onPress={onClose}>
        <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={s.modalHandle} />
          <View style={s.modalHeaderRow}>
            <Text style={s.modalTitle}>Filters</Text>
            <TouchableOpacity style={s.modalClose} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={K.inkMid} />
            </TouchableOpacity>
          </View>

          <Text style={s.modalLabel}>Price range</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              style={[s.modalInput, { flex: 1 }]}
              placeholder="Min"
              placeholderTextColor={K.inkLight}
              keyboardType="numeric"
              value={minPrice}
              onChangeText={setMinPrice}
            />
            <TextInput
              style={[s.modalInput, { flex: 1 }]}
              placeholder="Max"
              placeholderTextColor={K.inkLight}
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={setMaxPrice}
            />
          </View>

          <Text style={s.modalLabel}>Bedrooms (min)</Text>
          <View style={s.bedRow}>
            {["", "1", "2", "3", "4", "5"].map((b) => (
              <TouchableOpacity
                key={b || "any"}
                style={[s.bedChip, beds === b && s.bedChipOn]}
                onPress={() => setBeds(b)}
              >
                <Text style={[s.bedChipText, beds === b && s.bedChipTextOn]}>
                  {b === "" ? "Any" : `${b}+`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.modalActions}>
            <TouchableOpacity style={s.resetBtn} onPress={onReset}>
              <Text style={s.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.applyBtn} onPress={onApply}>
              <Text style={s.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: K.bg },
  center: { paddingVertical: 60, alignItems: "center" },
  hero: {
    paddingTop: 10,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTop: { flexDirection: "row", alignItems: "center" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  brand: { color: "#fff", fontSize: 19, fontWeight: "800", letterSpacing: 0.3 },
  brandSub: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 1 },
  searchRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 14, color: K.ink },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  listingTabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  listingTab: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: K.border,
  },
  listingTabOn: { backgroundColor: K.primary, borderColor: K.primary },
  listingTabText: { fontSize: 14, fontWeight: "700", color: K.inkMid },
  listingTabTextOn: { color: "#fff" },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: K.border,
  },
  typeChipOn: { backgroundColor: K.primary, borderColor: K.primary },
  typeChipText: { fontSize: 13, fontWeight: "700", color: K.inkMid },
  typeChipTextOn: { color: "#fff" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: K.ink },
  specs: { flexDirection: "row", gap: 12, marginTop: 8 },
  spec: { flexDirection: "row", alignItems: "center", gap: 4 },
  specText: { fontSize: 12, fontWeight: "600" },
  heart: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  pillText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  // Featured
  featCard: {
    width: 240,
    height: 260,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  featImg: { width: "100%", height: "100%" },
  featOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: 150 },
  featTop: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featBottom: { position: "absolute", left: 14, right: 14, bottom: 14 },
  featTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  featLoc: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 2 },
  featRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  featPrice: { color: "#fff", fontSize: 18, fontWeight: "800" },
  // List card
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: K.border,
  },
  cardImgWrap: { height: 180, backgroundColor: "#E5E7EB" },
  cardImg: { width: "100%", height: "100%" },
  cardImgTop: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verified: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: K.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  cardBody: { padding: 14 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrice: { fontSize: 18, fontWeight: "800", color: K.primary },
  cardTitle: { fontSize: 16, fontWeight: "700", color: K.ink, marginTop: 4 },
  cardLoc: { fontSize: 13, color: K.inkLight, marginTop: 3 },
  // Grid card (2 columns)
  grid: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: K.border,
  },
  gridImgWrap: { height: 130, backgroundColor: "#E5E7EB" },
  gridImg: { width: "100%", height: "100%" },
  gridImgTop: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gridImgBottom: { position: "absolute", bottom: 8, left: 8 },
  gridBody: { padding: 10 },
  gridPrice: { fontSize: 15, fontWeight: "800", color: K.primary },
  gridTitle: { fontSize: 13.5, fontWeight: "700", color: K.ink, marginTop: 3 },
  gridLoc: { fontSize: 11.5, color: K.inkLight, marginTop: 2 },
  trust: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  trustText: { color: "#fff", fontSize: 9.5, fontWeight: "800" },
  skel: { backgroundColor: "#E9EAF2", borderRadius: 6 },
  empty: { alignItems: "center", paddingVertical: 50, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: K.ink, marginTop: 8 },
  emptySub: { fontSize: 13, color: K.inkMid },
  // Modal
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: K.border,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: K.ink },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: K.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: K.inkMid,
    marginTop: 14,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: K.bg,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: K.ink,
  },
  bedRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  bedChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: K.bg,
    borderWidth: 1,
    borderColor: K.border,
  },
  bedChipOn: { backgroundColor: K.primary, borderColor: K.primary },
  bedChipText: { fontSize: 14, fontWeight: "700", color: K.inkMid },
  bedChipTextOn: { color: "#fff" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  resetBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: K.border,
    alignItems: "center",
  },
  resetText: { fontSize: 15, fontWeight: "700", color: K.inkMid },
  applyBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: K.primary,
    alignItems: "center",
  },
  applyText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
