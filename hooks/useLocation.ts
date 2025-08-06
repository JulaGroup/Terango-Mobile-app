import { useState, useEffect, useCallback } from "react";
import * as Location from "expo-location";
import { usePermissions } from "@/context/PermissionContext";

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

interface UseLocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  getCurrentLocation: () => Promise<LocationData | null>;
  getAddressFromCoords: (
    latitude: number,
    longitude: number
  ) => Promise<string>;
}

export const useLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { permissions, checkLocationAccess } = usePermissions();

  const getCurrentLocation =
    useCallback(async (): Promise<LocationData | null> => {
      try {
        setLoading(true);
        setError(null);

        // Check if location access is available, show modal if needed
        const hasLocationAccess = await checkLocationAccess();

        if (!hasLocationAccess) {
          setError("Location access is required");
          return null;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const locationData: LocationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        // Get address from coordinates
        try {
          const address = await getAddressFromCoords(
            locationData.latitude,
            locationData.longitude
          );
          locationData.address = address;
        } catch (addressError) {
          console.warn("Failed to get address:", addressError);
        }

        setLocation(locationData);
        return locationData;
      } catch (error: any) {
        const errorMessage = error.message || "Failed to get location";
        setError(errorMessage);
        console.error("Location error:", error);
        return null;
      } finally {
        setLoading(false);
      }
    }, [checkLocationAccess]);

  const getAddressFromCoords = async (
    latitude: number,
    longitude: number
  ): Promise<string> => {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        const addressParts = [
          address.streetNumber,
          address.street,
          address.district,
          address.city,
          address.region,
        ].filter(Boolean);

        return addressParts.join(", ") || "Location found";
      }

      return "Location found";
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return "Location found";
    }
  };
  // Auto-fetch location when permission is granted
  useEffect(() => {
    if (permissions.location === "granted" && !location) {
      getCurrentLocation();
    }
  }, [permissions.location, location, getCurrentLocation]);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    getAddressFromCoords,
  };
};
