/**
 * Hook to fetch dynamic delivery settings from admin panel
 * This replaces hardcoded zone prices with configurable ones
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../constants/config';

export interface DeliveryZoneFees {
  zone1: number;
  zone2: number;
  zone3: number;
}

export interface DistanceTier {
  range: string;
  fee: number;
}

export interface DeliverySettings {
  zoneFees: DeliveryZoneFees;
  distanceTiers: DistanceTier[];
  freeDeliveryThreshold: number;
  freeDeliveryEnabled: boolean;
}

interface DeliverySettingsState {
  settings: DeliverySettings | null;
  loading: boolean;
  error: string | null;
}

// Default fallback values if API fails (matches current static values)
const DEFAULT_SETTINGS: DeliverySettings = {
  zoneFees: {
    zone1: 35,
    zone2: 50,
    zone3: 75,
  },
  distanceTiers: [
    { range: '0-5km', fee: 100 },
    { range: '5-10km', fee: 150 },
    { range: '10-20km', fee: 200 },
    { range: '20-30km', fee: 300 },
    { range: '30+km', fee: 350 },
  ],
  freeDeliveryThreshold: 500,
  freeDeliveryEnabled: true,
};

// Cache for delivery settings
let cachedSettings: DeliverySettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useDeliverySettings(): DeliverySettingsState & {
  refetch: () => Promise<void>;
  getZoneFee: (zone: 'zone1' | 'zone2' | 'zone3') => number;
  getDistanceFee: (distanceKm: number) => number;
} {
  const [state, setState] = useState<DeliverySettingsState>({
    settings: cachedSettings,
    loading: !cachedSettings,
    error: null,
  });

  const fetchSettings = useCallback(async () => {
    // Check cache
    if (cachedSettings && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setState({ settings: cachedSettings, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-settings`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch delivery settings');
      }

      const json = await response.json();
      
      // Parse API response structure into our expected format
      // API returns: { success: true, data: { zones: {...}, distanceTiers: [...], freeDelivery: {...} } }
      const apiData = json.data || json;
      
      const parsedSettings: DeliverySettings = {
        zoneFees: {
          zone1: apiData.zones?.zone1?.fee ?? DEFAULT_SETTINGS.zoneFees.zone1,
          zone2: apiData.zones?.zone2?.fee ?? DEFAULT_SETTINGS.zoneFees.zone2,
          zone3: apiData.zones?.zone3?.fee ?? DEFAULT_SETTINGS.zoneFees.zone3,
        },
        distanceTiers: apiData.distanceTiers?.map((tier: { minKm?: number; maxKm?: number | null; fee: number }, index: number) => ({
          range: tier.maxKm ? `${tier.minKm}-${tier.maxKm}km` : `${tier.minKm}+km`,
          fee: tier.fee,
        })) ?? DEFAULT_SETTINGS.distanceTiers,
        freeDeliveryThreshold: apiData.freeDelivery?.minAmount ?? DEFAULT_SETTINGS.freeDeliveryThreshold,
        freeDeliveryEnabled: (apiData.freeDelivery?.minAmount ?? 0) > 0,
      };
      
      // Update cache
      cachedSettings = parsedSettings;
      cacheTimestamp = Date.now();
      
      setState({ settings: parsedSettings, loading: false, error: null });
    } catch (err) {
      console.error('Error fetching delivery settings:', err);
      // Use default settings as fallback
      setState({
        settings: DEFAULT_SETTINGS,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const getZoneFee = useCallback((zone: 'zone1' | 'zone2' | 'zone3'): number => {
    const settings = state.settings || DEFAULT_SETTINGS;
    // Defensive check in case zoneFees is undefined
    if (!settings.zoneFees) {
      return DEFAULT_SETTINGS.zoneFees[zone];
    }
    return settings.zoneFees[zone] ?? DEFAULT_SETTINGS.zoneFees[zone];
  }, [state.settings]);

  const getDistanceFee = useCallback((distanceKm: number): number => {
    const settings = state.settings || DEFAULT_SETTINGS;
    // Defensive check in case distanceTiers is undefined
    if (!settings.distanceTiers || settings.distanceTiers.length === 0) {
      if (distanceKm <= 5) return DEFAULT_SETTINGS.distanceTiers[0].fee;
      if (distanceKm <= 10) return DEFAULT_SETTINGS.distanceTiers[1].fee;
      if (distanceKm <= 20) return DEFAULT_SETTINGS.distanceTiers[2].fee;
      if (distanceKm <= 30) return DEFAULT_SETTINGS.distanceTiers[3].fee;
      return DEFAULT_SETTINGS.distanceTiers[4].fee;
    }
    
    if (distanceKm <= 5) return settings.distanceTiers[0]?.fee || 100;
    if (distanceKm <= 10) return settings.distanceTiers[1]?.fee || 150;
    if (distanceKm <= 20) return settings.distanceTiers[2]?.fee || 200;
    if (distanceKm <= 30) return settings.distanceTiers[3]?.fee || 300;
    return settings.distanceTiers[4]?.fee || 350;
  }, [state.settings]);

  return {
    ...state,
    refetch: fetchSettings,
    getZoneFee,
    getDistanceFee,
  };
}

// Standalone function to fetch zone fee (for use outside React components)
export async function fetchZoneFee(zone: 'zone1' | 'zone2' | 'zone3'): Promise<number> {
  // Check cache first
  if (cachedSettings && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedSettings.zoneFees[zone];
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/delivery-settings`);
    
    if (!response.ok) {
      return DEFAULT_SETTINGS.zoneFees[zone];
    }

    const data: DeliverySettings = await response.json();
    
    // Update cache
    cachedSettings = data;
    cacheTimestamp = Date.now();
    
    return data.zoneFees[zone];
  } catch (err) {
    console.error('Error fetching zone fee:', err);
    return DEFAULT_SETTINGS.zoneFees[zone];
  }
}

// Standalone function to calculate delivery fee based on vendor and town
export async function calculateDeliveryFee(params: {
  vendorId?: string;
  vendorType?: 'restaurant' | 'shop' | 'pharmacy';
  townLat?: number;
  townLng?: number;
  zone?: 'zone1' | 'zone2' | 'zone3';
}): Promise<{ deliveryFee: number; distanceKm?: number; method: string }> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.vendorId) queryParams.append('vendorId', params.vendorId);
    if (params.vendorType) queryParams.append('vendorType', params.vendorType);
    if (params.townLat) queryParams.append('townLat', params.townLat.toString());
    if (params.townLng) queryParams.append('townLng', params.townLng.toString());
    if (params.zone) queryParams.append('zone', params.zone);

    const response = await fetch(
      `${API_BASE_URL}/api/delivery-settings/calculate?${queryParams.toString()}`
    );
    
    if (!response.ok) {
      // Fallback to zone-based
      if (params.zone) {
        return {
          deliveryFee: DEFAULT_SETTINGS.zoneFees[params.zone],
          method: 'zone-fallback',
        };
      }
      return { deliveryFee: 50, method: 'default' };
    }

    return await response.json();
  } catch (err) {
    console.error('Error calculating delivery fee:', err);
    // Fallback
    if (params.zone) {
      return {
        deliveryFee: DEFAULT_SETTINGS.zoneFees[params.zone],
        method: 'zone-fallback',
      };
    }
    return { deliveryFee: 50, method: 'error-default' };
  }
}

// Clear cache (useful for testing or when settings are updated)
export function clearDeliverySettingsCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
}
