import axios from "axios";
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
  static async getUserAddresses(userId: string): Promise<Address[]> {
    try {
      const response = await axios.get(
        `${API_URL}/api/users/${userId}/addresses`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user addresses:", error);
      throw error;
    }
  }

  static async createAddress(
    userId: string,
    addressData: CreateAddressData
  ): Promise<Address> {
    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/addresses`,
        addressData
      );
      return response.data;
    } catch (error) {
      console.error("Failed to create address:", error);
      throw error;
    }
  }

  static async updateAddress(
    addressId: string,
    addressData: UpdateAddressData
  ): Promise<Address> {
    try {
      const response = await axios.put(
        `${API_URL}/api/addresses/${addressId}`,
        addressData
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update address:", error);
      throw error;
    }
  }

  static async deleteAddress(addressId: string): Promise<void> {
    try {
      await axios.delete(`${API_URL}/api/addresses/${addressId}`);
    } catch (error) {
      console.error("Failed to delete address:", error);
      throw error;
    }
  }

  static async setDefaultAddress(addressId: string): Promise<Address> {
    try {
      const response = await axios.patch(
        `${API_URL}/api/addresses/${addressId}/default`
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
    longitude: number
  ): Promise<string> {
    try {
      // Using a free geocoding service (you can replace with Google Maps API if needed)
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
      );

      if (response.data && response.data.display_name) {
        return response.data.display_name;
      }

      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error("Failed to get address from coordinates:", error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  // Forward geocoding - convert address to coordinates
  static async getCoordinatesFromAddress(
    address: string
  ): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}&limit=1`
      );

      if (response.data && response.data.length > 0) {
        const location = response.data[0];
        return {
          latitude: parseFloat(location.lat),
          longitude: parseFloat(location.lon),
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to get coordinates from address:", error);
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
        `${API_URL}/api/users/${userId}/profile`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      throw error;
    }
  }
}
