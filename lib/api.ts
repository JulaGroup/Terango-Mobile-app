import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/constants/config";

// Types for vendor-related data
export interface VendorStats {
  totalRevenue: number;
  todayOrders: number;
  totalOrders: number;
  activeBusinesses: number;
  pendingOrders: number;
  completedOrders: number;
}

export interface Business {
  id: string;
  name: string;
  type: "RESTAURANT" | "SHOP" | "PHARMACY";
  isActive: boolean;
  todayOrders: number;
  revenue: number;
  address?: string;
  phone?: string;
  description?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorData {
  id: string;
  businessName: string;
  businessType: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  businesses: Business[];
  totalRevenue: number;
  totalOrders: number;
}

// Order-related types
export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  menuItem: {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
  };
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  totalAmount: number;
  status:
    | "PENDING"
    | "ACCEPTED"
    | "PREPARING"
    | "READY"
    | "DISPATCHED"
    | "DELIVERED"
    | "CANCELLED";
  items: OrderItem[];
  restaurantId: string;
  restaurant: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  createdAt: string;
  estimatedDeliveryTime?: string;
  notes?: string;
}

export interface CreateOrderData {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: {
    menuItemId: string;
    quantity: number;
  }[];
  notes?: string;
}

// Helper function to get auth token
const getAuthToken = async (): Promise<string | null> => {
  try {
    // Try both token keys for compatibility
    let token = await AsyncStorage.getItem("token");
    if (!token) {
      token = await AsyncStorage.getItem("authToken");
    }
    console.log(
      "🔐 Auth Token Retrieved:",
      token ? "✅ Token found" : "❌ No token"
    );

    // Debug: Print first and last few characters of token
    if (token) {
      console.log(
        "🔍 Token Preview:",
        `${token.substring(0, 20)}...${token.substring(token.length - 20)}`
      );

      // Try to decode and check expiration
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map(function (c) {
              return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
        );

        const decoded = JSON.parse(jsonPayload);
        console.log("🕒 Token expires:", new Date(decoded.exp * 1000));
        console.log(
          "🔄 Token valid:",
          decoded.exp * 1000 > Date.now() ? "✅ Valid" : "❌ EXPIRED"
        );
        console.log("👤 User ID from token:", decoded.userId);

        if (decoded.exp * 1000 <= Date.now()) {
          console.log("⚠️ Token is expired! User needs to login again.");
          return null;
        }
      } catch (decodeError) {
        console.log("❌ Token decode failed:", decodeError);
      }
    }

    return token;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

// Helper function to make authenticated API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getAuthToken();

  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  console.log(`🌐 API Call: ${options.method || "GET"} ${endpoint}`);
  console.log(
    `🔐 Auth Header: ${token ? "✅ Bearer token included" : "❌ No token"}`
  );

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API Error: ${response.status} - ${errorText}`);
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
};

// Vendor API functions
export const vendorApi = {
  // Get vendor profile and businesses by user ID
  getVendorByUserId: async (userId: string): Promise<any> => {
    return apiCall(`/api/vendors/user/${userId}`);
  },

  // Get vendor profile and businesses - use the new endpoint
  getVendorData: async (userId: string): Promise<any> => {
    return apiCall(`/api/vendors/user/${userId}`);
  },

  // Get vendor businesses (restaurants, shops, pharmacies)
  getVendorBusinesses: async (userId: string): Promise<Business[]> => {
    try {
      const [restaurants, shops, pharmacies] = await Promise.all([
        apiCall(`/api/restaurant/vendor/${userId}`).catch(() => []),
        apiCall(`/api/shop/vendor/${userId}`).catch(() => []),
        apiCall(`/api/pharmacy/vendor/${userId}`).catch(() => []),
      ]);

      const businesses: Business[] = [
        ...restaurants.map((r: any) => ({
          id: r.id,
          name: r.name,
          type: "RESTAURANT" as const,
          isActive: r.isActive,
          todayOrders: r.todayOrders || 0,
          revenue: r.revenue || 0,
          address: r.address,
          phone: r.phone,
          description: r.description,
          logoUrl: r.logoUrl,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        ...shops.map((s: any) => ({
          id: s.id,
          name: s.name,
          type: "SHOP" as const,
          isActive: s.isActive,
          todayOrders: s.todayOrders || 0,
          revenue: s.revenue || 0,
          address: s.address,
          phone: s.phone,
          description: s.description,
          logoUrl: s.logoUrl,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
        ...pharmacies.map((p: any) => ({
          id: p.id,
          name: p.name,
          type: "PHARMACY" as const,
          isActive: p.isActive,
          todayOrders: p.todayOrders || 0,
          revenue: p.revenue || 0,
          address: p.address,
          phone: p.phone,
          description: p.description,
          logoUrl: p.logoUrl,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
      ];

      return businesses;
    } catch (error) {
      console.error("Error fetching vendor businesses:", error);
      return [];
    }
  },

  // Calculate vendor statistics from businesses
  calculateVendorStats: (businesses: Business[]): VendorStats => {
    const totalRevenue = businesses.reduce((acc, b) => acc + b.revenue, 0);
    const todayOrders = businesses.reduce((acc, b) => acc + b.todayOrders, 0);
    const activeBusinesses = businesses.filter((b) => b.isActive).length;

    return {
      totalRevenue,
      todayOrders,
      totalOrders: todayOrders * 30, // Estimated based on daily average
      activeBusinesses,
      pendingOrders: Math.floor(todayOrders * 0.3), // Estimated
      completedOrders: Math.floor(todayOrders * 0.7), // Estimated
    };
  },

  // Get business by ID
  getBusiness: async (businessId: string): Promise<Business> => {
    return apiCall(`/api/vendor/businesses/${businessId}`);
  },

  // Update business
  updateBusiness: async (
    businessId: string,
    data: Partial<Business>
  ): Promise<Business> => {
    return apiCall(`/api/vendor/businesses/${businessId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Get vendor orders
  getVendorOrders: async (
    userId: string,
    filters?: {
      status?: string;
      businessType?: string;
      businessId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ) => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }

    const endpoint = `/api/order/vendor/${userId}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return apiCall(endpoint);
  },

  // Get analytics data
  getAnalytics: async (
    userId: string,
    period: "day" | "week" | "month" | "year" = "week"
  ) => {
    return apiCall(`/api/vendor/${userId}/analytics?period=${period}`);
  },

  // Get menu items for a restaurant
  getMenuItemsByRestaurant: async (restaurantId: string) => {
    return apiCall(`/api/menuItem/restaurant/${restaurantId}`);
  },

  // Get menu items by subcategory
  getMenuItemsBySubCategory: async (subCategoryId: string) => {
    return apiCall(`/api/menuItem/subcategory/${subCategoryId}`);
  },

  // Update restaurant image
  updateRestaurantImage: async (restaurantId: string, imageUrl: string) => {
    return apiCall(`/api/restaurants/${restaurantId}/image`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUrl }),
    });
  },

  // Update restaurant details
  updateRestaurantDetails: async (
    restaurantId: string,
    details: {
      name?: string;
      description?: string;
      phone?: string;
      email?: string;
      website?: string;
      address?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
      cuisineType?: string;
      priceRange?: string;
      minimumOrderAmount?: number;
      deliveryFee?: number;
      estimatedDeliveryTime?: string;
      isActive?: boolean;
      acceptsOrders?: boolean;
    }
  ) => {
    return apiCall(`/api/restaurants/${restaurantId}/details`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(details),
    });
  },

  // Update restaurant operating hours
  updateRestaurantHours: async (
    restaurantId: string,
    openingHours: {
      monday: { open: string; close: string; closed: boolean };
      tuesday: { open: string; close: string; closed: boolean };
      wednesday: { open: string; close: string; closed: boolean };
      thursday: { open: string; close: string; closed: boolean };
      friday: { open: string; close: string; closed: boolean };
      saturday: { open: string; close: string; closed: boolean };
      sunday: { open: string; close: string; closed: boolean };
    }
  ) => {
    return apiCall(`/api/restaurants/${restaurantId}/hours`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ openingHours }),
    });
  },
};

// Menu API functions
export const menuApi = {
  // Get menus for a restaurant
  getMenusByRestaurant: async (restaurantId: string) => {
    return apiCall(`/api/menu/${restaurantId}`);
  },

  // Create a new menu
  createMenu: async (title: string, restaurantId: string) => {
    return apiCall("/api/menu", {
      method: "POST",
      body: JSON.stringify({ title, restaurantId }),
    });
  },

  // Get menu items
  getMenuItems: async () => {
    return apiCall("/api/menuItem");
  },

  // Get menu items by subcategory
  getMenuItemsBySubCategory: async (subCategoryId: string) => {
    return apiCall(`/api/menuItem/subcategory/${subCategoryId}`);
  },

  // Create a new menu item
  createMenuItem: async (menuItemData: {
    name: string;
    description: string;
    price: number;
    category: string;
    preparationTime: number;
    isAvailable: boolean;
    ingredients?: string[];
    restaurantId: string;
    subCategoryId?: string;
  }) => {
    return apiCall("/api/menuItem", {
      method: "POST",
      body: JSON.stringify(menuItemData),
    });
  },

  // Update menu item
  updateMenuItem: async (itemId: string, data: any) => {
    return apiCall(`/api/menuItem/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Delete menu item
  deleteMenuItem: async (itemId: string) => {
    return apiCall(`/api/menuItem/${itemId}`, {
      method: "DELETE",
    });
  },
};

// Category and SubCategory API functions
export const categoryApi = {
  // Get all categories
  getAllCategories: async () => {
    return apiCall("/api/categories");
  },

  // Get category by ID
  getCategoryById: async (categoryId: string) => {
    return apiCall(`/api/categories/${categoryId}`);
  },

  // Search categories
  searchCategories: async (query: string) => {
    return apiCall(`/api/categories/search?q=${encodeURIComponent(query)}`);
  },
};

export const subCategoryApi = {
  // Get all subcategories
  getAllSubCategories: async () => {
    return apiCall("/api/subcategories");
  },

  // Get subcategories by category ID
  getSubCategoriesByCategory: async (categoryId: string) => {
    return apiCall(`/api/subcategories/category/${categoryId}`);
  },

  // Get subcategory by ID
  getSubCategoryById: async (subCategoryId: string) => {
    return apiCall(`/api/subcategories/${subCategoryId}`);
  },
};

// User API functions
export const userApi = {
  // Check if user is vendor
  checkVendorStatus: async () => {
    return apiCall("/api/auth/vendor-status");
  },

  // Get user profile - requires userId
  getUserProfile: async (userId: string) => {
    return apiCall(`/api/users/${userId}/profile`);
  },

  // Get current user info from token
  getCurrentUser: async () => {
    const token = await getAuthToken();
    if (!token) throw new Error("No authentication token found");

    try {
      // Decode token to get userId
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );

      const decoded = JSON.parse(jsonPayload);
      const userId = decoded.userId;

      if (!userId) throw new Error("Invalid token: no userId found");

      // Get full user profile
      return await userApi.getUserProfile(userId);
    } catch (error) {
      console.error("Error decoding token or fetching profile:", error);
      throw new Error("Failed to get current user profile");
    }
  },
};

// Order API functions
export const orderApi = {
  // Create a new order
  createOrder: async (orderData: CreateOrderData): Promise<Order> => {
    console.log("🛒 Creating order with data:", orderData);
    const token = await getAuthToken();
    console.log(
      "🔐 Token for order creation:",
      token ? "✅ Available" : "❌ Missing"
    );

    return apiCall("/api/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  },

  // Get orders for a customer
  getCustomerOrders: async (): Promise<Order[]> => {
    return apiCall("/api/orders/customer");
  },

  // Get orders for a vendor/restaurant
  getVendorOrders: async (restaurantId: string): Promise<Order[]> => {
    return apiCall(`/api/orders/vendor/${restaurantId}`);
  },

  // Get all orders for a vendor (across all restaurants)
  getAllVendorOrders: async (): Promise<Order[]> => {
    return apiCall("/api/orders/vendor");
  },

  // Update order status
  updateOrderStatus: async (
    orderId: string,
    status: Order["status"],
    estimatedDeliveryTime?: string
  ): Promise<Order> => {
    return apiCall(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, estimatedDeliveryTime }),
    });
  },

  // Get order by ID
  getOrderById: async (orderId: string): Promise<Order> => {
    return apiCall(`/api/orders/${orderId}`);
  },

  // Cancel an order
  cancelOrder: async (orderId: string, reason?: string): Promise<Order> => {
    return apiCall(`/api/orders/${orderId}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  },
};

// Admin API functions for managing all products/menu items
export const adminApi = {
  // Menu Items Management
  createMenuItem: async (data: FormData) => {
    return apiCall("/api/admin/menuItem", {
      method: "POST",
      body: data,
      headers: {}, // Remove content-type to let browser set it for FormData
    });
  },

  updateMenuItem: async (itemId: string, data: FormData) => {
    return apiCall(`/api/admin/menuItem/${itemId}`, {
      method: "PUT",
      body: data,
      headers: {}, // Remove content-type to let browser set it for FormData
    });
  },

  deleteMenuItem: async (itemId: string) => {
    return apiCall(`/api/admin/menuItem/${itemId}`, {
      method: "DELETE",
    });
  },

  getAllMenuItems: async (filters?: {
    page?: number;
    limit?: number;
    search?: string;
    restaurantId?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return apiCall(`/api/admin/menuItems?${params.toString()}`);
  },

  getMenuItemsByRestaurant: async (
    restaurantId: string,
    filters?: {
      page?: number;
      limit?: number;
    }
  ) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return apiCall(
      `/api/admin/menuItems/restaurant/${restaurantId}?${params.toString()}`
    );
  },

  // Products Management
  createProduct: async (data: FormData) => {
    return apiCall("/api/admin/product", {
      method: "POST",
      body: data,
      headers: {}, // Remove content-type to let browser set it for FormData
    });
  },

  updateProduct: async (productId: string, data: FormData) => {
    return apiCall(`/api/admin/product/${productId}`, {
      method: "PUT",
      body: data,
      headers: {}, // Remove content-type to let browser set it for FormData
    });
  },

  deleteProduct: async (productId: string) => {
    return apiCall(`/api/admin/product/${productId}`, {
      method: "DELETE",
    });
  },

  getAllProducts: async (filters?: {
    page?: number;
    limit?: number;
    search?: string;
    shopId?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return apiCall(`/api/admin/products?${params.toString()}`);
  },

  getProductsByShop: async (
    shopId: string,
    filters?: {
      page?: number;
      limit?: number;
    }
  ) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return apiCall(`/api/admin/products/shop/${shopId}?${params.toString()}`);
  },

  // Medicines Management
  createMedicine: async (data: FormData) => {
    return apiCall("/api/admin/medicine", {
      method: "POST",
      body: data,
      headers: {}, // Remove content-type to let browser set it for FormData
    });
  },

  updateMedicine: async (medicineId: string, data: FormData) => {
    return apiCall(`/api/admin/medicine/${medicineId}`, {
      method: "PUT",
      body: data,
      headers: {}, // Remove content-type to let browser set it for FormData
    });
  },

  deleteMedicine: async (medicineId: string) => {
    return apiCall(`/api/admin/medicine/${medicineId}`, {
      method: "DELETE",
    });
  },

  getAllMedicines: async (filters?: {
    page?: number;
    limit?: number;
    search?: string;
    pharmacyId?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return apiCall(`/api/admin/medicines?${params.toString()}`);
  },

  getMedicinesByPharmacy: async (
    pharmacyId: string,
    filters?: {
      page?: number;
      limit?: number;
    }
  ) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return apiCall(
      `/api/admin/medicines/pharmacy/${pharmacyId}?${params.toString()}`
    );
  },

  // Orders Management
  getAllOrders: async (filters?: {
    page?: number;
    limit?: number;
    status?: string;
    restaurantId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return apiCall(`/api/admin/orders?${params.toString()}`);
  },

  getOrderStats: async (period?: string) => {
    const params = period ? `?period=${period}` : "";
    return apiCall(`/api/admin/orders/stats${params}`);
  },

  updateOrderStatus: async (
    orderId: string,
    data: {
      status: string;
      driverId?: string;
      estimatedDeliveryTime?: string;
    }
  ) => {
    return apiCall(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Dashboard & Analytics
  getDashboardStats: async () => {
    return apiCall("/api/admin/dashboard/stats");
  },

  getAllVendors: async (filters?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return apiCall(`/api/admin/vendors?${params.toString()}`);
  },

  getAllRestaurants: async (filters?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return apiCall(`/api/admin/restaurants?${params.toString()}`);
  },

  getAllShops: async (filters?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return apiCall(`/api/admin/shops?${params.toString()}`);
  },

  getAllPharmacies: async (filters?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return apiCall(`/api/admin/pharmacies?${params.toString()}`);
  },
};
