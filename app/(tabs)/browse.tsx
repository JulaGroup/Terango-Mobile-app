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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import SearchBar from "@/components/common/SearchBar";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RESPONSIVE_PADDING = getResponsivePadding();
const GRID_COLUMNS = getGridColumns();
const PRODUCT_CARD_WIDTH = getProductCardWidth(GRID_COLUMNS);
const HORIZONTAL_CARD_WIDTH = 160;
const CARD_WIDTH = (SCREEN_WIDTH - RESPONSIVE_PADDING * 2 - 10 * 2) / 3;
const CARD_IMAGE_HEIGHT = 95;

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
// Subcategory IDs – copied from your category list
// ─────────────────────────────────────────────────────────────────────────────
const SUBCATEGORY_IDS = {
  // Nduga Staples (Rice, Oil, Sugar, Flour)
  riceGrains: "cca76ff8-bc4e-4544-acc1-872c119943a5",
  oilsSpices: "6ac60d93-a199-4cc0-a85d-3636dc0c4508",
  sugarsSweeteners: "9ed2498c-305c-484e-9177-08a56b7b3a82",

  // Fresh & Frozen
  freshProduce: "3433f17f-fe9d-4d04-b4e2-05f9ae0db667",
  frozenFoods: "0a9a4987-a0e9-47fd-a303-0a3aaef5148a",
  dairyEggs: "d3b11157-d7ed-4069-a34f-271d79361451",

  // Proteins
  meatPoultry: "930ea464-53b8-4f01-95e6-27e6d8ba8fce",
  fishSeafood: "4f6502da-96be-4c43-92c7-86df851675c5",

  // Snacks & Beverages
  snacks: "be7ae270-3e96-4bb5-9118-61aa8bcf380b",
  beverages: "e5c6f708-f820-4c13-8691-e989ca8720e4",

  // Meals / Food
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
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const BrowseScreen: React.FC = () => {
  const { addToCart, removeFromCart, updateQuantity, getQuantity } = useCart();

  const [searchText, setSearchText] = useState("");
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dynamic section states
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

  // ───────────────────────────────────────────────────────────────────────────
  // Category groups (built from fetched subcategories)
  // ───────────────────────────────────────────────────────────────────────────
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

    const matchesKeywords = (name: string, keywords: string[]) => {
      const lower = name.toLowerCase();
      return keywords.some((k) => lower.includes(k));
    };

    return [
      {
        key: "food",
        title: "Food & Drinks",
        subtitle: "Restaurants, fast food & local favorites",
        icon: "restaurant" as const,
        gradient: SECTION_GRADIENTS.food,
        subcategories: subcategories.filter((s) =>
          matchesKeywords(s.name, foodKeywords),
        ),
      },
      {
        key: "groceries",
        title: "Groceries & Staples",
        subtitle: "Fresh produce, rice, oils & daily essentials",
        icon: "basket" as const,
        gradient: SECTION_GRADIENTS.groceries,
        subcategories: subcategories.filter((s) =>
          matchesKeywords(s.name, groceryKeywords),
        ),
      },
      {
        key: "beauty",
        title: "Beauty & Hygiene",
        subtitle: "Skincare, hair care & personal care",
        icon: "sparkles" as const,
        gradient: SECTION_GRADIENTS.beauty,
        subcategories: subcategories.filter((s) =>
          matchesKeywords(s.name, beautyKeywords),
        ),
      },
      {
        key: "home",
        title: "Home & Daily Essentials",
        subtitle: "Cleaning, kitchen items & household needs",
        icon: "home" as const,
        gradient: SECTION_GRADIENTS.home,
        subcategories: subcategories.filter((s) =>
          matchesKeywords(s.name, homeKeywords),
        ),
      },
      {
        key: "hardware",
        title: "Hardware & Utilities",
        subtitle: "Tools, electrical & building materials",
        icon: "construct" as const,
        gradient: SECTION_GRADIENTS.hardware,
        subcategories: subcategories.filter((s) =>
          matchesKeywords(s.name, hardwareKeywords),
        ),
      },
      {
        key: "pharmacy",
        title: "Pharmacy & Health",
        subtitle: "Medicines, vitamins & medical supplies",
        icon: "medkit" as const,
        gradient: SECTION_GRADIENTS.pharmacy,
        subcategories: subcategories.filter((s) =>
          matchesKeywords(s.name, pharmacyKeywords),
        ),
      },
    ].filter((g) => g.subcategories.length > 0);
  }, [subcategories]);

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch helpers
  // ───────────────────────────────────────────────────────────────────────────
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
    // ── Phase 1: above-the-fold sections (load immediately) ──────────────
    setSectionsLoading((prev) => ({ ...prev, staples: true, trending: true }));
    try {
      const [staplesArr, trendingArr] = await Promise.all([
        // Nduga Staples (Rice + Oils + Sugar combined)
        Promise.all([
          fetchProductsBySubcategory(SUBCATEGORY_IDS.riceGrains, 6),
          fetchProductsBySubcategory(SUBCATEGORY_IDS.oilsSpices, 4),
          fetchProductsBySubcategory(SUBCATEGORY_IDS.sugarsSweeteners, 4),
        ]).then((r) => r.flat()),
        // Trending – using API endpoint
        fetch(`${API_URL}/api/public/products/trending?page=1&limit=12`)
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .then((j) => (j?.data || []) as PublicProduct[]),
      ]);
      setNdugaStaples(staplesArr.slice(0, 12));
      setTrendingNow(trendingArr.slice(0, 12));
    } catch (err) {
      console.error("Error fetching phase-1 browse sections:", err);
    } finally {
      setSectionsLoading((prev) => ({
        ...prev,
        staples: false,
        trending: false,
      }));
    }

    // ── Phase 2: below-the-fold sections (lazy – deferred 500 ms) ────────
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    setSectionsLoading((prev) => ({ ...prev, fresh: true, snacks: true }));
    try {
      const [freshArr, snacksArr] = await Promise.all([
        fetchProductsBySubcategory(SUBCATEGORY_IDS.freshProduce, 12),
        fetchProductsBySubcategory(SUBCATEGORY_IDS.snacks, 12),
      ]);
      setFreshProduce(freshArr.slice(0, 12));
      setSnacksSection(snacksArr.slice(0, 12));
    } catch (err) {
      console.error("Error fetching phase-2 browse sections:", err);
    } finally {
      setSectionsLoading((prev) => ({ ...prev, fresh: false, snacks: false }));
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
        console.error("Error fetching subcategories:", err);
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

  // ───────────────────────────────────────────────────────────────────────────
  // Navigation handlers
  // ───────────────────────────────────────────────────────────────────────────
  const handleSubcategoryPress = (sub: SubCategory) => {
    router.push({
      pathname: "/SubCategoryView",
      params: { subCategoryId: sub.id, subCategoryName: sub.name },
    });
  };
  const handleCustomDelivery = () =>
    Alert.alert("Coming Soon", "Custom Parcel Delivery is coming soon!");
  const handleSeeAll = (section: string, title: string) =>
    router.push({ pathname: "/browse/[section]", params: { section, title } });
  const handleProductPress = (id: string) =>
    router.push({
      pathname: "/product/[productId]",
      params: { productId: id },
    });
  const handleOpenSearch = () => setSearchModalVisible(true);

  // ───────────────────────────────────────────────────────────────────────────
  // Cart helpers (for product cards)
  // ───────────────────────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ───────────────────────────────────────────────────────────────────────────
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
        style={horizontal ? styles.horizontalCardWrap : styles.gridCardWrap}
      >
        <VendorAwareProductCard
          product={product}
          cartQuantity={qty}
          onAddToCart={() => handleAddProduct(product)}
          onRemoveFromCart={() => handleRemoveProduct(item.id)}
          onPress={() => handleProductPress(item.id)}
          cardWidth={horizontal ? HORIZONTAL_CARD_WIDTH : PRODUCT_CARD_WIDTH}
          vendor={vendor}
        />
      </View>
    );
  };

  const renderSubcategoryCard = (
    sub: SubCategory,
    placeholderGradient: [string, string] = ["#FF6B00", "#CC5500"],
  ) => {
    const icon = CATEGORY_ICONS[sub.name] || "grid";
    return (
      <TouchableOpacity
        key={sub.id}
        style={styles.subcategoryCard}
        activeOpacity={0.82}
        onPress={() => handleSubcategoryPress(sub)}
      >
        {sub.imageUrl ? (
          <Image
            source={{ uri: sub.imageUrl }}
            style={styles.subcategoryImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <LinearGradient
            colors={placeholderGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.subcategoryImagePlaceholder}
          >
            <Ionicons name={icon} size={36} color="rgba(255,255,255,0.95)" />
          </LinearGradient>
        )}
        <View style={styles.subcategoryNameWrap}>
          <Text style={styles.subcategoryName} numberOfLines={2}>
            {sub.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryGroup = (group: CategoryGroup) => (
    <View key={group.key} style={styles.groupSection}>
      <View style={styles.groupHeader}>
        <View
          style={[
            styles.groupAccentBar,
            { backgroundColor: group.gradient[0] },
          ]}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <Text style={styles.groupSubtitle}>{group.subtitle}</Text>
        </View>
      </View>
      <View style={styles.subcategoryGrid}>
        {group.subcategories
          .slice(0, 6)
          .map((sub) => renderSubcategoryCard(sub, group.gradient))}
      </View>
    </View>
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Section wrapper
  // ───────────────────────────────────────────────────────────────────────────
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
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={onSeeAll}
          activeOpacity={0.8}
        >
          <Text style={styles.seeAllText}>See all</Text>
          <Ionicons name="chevron-forward" size={16} color="#6B7280" />
        </TouchableOpacity>
      )}
    </View>
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Main Render
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <SearchBar
            onChangeText={setSearchText}
            value={searchText}
            onPress={handleOpenSearch}
            editable={false}
            fullWidth
          />
        </View>
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
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>
            Browse Teran<Text style={{ color: PrimaryColor }}>GO</Text>
          </Text>
          <Text style={styles.pageSubtitle}>
            Shop by category for everything you need
          </Text>
        </View>

        {/* Custom Delivery Card */}
        <TouchableOpacity
          style={styles.customDeliveryCard}
          activeOpacity={0.9}
          onPress={handleCustomDelivery}
        >
          <LinearGradient
            colors={["#1F1F23", "#0B0D0F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.customDeliveryGradient}
          >
            <View style={styles.customDeliveryBadge}>
              <Ionicons name="flash" size={12} color="#0B0D0F" />
              <Text style={styles.customDeliveryBadgeText}>NEW</Text>
            </View>
            <Text style={styles.customDeliveryTitle}>
              Custom Parcel Delivery
            </Text>
            <Text style={styles.customDeliveryDesc}>
              Send parcels anywhere with real-time tracking & vehicle matching
            </Text>
            <View style={styles.customDeliveryFeatures}>
              <View style={styles.featurePill}>
                <Ionicons name="navigate" size={12} color={PrimaryColor} />
                <Text style={styles.featurePillText}>Live tracking</Text>
              </View>
              <View style={styles.featurePill}>
                <Ionicons name="car" size={12} color={PrimaryColor} />
                <Text style={styles.featurePillText}>Vehicle match</Text>
              </View>
            </View>
            <View style={styles.customDeliveryCTA}>
              <Text style={styles.customDeliveryCTAText}>Start delivery</Text>
              <Ionicons name="arrow-forward" size={16} color="#0B0D0F" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
        {/* ─────────── Top Categories ─────────── */}
        {loading ? (
          <View style={styles.topCategoriesSection}>
            <SectionHeader
              title="Top Categories"
              subtitle="Browse everything we offer"
            />
            <SkeletonLoader type="category" count={9} />
          </View>
        ) : categoryGroups.length > 0 ? (
          <View style={styles.topCategoriesSection}>
            <SectionHeader
              title="Top Categories"
              subtitle="Browse everything we offer"
            />
            {categoryGroups.map((group, index) => (
              <React.Fragment key={group.key}>
                {renderCategoryGroup(group)}
                {index < categoryGroups.length - 1 && (
                  <View style={{ marginBottom: 8 }}>
                    <AdvertCard
                      position={
                        index % 2 === 0 ? undefined : "HOME_AFTER_RESTAURANTS"
                      }
                    />
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="grid-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No categories available</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Top Advertisement Banner (Auto-scroll every 7 seconds) */}
        <View style={{ marginBottom: 14 }}>
          <AdvertCard />
        </View>

        {/* ─────────── Dynamic Sections ─────────── */}

        {/* Nduga Staples */}
        <View style={styles.sectionBlock}>
          <SectionHeader
            title="Nduga Staples"
            subtitle="Rice, oils, sugar & flour essentials"
            onSeeAll={() => handleSeeAll("essentials", "Nduga Staples")}
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

        {/* Trending Now */}
        <View style={styles.sectionBlock}>
          <SectionHeader
            title="Trending Now"
            subtitle="Most ordered items"
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

        {/* Popular Meals (MealItemCard) */}
        {/* <View style={styles.sectionBlock}>
          <SectionHeader
            title="Popular Meals"
            subtitle="Local dishes loved by many"
            onSeeAll={() => handleSeeAll("meals", "Popular Meals")}
          />
          {sectionsLoading.meals ? (
            <ActivityIndicator
              style={styles.loader}
              size="small"
              color={PrimaryColor}
            />
          ) : popularMeals.length > 0 ? (
            <View style={styles.mealsList}>
              {popularMeals.slice(0, 4).map(renderMealCard)}
            </View>
          ) : null}
        </View> */}
        {/* Advertisement after restaurants */}
        <View style={{ marginBottom: 14 }}>
          <AdvertCard position="HOME_AFTER_RESTAURANTS" />
        </View>

        {/* Fresh Produce */}
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

        {/* Snacks */}
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

      {/* Search Modal */}
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
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: RESPONSIVE_PADDING,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  scrollContent: { paddingBottom: 32 },
  titleSection: {
    paddingHorizontal: RESPONSIVE_PADDING,
    paddingTop: 24,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  pageSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },

  // Custom Delivery
  customDeliveryCard: {
    marginHorizontal: RESPONSIVE_PADDING,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  customDeliveryGradient: { padding: 20 },
  customDeliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: PrimaryColor,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginBottom: 12,
  },
  customDeliveryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0B0D0F",
    letterSpacing: 0.5,
  },
  customDeliveryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 8,
  },
  customDeliveryDesc: {
    fontSize: 13,
    color: "#D1D5DB",
    lineHeight: 18,
    marginBottom: 16,
  },
  customDeliveryFeatures: { flexDirection: "row", gap: 8, marginBottom: 16 },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,180,114,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  featurePillText: { fontSize: 11, fontWeight: "600", color: PrimaryColor },
  customDeliveryCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: PrimaryColor,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  customDeliveryCTAText: { fontSize: 14, fontWeight: "700", color: "#0B0D0F" },

  // Section block
  sectionBlock: { marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: RESPONSIVE_PADDING,
    marginBottom: 6,
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  sectionSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingLeft: 8,
  },
  seeAllText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },

  loader: { marginVertical: 24 },

  // Horizontal list
  horizontalList: { paddingLeft: RESPONSIVE_PADDING, paddingRight: 8, gap: 12 },
  horizontalCardWrap: { width: HORIZONTAL_CARD_WIDTH },

  // Grid card (2 columns)
  gridCardWrap: { width: PRODUCT_CARD_WIDTH },

  // Meals (vertical list)
  mealsList: { paddingHorizontal: RESPONSIVE_PADDING, gap: 12 },
  mealCardWrap: {},

  // Category groups
  topCategoriesSection: { paddingTop: 20, marginBottom: 4 },
  groupSection: { marginBottom: 32 },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: RESPONSIVE_PADDING,
    marginBottom: 14,
    gap: 10,
  },
  groupAccentBar: {
    width: 4,
    height: 38,
    borderRadius: 2,
  },
  groupTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  groupSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  subcategoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: RESPONSIVE_PADDING,
    columnGap: 10,
    rowGap: 12,
  },
  subcategoryCard: {
    width: CARD_WIDTH,
    backgroundColor: "#FFF",
    borderRadius: 14,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  subcategoryImage: {
    width: "100%",
    height: CARD_IMAGE_HEIGHT,
  },
  subcategoryImagePlaceholder: {
    width: "100%",
    height: CARD_IMAGE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  subcategoryNameWrap: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  subcategoryName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    lineHeight: 17,
  },

  // Loading & Empty
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: { fontSize: 14, color: "#9CA3AF", marginTop: 12 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PrimaryColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: { fontSize: 14, fontWeight: "600", color: "#FFF" },
});

export default BrowseScreen;
