import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_URL } from "@/constants/config";

export interface UserCacheData {
  fullName?: string;
  phone?: string;
  email?: string;
  isVerified?: boolean;
}

export class UserCacheManager {
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  private static readonly CACHE_KEYS = {
    NAME: "cached_user_name",
    PHONE: "cached_user_phone",
    EMAIL: "cached_user_email",
    VERIFIED: "cached_user_verified",
    TIMESTAMP: "cache_timestamp",
  };

  /**
   * Cache user data with timestamp
   */
  static async cacheUserData(userData: any): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [this.CACHE_KEYS.NAME, userData?.fullName || ""],
        [this.CACHE_KEYS.PHONE, userData?.phone || ""],
        [this.CACHE_KEYS.EMAIL, userData?.email || ""],
        [this.CACHE_KEYS.VERIFIED, userData?.isVerified?.toString() || "false"],
        [this.CACHE_KEYS.TIMESTAMP, Date.now().toString()],
      ]);
      console.log("✅ User data cached successfully");
    } catch (error) {
      console.error("❌ Error caching user data:", error);
    }
  }

  /**
   * Load cached user data if not stale
   */
  static async loadCachedUserData(): Promise<UserCacheData | null> {
    try {
      const cacheTimestamp = await AsyncStorage.getItem(
        this.CACHE_KEYS.TIMESTAMP
      );
      const isStale =
        Date.now() - parseInt(cacheTimestamp || "0") > this.CACHE_DURATION;

      if (isStale) {
        console.log("⏰ Cache is stale, will fetch fresh data");
        return null;
      }

      const [name, phone, email, verified] = await AsyncStorage.multiGet([
        this.CACHE_KEYS.NAME,
        this.CACHE_KEYS.PHONE,
        this.CACHE_KEYS.EMAIL,
        this.CACHE_KEYS.VERIFIED,
      ]);

      const cachedData: UserCacheData = {
        fullName: name[1] || "",
        phone: phone[1] || "",
        email: email[1] || "",
        isVerified: verified[1] === "true",
      };

      // Only return if we have actual data
      if (cachedData.fullName || cachedData.phone || cachedData.email) {
        console.log("📱 Loaded cached user data:", {
          ...cachedData,
          email: cachedData.email ? "***@***.***" : "",
        });
        return cachedData;
      }

      return null;
    } catch (error) {
      console.error("❌ Error loading cached data:", error);
      return null;
    }
  }

  /**
   * Fetch fresh user data from API and cache it
   */
  static async fetchAndCacheUserData(): Promise<UserCacheData | null> {
    try {
      const userId = await AsyncStorage.getItem("userId");
      const token = await AsyncStorage.getItem("token");

      if (!userId || !token) {
        console.log("⚠️ No user credentials found");
        return null;
      }

      const response = await axios.get(
        `${API_URL}/api/users/${userId}/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const userData = response.data?.user;
      console.log("🔄 Fresh user profile fetched");

      // Cache the fresh data
      await this.cacheUserData(userData);

      return {
        fullName: userData?.fullName,
        email: userData?.email,
        phone: userData?.phone,
        isVerified: userData?.isVerified,
      };
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
      return null;
    }
  }

  /**
   * Smart load: tries cache first, then API
   */
  static async smartLoadUserData(): Promise<{
    cached: UserCacheData | null;
    fresh: Promise<UserCacheData | null>;
  }> {
    // Load cached data immediately
    const cached = await this.loadCachedUserData();

    // Start fetching fresh data in background
    const fresh = this.fetchAndCacheUserData();

    return { cached, fresh };
  }

  /**
   * Clear user cache
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.CACHE_KEYS.NAME,
        this.CACHE_KEYS.PHONE,
        this.CACHE_KEYS.EMAIL,
        this.CACHE_KEYS.VERIFIED,
        this.CACHE_KEYS.TIMESTAMP,
      ]);
      console.log("🗑️ User cache cleared");
    } catch (error) {
      console.error("❌ Error clearing cache:", error);
    }
  }

  /**
   * Check if cache exists and is valid
   */
  static async isCacheValid(): Promise<boolean> {
    try {
      const cacheTimestamp = await AsyncStorage.getItem(
        this.CACHE_KEYS.TIMESTAMP
      );
      if (!cacheTimestamp) return false;

      const isStale =
        Date.now() - parseInt(cacheTimestamp) > this.CACHE_DURATION;
      return !isStale;
    } catch {
      return false;
    }
  }
}

export default UserCacheManager;
