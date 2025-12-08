import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
  ScrollView,
  FlatList,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";

import SearchBar from "@/components/common/SearchBar";
import Cart from "@/components/common/Cart";
import SearchModal from "@/components/common/SearchModal";
import ProductSliderSection from "@/components/ui/browse/ProductSliderSection";
import ComingSoonModal from "@/components/ui/browse/ComingSoonModal";
import SkeletonLoader from "@/components/ui/browse/SkeletonLoader";
import MealItemCard from "@/components/common/MealItemCard";
import { PrimaryColor } from "@/constants/Colors";
import { API_URL } from "@/constants/config";
import {
  Product,
  mapProductResponse,
  uniqueProducts,
} from "@/lib/productMapper";
import { useCart } from "@/context/CartContext";

interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  slug?: string;
  _count?: { products: number };
}

interface FeaturedCollection {
  id: string;
  name: string;
  imageUrl?: string;
  productCount: number;
  products?: Product[];
}

interface Meal {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  mealTime?: string | null;
  restaurant?: {
    id: string;
    name: string;
    city?: string | null;
    rating?: number | null;
    totalReviews?: number | null;
    imageUrl?: string | null;
  } | null;
}

interface MealSection extends MealSectionConfig {
  items: Meal[];
}

interface ComingSoonContent {
  title: string;
  message: string;
  helper?: string;
  badge?: string;
}

interface QuickFilter {
  key: string;
  label: string;
  query: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface HeroTab {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  headline: string;
  message: string;
  gradient: [string, string];
}

const CACHE_DURATION_6H = 6 * 60 * 60 * 1000;
const CACHE_DURATION_24H = 24 * 60 * 60 * 1000;
const MEAL_SECTIONS_CACHE_KEY = "@meal_sections";

const HERO_TABS: HeroTab[] = [
  {
    key: "marketplace",
    label: "Marketplace",
    icon: "storefront",
    headline: "Shop curated essentials",
    message:
      "Next-gen merchant experiences across groceries, beauty, and pharmacy are almost ready.",
    gradient: ["#1F1F23", "#0B0D0F"],
  },
  {
    key: "dining",
    label: "Dining",
    icon: "restaurant",
    headline: "Book chef-led dining",
    message:
      "Seamless reservations with exclusive perks for TeranGO diners launch soon.",
    gradient: ["#1A1B1F", "#131316"],
  },
  {
    key: "services",
    label: "Services",
    icon: "sparkles",
    headline: "Concierge-level services",
    message:
      "Personal errands, wellness, and lifestyle pros are lining up for you.",
    gradient: ["#17171A", "#0B0C10"],
  },
];

const QUICK_FILTERS: QuickFilter[] = [
  {
    key: "under-200",
    label: "Under D200",
    query: "price<200",
    icon: "cash-outline",
  },
  {
    key: "flash",
    label: "Flash deals",
    query: "flash deals",
    icon: "flash-outline",
  },
  { key: "vegan", label: "Vegan", query: "vegan", icon: "leaf-outline" },
  {
    key: "pharmacy",
    label: "Pharmacy",
    query: "pharmacy essentials",
    icon: "medkit-outline",
  },
  {
    key: "beauty",
    label: "Beauty & hair",
    query: "beauty hair",
    icon: "color-wand-outline",
  },
];

const CATEGORIES = {
  GROCERIES: {
    id: "0908cba0-3afa-4518-baff-c318c7b49f56",
    subCategories: {
      "Oils & Spices": "6ac60d93-a199-4cc0-a85d-3636dc0c4508",
      "Rice & Grains": "cca76ff8-bc4e-4544-acc1-872c119943a5",
      "Canned & Packaged": "da6110fb-5229-4448-b835-f298d677b764",
      Bakery: "f43c7628-c1f1-4faf-a426-080595cd7cf8",
      "Meat & Poultry": "930ea464-53b8-4f01-95e6-27e6d8ba8fce",
      "Fresh Produce": "3433f17f-fe9d-4d04-b4e2-05f9ae0db667",
      "Fish & Seafood": "4f6502da-96be-4c43-92c7-86df851675c5",
      "Dairy & Eggs": "d3b11157-d7ed-4069-a34f-271d79361451",
      Snacks: "be7ae270-3e96-4bb5-9118-61aa8bcf380b",
      "Condiments & Sauces": "c43b88b9-eb6e-4f1d-bb27-8eb051646cab",
      "Tea & Coffee": "ce7ba854-5c99-44de-8657-504b91792875",
      "Cereals & Breakfast": "3db3d86e-3f5a-4a38-b15f-02f5702a30e4",
      "Frozen Foods": "0a9a4987-a0e9-47fd-a303-0a3aaef5148a",
      "Nuts & Dried Fruits": "cfe75114-1b40-4717-a568-ec592db89ca1",
      "Pasta & Noodles": "0a0b2adf-af3d-4412-8c44-d915deefb9c8",
      "Sugars & Sweeteners": "9ed2498c-305c-484e-9177-08a56b7b3a82",
      Beverages: "e5c6f708-f820-4c13-8691-e989ca8720e4",
    },
  },
  PHARMACY: {
    id: "b61f14eb-25e6-4faa-8807-53dc376565e5",
    subCategories: {
      "Personal Care": "91769bbc-c354-4b97-ae8f-3b8b27727d57",
      Medicines: "f41dd4c6-b7df-4df2-8190-36a02a152006",
      "Baby Products": "f7f6a7aa-d232-4f73-840b-546e2e68db58",
      "Vitamins & Supplements": "6830ae37-1f90-46c3-bff2-464901cef7ab",
      "First Aid": "3dd0680b-d053-4b36-87c0-e7f8fe3be24b",
      Hygiene: "35a58046-e8cd-4003-b41a-e5a8a0741122",
      "Health Devices": "5c7d4fa6-6888-492f-a461-a295564dc37f",
      "Skin & Body Care": "897abec1-decd-4684-bbe6-b4f03d31554b",
      "Hair Care": "24fbeea8-acb4-4306-980d-38587c03a2e7",
      "Dental Care": "8a7c8a43-a82e-4ddb-9e85-b7b3bc70e2b5",
      "Feminine Care": "702e52ca-f6e0-403b-ae9f-aa34531e652f",
      "Baby Hygiene": "f74be19c-acc9-4020-993e-0120d61993e0",
    },
  },
  HOME_ESSENTIALS: {
    id: "ee51a540-afca-4450-8806-7b1255d88bec",
    subCategories: {
      "Home Utilities": "4a72494c-3929-461b-ae0a-1f5f6e4be0fb",
      "Cleaning Supplies": "b8f9cf07-7875-492d-8269-8ea393515ebe",
      Toiletries: "d2633442-5433-4001-8611-3ec49c881482",
      "Laundry Care": "226c2675-6312-4a68-b431-1e05cd40098f",
      "Kitchen Essentials": "754a0537-f9a4-419c-a4a5-d78cc43ca86e",
      "Tools & Hardware": "577e926d-23b1-4339-96a8-8ae358903577",
      "Small Appliances": "99635212-f5cc-494d-8684-b6c40309bb00",
      "Paper Products": "0ec08318-5582-43e6-9ead-5cfb0835f86b",
      "Storage & Packaging": "42f99196-52e6-41f7-a54c-d43dbc1e1ce9",
      "Air Care & Fresheners": "564bf729-c75c-4e69-b715-298fc057eca4",
      "Lighting & Matches": "c952e9ed-fa3c-49a4-9bab-0b886a98093e",
      "Tableware & Cutlery": "e6ab29d5-c71b-41fa-b712-9fdd35c7b069",
    },
  },
  FOOD: {
    id: "095eb4ff-362f-455b-90eb-a1df9f86e442",
    subCategories: {
      "Fast Food": "092780fb-8b37-4675-9e49-f4e7a99376a7",
      "Local Dishes": "557e0c1d-4e5f-4c3e-8477-987e5ab07d73",
      Beverages: "e5c6f708-f820-4c13-8691-e989ca8720e4",
      "African Cuisine": "3cfb1f8e-d781-4b48-9dad-ced44a9cf715",
      "Asian Cuisine": "e6744b42-1d39-4586-b33b-29cbab22f71b",
      "Street Food": "5cc41d8c-2973-42fe-976b-c614824e395b",
      "Breakfast & Brunch": "6d61f4bc-c450-40fb-a997-6b083c5ad8c2",
      Desserts: "0b2032db-d2e7-4b2e-a3b7-9f82510cbd3e",
      "Bakery & Pastries": "98d6a3f0-78d0-4056-909d-f5724636b845",
      "Frozen Meals": "df3ce64f-dfc5-4da6-8a21-3d5abfafe270",
      "Ice Cream & Sweets": "b68c897a-2496-4adf-ae59-a6155a17f0af",
      "Sauces & Dips": "09c06404-a02c-4350-8d9b-2c7b7c984f0d",
    },
  },
} as const;

// Map curated browse rails to the exact subcategories they should surface
const SECTION_SUBCATEGORY_IDS: Record<string, string[]> = {
  fresh: [
    CATEGORIES.GROCERIES.subCategories["Fresh Produce"],
    CATEGORIES.GROCERIES.subCategories["Meat & Poultry"],
    CATEGORIES.GROCERIES.subCategories["Fish & Seafood"],
    CATEGORIES.GROCERIES.subCategories.Bakery,
    CATEGORIES.GROCERIES.subCategories["Frozen Foods"],
  ],
  essentials: [
    CATEGORIES.GROCERIES.subCategories["Rice & Grains"],
    CATEGORIES.GROCERIES.subCategories["Canned & Packaged"],
    CATEGORIES.GROCERIES.subCategories["Oils & Spices"],
    CATEGORIES.HOME_ESSENTIALS.subCategories["Cleaning Supplies"],
    CATEGORIES.HOME_ESSENTIALS.subCategories.Toiletries,
    CATEGORIES.PHARMACY.subCategories.Medicines,
    CATEGORIES.PHARMACY.subCategories["Personal Care"],
  ],
  beauty: [
    CATEGORIES.PHARMACY.subCategories["Skin & Body Care"],
    CATEGORIES.PHARMACY.subCategories["Hair Care"],
    CATEGORIES.PHARMACY.subCategories["Feminine Care"],
    CATEGORIES.PHARMACY.subCategories["Dental Care"],
  ],
};

interface MealSectionConfig {
  key: string;
  title: string;
  subtitle?: string;
  subCategoryId: string;
}

// Define meal rails tied to menu subcategories for horizontal sliders
const MEAL_SECTION_CONFIG: MealSectionConfig[] = [
  {
    key: "fast-food",
    title: "Best Fast Food",
    subtitle: "Burgers, grills, and quick bites",
    subCategoryId: CATEGORIES.FOOD.subCategories["Fast Food"],
  },
  {
    key: "local-dishes",
    title: "Local Comforts",
    subtitle: "Authentic staples and classics",
    subCategoryId: CATEGORIES.FOOD.subCategories["Local Dishes"],
  },
  // {
  //   key: "breakfast",
  //   title: "Breakfast & Brunch",
  //   subtitle: "Start the day right",
  //   subCategoryId: CATEGORIES.FOOD.subCategories["Breakfast & Brunch"],
  // },
  // {
  //   key: "desserts",
  //   title: "Sweet Treats",
  //   subtitle: "Desserts & ice cream",
  //   subCategoryId: CATEGORIES.FOOD.subCategories.Desserts,
  // },
  {
    key: "frozen-meals",
    title: "Heat & Eat",
    subtitle: "Frozen meals ready fast",
    subCategoryId: CATEGORIES.FOOD.subCategories["Frozen Meals"],
  },
];

const CATEGORY_ICON_POOL: (keyof typeof Ionicons.glyphMap)[] = [
  "fast-food",
  "bag-handle",
  "ice-cream",
  "leaf",
  "sparkles",
  "medkit",
  "beer",
  "storefront",
];

const CATEGORY_GRADIENTS: [string, string][] = [
  ["#FF9A9E", "#FAD0C4"],
  ["#A18CD1", "#FBC2EB"],
  ["#FBC2EB", "#A6C1EE"],
  ["#FEC163", "#DE4313"],
  ["#4ECDC4", "#556270"],
  ["#6EE7B7", "#3B82F6"],
  ["#F472B6", "#F59E0B"],
  ["#60A5FA", "#4338CA"],
];

const SECTION_TAG_COLORS: Record<string, [string, string]> = {
  picks: ["#FF7E5F", "#FD3A84"],
  trending: ["#F97316", "#FB923C"],
  fresh: ["#10B981", "#34D399"],
  essentials: ["#6366F1", "#8B5CF6"],
  beauty: ["#EC4899", "#F472B6"],
  nearby: ["#0EA5E9", "#38BDF8"],
};

const SECTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  picks: "star-outline",
  trending: "flame",
  fresh: "leaf-outline",
  essentials: "medkit-outline",
  beauty: "color-palette",
  nearby: "locate-outline",
};

const EMPTY_STATE_COPY: Record<
  string,
  { title: string; message: string; action: string }
> = {
  picks: {
    title: "We're refreshing this carousel",
    message:
      "Our team is curating a new round of TeranGO Picks. Pop back in a bit or jump into the full catalog.",
    action: "Explore everything",
  },
  trending: {
    title: "No trending surge right now",
    message:
      "It's a calm moment - perfect time to create your own trend. Try a quick search or filter.",
    action: "Open search",
  },
  fresh: {
    title: "Fresh arrivals are loading",
    message:
      "Merchants are updating their shelves. We'll surface the newest drops shortly.",
    action: "See all products",
  },
  essentials: {
    title: "Essentials aisle restocking",
    message:
      "We're syncing pharmacy and grocery partners. Check back soon or browse all categories.",
    action: "View categories",
  },
  beauty: {
    title: "Beauty editors are curating",
    message:
      "Glow kits and haircare bundles are on the way. Peek at trending finds while we prep.",
    action: "Browse trending",
  },
  nearby: {
    title: "No nearby surprises yet",
    message:
      "Delivery partners are recalibrating routes. Tap search to find something specific.",
    action: "Search nearby",
  },
};

const { width } = Dimensions.get("window");
const HERO_CARD_GAP = 4;
const HERO_CARD_WIDTH = Math.max(96, (width - 32 - HERO_CARD_GAP * 2) / 3);
const HERO_CARD_HEIGHT = HERO_CARD_WIDTH + 28;

const cacheGet = async <T,>(key: string): Promise<T | null> => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as { data: T };
    return parsed.data;
  } catch (error) {
    console.error(`Error reading cache for ${key}:`, error);
    return null;
  }
};

const cacheSave = async <T,>(
  key: string,
  data: T,
  duration: number = CACHE_DURATION_6H
): Promise<void> => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now() + duration,
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error saving cache for ${key}:`, error);
  }
};

const isCacheValid = async (key: string): Promise<boolean> => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return false;
    const parsed = JSON.parse(cached) as { timestamp: number };
    return Date.now() < parsed.timestamp;
  } catch {
    return false;
  }
};

const formatCategoryCount = (count?: number) => {
  if (!count || count <= 0) return "See what's inside";
  if (count === 1) return "1 item";
  return `${count} items`;
};

const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace("#", "");
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getCategoryIcon = (index: number): keyof typeof Ionicons.glyphMap =>
  CATEGORY_ICON_POOL[index % CATEGORY_ICON_POOL.length];

const getCategoryGradient = (index: number): [string, string] =>
  CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length];

const BrowseScreen: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [comingSoonConfig, setComingSoonConfig] =
    useState<ComingSoonContent | null>(null);

  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [arrivalsLoading, setArrivalsLoading] = useState(true);

  const [flashDeals, setFlashDeals] = useState<Product[]>([]);
  const [flashDealsLoading, setFlashDealsLoading] = useState(true);

  const [topRated, setTopRated] = useState<Product[]>([]);
  const [topRatedLoading, setTopRatedLoading] = useState(true);

  const [nearbyProducts, setNearbyProducts] = useState<Product[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(true);

  const [freshProducts, setFreshProducts] = useState<Product[]>([]);
  const [freshLoading, setFreshLoading] = useState(true);
  const [freshError, setFreshError] = useState<string | null>(null);

  const [essentialsProducts, setEssentialsProducts] = useState<Product[]>([]);
  const [essentialsLoading, setEssentialsLoading] = useState(true);
  const [essentialsError, setEssentialsError] = useState<string | null>(null);

  const [beautyProducts, setBeautyProducts] = useState<Product[]>([]);
  const [beautyLoading, setBeautyLoading] = useState(true);
  const [beautyError, setBeautyError] = useState<string | null>(null);

  const [collections, setCollections] = useState<FeaturedCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  const [mealSections, setMealSections] = useState<MealSection[]>([]);
  const [mealSectionsLoading, setMealSectionsLoading] = useState(true);
  const [mealSectionsError, setMealSectionsError] = useState<string | null>(
    null
  );

  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const showStickySearchBar = scrollY.interpolate({
    inputRange: [100, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const cacheValid = await isCacheValid("@categories_all");
      if (cacheValid) {
        const cached = await cacheGet<Category[]>("@categories_all");
        if (cached) {
          setCategories(cached);
          setCategoriesLoading(false);
          return;
        }
      }

      const response = await fetch(
        `${API_URL}/api/public/categories?skip=0&take=24`
      );

      if (response.ok) {
        const data = await response.json();
        const mapped: Category[] =
          data.data?.map((c: any) => ({
            id: c.id,
            name: c.name,
            imageUrl:
              c.imageUrl ||
              `https://via.placeholder.com/150?text=${encodeURIComponent(
                c.name
              )}`,
            slug: c.slug,
            _count: c._count,
          })) || [];
        setCategories(mapped);
        await cacheSave("@categories_all", mapped, CACHE_DURATION_24H);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const fetchTrendingProducts = useCallback(async () => {
    try {
      setTrendingLoading(true);
      const cacheValid = await isCacheValid("@trending_products");
      if (cacheValid) {
        const cached = await cacheGet<Product[]>("@trending_products");
        if (cached) {
          setTrendingProducts(cached);
          setTrendingLoading(false);
          return;
        }
      }

      const response = await fetch(
        `${API_URL}/api/public/products/trending?page=1&limit=12`
      );

      if (response.ok) {
        const json = await response.json();
        const normalized: Product[] = (json.data || []).map(mapProductResponse);
        setTrendingProducts(normalized);
        await cacheSave("@trending_products", normalized, CACHE_DURATION_6H);
      }
    } catch (error) {
      console.error("Error fetching trending products:", error);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  const fetchNewArrivals = useCallback(async () => {
    try {
      setArrivalsLoading(true);
      const response = await fetch(
        `${API_URL}/api/public/products/new-arrivals?page=1&limit=12`
      );

      if (response.ok) {
        const json = await response.json();
        const normalized: Product[] = (json.data || []).map(mapProductResponse);
        setNewArrivals(normalized);
      }
    } catch (error) {
      console.error("Error fetching new arrivals:", error);
    } finally {
      setArrivalsLoading(false);
    }
  }, []);

  const fetchFlashDeals = useCallback(async () => {
    try {
      setFlashDealsLoading(true);
      const response = await fetch(
        `${API_URL}/api/public/products?limit=40&sortBy=orders&sortOrder=desc`
      );

      if (response.ok) {
        const json = await response.json();
        const products: Product[] = (json.data || []).map(mapProductResponse);

        const withDiscount = products
          .filter(
            (item) =>
              item.discountedPrice !== undefined &&
              item.discountedPrice < item.price
          )
          .sort((a, b) => {
            const discountA =
              ((a.price - (a.discountedPrice || a.price)) / a.price) * 100;
            const discountB =
              ((b.price - (b.discountedPrice || b.price)) / b.price) * 100;
            return discountB - discountA;
          });

        const curated = withDiscount.length
          ? withDiscount.slice(0, 12)
          : products.slice(0, 12);

        setFlashDeals(curated);
      }
    } catch (error) {
      console.error("Error fetching flash deals:", error);
    } finally {
      setFlashDealsLoading(false);
    }
  }, []);

  const fetchTopRated = useCallback(async () => {
    try {
      setTopRatedLoading(true);
      const response = await fetch(
        `${API_URL}/api/public/products?limit=20&sortBy=orders&sortOrder=desc`
      );
      if (response.ok) {
        const json = await response.json();
        const normalized: Product[] = (json.data || []).map(mapProductResponse);
        setTopRated(normalized.slice(0, 12));
      }
    } catch (error) {
      console.error("Error fetching top rated:", error);
    } finally {
      setTopRatedLoading(false);
    }
  }, []);

  const fetchNearby = useCallback(async () => {
    try {
      setNearbyLoading(true);
      const response = await fetch(
        `${API_URL}/api/public/products?limit=20&sortBy=price&sortOrder=asc`
      );
      if (response.ok) {
        const json = await response.json();
        const normalized: Product[] = (json.data || []).map(mapProductResponse);
        setNearbyProducts(normalized.slice(0, 12));
      }
    } catch (error) {
      console.error("Error fetching nearby products:", error);
    } finally {
      setNearbyLoading(false);
    }
  }, []);

  const fetchCollections = useCallback(async () => {
    try {
      setCollectionsLoading(true);
      const response = await fetch(
        `${API_URL}/api/public/collections/featured`
      );

      if (response.ok) {
        const json = await response.json();
        const curated: FeaturedCollection[] = (json.data || []).map(
          (collection: any) => {
            const mappedProducts = (collection.products || []).map(
              mapProductResponse
            );
            const primaryImage =
              collection.imageUrl || mappedProducts[0]?.imageUrl;

            return {
              id: collection.id,
              name: collection.name,
              imageUrl: primaryImage,
              productCount: collection.productCount,
              products: mappedProducts,
            };
          }
        );
        setCollections(curated);
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setCollectionsLoading(false);
    }
  }, []);

  const fetchProductsBySubCategory = useCallback(
    async (subCategoryId: string, limit: number = 12) => {
      const response = await fetch(
        `${API_URL}/api/public/products-by-subcategory/${subCategoryId}?page=1&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch products for subcategory ${subCategoryId}`
        );
      }

      const json = await response.json();
      const products: Product[] = (json?.products || []).map(
        mapProductResponse
      );
      return products;
    },
    []
  );

  const fetchSectionProducts = useCallback(
    async (subCategoryIds: string[], limitPerSubCategory: number = 6) => {
      const batches = await Promise.all(
        subCategoryIds.map((id) =>
          fetchProductsBySubCategory(id, limitPerSubCategory)
        )
      );
      const combined = batches.flat();
      return uniqueProducts(combined).slice(0, 12);
    },
    [fetchProductsBySubCategory]
  );

  const fetchFreshProducts = useCallback(async () => {
    try {
      setFreshLoading(true);
      setFreshError(null);
      const products = await fetchSectionProducts(
        SECTION_SUBCATEGORY_IDS.fresh,
        8
      );
      setFreshProducts(products);
    } catch (error) {
      console.error("Error fetching fresh products:", error);
      setFreshError("We couldn't load fresh picks right now.");
      setFreshProducts([]);
    } finally {
      setFreshLoading(false);
    }
  }, [fetchSectionProducts]);

  const fetchEssentialsProducts = useCallback(async () => {
    try {
      setEssentialsLoading(true);
      setEssentialsError(null);
      const products = await fetchSectionProducts(
        SECTION_SUBCATEGORY_IDS.essentials,
        6
      );
      setEssentialsProducts(products);
    } catch (error) {
      console.error("Error fetching essentials products:", error);
      setEssentialsError("We couldn't load essentials right now.");
      setEssentialsProducts([]);
    } finally {
      setEssentialsLoading(false);
    }
  }, [fetchSectionProducts]);

  const fetchBeautyProducts = useCallback(async () => {
    try {
      setBeautyLoading(true);
      setBeautyError(null);
      const products = await fetchSectionProducts(
        SECTION_SUBCATEGORY_IDS.beauty,
        6
      );
      setBeautyProducts(products);
    } catch (error) {
      console.error("Error fetching beauty products:", error);
      setBeautyError("We couldn't load beauty picks right now.");
      setBeautyProducts([]);
    } finally {
      setBeautyLoading(false);
    }
  }, [fetchSectionProducts]);

  const fetchMealSections = useCallback(async () => {
    try {
      setMealSectionsLoading(true);
      setMealSectionsError(null);

      const cacheValid = await isCacheValid(MEAL_SECTIONS_CACHE_KEY);
      if (cacheValid) {
        const cached = await cacheGet<MealSection[]>(MEAL_SECTIONS_CACHE_KEY);
        if (cached && cached.length) {
          setMealSections(cached);
          setMealSectionsLoading(false);
          return;
        }
      }

      const results = await Promise.all(
        MEAL_SECTION_CONFIG.map(async (config) => {
          const response = await fetch(
            `${API_URL}/api/public/menu-items-by-subcategory/${config.subCategoryId}?page=1&limit=12`
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch meals for ${config.key}`);
          }

          const json = await response.json();
          const meals: Meal[] = (json?.menuItems || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            discountedPrice: item.discountedPrice,
            description: item.description,
            imageUrl: item.imageUrl,
            mealTime: item.mealTime,
            restaurant: item.menu?.restaurant || null,
          }));

          return {
            ...config,
            items: meals.slice(0, 12),
          } as MealSection;
        })
      );

      setMealSections(results);
      await cacheSave(MEAL_SECTIONS_CACHE_KEY, results, CACHE_DURATION_6H);
    } catch (error) {
      console.error("Error fetching meal sections:", error);
      setMealSectionsError(
        "We couldn't load meals right now. Pull to refresh to try again."
      );
      setMealSections([]);
    } finally {
      setMealSectionsLoading(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    await Promise.all([
      fetchCategories(),
      fetchTrendingProducts(),
      fetchNewArrivals(),
      fetchFlashDeals(),
      fetchTopRated(),
      fetchNearby(),
      fetchCollections(),
      fetchFreshProducts(),
      fetchEssentialsProducts(),
      fetchBeautyProducts(),
      fetchMealSections(),
    ]);
  }, [
    fetchCategories,
    fetchTrendingProducts,
    fetchNewArrivals,
    fetchFlashDeals,
    fetchTopRated,
    fetchNearby,
    fetchCollections,
    fetchFreshProducts,
    fetchEssentialsProducts,
    fetchBeautyProducts,
    fetchMealSections,
  ]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, [loadInitialData]);

  const terangoPicks = useMemo(() => {
    const combined = uniqueProducts([
      ...flashDeals.slice(0, 6),
      ...topRated.slice(0, 6),
      ...trendingProducts.slice(0, 6),
      ...newArrivals.slice(0, 6),
    ]);

    if (combined.length > 0) {
      return combined.slice(0, 12);
    }
    return trendingProducts.slice(0, 12);
  }, [flashDeals, topRated, trendingProducts, newArrivals]);

  const sections = useMemo(
    () => [
      {
        key: "picks",
        title: "TeranGO Picks",
        subtitle: "Curated highlights from our experience team",
        products: terangoPicks,
        isLoading:
          flashDealsLoading ||
          topRatedLoading ||
          trendingLoading ||
          arrivalsLoading,
        // tagLabel: "TeranGO pick",
        error: null,
      },
      {
        key: "trending",
        title: "Trending Now",
        subtitle: "What the city is loving this minute",
        products: trendingProducts,
        isLoading: trendingLoading,
        tagLabel: "Trending",
        error: null,
      },
      {
        key: "fresh",
        title: "Fresh Finds",
        subtitle: "New arrivals landing all day",
        products: freshProducts,
        isLoading: freshLoading,
        tagLabel: "New",
        error: freshError,
      },
      {
        key: "essentials",
        title: "Essentials",
        subtitle: "Daily grocery & pharmacy favorites",
        products: essentialsProducts,
        isLoading: essentialsLoading,
        tagLabel: "Essentials",
        error: essentialsError,
      },
      {
        key: "beauty",
        title: "Beauty & Hair Corner",
        subtitle: "Glow-up kits, textures, and styling go-tos",
        products: beautyProducts,
        isLoading: beautyLoading,
        tagLabel: "Glow",
        error: beautyError,
      },
      {
        key: "nearby",
        title: "Nearby Highlights",
        subtitle: "Close-by picks with quick delivery",
        products: nearbyProducts,
        isLoading: nearbyLoading,
        tagLabel: "Local",
        error: null,
      },
    ],
    [
      terangoPicks,
      flashDealsLoading,
      topRatedLoading,
      trendingLoading,
      arrivalsLoading,
      trendingProducts,
      freshProducts,
      freshLoading,
      freshError,
      essentialsProducts,
      essentialsLoading,
      essentialsError,
      beautyProducts,
      beautyLoading,
      beautyError,
      nearbyProducts,
      nearbyLoading,
    ]
  );

  const handleHeroTabPress = (tab: HeroTab) => {
    setComingSoonConfig({
      title: tab.headline,
      message: tab.message,
      badge: "Coming soon",
      helper: "We'll notify you as soon as this vertical opens up.",
    });
    setComingSoonVisible(true);
  };

  const handleNavigateCustomDelivery = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      const isLoggedIn = await SecureStore.getItemAsync("isLoggedIn");

      if (!token || !isLoggedIn) {
        Alert.alert(
          "Login Required",
          "Please log in to request a custom delivery.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Log In",
              onPress: () => router.push("/auth"),
            },
          ]
        );
        return;
      }
    } catch (error) {
      console.error("Failed to verify login before custom delivery:", error);
      Alert.alert(
        "Login Required",
        "Please log in to request a custom delivery.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Log In",
            onPress: () => router.push("/auth"),
          },
        ]
      );
      return;
    }

    router.push("/custom-delivery");
  }, []);

  const handleQuickFilterPress = (filter: QuickFilter) => {
    router.push({
      pathname: "/browse/[section]",
      params: {
        section: filter.key,
        title: filter.label,
        query: filter.query,
        mode: "filter",
      },
    });
  };

  const handleOpenSearch = () => {
    setSearchModalVisible(true);
  };

  const handleSeeAll = (sectionKey: string, title: string) => {
    router.push({
      pathname: "/browse/[section]",
      params: {
        section: sectionKey,
        title,
      },
    });
  };

  const handleCategoryPress = (category: Category) => {
    router.push({
      pathname: "/CategoryDetailsPage",
      params: {
        categoryId: category.id,
        categoryName: category.name,
      },
    });
  };

  const handleCollectionPress = (collection: FeaturedCollection) => {
    router.push({
      pathname: "/SubCategoryView",
      params: {
        subCategoryId: collection.id,
        subCategoryName: collection.name,
      },
    });
  };

  const getMealQuantity = (mealId: string) => {
    const cartItem = cartItems.find((item) => item.id === mealId);
    return cartItem ? cartItem.quantity : 0;
  };

  const handleMealAdd = (meal: Meal) => {
    const cartItem = {
      id: meal.id,
      name: meal.name,
      price: meal.price,
      discountedPrice: meal.discountedPrice ?? undefined,
      imageUrl: meal.imageUrl || "",
      description: meal.description || meal.restaurant?.name || "",
      vendorId: meal.restaurant?.id || "",
      vendorName: meal.restaurant?.name || "Restaurant",
      entityType: "restaurant",
    } as any;

    addToCart(cartItem);
  };

  const handleMealRemove = (mealId: string) => {
    const existing = cartItems.find((cartItem) => cartItem.id === mealId);
    if (existing && existing.quantity > 1) {
      updateQuantity(mealId, existing.quantity - 1);
    } else {
      removeFromCart(mealId);
    }
  };

  const handleSeeAllMeals = () => {
    router.push({
      pathname: "/browse/[section]",
      params: {
        section: "meals",
        title: "Meals",
        mode: "meal",
      },
    });
  };

  const renderCategoryCard = ({
    item,
    index,
  }: {
    item: Category;
    index: number;
  }) => {
    const gradient = getCategoryGradient(index);
    const iconName = getCategoryIcon(index);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.categoryCard}
        onPress={() => handleCategoryPress(item)}
      >
        <LinearGradient colors={gradient} style={styles.categoryCardBackground}>
          <View style={styles.categoryCardHeader}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.categoryImage}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.categoryImagePlaceholder}>
                <Ionicons
                  name={iconName}
                  size={22}
                  color="rgba(255,255,255,0.92)"
                />
              </View>
            )}
            <Ionicons
              name="chevron-forward"
              size={16}
              color="rgba(255,255,255,0.65)"
            />
          </View>
          <View style={styles.categoryCardBody}>
            <Text style={styles.categoryTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.categoryCountText} numberOfLines={1}>
              {formatCategoryCount(item._count?.products)}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderCollectionCard = ({ item }: { item: FeaturedCollection }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.collectionCard}
      onPress={() => handleCollectionPress(item)}
    >
      <Image
        source={{ uri: item.imageUrl || "https://via.placeholder.com/320x180" }}
        style={styles.collectionImage}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.05)"]}
        style={styles.collectionOverlay}
      />
      <View style={styles.collectionMeta}>
        <View style={styles.collectionLabelRow}>
          <Ionicons name="albums" size={16} color="#fff" />
          <Text style={styles.collectionLabel}>{item.productCount} items</Text>
        </View>
        <Text style={styles.collectionTitle}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSection = (section: (typeof sections)[number]) => {
    const tagColors = SECTION_TAG_COLORS[section.key] || [
      PrimaryColor,
      PrimaryColor,
    ];
    const iconName = SECTION_ICONS[section.key] || "star";
    const iconBackground = tagColors.length
      ? hexToRgba(tagColors[0], 0.18)
      : "rgba(17,24,39,0.08)";

    const canRetry = ["fresh", "essentials", "beauty"].includes(section.key);

    const handleRetry = () => {
      switch (section.key) {
        case "fresh":
          fetchFreshProducts();
          break;
        case "essentials":
          fetchEssentialsProducts();
          break;
        case "beauty":
          fetchBeautyProducts();
          break;
        default:
          break;
      }
    };

    if (section.error && !section.isLoading) {
      return (
        <View key={section.key} style={styles.sectionErrorCard}>
          <Ionicons name="alert-circle-outline" size={20} color="#B91C1C" />
          <Text style={styles.sectionErrorText}>{section.error}</Text>
          {canRetry ? (
            <TouchableOpacity
              style={styles.sectionErrorRetry}
              onPress={handleRetry}
            >
              <Ionicons name="refresh" size={14} color="#fff" />
              <Text style={styles.sectionErrorRetryText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }

    if (!section.isLoading && section.products.length === 0) {
      const copy = EMPTY_STATE_COPY[section.key] || {
        title: "Nothing to show yet",
        message: "We're refreshing this lane - check back soon.",
        action: "Open search",
      };
      return (
        <View key={section.key} style={styles.emptyStateContainer}>
          <View style={styles.emptyStateContent}>
            <Text style={styles.emptyStateTitle}>{copy.title}</Text>
            <Text style={styles.emptyStateSubtitle}>{copy.message}</Text>
            <TouchableOpacity
              style={styles.emptyStateChip}
              onPress={() =>
                copy.action.includes("category")
                  ? router.push("/AllCategoriesPage")
                  : handleOpenSearch()
              }
            >
              <Text style={styles.emptyStateChipText}>{copy.action}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <ProductSliderSection
        key={section.key}
        title={section.title}
        subtitle={section.subtitle}
        icon={iconName}
        iconBgColor={iconBackground}
        iconColor="#1F2937"
        products={section.products}
        isLoading={section.isLoading}
        onSeeAll={() => handleSeeAll(section.key, section.title)}
        onProductPress={(product) =>
          router.push({
            pathname: "/product/[productId]",
            params: { productId: product.id },
          })
        }
        tagLabel={section.tagLabel}
        tagColors={tagColors}
        ctaLabel="View all"
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />

      <Animated.View
        style={[styles.stickySearchBar, { opacity: showStickySearchBar }]}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <SearchBar
            onChangeText={(text) => setSearchText(text)}
            value={searchText}
            onPress={handleOpenSearch}
            editable={false}
            fullWidth
          />
        </View>
        <Cart />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PrimaryColor]}
            tintColor={PrimaryColor}
          />
        }
      >
        <View style={styles.heroContainer}>
          <Text style={styles.heroHeading}>
            Explore Tera
            <Text style={styles.heroAccent}>GO</Text>
          </Text>
          <Text style={styles.heroDescription}>
            Discover fresh products, meals, and upcoming services tailored for
            your day.
          </Text>
          <View style={{ flex: 1, marginTop: 8 }}>
            <SearchBar
              onChangeText={(text) => setSearchText(text)}
              value={searchText}
              onPress={() => setSearchModalVisible(true)}
              editable={false} // Make it non-editable to force modal usage
              fullWidth={true} // Remove horizontal margins for full width
            />
          </View>
          <TouchableOpacity
            style={styles.customDeliveryCard}
            activeOpacity={0.92}
            onPress={handleNavigateCustomDelivery}
          >
            <LinearGradient
              colors={["#1F1F23", "#0B0D0F"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.customDeliveryGradient}
            >
              <View style={styles.customDeliveryBadge}>
                <Ionicons name="flash-outline" size={14} color="#0B0D0F" />
                <Text style={styles.customDeliveryBadgeText}>New</Text>
              </View>
              <Text style={styles.customDeliveryTitle}>
                Custom parcel delivery, built your way
              </Text>
              <Text style={styles.customDeliveryCopy}>
                Select weight classes, match the right vehicle, and track every
                checkpoint in real time.
              </Text>
              <View style={styles.customDeliveryHighlights}>
                <View style={styles.highlightPill}>
                  <Ionicons
                    name="navigate-outline"
                    size={14}
                    color={PrimaryColor}
                  />
                  <Text style={styles.highlightPillText}>Live tracking</Text>
                </View>
                <View style={styles.highlightPill}>
                  <Ionicons name="car-outline" size={14} color={PrimaryColor} />
                  <Text style={styles.highlightPillText}>Vehicle matching</Text>
                </View>
              </View>
              <View style={styles.customDeliveryCTA}>
                <Text style={styles.customDeliveryCTAText}>
                  Start a delivery
                </Text>
                <View style={styles.customDeliveryCTAIconWrap}>
                  <Ionicons name="arrow-forward" size={16} color="#0B0D0F" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.heroCardRow}>
            {HERO_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={styles.heroCard}
                activeOpacity={0.92}
                onPress={() => handleHeroTabPress(tab)}
              >
                <LinearGradient
                  colors={tab.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroCardGradient}
                >
                  <View style={styles.heroCardIconWrap}>
                    <Ionicons name={tab.icon} size={18} color="#FFB472" />
                  </View>
                  <Text style={styles.heroCardLabel}>{tab.label}</Text>
                  <Text style={styles.heroCardCaption} numberOfLines={2}>
                    {tab.headline}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.quickFilterSection}>
          <View style={styles.quickFilterHeader}>
            <Text style={styles.sectionEyebrow}>Quick filters</Text>
            <TouchableOpacity
              onPress={handleOpenSearch}
              style={styles.quickFilterLink}
            >
              <Text style={styles.quickFilterLinkText}>Open search</Text>
              <Ionicons name="arrow-forward" size={14} color={PrimaryColor} />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickFilterRow}
          >
            {QUICK_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={styles.quickFilterChip}
                activeOpacity={0.85}
                onPress={() => handleQuickFilterPress(filter)}
              >
                <Ionicons name={filter.icon} size={14} color={PrimaryColor} />
                <Text style={styles.quickFilterText}>{filter.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.mealsSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Meals on TeranGO</Text>
              <Text style={styles.sectionSubtitle}>
                Restaurant picks trending right now
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sectionOutlineChip}
              onPress={handleSeeAllMeals}
            >
              <Text style={styles.sectionOutlineText}>See all meals</Text>
              <Ionicons name="arrow-forward" size={14} color={PrimaryColor} />
            </TouchableOpacity>
          </View>

          {mealSectionsLoading ? (
            <SkeletonLoader type="list" count={4} />
          ) : mealSectionsError ? (
            <View style={styles.mealState}>
              <Ionicons name="restaurant-outline" size={18} color="#9CA3AF" />
              <Text style={styles.mealStateText}>{mealSectionsError}</Text>
              <TouchableOpacity
                style={styles.mealRetryButton}
                onPress={fetchMealSections}
              >
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={styles.mealRetryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : mealSections.length === 0 ? (
            <View style={styles.mealState}>
              <Ionicons name="leaf-outline" size={18} color="#9CA3AF" />
              <Text style={styles.mealStateText}>
                We&apos;re lining up restaurant partners - check again shortly.
              </Text>
            </View>
          ) : (
            <View style={styles.mealCarouselGroup}>
              {mealSections.map((section) => (
                <View key={section.key} style={styles.mealCarousel}>
                  <View style={styles.mealCarouselHeader}>
                    <View>
                      <Text style={styles.mealCarouselTitle}>
                        {section.title}
                      </Text>
                      {section.subtitle ? (
                        <Text style={styles.mealCarouselSubtitle}>
                          {section.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {section.items.length === 0 ? (
                    <View style={styles.mealState}>
                      <Ionicons
                        name="restaurant-outline"
                        size={18}
                        color="#9CA3AF"
                      />
                      <Text style={styles.mealStateText}>
                        We&apos;ll populate this lane soon.
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={section.items}
                      keyExtractor={(item) => item.id}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.mealCarouselList}
                      renderItem={({
                        item,
                        index,
                      }: {
                        item: Meal;
                        index: number;
                      }) => (
                        <View style={styles.mealCardWrapper}>
                          <MealItemCard
                            product={{
                              id: index,
                              name: item.name,
                              price: item.price,
                              discountedPrice:
                                item.discountedPrice ?? undefined,
                              image: item.imageUrl || "",
                              description:
                                item.description || item.restaurant?.name || "",
                              inStock: true,
                            }}
                            cartQuantity={getMealQuantity(item.id)}
                            onAddToCart={() => handleMealAdd(item)}
                            onRemoveFromCart={() => handleMealRemove(item.id)}
                            onPress={() =>
                              router.push({
                                pathname: "/menuitem/[menuitem]",
                                params: { menuitem: item.id },
                              })
                            }
                          />
                        </View>
                      )}
                    />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {sections.map((section) => renderSection(section))}

        <View style={styles.categorySection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Browse by category</Text>
              <Text style={styles.sectionSubtitle}>
                Tap a tile to open a dedicated list
              </Text>
            </View>
            <TouchableOpacity
              style={styles.ctaChipOutline}
              onPress={() => router.push("/AllCategoriesPage")}
            >
              <Text style={styles.ctaChipOutlineText}>See all</Text>
              <Ionicons name="chevron-forward" size={16} color={PrimaryColor} />
            </TouchableOpacity>
          </View>
          {categoriesLoading ? (
            <SkeletonLoader type="category" count={6} />
          ) : categories.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categories}
              renderItem={renderCategoryCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.categoryListContent}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateContent}>
                <Text style={styles.emptyStateTitle}>No categories yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  {
                    "We're syncing categories. Try the quick filters or search in the meantime."
                  }
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateChip}
                  onPress={handleOpenSearch}
                >
                  <Text style={styles.emptyStateChipText}>Search TeranGO</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.collectionSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Lifestyle Collections</Text>
              <Text style={styles.sectionSubtitle}>
                Curated bundles from our featured partners
              </Text>
            </View>
            <TouchableOpacity
              style={styles.ctaChipOutline}
              onPress={() => handleSeeAll("lifestyle", "Lifestyle Collections")}
            >
              <Text style={styles.ctaChipOutlineText}>View more</Text>
              <Ionicons name="chevron-forward" size={16} color={PrimaryColor} />
            </TouchableOpacity>
          </View>

          {collectionsLoading ? (
            <SkeletonLoader type="card" count={2} />
          ) : collections.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={collections}
              renderItem={renderCollectionCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.collectionListContent}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateContent}>
                <Text style={styles.emptyStateTitle}>
                  Collections refreshing
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  {
                    "Merchants are updating their collections. We'll surface them once the new drops land."
                  }
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </Animated.ScrollView>

      <SearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        initialQuery={searchText}
      />

      <ComingSoonModal
        visible={comingSoonVisible}
        onClose={() => setComingSoonVisible(false)}
        title={comingSoonConfig?.title || "Coming soon"}
        message={
          comingSoonConfig?.message || "We're building something special here."
        }
        helper={comingSoonConfig?.helper}
        badge={comingSoonConfig?.badge}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  stickySearchBar: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: "#fff",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroContainer: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 12,
  },
  heroHeading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  heroAccent: {
    color: PrimaryColor,
  },
  heroDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
    maxWidth: 320,
  },
  heroCardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: HERO_CARD_GAP,
    marginTop: 20,
  },
  heroCard: {},
  heroCardGradient: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    justifyContent: "space-between",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  heroCardIconWrap: {
    backgroundColor: "rgba(255,255,255,0.08)",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroCardLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroCardCaption: {
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255,255,255,0.7)",
  },
  customDeliveryCard: {
    marginTop: 20,
    borderRadius: 24,
    overflow: "hidden",
  },
  customDeliveryGradient: {
    padding: 20,
    borderRadius: 24,
    gap: 14,
  },
  customDeliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    alignSelf: "flex-start",
  },
  customDeliveryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0B0D0F",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  customDeliveryTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 28,
  },
  customDeliveryCopy: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 19,
  },
  customDeliveryHighlights: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  highlightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  highlightPillText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
  },
  customDeliveryCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  customDeliveryCTAText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  customDeliveryCTAIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PrimaryColor,
    alignItems: "center",
    justifyContent: "center",
  },
  quickFilterSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  quickFilterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionEyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  quickFilterLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quickFilterLinkText: {
    color: PrimaryColor,
    fontSize: 12,
    fontWeight: "600",
  },
  quickFilterRow: {
    gap: 10,
  },
  quickFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  quickFilterText: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "600",
  },
  categorySection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  collectionSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: "#6B7280",
    marginTop: 4,
  },
  ctaChipOutline: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: PrimaryColor,
    gap: 6,
  },
  sectionOutlineChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
    backgroundColor: "#fff",
  },
  sectionOutlineText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  mealsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  mealCarouselGroup: {
    gap: 18,
  },
  mealCarousel: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  mealCarouselHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mealCarouselTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  mealCarouselSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  mealState: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    gap: 8,
  },
  mealStateText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
    textAlign: "center",
  },
  mealRetryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PrimaryColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  mealRetryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  mealCarouselList: {
    paddingRight: 8,
    gap: 12,
  },
  mealCardWrapper: {
    borderRadius: 16,
    marginRight: 14,
    width: Math.min(width * 0.72, 280),
  },
  ctaChipOutlineText: {
    color: PrimaryColor,
    fontSize: 13,
    fontWeight: "600",
  },
  categoryListContent: {
    paddingRight: 16,
    gap: 12,
  },
  categoryCard: {
    width: width * 0.36,
    maxWidth: 200,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  categoryCardBackground: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  categoryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
  categoryImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryCardBody: {
    marginTop: 18,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  categoryCountText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  collectionListContent: {
    paddingRight: 16,
    gap: 16,
  },
  collectionCard: {
    width: width * 0.65,
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 16,
  },
  collectionImage: {
    width: "100%",
    height: "100%",
  },
  collectionOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  collectionMeta: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
  },
  collectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  collectionLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
  collectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  sectionErrorCard: {
    marginHorizontal: 16,
    marginVertical: 18,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionErrorText: {
    flex: 1,
    fontSize: 13,
    color: "#B91C1C",
    lineHeight: 18,
  },
  sectionErrorRetry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#B91C1C",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  sectionErrorRetryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyStateContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  emptyStateContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyStateChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PrimaryColor,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    alignSelf: "flex-start",
  },
  emptyStateChipText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default BrowseScreen;
