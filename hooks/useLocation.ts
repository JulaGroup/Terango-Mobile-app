import { useState, useEffect, useCallback } from "react";
import * as Location from "expo-location";
import { usePermissions } from "@/context/PermissionContext";
import { AddressService } from "@/services/AddressService";

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
    longitude: number,
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

        let location: Location.LocationObject | null = null;

        // Use Highest accuracy for precise GPS fix
        try {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          });
        } catch (highAccuracyError: any) {
          console.warn(
            "[useLocation] Highest accuracy failed, trying recent last known position:",
            highAccuracyError.message,
          );

          // Fallback 1: only accept a very recent, accurate cached position
          try {
            location = await Location.getLastKnownPositionAsync({
              maxAge: 30 * 1000,    // max 30 seconds old
              requiredAccuracy: 50, // within 50 metres only
            });
            if (location) {
              console.log("[useLocation] Using recent cached GPS position");
            }
          } catch (_) {}

          // Fallback 2: High accuracy (still GPS, slightly less strict than Highest)
          if (!location) {
            console.warn(
              "[useLocation] No recent cached position, retrying with High accuracy",
            );
            location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
          }
        }

        const locationData: LocationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        // Get address from coordinates
        try {
          const address = await getAddressFromCoords(
            locationData.latitude,
            locationData.longitude,
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
    longitude: number,
  ): Promise<string> => {
    try {
      // Use AddressService with rate limiting instead of Expo's reverseGeocodeAsync
      const address = await AddressService.getAddressFromCoordinates(
        latitude,
        longitude,
      );
      return address || "Location found";
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
