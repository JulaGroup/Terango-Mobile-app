// API service for fetching delivery towns from backend

import { API_URL } from "@/constants/config";

export interface DeliveryTown {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  deliveryZone: "zone1" | "zone2" | "zone3";
}

export interface DeliveryTownsResponse {
  success: boolean;
  data: DeliveryTown[];
  grouped: Record<string, DeliveryTown[]>;
  total: number;
}

/**
 * Fetch all active delivery towns from the backend
 */
export async function fetchDeliveryTowns(params?: {
  deliveryZone?: string;
  search?: string;
}): Promise<DeliveryTownsResponse> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.deliveryZone) {
      queryParams.append("deliveryZone", params.deliveryZone);
    }
    if (params?.search) {
      queryParams.append("search", params.search);
    }

    const url = `${API_URL}/api/delivery-towns${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch delivery towns");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching delivery towns:", error);
    throw error;
  }
}

/**
 * Fetch a single delivery town by ID
 */
export async function fetchDeliveryTownById(id: string): Promise<DeliveryTown> {
  try {
    const response = await fetch(`${API_URL}/api/delivery-towns/${id}`);

    if (!response.ok) {
      throw new Error("Failed to fetch delivery town");
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error fetching delivery town:", error);
    throw error;
  }
}

/**
 * Search delivery towns by query
 */
export async function searchDeliveryTowns(
  query: string,
): Promise<DeliveryTownsResponse> {
  try {
    const response = await fetch(
      `${API_URL}/api/delivery-towns/search/${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      throw new Error("Failed to search delivery towns");
    }

    const result = await response.json();
    return {
      success: result.success,
      data: result.data,
      grouped: {},
      total: result.total,
    };
  } catch (error) {
    console.error("Error searching delivery towns:", error);
    throw error;
  }
}

/**
 * Get town by ID from a list (helper function)
 */
export function getTownById(
  towns: DeliveryTown[],
  townId: string,
): DeliveryTown | undefined {
  return towns.find((town) => town.id === townId);
}

/**
 * Group towns by delivery zone (helper function)
 */
export function groupTownsByZone(
  towns: DeliveryTown[],
): Record<string, DeliveryTown[]> {
  return towns.reduce(
    (acc, town) => {
      const zone = town.deliveryZone;
      if (!acc[zone]) {
        acc[zone] = [];
      }
      acc[zone].push(town);
      return acc;
    },
    {} as Record<string, DeliveryTown[]>,
  );
}
