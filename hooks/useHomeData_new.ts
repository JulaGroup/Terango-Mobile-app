// React hook for managing home page data with optimization
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
}

export const useHomeData = (): UseHomeDataReturn => {
  const [data, setData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get cached data
  const getCachedData = useCallback(async (): Promise<HomePageData | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return cachedData;
        }
      }
      return null;
    } catch (error) {
      console.error("Error reading cache:", error);
      return null;
    }
  }, []);

  // Save to cache
  const saveToCache = useCallback(
    async (homeData: HomePageData): Promise<void> => {
      try {
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: homeData,
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        console.error("Error saving to cache:", error);
      }
    },
    []
  );

  // For now, we'll use mock data until your backend is ready
  const getMockData = useCallback((): HomePageData => {
    return {
      categories: [
        {
          id: "1",
          name: "Food & Beverages",
          icon: "restaurant",
          color: "#F97316",
        },
        { id: "2", name: "Groceries", icon: "basket", color: "#10B981" },
        { id: "3", name: "Pharmacy", icon: "medical", color: "#EF4444" },
        { id: "4", name: "Home Essentials", icon: "home", color: "#3B82F6" },
      ],
      nearbyRestaurants: [],
      nearbyShops: [],
      sections: {
        localDishes: [],
        fastFood: [],
        beverages: [],
        riceGrains: [],
        oilsSpices: [],
        medicines: [],
        personalCare: [],
        cleaningSupplies: [],
        homeUtilities: [],
        toiletries: [],
      },
      advertisements: [],
    };
  }, []);

  const loadHomeData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        // Check cache first (skip on refresh)
        if (!isRefresh) {
          const cachedData = await getCachedData();
          if (cachedData) {
            setData(cachedData);
            setLoading(false);
            return;
          }
        }

        // For now, use mock data
        // TODO: Replace with actual API call when backend is ready
        const homeData = getMockData();

        /* When your backend is ready, replace the above with:
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/public/home-data`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch home data');
      }

      const homeData = result.data;
      */

        setData(homeData);
        await saveToCache(homeData);
      } catch (err) {
        console.error("Failed to load home data:", err);
        setError("Failed to load content. Please try again.");

        // Try to load cached data as fallback
        if (!isRefresh) {
          const cachedData = await getCachedData();
          if (cachedData) {
            setData(cachedData);
          }
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getCachedData, getMockData, saveToCache]
  );

  const refresh = useCallback(async () => {
    await loadHomeData(true);
  }, [loadHomeData]);

  // Initial load
  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  return {
    data,
    loading,
    error,
    refreshing,
    refresh,
  };
};

// Individual section hook for fetching products by subcategory
export const useProductsBySubcategory = (subcategoryId: string, limit = 10) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!subcategoryId) return;

    setLoading(true);
    setError(null);

    try {
      // For now, return empty array until backend is ready
      // TODO: Replace with actual API call
      setProducts([]);

      /* When your backend is ready, replace the above with:
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/public/products-by-subcategory/${subcategoryId}?limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setProducts(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch products');
      }
      */
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [subcategoryId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
};
