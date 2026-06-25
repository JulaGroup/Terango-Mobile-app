import axios from "axios";
import * as Location from "expo-location";
import { API_URL } from "@/constants/config";

export interface Address {
  id: string;
  label: string;
  addressLine: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateAddressData {
  label: string;
  street: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateAddressData extends Partial<CreateAddressData> {}

export class AddressService {
  // Rate limiting for Nominatim API
  private static lastNominatimCall = 0;
  private static readonly NOMINATIM_MIN_INTERVAL = 1000; // 1 second between calls

  // Helper method to wait between Nominatim API calls
  private static async waitForNominatim(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastNominatimCall;

    if (timeSinceLastCall < this.NOMINATIM_MIN_INTERVAL) {
      const waitTime = this.NOMINATIM_MIN_INTERVAL - timeSinceLastCall;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastNominatimCall = Date.now();
  }

  // Helper method to retry API calls with exponential backoff
  private static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    initialDelay = 1000,
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        const isNetworkError =
          error.code === "ERR_NETWORK" ||
          error.code === "ECONNABORTED" ||
          error.message?.includes("Network Error");
        const isRateLimit = error.response?.status === 429;
        const isTimeout = error.code === "ECONNABORTED";

        // Retry on network errors, rate limits, or timeouts
        if (isNetworkError || isRateLimit || isTimeout) {
          // Don't retry on last attempt
          if (i < maxRetries - 1) {
            const delay = initialDelay * Math.pow(2, i); // Exponential backoff
            console.log(
              `${isRateLimit ? "Rate limited" : "Network error"}, waiting ${delay}ms before retry ${i + 1}/${maxRetries}...`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        // For all other errors or last retry, throw immediately
        throw error;
      }
    }

    throw lastError;
  }

  static async getUserAddresses(userId: string): Promise<Address[]> {
    try {
      const response = await axios.get(
        `${API_URL}/api/users/${userId}/addresses`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user addresses:", error);
      throw error;
    }
  }

  static async createAddress(
    userId: string,
    addressData: CreateAddressData,
  ): Promise<Address> {
    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/addresses`,
        addressData,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to create address:", error);
      throw error;
    }
  }

  static async updateAddress(
    addressId: string,
    addressData: UpdateAddressData,
  ): Promise<Address> {
    try {
      const response = await axios.put(
        `${API_URL}/api/users/addresses/${addressId}`,
        addressData,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update address:", error);
      throw error;
    }
  }

  static async deleteAddress(addressId: string): Promise<void> {
    try {
      await axios.delete(`${API_URL}/api/users/addresses/${addressId}`);
    } catch (error) {
      console.error("Failed to delete address:", error);
      throw error;
    }
  }

  static async setDefaultAddress(addressId: string): Promise<Address> {
    try {
      // No dedicated endpoint for setting default on backend; reuse update.
      const response = await axios.put(
        `${API_URL}/api/users/addresses/${addressId}`,
        { isDefault: true },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to set default address:", error);
      throw error;
    }
  }

  // Reverse geocoding - convert coordinates to address
  static async getAddressFromCoordinates(
    latitude: number,
    longitude: number,
  ): Promise<string> {
    try {
      await this.waitForNominatim();

      const response = await this.retryWithBackoff(() =>
        axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
          {
            headers: {
              "User-Agent": "TeranGo-App/1.0 (contact@terango.com)",
              "Accept-Language": "en",
            },
            timeout: 10000,
          },
        ),
      );

      if (response.data?.address) {
        const a = response.data.address;
        const parts: string[] = [];
        const seen = new Set<string>();
        const push = (val: string | undefined) => {
          if (val && !seen.has(val)) {
            seen.add(val);
            parts.push(val);
          }
        };

        if (a.amenity) push(a.amenity);
        if (a.building) push(a.building);
        if (a.house_number && a.road) push(`${a.house_number} ${a.road}`);
        else if (a.road) push(a.road);
        if (a.neighbourhood) push(a.neighbourhood);
        push(a.suburb);
        push(a.county);
        push(a.state);

        const result = parts.filter(Boolean).join(", ");
        return result || response.data.display_name;
      }

      if (response.data?.display_name) return response.data.display_name;
    } catch (error: any) {
      console.error("Failed to get address from coordinates:", error.message);
      if (error.response?.status === 429) {
        console.warn("Rate limited by Nominatim API, returning coordinates");
      }
    }

    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  // Reverse geocoding - convert coordinates to structured address with city
  static async getStructuredAddressFromCoordinates(
    latitude: number,
    longitude: number,
  ): Promise<{ address: string; city: string } | null> {
    try {
      // First try Expo's Location API (works better in React Native)
      try {
        const [result] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (result) {
          const addressParts = [
            result.street,
            result.district,
            result.city,
            result.region,
            result.country,
          ].filter(Boolean);

          const address =
            addressParts.join(", ") ||
            `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          const city = result.city || result.district || result.region || "";

          console.log("✅ Expo Location API succeeded:", { address, city });
          return { address, city };
        }
      } catch (expoError: any) {
        console.log(
          "⚠️ Expo Location API failed, trying Nominatim...",
          expoError.message,
        );
      }

      // Fallback to Nominatim if Expo fails
      await this.waitForNominatim();

      const response = await this.retryWithBackoff(() =>
        axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
          {
            headers: {
              "User-Agent": "TeranGo-App/1.0 (contact@terango.com)",
              "Accept-Language": "en",
            },
            timeout: 10000,
          },
        ),
      );

      if (response.data && response.data.display_name) {
        const addressDetails = response.data.address || {};

        const city =
          addressDetails.city ||
          addressDetails.town ||
          addressDetails.village ||
          addressDetails.suburb ||
          addressDetails.municipality ||
          "";

        const address = response.data.display_name;

        console.log("✅ Nominatim API succeeded:", { address, city });
        return { address, city };
      }

      return null;
    } catch (error: any) {
      console.error(
        "Failed to get structured address from coordinates:",
        error,
      );

      // Log specific error types for debugging
      if (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK") {
        console.warn(
          "Network error while geocoding - check internet connection",
        );
      } else if (error.response?.status === 429) {
        console.warn("Rate limited by Nominatim API");
      }

      // Return null on error (don't return coordinates as fallback)
      return null;
    }
  }

  // Forward geocoding - convert address to coordinates
  static async getCoordinatesFromAddress(
    address: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    try {
      // Wait to respect rate limits
      await this.waitForNominatim();

      // Using Nominatim with proper headers and retry logic
      const response = await this.retryWithBackoff(() =>
        axios.get(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            address,
          )}&limit=1&countrycodes=gm`, // Added country code filter for The Gambia
          {
            headers: {
              "User-Agent": "TeranGo-App/1.0 (contact@terango.com)", // Required by Nominatim
              "Accept-Language": "en",
            },
            timeout: 10000, // 10 second timeout
          },
        ),
      );

      if (response.data && response.data.length > 0) {
        const location = response.data[0];
        return {
          latitude: parseFloat(location.lat),
          longitude: parseFloat(location.lon),
        };
      }

      return null;
    } catch (error: any) {
      console.error("Failed to get coordinates from address:", error);

      // Provide better error messages
      if (error.response?.status === 429) {
        throw new Error(
          "Rate limit exceeded. Please wait a moment and try again.",
        );
      } else if (error.code === "ECONNABORTED") {
        throw new Error(
          "Request timeout. Please check your internet connection.",
        );
      }

      return null;
    }
  }

  static async getUserStatus(userId: string): Promise<{
    hasProfile: boolean;
    hasAddresses: boolean;
    addressCount: number;
  }> {
    try {
      const response = await axios.get(`${API_URL}/api/users/${userId}/status`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user status:", error);
      throw error;
    }
  }

  static async getUserProfile(userId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_URL}/api/users/${userId}/profile`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      throw error;
    }
  }
}
