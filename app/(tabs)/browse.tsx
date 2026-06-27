/**
 * Browse Screen — Grab-style Discover page for TeranGO super app.
 * Orange header, service tiles, category filter tabs, product sections.
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
  FlatList,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Cart from "@/components/common/Cart";
import SearchModal from "@/components/common/SearchModal";
import { UniversalProduct } from "@/components/common/ProductCard";
import VendorAwareProductCard from "@/components/common/VendorAwareProductCard";
import SkeletonLoader from "@/components/ui/browse/SkeletonLoader";
import { VendorOrderingMeta } from "@/utils/vendorOrdering";
import { PrimaryColor } from "@/constants/Colors";
import { API_URL } from "@/constants/config";
import { useCart } from "@/context/CartContext";
import {
  getResponsivePadding,
  getGridColumns,
  getProductCardWidth,
} from "@/utils/responsive";
import AdvertCard from "@/components/ui/home/AdvertCard";
import { Image } from "expo-image";
import TeranGOPicks from "@/components/ui/home/TerangoPicks";
import { Divider } from ".";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RESPONSIVE_PADDING = getResponsivePadding();
const GRID_COLUMNS = getGridColumns();
const PRODUCT_CARD_WIDTH = getProductCardWidth(GRID_COLUMNS);
const HORIZONTAL_CARD_WIDTH = 160;

// 4-column subcategory grid card size
const SUB_CARD_SIZE = (SCREEN_WIDTH - RESPONSIVE_PADDING * 2 - 12 * 3) / 4;

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────
interface SubCategory {
  id: string;
  name: string;
  imageUrl?: string;
  categoryId: string;
  category?: { id: string; name: string };
}

interface CategoryGroup {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  subcategories: SubCategory[];
}

type PublicProduct = {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  shop?: { id: string; name: string; city?: string | null } | null;
  subCategory?: { name?: string | null; imageUrl?: string | null } | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Subcategory IDs
// ─────────────────────────────────────────────────────────────────────────────
const SUBCATEGORY_IDS = {
  riceGrains: "cca76ff8-bc4e-4544-acc1-872c119943a5",
  oilsSpices: "6ac60d93-a199-4cc0-a85d-3636dc0c4508",
  sugarsSweeteners: "9ed2498c-305c-484e-9177-08a56b7b3a82",
  freshProduce: "3433f17f-fe9d-4d04-b4e2-05f9ae0db667",
  frozenFoods: "0a9a4987-a0e9-47fd-a303-0a3aaef5148a",
  dairyEggs: "d3b11157-d7ed-4069-a34f-271d79361451",
  meatPoultry: "930ea464-53b8-4f01-95e6-27e6d8ba8fce",
  fishSeafood: "4f6502da-96be-4c43-92c7-86df851675c5",
  snacks: "be7ae270-3e96-4bb5-9118-61aa8bcf380b",
  beverages: "e5c6f708-f820-4c13-8691-e989ca8720e4",
  fastFood: "092780fb-8b37-4675-9e49-f4e7a99376a7",
  localDishes: "557e0c1d-4e5f-4c3e-8477-987e5ab07d73",
  africanCuisine: "3cfb1f8e-d781-4b48-9dad-ced44a9cf715",
  streetFood: "5cc41d8c-2973-42fe-976b-c614824e395b",
  breakfastBrunch: "6d61f4bc-c450-40fb-a997-6b083c5ad8c2",
  bakeryPastries: "98d6a3f0-78d0-4056-909d-f5724636b845",
};

// ─────────────────────────────────────────────────────────────────────────────
// Icon / gradient maps
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Fast Food": "fast-food",
  Restaurants: "restaurant",
  "Local Dishes": "nutrition",
  Bakery: "cafe",
  "Bakery & Pastries": "cafe",
  Beverages: "wine",
  Desserts: "ice-cream",
  "Street Food": "restaurant",
  "Breakfast & Brunch": "sunny",
  "African Cuisine": "earth",
  "Asian Cuisine": "globe",
  "Rice & Grains": "basket",
  "Fresh Produce": "leaf",
  "Frozen Foods": "snow",
  "Oils & Spices": "flask",
  Snacks: "pizza",
  "Canned & Packaged": "cube",
  "Meat & Poultry": "nutrition-outline",
  "Fish & Seafood": "fish",
  "Dairy & Eggs": "egg",
  "Sugars & Sweeteners": "ice-cream-outline",
  "Vitamins & Supplements": "fitness",
  Medicines: "medical",
  "Baby Products": "heart",
  "Cleaning Supplies": "brush",
  "Kitchen Essentials": "restaurant-outline",
  Toiletries: "hand-left",
  "Laundry Care": "shirt",
  Tools: "construct",
  "Tools & Hardware": "construct",
};

const SECTION_GRADIENTS: Record<string, [string, string]> = {
  food: ["#FF6B6B", "#C92A2A"],
  groceries: ["#51CF66", "#2F9E44"],
  beauty: ["#FF6B9D", "#C92A67"],
  home: ["#4DABF7", "#1971C2"],
  hardware: ["#868E96", "#495057"],
  pharmacy: ["#5C7CFA", "#364FC7"],
};

const CACHE_KEY = "@browse_subcategories_v2";
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Service Tiles (Grab-style quick access)
// ─────────────────────────────────────────────────────────────────────────────
const SERVICE_TILES = [
  {
    key: "food",
    label: "Food",
    icon: "restaurant" as const,
    color: "#FF6B6B",
    bg: "#FFF0F0",
  },
  {
    key: "mart",
    label: "Mart",
    icon: "basket" as const,
    color: "#2F9E44",
    bg: "#EDFAF1",
  },
  {
    key: "pharmacy",
    label: "Pharmacy",
    icon: "medical" as const,
    color: "#5C7CFA",
    bg: "#EEF2FF",
  },
  // { key: "stores",   label: "Stores",    icon: "storefront" as const,   color: "#ff6b00", bg: "#FFF5EE" },
  {
    key: "more",
    label: "More",
    icon: "grid-outline" as const,
    color: "#868E96",
    bg: "#F4F4F5",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Filter Tabs
// ─────────────────────────────────────────────────────────────────────────────
const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "food", label: "Food & Drinks" },
  { key: "groceries", label: "Groceries" },
  { key: "beauty", label: "Beauty" },
  { key: "home", label: "Home" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "hardware", label: "Hardware" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const BrowseScreen: React.FC = () => {
  const { addToCart, removeFromCart, updateQuantity, getQuantity } = useCart();

  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [ndugaStaples, setNdugaStaples] = useState<PublicProduct[]>([]);
  const [trendingNow, setTrendingNow] = useState<PublicProduct[]>([]);
  const [freshProduce, setFreshProduce] = useState<PublicProduct[]>([]);
  const [snacksSection, setSnacksSection] = useState<PublicProduct[]>([]);

  const [sectionsLoading, setSectionsLoading] = useState({
    staples: false,
    trending: false,
    fresh: false,
    snacks: false,
  });

  // ─── Category groups ──────────────────────────────────────────────────────
  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    if (!subcategories.length) return [];

    const foodKeywords = [
      "fast food",
      "restaurant",
      "local",
      "bakery",
      "beverage",
      "drink",
      "dessert",
      "ice cream",
      "street food",
      "breakfast",
      "brunch",
      "african",
      "asian",
      "cuisine",
      "sauce",
      "dip",
    ];
    const groceryKeywords = [
      "rice",
      "grain",
      "produce",
      "frozen",
      "spice",
      "oil",
      "snack",
      "canned",
      "packaged",
      "meat",
      "poultry",
      "fish",
      "seafood",
      "dairy",
      "egg",
      "tea",
      "coffee",
      "cereal",
      "nut",
      "dried fruit",
      "pasta",
      "noodle",
      "sugar",
      "sweetener",
      "condiment",
      "staple",
    ];
    const beautyKeywords = [
      "bath",
      "body",
      "hair",
      "skin",
      "baby care",
      "baby product",
      "baby hygiene",
      "feminine",
      "dental",
      "hygiene",
      "personal care",
    ];
    const homeKeywords = [
      "cleaning",
      "kitchen",
      "household",
      "home",
      "appliance",
      "toiletry",
      "laundry",
      "paper",
      "storage",
      "packaging",
      "air care",
      "freshener",
      "lighting",
      "match",
      "tableware",
      "cutlery",
    ];
    const hardwareKeywords = [
      "tool",
      "hardware",
      "electrical",
      "plumbing",
      "paint",
      "building",
    ];
    const pharmacyKeywords = [
      "medicine",
      "supplement",
      "vitamin",
      "first aid",
      "medical",
      "health",
      "otc",
    ];

    const matches = (name: string, kw: string[]) => {
      const l = name.toLowerCase();
      return kw.some((k) => l.includes(k));
    };

    return [
      {
        key: "food",
        title: "Food & Drinks",
        subtitle: "Restaurants, fast food & local favorites",
        icon: "restaurant" as const,
        gradient: SECTION_GRADIENTS.food,
        subcategories: subcategories.filter((s) =>
          matches(s.name, foodKeywords),
        ),
      },
      {
        key: "groceries",
        title: "Groceries & Staples",
        subtitle: "Fresh produce, rice, oils & daily essentials",
        icon: "basket" as const,
        gradient: SECTION_GRADIENTS.groceries,
        subcategories: subcategories.filter((s) =>
          matches(s.name, groceryKeywords),
        ),
      },
      {
        key: "beauty",
        title: "Beauty & Hygiene",
        subtitle: "Skincare, hair care & personal care",
        icon: "sparkles" as const,
        gradient: SECTION_GRADIENTS.beauty,
        subcategories: subcategories.filter((s) =>
          matches(s.name, beautyKeywords),
        ),
      },
      {
        key: "home",
        title: "Home & Daily Essentials",
        subtitle: "Cleaning, kitchen items & household needs",
        icon: "home" as const,
        gradient: SECTION_GRADIENTS.home,
        subcategories: subcategories.filter((s) =>
          matches(s.name, homeKeywords),
        ),
      },
      {
        key: "hardware",
        title: "Hardware & Utilities",
        subtitle: "Tools, electrical & building materials",
        icon: "construct" as const,
        gradient: SECTION_GRADIENTS.hardware,
        subcategories: subcategories.filter((s) =>
          matches(s.name, hardwareKeywords),
        ),
      },
      {
        key: "pharmacy",
        title: "Pharmacy & Health",
        subtitle: "Medicines, vitamins & medical supplies",
        icon: "medkit" as const,
        gradient: SECTION_GRADIENTS.pharmacy,
        subcategories: subcategories.filter((s) =>
          matches(s.name, pharmacyKeywords),
        ),
      },
    ].filter((g) => g.subcategories.length > 0);
  }, [subcategories]);

  const filteredGroups = useMemo(
    () =>
      activeTab === "all"
        ? categoryGroups
        : categoryGroups.filter((g) => g.key === activeTab),
    [categoryGroups, activeTab],
  );

  // ─── Fetch helpers ────────────────────────────────────────────────────────
  const fetchProductsBySubcategory = async (
    subCategoryId: string,
    limit = 12,
  ): Promise<PublicProduct[]> => {
    const res = await fetch(
      `${API_URL}/api/subcategories/${subCategoryId}/entities?limit=${limit}`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.products || json?.data || []) as PublicProduct[];
  };

  const fetchDynamicSections = useCallback(async () => {
    setSectionsLoading((p) => ({ ...p, staples: true, trending: true }));
    try {
      const [staplesArr, trendingArr] = await Promise.all([
        Promise.all([
          fetchProductsBySubcategory(SUBCATEGORY_IDS.riceGrains, 6),
          fetchProductsBySubcategory(SUBCATEGORY_IDS.oilsSpices, 4),
          fetchProductsBySubcategory(SUBCATEGORY_IDS.sugarsSweeteners, 4),
        ]).then((r) => r.flat()),
        fetch(`${API_URL}/api/public/products/trending?page=1&limit=12`)
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .then((j) => (j?.data || []) as PublicProduct[]),
      ]);
      setNdugaStaples(staplesArr.slice(0, 12));
      setTrendingNow(trendingArr.slice(0, 12));
    } catch (err) {
      console.error("browse phase-1:", err);
    } finally {
      setSectionsLoading((p) => ({ ...p, staples: false, trending: false }));
    }

    await new Promise<void>((r) => setTimeout(r, 500));
    setSectionsLoading((p) => ({ ...p, fresh: true, snacks: true }));
    try {
      const [freshArr, snacksArr] = await Promise.all([
        fetchProductsBySubcategory(SUBCATEGORY_IDS.freshProduce, 12),
        fetchProductsBySubcategory(SUBCATEGORY_IDS.snacks, 12),
      ]);
      setFreshProduce(freshArr.slice(0, 12));
      setSnacksSection(snacksArr.slice(0, 12));
    } catch (err) {
      console.error("browse phase-2:", err);
    } finally {
      setSectionsLoading((p) => ({ ...p, fresh: false, snacks: false }));
    }
  }, []);

  const fetchSubcategories = useCallback(
    async (skipCache = false) => {
      try {
        setLoading(true);
        if (!skipCache) {
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
              setSubcategories(data);
              void fetchDynamicSections();
              setLoading(false);
              return;
            }
          }
        }
        const res = await fetch(`${API_URL}/api/subcategories`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setSubcategories(data || []);
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ data: data || [], timestamp: Date.now() }),
        );
        void fetchDynamicSections();
      } catch (err) {
        console.error("browse subcategories:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchDynamicSections],
  );

  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSubcategories(true);
  }, [fetchSubcategories]);

  // ─── Navigation ───────────────────────────────────────────────────────────
  const handleServiceTap = (key: string) => {
    if (key === "food") router.push("/food" as any);
    else if (key === "mart") router.push("/mart" as any);
    else if (key === "pharmacy")
      router.push({
        pathname: "/CategoryDetailsPage",
        params: {
          categoryId: "b61f14eb-25e6-4faa-8807-53dc376565e5",
          categoryName: "Pharmacy",
        },
      } as any);
    else if (key === "stores") router.push("/AllCategoriesPage" as any);
  };

  const handleSubcategoryPress = (sub: SubCategory) =>
    router.push({
      pathname: "/SubCategoryView",
      params: { subCategoryId: sub.id, subCategoryName: sub.name },
    });

  const handleSeeAll = (section: string, title: string) =>
    router.push({ pathname: "/browse/[section]", params: { section, title } });

  const handleProductPress = (id: string) =>
    router.push({
      pathname: "/product/[productId]",
      params: { productId: id },
    });

  // ─── Cart helpers ─────────────────────────────────────────────────────────
  const handleAddProduct = (
    p: UniversalProduct & {
      vendorId?: string;
      vendorName?: string;
      entityType?: string;
    },
  ) => {
    addToCart({
      id: String(p.id),
      name: p.name,
      price: p.discountedPrice ?? p.price,
      imageUrl: typeof p.image === "string" ? p.image : undefined,
      quantity: 1,
      vendorId: p.vendorId ?? "",
      vendorName: p.vendorName ?? "",
      entityType: p.entityType ?? "product",
    });
  };
  const handleRemoveProduct = (id: string) => {
    const qty = getQuantity(id);
    if (qty <= 1) removeFromCart(id);
    else updateQuantity(id, qty - 1);
  };

  // ─── Render helpers ───────────────────────────────────────────────────────
  const renderProductCard = (item: PublicProduct, horizontal = false) => {
    const qty = getQuantity(item.id);
    const product: UniversalProduct = {
      id: item.id,
      name: item.name,
      price: item.price,
      discountedPrice: item.discountedPrice ?? undefined,
      image: item.imageUrl ?? undefined,
      description: item.description ?? undefined,
      inStock: true,
    };
    const vendor: VendorOrderingMeta = {
      vendorId: item.shop?.id,
      vendorType: "shop",
      vendorName: item.shop?.name,
    };
    return (
      <View
        key={item.id}
        style={
          horizontal ? styles.horizontalCardWrap : { width: PRODUCT_CARD_WIDTH }
        }
      >
        <VendorAwareProductCard
          product={product}
          cartQuantity={qty}
          onAddToCart={() =>
            handleAddProduct({
              ...product,
              vendorId: item.shop?.id,
              vendorName: item.shop?.name,
              entityType: "product",
            })
          }
          onRemoveFromCart={() => handleRemoveProduct(item.id)}
          onPress={() => handleProductPress(item.id)}
          cardWidth={horizontal ? HORIZONTAL_CARD_WIDTH : PRODUCT_CARD_WIDTH}
          vendor={vendor}
        />
      </View>
    );
  };

  // 4-column Grab-style subcategory card
  const renderSubCard = (sub: SubCategory, gradient: [string, string]) => {
    const icon = CATEGORY_ICONS[sub.name] || "grid";
    return (
      <TouchableOpacity
        key={sub.id}
        style={styles.subCard}
        activeOpacity={0.75}
        onPress={() => handleSubcategoryPress(sub)}
      >
        <View style={styles.subCardIconWrap}>
          {sub.imageUrl ? (
            <Image
              source={{ uri: sub.imageUrl }}
              style={styles.subCardImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.subCardGradient}
            >
              <Ionicons name={icon} size={28} color="rgba(255,255,255,0.95)" />
            </LinearGradient>
          )}
        </View>
        <Text style={styles.subCardName} numberOfLines={2}>
          {sub.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({
    title,
    subtitle,
    onSeeAll,
  }: {
    title: string;
    subtitle: string;
    onSeeAll?: () => void;
  }) => (
    <View style={styles.sectionHeaderRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {onSeeAll && (
        <TouchableOpacity
          onPress={onSeeAll}
          activeOpacity={0.7}
          style={styles.seeAllBtn}
        >
          <Text style={styles.seeAllText}>See all</Text>
          <Ionicons name="chevron-forward" size={14} color={PrimaryColor} />
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />

      {/* ── Orange Header ───────────────────────────────── */}
      <View style={styles.header}>
        {/* Search touchable */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => setSearchModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="search-outline" size={17} color="#aaa" />
          <Text style={styles.searchPlaceholder}>
            Search food, groceries, pharmacy…
          </Text>
        </TouchableOpacity>
        <Cart />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PrimaryColor]}
            tintColor={PrimaryColor}
          />
        }
      >
        {/* ── Service Tiles ── */}
        <View style={styles.serviceRow}>
          {SERVICE_TILES.map((tile) => (
            <TouchableOpacity
              key={tile.key}
              style={styles.serviceTile}
              onPress={() => handleServiceTap(tile.key)}
              activeOpacity={0.75}
            >
              <View
                style={[styles.serviceIconCircle, { backgroundColor: tile.bg }]}
              >
                <Ionicons name={tile.icon} size={26} color={tile.color} />
              </View>
              <Text style={styles.serviceTileLabel}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Hero Ad Banner ── */}
        <View style={styles.heroBannerWrap}>
          <AdvertCard />
        </View>
        <Divider />

        <TeranGOPicks />
        <Divider />
        {/* ── Browse Categories ── */}
        <View style={styles.categoriesSection}>
          {/* Section header */}
          <View style={styles.categoriesTitleRow}>
            <Text style={styles.categoriesTitle}>Browse Categories</Text>
            <Text style={styles.categoriesSubtitle}>
              Everything you need, one tap away
            </Text>
          </View>

          {/* Filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsRow}
          >
            {FILTER_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  activeTab === tab.key && styles.filterTabActive,
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeTab === tab.key && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Category grid */}
          {loading ? (
            <View style={{ paddingHorizontal: RESPONSIVE_PADDING }}>
              <SkeletonLoader type="category" count={8} />
            </View>
          ) : filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <View key={group.key} style={styles.groupBlock}>
                {/* Group label row */}
                <View style={styles.groupLabelRow}>
                  <View
                    style={[
                      styles.groupAccentDot,
                      { backgroundColor: group.gradient[0] },
                    ]}
                  />
                  <Text style={styles.groupLabelTitle}>{group.title}</Text>
                </View>

                {/* 4-column grid */}
                <View style={styles.subGrid}>
                  {group.subcategories
                    .slice(0, 8)
                    .map((sub) => renderSubCard(sub, group.gradient))}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="grid-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No categories yet</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Trending Now ── */}
        <View style={styles.sectionBlock}>
          <SectionHeader
            title="Trending Now"
            subtitle="Most ordered today"
            onSeeAll={() => handleSeeAll("trending", "Trending Now")}
          />
          {sectionsLoading.trending ? (
            <SkeletonLoader type="horizontal" count={3} />
          ) : trendingNow.length > 0 ? (
            <FlatList
              data={trendingNow}
              keyExtractor={(i) => i.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => renderProductCard(item, true)}
            />
          ) : null}
        </View>

        {/* ── Nduga Staples ── */}
        <View style={styles.sectionBlock}>
          <SectionHeader
            title="Everyday Staples"
            subtitle="Rice, oils, sugar & flour"
            onSeeAll={() => handleSeeAll("essentials", "Everyday Staples")}
          />
          {sectionsLoading.staples ? (
            <SkeletonLoader type="horizontal" count={3} />
          ) : ndugaStaples.length > 0 ? (
            <FlatList
              data={ndugaStaples}
              keyExtractor={(i) => i.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => renderProductCard(item, true)}
            />
          ) : null}
        </View>

        {/* ── Mid Ad ── */}
        <View style={styles.midAdWrap}>
          <AdvertCard position="HOME_AFTER_RESTAURANTS" />
        </View>

        {/* ── Fresh Produce ── */}
        <View style={styles.sectionBlock}>
          <SectionHeader
            title="Fresh Produce"
            subtitle="Fruits, vegetables & more"
            onSeeAll={() => handleSeeAll("fresh", "Fresh Produce")}
          />
          {sectionsLoading.fresh ? (
            <SkeletonLoader type="horizontal" count={3} />
          ) : freshProduce.length > 0 ? (
            <FlatList
              data={freshProduce}
              keyExtractor={(i) => i.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => renderProductCard(item, true)}
            />
          ) : null}
        </View>

        {/* ── Snacks & Treats ── */}
        <View style={styles.sectionBlock}>
          <SectionHeader
            title="Snacks & Treats"
            subtitle="Munch on something tasty"
            onSeeAll={() => handleSeeAll("snacks", "Snacks & Treats")}
          />
          {sectionsLoading.snacks ? (
            <SkeletonLoader type="horizontal" count={3} />
          ) : snacksSection.length > 0 ? (
            <FlatList
              data={snacksSection}
              keyExtractor={(i) => i.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => renderProductCard(item, true)}
            />
          ) : null}
        </View>
      </ScrollView>

      <SearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: Platform.OS === "android" ? 20 : 0,
    paddingBottom: 40,
  },

  // ── Orange Header ───────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PrimaryColor,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchPlaceholder: { fontSize: 14, color: "#aaa", flex: 1 },

  scrollContent: { paddingBottom: 36 },

  // ── Service Tiles ────────────────────────────────────────────────────────
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  serviceTile: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  serviceIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceTileLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },

  // ── Hero Banner ──────────────────────────────────────────────────────────
  heroBannerWrap: {
    marginTop: 12,
    marginBottom: 4,
  },

  // ── Browse Categories section ────────────────────────────────────────────
  categoriesSection: {
    backgroundColor: "#fff",
    marginTop: 12,
    paddingTop: 20,
    paddingBottom: 8,
  },
  categoriesTitleRow: {
    paddingHorizontal: RESPONSIVE_PADDING,
    marginBottom: 14,
  },
  categoriesTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  categoriesSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 3,
  },

  // Filter tabs
  filterTabsRow: {
    paddingHorizontal: RESPONSIVE_PADDING,
    paddingBottom: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterTabActive: {
    backgroundColor: "#FF6B0015",
    borderColor: "#ff6b00",
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTabTextActive: {
    color: "#ff6b00",
  },

  // Category group in grid
  groupBlock: {
    marginBottom: 20,
    paddingHorizontal: RESPONSIVE_PADDING,
  },
  groupLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  groupAccentDot: {
    width: 4,
    height: 18,
    borderRadius: 3,
  },
  groupLabelTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  // 4-column subcategory grid
  subGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  subCard: {
    width: SUB_CARD_SIZE,
    alignItems: "center",
    gap: 6,
  },
  subCardIconWrap: {
    width: SUB_CARD_SIZE,
    height: SUB_CARD_SIZE,
    borderRadius: 14,
    overflow: "hidden",
  },
  subCardImage: {
    width: "100%",
    height: "100%",
  },
  subCardGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  subCardName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    lineHeight: 15,
  },

  // Empty / retry
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: { fontSize: 14, color: "#9CA3AF" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff6b00",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  retryBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // ── Horizontal product sections ──────────────────────────────────────────
  sectionBlock: {
    backgroundColor: "#fff",
    marginTop: 12,
    paddingTop: 18,
    paddingBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: RESPONSIVE_PADDING,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    paddingLeft: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ff6b00",
  },

  horizontalList: { paddingLeft: RESPONSIVE_PADDING, paddingRight: 8, gap: 12 },
  horizontalCardWrap: { width: HORIZONTAL_CARD_WIDTH },

  midAdWrap: { marginVertical: 12 },
});

export default BrowseScreen;
