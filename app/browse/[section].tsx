import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import VendorAwareProductCard from "@/components/common/VendorAwareProductCard";
import { useCart } from "@/context/CartContext";
import { PrimaryColor } from "@/constants/Colors";
import { API_URL } from "@/constants/config";
import {
  Product,
  mapProductResponse,
  uniqueProducts,
} from "@/lib/productMapper";

interface FeaturedCollection {
  id: string;
  name: string;
  imageUrl?: string;
  productCount: number;
  products?: Product[];
}

interface ApiCollectionResponse {
  data?: FeaturedCollection[];
}

const { width } = Dimensions.get("window");

const SECTION_METADATA: Record<
  string,
  { title: string; subtitle: string; placeholder?: string }
> = {
  picks: {
    title: "TeranGO Picks",
    subtitle: "Curated by the TeranGO team",
  },
  trending: {
    title: "Trending Now",
    subtitle: "Most ordered this week",
  },
  fresh: {
    title: "Fresh Finds",
    subtitle: "Latest additions to the marketplace",
  },
  essentials: {
    title: "Essentials",
    subtitle: "Daily grocery and pharmacy must-haves",
  },
  beauty: {
    title: "Beauty & Hair Corner",
    subtitle: "Self-care and styling essentials",
  },
  nearby: {
    title: "Nearby Highlights",
    subtitle: "Quick delivery from close-by vendors",
  },
  lifestyle: {
    title: "Lifestyle Collections",
    subtitle: "Featured bundles from partner brands",
    placeholder: "Collections refresh often - check back soon",
  },
};

const QUICK_FILTER_METADATA: Record<
  string,
  { title: string; subtitle: string }
> = {
  "under-200": {
    title: "Under D200",
    subtitle: "Budget-friendly picks for every craving",
  },
  flash: {
    title: "Flash deals",
    subtitle: "Limited-time savings while they last",
  },
  vegan: {
    title: "Vegan",
    subtitle: "Plant-forward meals and pantry staples",
  },
  pharmacy: {
    title: "Pharmacy",
    subtitle: "Essentials for wellness and care",
  },
  beauty: {
    title: "Beauty & hair",
    subtitle: "Glow-up and grooming heroes",
  },
};

const ESSENTIAL_KEYWORDS = [
  "pharmacy",
  "drug",
  "medicine",
  "grocery",
  "mart",
  "market",
  "fresh",
  "essential",
];

const BEAUTY_KEYWORDS = [
  "beauty",
  "hair",
  "salon",
  "spa",
  "skin",
  "glow",
  "makeup",
  "cosmetic",
];

const filterByKeywords = (products: Product[], keywords: string[]) => {
  return products.filter((product) => {
    const haystack = `${product.name} ${product.shopName || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  });
};

const BrowseSectionScreen: React.FC = () => {
  const params = useLocalSearchParams<{
    section?: string;
    title?: string;
    query?: string;
    mode?: string;
  }>();

  const sectionKey = (params.section as string) || "trending";
  const quickFilterMeta = QUICK_FILTER_METADATA[sectionKey];
  const metadata = SECTION_METADATA[sectionKey] ||
    quickFilterMeta || {
      title: params.title || "Explore",
      subtitle: "Discover something new",
    };
  const query = typeof params.query === "string" ? params.query : undefined;
  const mode = typeof params.mode === "string" ? params.mode : undefined;

  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<FeaturedCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/api/public/collections/featured`
      );
      if (!response.ok) {
        throw new Error("Unable to load collections");
      }
      const data: ApiCollectionResponse = await response.json();
      setCollections(data.data || []);
    } catch (err) {
      console.error("Collections fetch error", err);
      setError("We hit a snag pulling collections. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQuickFilter = useCallback(async () => {
    if (!query) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/api/search?q=${encodeURIComponent(
          query
        )}&type=products&page=1&limit=60`
      );
      if (!response.ok) {
        throw new Error("Search request failed");
      }
      const json = await response.json();
      const items = (json?.data?.products || []).map(mapProductResponse);
      setProducts(items);
    } catch (err) {
      console.error("Quick filter fetch error", err);
      setError("Unable to fetch results for this filter. Give it another go.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadStandardSection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (sectionKey === "picks") {
        const [trendingRes, arrivalsRes, flashRes, topRatedRes] =
          await Promise.all([
            fetch(`${API_URL}/api/public/products/trending?page=1&limit=30`),
            fetch(
              `${API_URL}/api/public/products/new-arrivals?page=1&limit=30`
            ),
            fetch(
              `${API_URL}/api/public/products?limit=40&sortBy=orders&sortOrder=desc`
            ),
            fetch(
              `${API_URL}/api/public/products?limit=30&sortBy=orders&sortOrder=desc`
            ),
          ]);

        const parseProducts = async (res: Response): Promise<Product[]> => {
          const json = await res.json();
          return (json.data || []).map(mapProductResponse);
        };

        const [trending, arrivals, flashPool, topRatedPool] = await Promise.all(
          [
            parseProducts(trendingRes),
            parseProducts(arrivalsRes),
            parseProducts(flashRes),
            parseProducts(topRatedRes),
          ]
        );

        const flashDeals = flashPool
          .filter(
            (p) =>
              p.discountedPrice !== undefined && p.discountedPrice < p.price
          )
          .slice(0, 20);

        setProducts(
          uniqueProducts([
            ...flashDeals,
            ...topRatedPool.slice(0, 20),
            ...trending.slice(0, 20),
            ...arrivals.slice(0, 20),
          ])
        );
        return;
      }

      if (sectionKey === "trending") {
        const response = await fetch(
          `${API_URL}/api/public/products/trending?page=1&limit=60`
        );
        const json = await response.json();
        setProducts((json.data || []).map(mapProductResponse));
        return;
      }

      if (sectionKey === "fresh") {
        const response = await fetch(
          `${API_URL}/api/public/products/new-arrivals?page=1&limit=60`
        );
        const json = await response.json();
        setProducts((json.data || []).map(mapProductResponse));
        return;
      }

      if (sectionKey === "nearby") {
        const response = await fetch(
          `${API_URL}/api/public/products?limit=60&sortBy=price&sortOrder=asc`
        );
        const json = await response.json();
        setProducts((json.data || []).map(mapProductResponse));
        return;
      }

      if (sectionKey === "essentials" || sectionKey === "beauty") {
        const response = await fetch(
          `${API_URL}/api/public/products?limit=80&sortBy=orders&sortOrder=desc`
        );
        const json = await response.json();
        const pool: Product[] = (json.data || []).map(mapProductResponse);
        const keywords =
          sectionKey === "essentials" ? ESSENTIAL_KEYWORDS : BEAUTY_KEYWORDS;
        const filtered = filterByKeywords(pool, keywords);
        setProducts(filtered.length > 0 ? filtered : pool.slice(0, 40));
        return;
      }

      // Default fallback: trending
      const response = await fetch(
        `${API_URL}/api/public/products/trending?page=1&limit=60`
      );
      const json = await response.json();
      setProducts((json.data || []).map(mapProductResponse));
    } catch (err) {
      console.error("Section fetch error", err);
      setError("We couldn't load this section just now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [sectionKey]);

  useEffect(() => {
    if (sectionKey === "lifestyle") {
      loadCollections();
      return;
    }

    if (mode === "filter") {
      loadQuickFilter();
      return;
    }

    loadStandardSection();
  }, [sectionKey, mode, loadCollections, loadQuickFilter, loadStandardSection]);

  const getCartQuantity = useCallback(
    (productId: string) => {
      const item = cartItems.find((c) => c.id === productId);
      return item ? item.quantity : 0;
    },
    [cartItems]
  );

  const handleAdd = useCallback(
    (item: Product) => {
      const cartItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        discountedPrice: item.discountedPrice,
        description: item.shopName || item.shop?.name || "",
        vendorId: item.shop?.vendorId || "",
        vendorName: item.shopName || item.shop?.name || "",
        imageUrl: item.imageUrl,
        entityType: "product",
      } as any;
      addToCart(cartItem);
    },
    [addToCart]
  );

  const handleRemove = useCallback(
    (productId: string) => {
      const existing = cartItems.find((c) => c.id === productId);
      if (existing && existing.quantity > 1) {
        updateQuantity(productId, existing.quantity - 1);
      } else {
        removeFromCart(productId);
      }
    },
    [cartItems, removeFromCart, updateQuantity]
  );

  const handleProductPress = useCallback((product: Product) => {
    router.push({
      pathname: "/product/[productId]",
      params: { productId: product.id },
    });
  }, []);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <View style={styles.productCardWrap}>
        <VendorAwareProductCard
          product={{
            id: item.id,
            name: item.name,
            price: item.discountedPrice || item.price,
            discountedPrice: item.discountedPrice,
            image: item.imageUrl,
            description: item.shopName || item.shop?.name,
            inStock: true,
          }}
          cartQuantity={getCartQuantity(item.id)}
          onAddToCart={() => handleAdd(item)}
          onRemoveFromCart={() => handleRemove(item.id)}
          onPress={() => handleProductPress(item)}
          cardWidth={(width - 16 * 2 - 12) / 2}
          vendor={{
            vendorId: item.shop?.vendorId,
            vendorType: "shop",
            vendorName: item.shopName || item.shop?.name,
          }}
        />
      </View>
    ),
    [getCartQuantity, handleAdd, handleRemove, handleProductPress]
  );

  const renderCollection = useCallback(
    ({ item }: { item: FeaturedCollection }) => (
      <TouchableOpacity
        style={styles.collectionCard}
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: "/SubCategoryView",
            params: {
              subCategoryId: item.id,
              subCategoryName: item.name,
            },
          })
        }
      >
        <View style={styles.collectionInfo}>
          <Text style={styles.collectionName}>{item.name}</Text>
          <Text style={styles.collectionCount}>{item.productCount} items</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={PrimaryColor} />
      </TouchableOpacity>
    ),
    []
  );

  const dataIsEmpty = useMemo(() => {
    if (sectionKey === "lifestyle") {
      return !loading && collections.length === 0;
    }
    return !loading && products.length === 0;
  }, [collections.length, loading, products.length, sectionKey]);

  const screenTitle = params.title || metadata.title;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={PrimaryColor} />
          <Text style={styles.stateLabel}>Loading up this section...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.errorLabel}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              if (sectionKey === "lifestyle") {
                loadCollections();
              } else if (mode === "filter") {
                loadQuickFilter();
              } else {
                loadStandardSection();
              }
            }}
            style={styles.retryButton}
          >
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : dataIsEmpty ? (
        <View style={styles.centerState}>
          <Ionicons name="planet" size={22} color="#9CA3AF" />
          <Text style={styles.stateLabel}>
            {metadata.placeholder || "Nothing to show right now."}
          </Text>
          <TouchableOpacity
            style={styles.retryButtonAlt}
            onPress={() => router.push({ pathname: "/(tabs)/browse" })}
          >
            <Text style={styles.retryAltText}>Back to browse</Text>
          </TouchableOpacity>
        </View>
      ) : sectionKey === "lifestyle" ? (
        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          renderItem={renderCollection}
          contentContainerStyle={styles.collectionList}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  homeChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PrimaryColor,
    alignItems: "center",
    justifyContent: "center",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  stateLabel: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  errorLabel: {
    fontSize: 13,
    color: "#B91C1C",
    textAlign: "center",
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PrimaryColor,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  retryText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  retryButtonAlt: {
    marginTop: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PrimaryColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryAltText: {
    color: PrimaryColor,
    fontSize: 13,
    fontWeight: "600",
  },
  productList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  productCardWrap: {
    marginBottom: 12,
  },
  collectionList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  collectionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  collectionCount: {
    fontSize: 12,
    color: "#6B7280",
  },
});

export default BrowseSectionScreen;
