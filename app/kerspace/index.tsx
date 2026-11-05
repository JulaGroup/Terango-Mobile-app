/**
 * KërSpace — Real Estate home (customer). Clean, industry-standard layout
 * (white surfaces + dark navy accent): location bar, search, category tiles,
 * Buy/Rent tabs, a Recommended rail and a switchable 1-col / 2-col listing grid.
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
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
const COLS_KEY = "@kerspace_cols";

const TYPES = [
  { key: "ALL", label: "All", icon: "apps" },
  { key: "HOUSE", label: "House", icon: "home" },
  { key: "VILLA", label: "Villa", icon: "business" },
  { key: "APARTMENT", label: "Apartment", icon: "business-outline" },
  { key: "OFFICE", label: "Office", icon: "briefcase" },
  { key: "LAND", label: "Land", icon: "map" },
  { key: "COMMERCIAL", label: "Shop", icon: "storefront" },
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
  const [cols, setCols] = useState(2);

  const [filterOpen, setFilterOpen] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [beds, setBeds] = useState("");

  useEffect(() => {
    AsyncStorage.getItem(COLS_KEY).then((v) => {
      if (v === "1" || v === "2") setCols(Number(v));
    });
  }, []);

  const switchCols = (c: number) => {
    setCols(c);
    AsyncStorage.setItem(COLS_KEY, String(c)).catch(() => {});
  };

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
      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.locWrap}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={K.ink} />
          </TouchableOpacity>
          <View>
            <Text style={s.locLabel}>Location</Text>
            <View style={s.locRow}>
              <Ionicons name="location" size={14} color={K.primary} />
              <Text style={s.locCity}>The Gambia</Text>
              <Ionicons name="chevron-down" size={13} color={K.inkMid} />
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={s.bell}
          onPress={() => router.push("/kerspace/saved" as any)}
        >
          <Ionicons name="heart-outline" size={20} color={K.ink} />
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
        <TouchableOpacity style={s.filterCircle} onPress={() => setFilterOpen(true)}>
          <Ionicons name="options" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Buy / Rent tabs */}
      <View style={s.listingTabs}>
        {LISTING_TABS.map((t) => {
          const on = listingType === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={s.listingTab}
              onPress={() => setListingType(t.key)}
            >
              <Text style={[s.listingTabText, on && s.listingTabTextOn]}>
                {t.label}
              </Text>
              {on && <View style={s.listingUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category tiles */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={TYPES}
        keyExtractor={(t) => t.key}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingTop: 4 }}
        renderItem={({ item: t }) => {
          const on = type === t.key;
          return (
            <TouchableOpacity
              style={s.catTile}
              onPress={() => setType(t.key)}
              activeOpacity={0.85}
            >
              <View style={[s.catIcon, on && s.catIconOn]}>
                <Ionicons
                  name={t.icon as any}
                  size={20}
                  color={on ? "#fff" : K.primary}
                />
              </View>
              <Text style={[s.catLabel, on && s.catLabelOn]}>{t.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Recommended rail */}
      {featured.length > 0 && (
        <View style={{ marginTop: 20 }}>
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

      {/* Section head + column toggle */}
      <View style={[s.sectionHead, { marginTop: 22 }]}>
        <Text style={s.sectionTitle}>
          {search ? "Results" : "Available properties"}
        </Text>
        <View style={s.colToggle}>
          <TouchableOpacity
            style={[s.colBtn, cols === 1 && s.colBtnOn]}
            onPress={() => switchCols(1)}
          >
            <Ionicons
              name="list"
              size={17}
              color={cols === 1 ? "#fff" : K.inkMid}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.colBtn, cols === 2 && s.colBtnOn]}
            onPress={() => switchCols(2)}
          >
            <Ionicons
              name="grid"
              size={15}
              color={cols === 2 ? "#fff" : K.inkMid}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Property }) =>
    cols === 2 ? (
      <GridCard
        p={item}
        saved={savedIds.includes(item.id)}
        onPress={() => openDetail(item.id)}
        onSave={() => onToggleSave(item)}
      />
    ) : (
      <View style={{ paddingHorizontal: 16 }}>
        <RowCard
          p={item}
          saved={savedIds.includes(item.id)}
          onPress={() => openDetail(item.id)}
          onSave={() => onToggleSave(item)}
        />
      </View>
    );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      {loading ? (
        <FlatList
          key="skeleton"
          data={[0, 1, 2, 3]}
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
          key={`list-${cols}`}
          data={items}
          keyExtractor={(p) => p.id}
          numColumns={cols}
          ListHeaderComponent={Header}
          columnWrapperStyle={
            cols === 2 ? { paddingHorizontal: 16, gap: COL_GAP } : undefined
          }
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
          renderItem={renderItem}
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

// ─── Shared bits ──────────────────────────────────────────────────────────────
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

function HeartBtn({
  saved,
  onPress,
  dark,
}: {
  saved: boolean;
  onPress: () => void;
  dark?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.heart, dark && s.heartDark]}
      onPress={onPress}
      hitSlop={8}
    >
      <Ionicons
        name={saved ? "heart" : "heart-outline"}
        size={17}
        color={saved ? "#EF4444" : dark ? K.inkMid : "#fff"}
      />
    </TouchableOpacity>
  );
}

export function TrustBadge({ p }: { p: Property }) {
  const teranGO = !p.agentId && p.isVerified;
  if (teranGO) {
    return (
      <View style={s.trustTeranGO}>
        <Ionicons name="checkmark-circle" size={13} color={K.primary} />
        <Text style={s.trustTeranGOText}>TeranGO</Text>
      </View>
    );
  }
  if (p.isVerified) {
    return (
      <View style={s.trustTick}>
        <Ionicons name="checkmark-circle" size={18} color={K.primary} />
      </View>
    );
  }
  return null;
}

function FeaturedCard({ p, saved, onPress, onSave }: CardProps) {
  const img = p.images?.find((i) => i.isPrimary) || p.images?.[0];
  return (
    <TouchableOpacity style={s.featCard} onPress={onPress} activeOpacity={0.92}>
      <Image source={{ uri: img?.url }} style={s.featImg} contentFit="cover" />
      <View style={s.featTop}>
        <View
          style={[s.pill, { backgroundColor: listingTypeColor(p.listingType) }]}
        >
          <Text style={s.pillText}>{listingTypeLabel(p.listingType)}</Text>
        </View>
        <HeartBtn saved={saved} onPress={onSave} />
      </View>
      <View style={s.featBody}>
        <Text style={s.featPrice} numberOfLines={1}>
          {money(p.price, p.currency)}
          {p.listingType === "FOR_RENT" ? "/mo" : ""}
        </Text>
        <Text style={s.featTitle} numberOfLines={1}>
          {p.title}
        </Text>
        <Text style={s.featLoc} numberOfLines={1}>
          <Ionicons name="location-outline" size={11} color={K.inkLight} />{" "}
          {p.city}
        </Text>
        <Specs p={p} />
      </View>
    </TouchableOpacity>
  );
}

function GridCard({ p, saved, onPress, onSave }: CardProps) {
  const img = p.images?.find((i) => i.isPrimary) || p.images?.[0];
  return (
    <TouchableOpacity
      style={[s.card, { width: GRID_W }]}
      onPress={onPress}
      activeOpacity={0.92}
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
        <Text style={s.price} numberOfLines={1}>
          {money(p.price, p.currency)}
          {p.listingType === "FOR_RENT" ? "/mo" : ""}
        </Text>
        <Text style={s.title} numberOfLines={1}>
          {p.title}
        </Text>
        <Text style={s.loc} numberOfLines={1}>
          <Ionicons name="location-outline" size={11} color={K.inkLight} />{" "}
          {p.city}
        </Text>
        <Specs p={p} />
      </View>
    </TouchableOpacity>
  );
}

function RowCard({ p, saved, onPress, onSave }: CardProps) {
  const img = p.images?.find((i) => i.isPrimary) || p.images?.[0];
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.92}>
      <View style={s.rowImgWrap}>
        <Image source={{ uri: img?.url }} style={s.rowImg} contentFit="cover" />
        <View style={s.rowImgBottom}>
          <TrustBadge p={p} />
        </View>
      </View>
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <View
            style={[s.pill, { backgroundColor: listingTypeColor(p.listingType) }]}
          >
            <Text style={s.pillText}>{listingTypeLabel(p.listingType)}</Text>
          </View>
          <HeartBtn saved={saved} onPress={onSave} dark />
        </View>
        <Text style={s.title} numberOfLines={1}>
          {p.title}
        </Text>
        <Text style={s.loc} numberOfLines={1}>
          <Ionicons name="location-outline" size={11} color={K.inkLight} />{" "}
          {p.city}
          {p.region ? `, ${p.region}` : ""}
        </Text>
        <Specs p={p} />
        <Text style={[s.price, { marginTop: 6 }]} numberOfLines={1}>
          {money(p.price, p.currency)}
          {p.listingType === "FOR_RENT" ? "/mo" : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function SkeletonCard() {
  return (
    <View style={[s.card, { width: GRID_W }]}>
      <View style={[s.gridImgWrap, { backgroundColor: "#EEF0F3" }]} />
      <View style={s.gridBody}>
        <View style={[s.skel, { width: "55%", height: 16 }]} />
        <View style={[s.skel, { width: "90%", height: 12, marginTop: 8 }]} />
        <View style={[s.skel, { width: "45%", height: 12, marginTop: 6 }]} />
      </View>
    </View>
  );
}

type CardProps = {
  p: Property;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
};

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

const CARD_SHADOW = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2,
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: K.bg },
  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  locWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: K.bgSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  locLabel: { fontSize: 11, color: K.inkLight, fontWeight: "600" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 1 },
  locCity: { fontSize: 15, fontWeight: "800", color: K.ink },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: K.bgSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  // Search
  searchRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: K.bgSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  searchInput: { flex: 1, fontSize: 14.5, color: K.ink },
  filterCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: K.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  // Buy/Rent tabs
  listingTabs: {
    flexDirection: "row",
    gap: 22,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  listingTab: { alignItems: "center" },
  listingTabText: { fontSize: 15, fontWeight: "700", color: K.inkLight },
  listingTabTextOn: { color: K.ink, fontWeight: "800" },
  listingUnderline: {
    marginTop: 6,
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: K.primary,
  },
  // Category tiles
  catTile: { alignItems: "center", width: 64 },
  catIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: K.bgSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  catIconOn: { backgroundColor: K.primary },
  catLabel: {
    fontSize: 11.5,
    color: K.inkMid,
    fontWeight: "600",
    marginTop: 6,
  },
  catLabelOn: { color: K.ink, fontWeight: "800" },
  // Section head
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: K.ink },
  colToggle: {
    flexDirection: "row",
    backgroundColor: K.bgSoft,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  colBtn: {
    width: 30,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  colBtnOn: { backgroundColor: K.primary },
  // Specs
  specs: { flexDirection: "row", gap: 12, marginTop: 8 },
  spec: { flexDirection: "row", alignItems: "center", gap: 4 },
  specText: { fontSize: 12, fontWeight: "600" },
  heart: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  heartDark: { backgroundColor: K.bgSoft },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  pillText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  trustTick: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  trustTeranGO: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fff",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trustTeranGOText: { color: K.ink, fontSize: 10, fontWeight: "800" },
  price: { fontSize: 16, fontWeight: "900", color: K.ink },
  title: { fontSize: 14, fontWeight: "700", color: K.ink, marginTop: 4 },
  loc: { fontSize: 12, color: K.inkLight, marginTop: 2 },
  // Featured
  featCard: {
    width: 230,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: K.border,
    overflow: "hidden",
    ...CARD_SHADOW,
  },
  featImg: { width: "100%", height: 150 },
  featTop: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featBody: { padding: 12 },
  featPrice: { fontSize: 17, fontWeight: "900", color: K.ink },
  featTitle: { fontSize: 14, fontWeight: "700", color: K.ink, marginTop: 3 },
  featLoc: { fontSize: 12, color: K.inkLight, marginTop: 2 },
  // Grid card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: K.border,
    ...CARD_SHADOW,
  },
  gridImgWrap: { height: 130, backgroundColor: "#EEF0F3" },
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
  gridBody: { padding: 11 },
  // Row card (1 column)
  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: K.border,
    ...CARD_SHADOW,
  },
  rowImgWrap: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#EEF0F3",
  },
  rowImg: { width: "100%", height: "100%" },
  rowImgBottom: { position: "absolute", bottom: 6, left: 6 },
  rowBody: { flex: 1, paddingLeft: 12, paddingVertical: 2 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skel: { backgroundColor: "#EEF0F3", borderRadius: 6 },
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
    backgroundColor: K.bgSoft,
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
    backgroundColor: K.bgSoft,
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
    backgroundColor: K.bgSoft,
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
