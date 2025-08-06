// React hook for managing home page data with optimization
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { homeApi } from "@/lib/homeApi";

export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  store?: {
    id: string;
    name: string;
    rating: number;
  };
}

export interface Restaurant {
  id: string;
  name: string;
  image?: string;
  rating: number;
  deliveryTime: string;
  address: string;
  distance?: number;
}

export interface Shop {
  id: string;
  name: string;
  image?: string;
  rating: number;
  deliveryTime: string;
  address: string;
  distance?: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  image?: string;
}

export interface Advertisement {
  id: string;
  title: string;
  image: string;
  description?: string;
  link?: string;
  priority: number;
}

export interface HomePageData {
  categories: Category[];
  nearbyRestaurants: Restaurant[];
  nearbyShops: Shop[];
  sections: {
    localDishes: Product[];
    fastFood: Product[];
    beverages: Product[];
    riceGrains: Product[];
    oilsSpices: Product[];
    medicines: Product[];
    personalCare: Product[];
    cleaningSupplies: Product[];
    homeUtilities: Product[];
    toiletries: Product[];
    cannedPackaged: Product[];
    babyProducts: Product[];
  };
  advertisements: Advertisement[];
}

// Subcategory IDs from your database
export const SUBCATEGORY_IDS = {
  localDishes: "557e0c1d-4e5f-4c3e-8477-987e5ab07d73",
  fastFood: "092780fb-8b37-4675-9e49-f4e7a99376a7",
  beverages: "e5c6f708-f820-4c13-8691-e989ca8720e4",
  riceGrains: "cca76ff8-bc4e-4544-acc1-872c119943a5",
  oilsSpices: "6ac60d93-a199-4cc0-a85d-3636dc0c4508",
  medicines: "f41dd4c6-b7df-4df2-8190-36a02a152006",
  personalCare: "91769bbc-c354-4b97-ae8f-3b8b27727d57",
  cleaningSupplies: "b8f9cf07-7875-492d-8269-8ea393515ebe",
  homeUtilities: "4a72494c-3929-461b-ae0a-1f5f6e4be0fb",
  toiletries: "d2633442-5433-4001-8611-3ec49c881482",
  cannedPackaged: "da6110fb-5229-4448-b835-f298d677b764",
  babyProducts: "f7f6a7aa-d232-4f73-840b-546e2e68db58",
};

const CACHE_KEY = "home_page_data";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface UseHomeDataReturn {
  data: HomePageData | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  loadMoreSection: (sectionName: string, page: number) => Promise<void>;
}

export const useHomeData = (): UseHomeDataReturn => {
  const [data, setData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadHomeData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        homeApi.clearCache();
      } else {
        setLoading(true);
      }

      setError(null);

      const homeData = await homeApi.getHomePageData();
      setData(homeData);
    } catch (err) {
      console.error("Failed to load home data:", err);
      setError("Failed to load content. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadHomeData(true);
  }, [loadHomeData]);

  const loadMoreSection = useCallback(
    async (sectionName: string, page: number) => {
      try {
        const subcategoryId = getSectionSubcategoryId(sectionName);
        if (!subcategoryId) return;

        const result = await homeApi.getMoreSectionItems(subcategoryId, page);

        if (data && result.items.length > 0) {
          setData((prevData) => {
            if (!prevData) return prevData;

            return {
              ...prevData,
              sections: {
                ...prevData.sections,
                [sectionName]: [
                  ...prevData.sections[
                    sectionName as keyof typeof prevData.sections
                  ],
                  ...result.items,
                ],
              },
            };
          });
        }
      } catch (err) {
        console.error(`Failed to load more items for ${sectionName}:`, err);
      }
    },
    [data]
  );

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  // Preload on app start
  useEffect(() => {
    const preloadData = async () => {
      const isFirstLaunch = await AsyncStorage.getItem("hasLaunched");
      if (!isFirstLaunch) {
        await AsyncStorage.setItem("hasLaunched", "true");
        homeApi.preloadCriticalData();
      }
    };

    preloadData();
  }, []);

  return {
    data,
    loading,
    error,
    refreshing,
    refresh,
    loadMoreSection,
  };
};

// Helper function to map section names to subcategory IDs
const getSectionSubcategoryId = (sectionName: string): string | null => {
  const mapping: Record<string, string> = {
    localDishes: SUBCATEGORY_IDS.localDishes,
    fastFood: SUBCATEGORY_IDS.fastFood,
    beverages: SUBCATEGORY_IDS.beverages,
    riceGrains: SUBCATEGORY_IDS.riceGrains,
    oilsSpices: SUBCATEGORY_IDS.oilsSpices,
    medicines: SUBCATEGORY_IDS.medicines,
    personalCare: SUBCATEGORY_IDS.personalCare,
    cleaningSupplies: SUBCATEGORY_IDS.cleaningSupplies,
    homeUtilities: SUBCATEGORY_IDS.homeUtilities,
    toiletries: SUBCATEGORY_IDS.toiletries,
    cannedPackaged: SUBCATEGORY_IDS.cannedPackaged,
    babyProducts: SUBCATEGORY_IDS.babyProducts,
    // Legacy mappings for backward compatibility
    snackingCorner: SUBCATEGORY_IDS.fastFood, // Map to fast food
    greatForBreakfast: SUBCATEGORY_IDS.cannedPackaged, // Map to canned & packaged
    traditionalMeals: SUBCATEGORY_IDS.localDishes, // Map to local dishes
    localBeverages: SUBCATEGORY_IDS.beverages, // Map to beverages
    freshFromFarm: SUBCATEGORY_IDS.riceGrains, // Map to rice & grains
    gadgetTechZone: SUBCATEGORY_IDS.homeUtilities, // Map to home utilities
  };

  return mapping[sectionName] || null;
};
