import { API_URL } from "../constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface VendorStats {
  totalRevenue: number;
  todayRevenue: number;
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalMenuItems: number;
  activeBusinesses: number;
  totalBusinesses: number;
  averageOrderValue: number;
  topSellingItems: {
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }[];
  recentOrders: {
    id: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    customerName: string;
    itemCount: number;
  }[];
  dailyStats: {
    date: string;
    orders: number;
    revenue: number;
  }[];
}

export const fetchVendorStats = async (): Promise<VendorStats> => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${API_URL}/api/vendor-stats/dashboard`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication failed");
      }
      if (response.status === 404) {
        throw new Error("Vendor profile not found");
      }
      throw new Error(`Failed to fetch vendor stats: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to fetch vendor stats");
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching vendor stats:", error);
    throw error;
  }
};

export const fetchVendorStatsById = async (
  vendorId: string
): Promise<VendorStats> => {
  try {
    const response = await fetch(`${API_URL}/api/vendor-stats/${vendorId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Vendor not found");
      }
      throw new Error(`Failed to fetch vendor stats: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to fetch vendor stats");
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching vendor stats by ID:", error);
    throw error;
  }
};
