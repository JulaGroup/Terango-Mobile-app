// Enhanced API service for home page data fetching
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/constants/config";

// Types for home page data
export interface HomePageSection {
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

export interface HomePageData {
  categories: Category[];
  nearbyRestaurants: Restaurant[];
  nearbyShops: Shop[];
  sections: {
    localDishes: HomePageSection[];
    fastFood: HomePageSection[];
    beverages: HomePageSection[];
    riceGrains: HomePageSection[];
    oilsSpices: HomePageSection[];
    medicines: HomePageSection[];
    personalCare: HomePageSection[];
    cleaningSupplies: HomePageSection[];
    homeUtilities: HomePageSection[];
    toiletries: HomePageSection[];
    cannedPackaged: HomePageSection[];
    babyProducts: HomePageSection[];
  };
  advertisements: Advertisement[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  image?: string;
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

export interface Advertisement {
  id: string;
  title: string;
  image: string;
  description?: string;
  link?: string;
  priority: number;
}

class HomeApiService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get user location for nearby results
  private async getUserLocation(): Promise<{
    lat: number;
    lng: number;
  } | null> {
    try {
      const savedLocation = await AsyncStorage.getItem("userLocation");
      if (savedLocation) {
        return JSON.parse(savedLocation);
      }
    } catch (error) {
      console.log("No saved location found");
    }
    return null;
  }

  // Cache management
  private isValidCache(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private getCache(key: string): any {
    return this.cache.get(key)?.data;
  }

  // Main home page data fetch (optimized single request)
  async getHomePageData(): Promise<HomePageData> {
    const cacheKey = "homePageData";

    // Return cached data if available and valid
    if (this.isValidCache(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      const location = await this.getUserLocation();

      const queryParams = new URLSearchParams();
      if (location) {
        queryParams.append("userLat", location.lat.toString());
        queryParams.append("userLng", location.lng.toString());
      }
      queryParams.append("limit", "6"); // Limit items per section for performance

      const response = await fetch(
        `${API_URL}/api/public/home-data?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Cache the successful response
        this.setCache(cacheKey, result.data);
        return result.data;
      } else {
        throw new Error(result.message || "Failed to fetch home page data");
      }
    } catch (error) {
      console.error("Home page data fetch error:", error);

      // Return cached data if available, even if expired
      const cachedData = this.getCache(cacheKey);
      if (cachedData) {
        console.log("Returning cached data due to error");
        return cachedData;
      }

      // Return fallback data structure
      return this.getFallbackData();
    }
  }

  // Fetch more items for a specific section (lazy loading)
  async getMoreSectionItems(
    subcategoryId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ items: HomePageSection[]; hasMore: boolean }> {
    try {
      const response = await fetch(
        `${API_URL}/api/public/products-by-subcategory/${subcategoryId}?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return {
          items: result.data,
          hasMore: result.pagination.page < result.pagination.totalPages,
        };
      } else {
        throw new Error(result.message || "Failed to fetch section items");
      }
    } catch (error) {
      console.error("Section items fetch error:", error);
      return { items: [], hasMore: false };
    }
  }

  // Search products
  async searchProducts(
    query: string,
    filters: {
      categoryId?: string;
      subcategoryId?: string;
      minPrice?: number;
      maxPrice?: number;
    } = {},
    page: number = 1
  ): Promise<{ items: HomePageSection[]; hasMore: boolean }> {
    try {
      const queryParams = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: "20",
      });

      if (filters.categoryId)
        queryParams.append("categoryId", filters.categoryId);
      if (filters.subcategoryId)
        queryParams.append("subcategoryId", filters.subcategoryId);
      if (filters.minPrice)
        queryParams.append("minPrice", filters.minPrice.toString());
      if (filters.maxPrice)
        queryParams.append("maxPrice", filters.maxPrice.toString());

      const response = await fetch(
        `${API_URL}/api/public/search?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return {
          items: result.data,
          hasMore: result.pagination.page < result.pagination.totalPages,
        };
      } else {
        throw new Error(result.message || "Search failed");
      }
    } catch (error) {
      console.error("Search error:", error);
      return { items: [], hasMore: false };
    }
  }

  // Get categories
  async getCategories(): Promise<Category[]> {
    const cacheKey = "categories";

    if (this.isValidCache(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      const response = await fetch(`${API_URL}/api/public/categories`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        this.setCache(cacheKey, result.data);
        return result.data;
      } else {
        throw new Error(result.message || "Failed to fetch categories");
      }
    } catch (error) {
      console.error("Categories fetch error:", error);
      // Return cached data if available, even if expired
      const cachedData = this.getCache(cacheKey);
      if (cachedData) {
        console.log("Returning cached categories due to error");
        return cachedData;
      }
      return [];
    }
  }

  // Fallback data when API is unavailable
  private getFallbackData(): HomePageData {
    return {
      categories: [],
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
        cannedPackaged: [],
        babyProducts: [],
      },
      advertisements: [],
    };
  }

  // Clear cache (useful for refresh)
  clearCache(): void {
    this.cache.clear();
  }

  // Preload critical data
  async preloadCriticalData(): Promise<void> {
    try {
      // Preload in background without waiting
      this.getHomePageData();
      this.getCategories();
    } catch (error) {
      console.log("Preload failed, will load on demand");
    }
  }
}

// Export singleton instance
export const homeApi = new HomeApiService();

// Subcategory IDs for easy reference
export const SUBCATEGORY_IDS = {
  SNACKING_CORNER: "cm5ieyg3q000013i52qlxvbtw",
  GREAT_FOR_BREAKFAST: "cm5iezw5a000113i5w0yxdqwf",
  TRADITIONAL_MEALS: "cm5if1ytr000213i54ky7cgxk",
  LOCAL_BEVERAGES: "cm5if3wvn000313i5s3f8hqxe",
  FRESH_FROM_FARM: "cm5if4o9i000413i5zzl8uorc",
  GADGET_TECH_ZONE: "cm5if5hgn000513i5pzuxh1ts",
};
