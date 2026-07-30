import { SecureStorage } from "@/utils/secureStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/constants/config";

// Types for vendor-related data
export interface VendorStats {
  totalRevenue: number;
  todayRevenue: number; // Added to match server interface
  todayOrders: number;
  totalOrders: number;
  activeBusinesses: number;
  totalBusinesses: number; // Added to match server interface
  pendingOrders: number;
  completedOrders: number;
  totalMenuItems: number; // Added to match server interface
  averageOrderValue: number; // Added to match server interface
  // Optional detailed stats from server
  topSellingItems?: {
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }[];
  recentOrders?: {
    id: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
    customerName: string;
    itemCount: number;
  }[];
  dailyStats?: {
    date: string;
    orders: number;
    revenue: number;
  }[];
}

export type WeekdayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export interface OpeningHoursDay {
  open: string;
  close: string;
  closed: boolean;
}

export type OpeningHours = Partial<Record<WeekdayKey, OpeningHoursDay | null>>;

export interface Business {
  id: string;
  name: string;
  type: "RESTAURANT" | "SHOP" | "PHARMACY";
  isActive: boolean;
  todayOrders: number;
  website?: string;
  email?: string;
  revenue: number;
  address?: string;
  city?: string;
  phone?: string;
  description?: string;
  logoUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  acceptsOrders?: boolean;
  openingHours?: OpeningHours | null;
  minimumOrderAmount?: number | null;
  createdAt: string;
  updatedAt: string;
}

// A recurring shift window for a multi-user vendor.
export interface VendorShift {
  id: string;
  vendorId: string;
  name: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// The shift active right now plus its live order/sales tally. The tally is
// scoped to the active window, so it resets to zero at each shift boundary.
export interface CurrentShift {
  multiUserEnabled: boolean;
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  } | null;
  windowStart: string | null;
  windowEnd: string | null;
  stats: { orders: number; completed: number; sales: number };
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
  menuItemId?: string; // For restaurant orders
  productId?: string; // For shop orders
  medicineId?: string; // For pharmacy orders
  quantity: number;
  price: number;
  menuItem?: {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
  };
  product?: {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
  };
  medicine?: {
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
  // New fields to support pick-up orders
  orderType?: "DELIVERY" | "PICKUP";
  pickupInstructions?: string;
  // Enhanced delivery types for Express functionality
  deliveryType?: "STANDARD" | "EXPRESS";
  expressDeliveryTime?: number; // ETA in minutes for EXPRESS orders
  isBadgeEligible?: boolean; // Whether order qualifies for Express badge
  // Sender information (for verification)
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  // Receiver information (for verification)
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  // Delivery options
  deliveryMethod?: "PICKUP_BY_USER" | "DELIVERY_TO_USER" | "SEND_TO_SOMEONE";
  // Enhanced QR verification
  qrVerificationRequired?: boolean;
  qrVerificationStatus?: "PENDING" | "SCANNED" | "ADMIN_CONFIRMED" | "FAILED";
  verificationNotes?: string;
  // Generic address field used by backend for either delivery or pickup location
  customerLatitude?: number;
  customerLongitude?: number;
  driverPhone?: string;
  driverName?: string;
  driverImage?: string;
  driverId?: string;
  driverLatitude?: number;
  driverLongitude?: number;
  driverLastLocationUpdate?: string;
  driverVehicleType?: string;
  driverVehicleNumber?: string;
  address?: string;
  // 🎁 Recipient fields for gift orders
  isGiftOrder?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  recipientTown?: string; // Town ID for zone-based gift order tracking
  totalAmount: number;
  subtotalAmount?: number; // Items subtotal (before fees/discounts) - vendor earnings
  deliveryFee?: number; // Dynamic delivery fee based on distance
  serviceFee?: number; // Service fee (5% of subtotal)
  discountAmount?: number; // Discount from promo codes
  status:
    | "PENDING"
    | "PROCESSING"
    | "ACCEPTED"
    | "PREPARING"
    | "READY"
    | "DISPATCHED"
    | "DELIVERED"
    | "CANCELLED";
  paymentStatus?: "UNPAID" | "PAID" | "REFUNDED" | "FAILED"; // 💳 Payment status tracking
  items: OrderItem[];
  restaurantId: string;
  restaurant?: {
    id: string;
    name: string;
    address: string;
    phone: string;
    [key: string]: any;
  };
  shopId?: string;
  shop?: {
    id: string;
    name: string;
    address: string;
    phone?: string;
    [key: string]: any;
  };
  pharmacyId?: string;
  pharmacy?: {
    id: string;
    name: string;
    address: string;
    phone?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt?: string;
  estimatedDeliveryTime?: string;
  notes?: string;
  qrCode?: string; // QR code data for delivery verification
  qrCodeUrl?: string; // QR code image URL (base64)
  driverRating?: { id: string; rating: number; review?: string } | null; // ⭐ Rating given by user
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
    let token = await SecureStorage.getItem("token");
    if (!token) {
      token = await SecureStorage.getItem("authToken");
    }
    console.log(
      "🔐 Auth Token Retrieved:",
      token ? "✅ Token found" : "❌ No token",
    );

    // Debug: Print first and last few characters of token
    if (token) {
      console.log(
        "🔍 Token Preview:",
        `${token.substring(0, 20)}...${token.substring(token.length - 20)}`,
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
            .join(""),
        );

        const decoded = JSON.parse(jsonPayload);
        console.log("🕒 Token expires:", new Date(decoded.exp * 1000));
        console.log(
          "🔄 Token valid:",
          decoded.exp * 1000 > Date.now() ? "✅ Valid" : "❌ EXPIRED",
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
  // Prefer vendor token for vendor-scoped endpoints if available, otherwise fall back to main auth token
  const vendorEndpointRegex =
    /\/api\/(vendor(-stats)?|vendors|orders\/vendor|analytics|vendor-stats|restaurants|shops|pharmacies|menuItem)/i;
  let token: string | null = null;

  try {
    if (vendorEndpointRegex.test(endpoint)) {
      token = await AsyncStorage.getItem("@vendor_token");
      console.log(
        "🔑 Vendor endpoint detected. Vendor token present:",
        !!token,
      );
    }
  } catch (err) {
    console.warn("⚠️ Failed reading @vendor_token from AsyncStorage:", err);
    token = null;
  }

  if (!token) {
    token = await getAuthToken();
    console.log("🔁 Using standard auth token (fallback):", !!token);
  } else {
    console.log("🔐 Using vendor token for request");
  }

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
    `🔐 Auth Header: ${token ? "✅ Bearer token included" : "❌ No token"}`,
  );

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorText = await response.text();
    // console.error(`❌ API Error: ${response.status} - ${errorText}`);
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(
    `✅ API Response for ${endpoint}:`,
    Array.isArray(data) ? `Array[${data.length}]` : typeof data,
  );

  return data;
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

  // Get vendor businesses (restaurants, shops, pharmacies) - UPDATED to use vendor endpoint
  getVendorBusinesses: async (userId: string): Promise<Business[]> => {
    try {
      console.log("🔍 Getting vendor businesses for user:", userId);

      // Use the vendor endpoint to get complete vendor data with restaurants and shops
      const vendorData = await apiCall(`/api/vendors/user/${userId}`);
      console.log("📍 Vendor data response:", vendorData);

      if (!vendorData) {
        console.log("❌ No vendor data found for user");
        return [];
      }

      const businesses: Business[] = [];

      // Add restaurants
      if (vendorData.restaurants && Array.isArray(vendorData.restaurants)) {
        const restaurants = vendorData.restaurants.map((r: any) => ({
          id: r.id,
          name: r.name,
          type: "RESTAURANT" as const,
          isActive: r.isActive !== false,
          todayOrders: r.todayOrders || 0,
          revenue: r.revenue || 0,
          address: r.address,
          city: r.city,
          phone: r.phone,
          description: r.description,
          logoUrl: r.imageUrl, // Database uses imageUrl, map to logoUrl for consistency
          email: r.email,
          website: r.website,
          acceptsOrders: r.acceptsOrders !== false,
          openingHours: r.openingHours || null,
          minimumOrderAmount: r.minimumOrderAmount ?? null,
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
        businesses.push(...restaurants);
        console.log("✅ Found vendor restaurants:", restaurants);
      }

      // Add shops
      if (vendorData.shops && Array.isArray(vendorData.shops)) {
        const shops = vendorData.shops.map((s: any) => ({
          id: s.id,
          name: s.name,
          type: "SHOP" as const,
          isActive: s.isActive !== false,
          todayOrders: s.todayOrders || 0,
          revenue: s.revenue || 0,
          address: s.address,
          city: s.city,
          phone: s.phone,
          description: s.description,
          logoUrl: s.imageUrl, // Database uses imageUrl, map to logoUrl for consistency
          email: s.email,
          website: s.website,
          acceptsOrders: s.acceptsOrders !== false,
          openingHours: s.openingHours || null,
          minimumOrderAmount: s.minimumOrderAmount ?? null,
          latitude: s.latitude ?? null,
          longitude: s.longitude ?? null,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }));
        businesses.push(...shops);
        console.log("✅ Found vendor shops:", shops);
      }

      console.log("✅ Total vendor businesses found:", businesses);
      return businesses;
    } catch (error) {
      console.error("🚨 Error in getVendorBusinesses:", error);
      return [];
    }
  },

  // Get vendor statistics from server - UPDATED to use server endpoint
  getVendorStats: async (): Promise<VendorStats> => {
    const response = await apiCall("/api/vendor-stats/dashboard");
    console.log("📊 Raw vendor stats response:", response);

    // Server returns {success: true, data: stats} format
    if (response.success && response.data) {
      console.log("✅ Extracted vendor stats data:", response.data);
      return response.data;
    }

    // Fallback to direct response if format is different
    console.log("⚠️ Using fallback vendor stats format");
    return response;
  },

  // ── Vendor shifts (multi-user vendors) ─────────────────────────────────
  // Admin: manage the shift schedule. Cashier + admin: read the active shift.
  getShifts: async (): Promise<VendorShift[]> => {
    const res = await apiCall("/api/vendor/shifts");
    return res?.data ?? [];
  },
  createShift: async (input: {
    name: string;
    startTime: string;
    endTime: string;
  }): Promise<VendorShift> => {
    const res = await apiCall("/api/vendor/shifts", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return res?.data;
  },
  updateShift: async (
    id: string,
    input: Partial<{
      name: string;
      startTime: string;
      endTime: string;
      isActive: boolean;
    }>,
  ): Promise<VendorShift> => {
    const res = await apiCall(`/api/vendor/shifts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return res?.data;
  },
  deleteShift: async (id: string): Promise<void> => {
    await apiCall(`/api/vendor/shifts/${id}`, { method: "DELETE" });
  },
  getCurrentShift: async (): Promise<CurrentShift> => {
    const res = await apiCall("/api/vendor/shifts/current");
    return (
      res?.data ?? {
        multiUserEnabled: false,
        shift: null,
        windowStart: null,
        windowEnd: null,
        stats: { orders: 0, completed: 0, sales: 0 },
      }
    );
  },

  // Calculate vendor statistics from businesses - DEPRECATED: Use getVendorStats instead
  calculateVendorStats: (businesses: Business[]): VendorStats => {
    const totalRevenue = businesses.reduce((acc, b) => acc + b.revenue, 0);
    const todayOrders = businesses.reduce((acc, b) => acc + b.todayOrders, 0);
    const activeBusinesses = businesses.filter((b) => b.isActive).length;

    return {
      totalRevenue,
      todayRevenue: totalRevenue * 0.1, // Estimated 10% is today's revenue
      todayOrders,
      totalOrders: todayOrders * 30, // Estimated based on daily average
      activeBusinesses,
      totalBusinesses: businesses.length,
      pendingOrders: Math.floor(todayOrders * 0.3), // Estimated
      completedOrders: Math.floor(todayOrders * 0.7), // Estimated
      totalMenuItems: 0, // Not available in client-side calculation
      averageOrderValue: todayOrders > 0 ? totalRevenue / todayOrders : 0,
    };
  },

  // Get business by ID
  getBusiness: async (businessId: string): Promise<Business> => {
    return apiCall(`/api/vendor/businesses/${businessId}`);
  },

  // Update business
  updateBusiness: async (
    businessId: string,
    data: Partial<Business>,
  ): Promise<Business> => {
    return apiCall(`/api/vendor/businesses/${businessId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Get vendor orders
  getVendorOrders: async (filters?: {
    status?: string;
    businessType?: string;
    businessId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }

    // Server uses verifyVendorToken middleware to get vendor from auth token
    // No need to pass userId in URL
    const endpoint = `/api/orders/vendor${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return apiCall(endpoint);
  },

  // Get analytics data
  getAnalytics: async (
    userId: string,
    period: "day" | "week" | "month" | "year" = "week",
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
    },
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
    },
  ) => {
    return apiCall(`/api/restaurants/${restaurantId}/hours`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ openingHours }),
    });
  },

  // Update shop details
  updateShop: async (
    shopId: string,
    details: {
      name?: string;
      description?: string;
      phone?: string;
      email?: string;
      website?: string;
      address?: string;
      city?: string;
      state?: string;
      imageUrl?: string;
      isActive?: boolean;
      acceptsOrders?: boolean;
      latitude?: number;
      longitude?: number;
    },
  ) => {
    return apiCall(`/api/shops/${shopId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(details),
    });
  },
};

// Menu API functions
export const menuApi = {
  // Get menus for a restaurant
  getMenusByRestaurant: async (restaurantId: string) => {
    return apiCall(`/api/menus/${restaurantId}`);
  },

  // Get menu items by restaurant - ADD THIS MISSING ENDPOINT
  getMenuItemsByRestaurant: async (restaurantId: string) => {
    return apiCall(`/api/menuItem/restaurant/${restaurantId}`);
  },

  // Create a new menu
  createMenu: async (title: string, restaurantId: string) => {
    return apiCall("/api/menus", {
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
  // Server accepts restaurantId and will auto-create/get the menu
  createMenuItem: async (menuItemData: {
    name: string;
    description?: string;
    price: number;
    mealTime?: string; // Used instead of "category"
    preparationTime?: number;
    isAvailable?: boolean;
    imageUrl?: string;
    restaurantId?: string; // Server will convert to menuId
    menuId?: string; // Or provide menuId directly
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

  // Update menu item availability - ADD THIS MISSING ENDPOINT
  updateMenuItemAvailability: async (itemId: string, isAvailable: boolean) => {
    return apiCall(`/api/menuItem/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ isAvailable }),
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
          .join(""),
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

  // Update user profile
  updateProfile: async (data: {
    homeAddress?: string;
    homeLatitude?: number;
    homeLongitude?: number;
    fullName?: string;
    email?: string;
    phone?: string;
  }) => {
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
          .join(""),
      );

      const decoded = JSON.parse(jsonPayload);
      const userId = decoded.userId;

      if (!userId) throw new Error("Invalid token: no userId found");

      // Update profile
      return apiCall(`/api/users/${userId}/profile`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      throw new Error("Failed to update profile");
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
      token ? "✅ Available" : "❌ Missing",
    );

    // Add deep link URLs for Wave payment redirect
    const orderPayloadWithUrls = {
      ...orderData,
      success_url: "teranggo://payment-success",
      error_url: "teranggo://payment-failed",
    };

    return apiCall("/api/orders", {
      method: "POST",
      body: JSON.stringify(orderPayloadWithUrls),
    });
  },

  // Get orders for a customer with pagination
  getCustomerOrders: async (
    page: number = 1,
    limit: number = 15,
  ): Promise<{
    orders: Order[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasMore: boolean;
  }> => {
    return apiCall(`/api/orders/customer?page=${page}&limit=${limit}`);
  },

  // Lightweight: get order counts grouped by status (and accepted unpaid count)
  getOrderStatusCounts: async (): Promise<{
    byStatus: Record<string, number>;
    acceptedUnpaid: number;
    live: number;
  }> => {
    return apiCall(`/api/orders/status-counts`);
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
    estimatedDeliveryTime?: string,
    cancelReason?: string,
  ): Promise<Order> => {
    return apiCall(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, estimatedDeliveryTime, cancelReason }),
    });
  },

  // Get order by ID
  getOrderById: async (orderId: string): Promise<Order> => {
    return apiCall(`/api/orders/${orderId}`);
  },

  // Get QR code for an order with comprehensive verification data
  getOrderQRCode: async (
    orderId: string,
  ): Promise<{ 
    qrCode: string; 
    qrCodeUrl: string; 
    orderInfo: any;
    verificationData: {
      orderId: string;
      orderType: string;
      senderInfo: { name: string; phone: string };
      receiverInfo: { name: string; phone: string };
      deliveryType: string;
      timestamp: string;
    }
  }> => {
    return apiCall(`/api/qrcode/order/${orderId}`);
  },

  // Generate QR code for Express delivery with enhanced verification
  generateExpressQR: async (
    orderId: string,
    options?: {
      includeTimestamp?: boolean;
      includeLocationData?: boolean;
      customValidation?: string;
    }
  ): Promise<{
    qrCode: string;
    qrCodeUrl: string;
    expressData: {
      estimatedDelivery: number;
      vehicleType: string;
      priority: "HIGH" | "MEDIUM" | "LOW";
    }
  }> => {
    return apiCall(`/api/qrcode/express/${orderId}`, {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
  },

  // Driver: scan QR code for delivery verification
  driverScanQR: async (
    qrData: string,
    driverId: string,
    location?: { latitude: number; longitude: number }
  ): Promise<{
    success: boolean;
    order: Order;
    verificationStatus: "SUCCESS" | "INVALID_QR" | "ORDER_MISMATCH" | "ALREADY_SCANNED";
    message: string;
  }> => {
    return apiCall(`/api/orders/driver-scan`, {
      method: "POST",
      body: JSON.stringify({
        qrData,
        driverId,
        location,
        timestamp: new Date().toISOString(),
      }),
    });
  },

  // Admin confirmation for failed QR scans
  adminConfirmDelivery: async (
    orderId: string,
    adminId: string,
    confirmationData: {
      reason: "QR_FAILED" | "CUSTOMER_UNAVAILABLE" | "TECHNICAL_ISSUE";
      notes: string;
      verificationMethod: "PHONE_CALL" | "SMS" | "PHOTO_PROOF";
      customerConfirmed: boolean;
    }
  ): Promise<{
    success: boolean;
    order: Order;
    confirmationId: string;
  }> => {
    return apiCall(`/api/orders/${orderId}/admin-confirm`, {
      method: "POST",
      body: JSON.stringify({
        adminId,
        ...confirmationData,
        timestamp: new Date().toISOString(),
      }),
    });
  },

  // Request admin confirmation for delivery
  requestAdminConfirmation: async (
    orderId: string,
    driverId: string,
    reason: string
  ): Promise<{
    success: boolean;
    confirmationId: string;
    message: string;
  }> => {
    return apiCall(`/api/orders/${orderId}/request-admin-confirmation`, {
      method: "POST",
      body: JSON.stringify({
        driverId,
        reason,
        requestedAt: new Date().toISOString(),
      }),
    });
  },

  // Get pending admin confirmations
  getPendingConfirmations: async (): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      orderId: string;
      driverName: string;
      driverPhone: string;
      customerName: string;
      customerPhone: string;
      deliveryAddress: string;
      requestedAt: string;
      status: string;
      priority: string;
      notes?: string;
    }>;
  }> => {
    return apiCall(`/api/admin/pending-confirmations`);
  },

  // Admin reject delivery confirmation
  adminRejectDelivery: async (
    orderId: string,
    rejectionData: {
      confirmationId: string;
      adminId: string;
      rejectedAt: string;
      reason: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
  }> => {
    return apiCall(`/api/orders/${orderId}/admin-reject`, {
      method: "POST",
      body: JSON.stringify(rejectionData),
    });
  },

  // Update delivery status with location
  updateDeliveryStatus: async (
    orderId: string,
    status: string,
    location?: { latitude: number; longitude: number },
    notes?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> => {
    return apiCall(`/api/orders/${orderId}/update-status`, {
      method: "POST",
      body: JSON.stringify({
        status,
        location,
        notes,
        updatedAt: new Date().toISOString(),
      }),
    });
  },

  // Calculate Express delivery time
  calculateExpressDeliveryTime: async (
    pickupLocation: string,
    deliveryLocation: string,
    orderType?: string
  ): Promise<{
    success: boolean;
    estimatedTime: number;
    canBeExpress: boolean;
    zone: string;
    distance: number;
  }> => {
    return apiCall(`/api/delivery/calculate-express-time`, {
      method: "POST",
      body: JSON.stringify({
        pickupLocation,
        deliveryLocation,
        orderType,
      }),
    });
  },

  // Vendor: scan pickup QR (mark pickup as delivered)
  vendorScanPickup: async (orderId?: string, scannedId?: string) => {
    const url = orderId
      ? `/api/orders/${orderId}/scan-pickup`
      : `/api/orders/scan-pickup`;
    return apiCall(url, {
      method: "PATCH",
      body: JSON.stringify(scannedId ? { scannedId } : {}),
    });
  },

  // Cancel an order
  cancelOrder: async (orderId: string, reason?: string): Promise<Order> => {
    return apiCall(`/api/orders/${orderId}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  },

  // ⭐ Rate a driver after delivery
  rateDriver: async (
    orderId: string,
    rating: number,
    review?: string,
  ): Promise<{ message: string }> => {
    return apiCall(`/api/orders/${orderId}/rate-driver`, {
      method: "POST",
      body: JSON.stringify({ rating, review }),
    });
  },

  // 💳 Pay for an accepted order
  payForOrder: async (
    orderId: string,
    network?: string,
    returnUrl?: string,
    cancelUrl?: string,
  ): Promise<Order> => {
    console.log(
      "💳 Processing payment for order:",
      orderId,
      "network:",
      network,
      "returnUrl:",
      returnUrl,
    );
    return apiCall(`/api/orders/${orderId}/pay`, {
      method: "POST",
      body: JSON.stringify({
        network,
        success_url: returnUrl,
        error_url: cancelUrl,
      }),
    });
  },

  // 💳 Confirm payment success (called from payment success page)
  confirmPaymentSuccess: async (
    orderId: string,
    paymentId?: string,
  ): Promise<{ message: string; order: Order }> => {
    console.log(
      "💳 Confirming payment success for order:",
      orderId,
      "payment:",
      paymentId,
    );
    return apiCall(`/api/orders/${orderId}/confirm-payment`, {
      method: "POST",
      body: JSON.stringify({ paymentId }),
    });
  },

  // Shop Products Management - FIX: Use correct endpoint
  getShopProducts: async (shopId: string) => {
    return apiCall(`/api/products/shop/${shopId}`);
  },

  createShopProduct: async (productData: any) => {
    return apiCall("/api/products", {
      method: "POST",
      body: JSON.stringify(productData),
    });
  },

  updateShopProduct: async (productId: string, productData: any) => {
    return apiCall(`/api/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify(productData),
    });
  },
  deleteShopProduct: async (productId: string) => {
    return apiCall(`/api/products/${productId}`, {
      method: "DELETE",
    });
  },

  getShopProductById: async (productId: string) => {
    return apiCall(`/api/products/${productId}`);
  },

  // Shop Orders Management
  getShopOrders: async (userId: string) => {
    return apiCall(`/api/order/shop/vendor/${userId}`);
  },

  updateShopOrderStatus: async (orderId: string, status: string) => {
    return apiCall(`/api/order/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // Shop Settings Management
  updateShopSettings: async (shopId: string, settings: any) => {
    return apiCall(`/api/shop/${shopId}`, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },
};

export const customDeliveryApi = {
  createDelivery: async (payload: {
    pickupAddress: string;
    pickupCity?: string | null;
    pickupLatitude?: number | null;
    pickupLongitude?: number | null;
    dropoffAddress: string;
    dropoffCity?: string | null;
    dropoffLatitude?: number | null;
    dropoffLongitude?: number | null;
    packageDescription?: string | null;
    customerNote?: string | null;
    weightClass: "LIGHT" | "MEDIUM" | "HEAVY";
    vehicleType: "BIKE" | "KEKE_CARGO" | "CAR" | "VAN" | "LORRY";
    senderName?: string;
    senderPhone?: string;
    receiverName?: string;
    receiverPhone?: string;
    isExpress?: boolean;
    priorityLevel?: "STANDARD" | "EXPRESS" | "URGENT";
    expressDeadlineMinutes?: number;
  }) => {
    return apiCall("/api/custom-deliveries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listDeliveries: async (opts?: { limit?: number }) => {
    const qs = opts?.limit ? `?limit=${opts.limit}` : "";
    return apiCall(`/api/custom-deliveries${qs}`);
  },
  getDeliveryById: async (deliveryId: string) => {
    return apiCall(`/api/custom-deliveries/${deliveryId}`);
  },
  updateDeliveryStatus: async (
    deliveryId: string,
    data: {
      status: string;
      note?: string | null;
      locationLatitude?: number | null;
      locationLongitude?: number | null;
    },
  ) => {
    return apiCall(`/api/custom-deliveries/${deliveryId}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

// Express Delivery API
export const expressDeliveryApi = {
  quoteExpressDelivery: async (payload: {
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffLatitude: number;
    dropoffLongitude: number;
    weightClass: "LIGHT" | "MEDIUM" | "HEAVY";
    vehicleType: "BIKE" | "KEKE_CARGO" | "CAR" | "VAN" | "LORRY";
    isExpress?: boolean;
    priorityLevel?: "STANDARD" | "EXPRESS" | "URGENT";
  }) => {
    return apiCall("/api/express-delivery/quote", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  createExpressDelivery: async (payload: {
    pickupAddress: string;
    pickupCity?: string;
    pickupLatitude?: number;
    pickupLongitude?: number;
    dropoffAddress: string;
    dropoffCity?: string;
    dropoffLatitude?: number;
    dropoffLongitude?: number;
    packageDescription?: string;
    customerNote?: string;
    weightClass: "LIGHT" | "MEDIUM" | "HEAVY";
    vehicleType: "BIKE" | "KEKE_CARGO" | "CAR" | "VAN" | "LORRY";
    senderName: string;
    senderPhone: string;
    receiverName: string;
    receiverPhone: string;
    priorityLevel: "EXPRESS" | "URGENT";
    expressDeadlineMinutes: number;
  }) => {
    return apiCall("/api/express-delivery", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        isExpress: true,
      }),
    });
  },
  
  getExpressDeliveries: async (filters?: {
    isExpress?: boolean;
    priorityLevel?: string;
    status?: string;
    urgent?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return apiCall(`/api/express-delivery${queryString ? `?${queryString}` : ""}`);
  },

  getExpressDeliveryById: async (deliveryId: string) => {
    return apiCall(`/api/express-delivery/${deliveryId}`);
  },

  getExpressDeliveryTracking: async (deliveryId: string) => {
    return apiCall(`/api/express-delivery/${deliveryId}/tracking`);
  },

  getExpressDeliveryTimeline: async (deliveryId: string) => {
    return apiCall(`/api/express-delivery/${deliveryId}/timeline`);
  },

  cancelExpressDelivery: async (deliveryId: string, reason?: string) => {
    return apiCall(`/api/express-delivery/${deliveryId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  generateExpressQR: async (deliveryId: string, options?: {
    includeTimestamp?: boolean;
    includeLocationData?: boolean;
  }) => {
    return apiCall(`/api/express-delivery/${deliveryId}/qr`, {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
  },

  verifyExpressQR: async (deliveryId: string, qrData: {
    qrCodeData: string;
    verificationLocation?: {
      latitude: number;
      longitude: number;
    };
  }) => {
    return apiCall(`/api/express-delivery/${deliveryId}/verify-qr`, {
      method: "POST",
      body: JSON.stringify(qrData),
    });
  },

  requestAdminConfirmation: async (deliveryId: string, reason: string) => {
    return apiCall(`/api/express-delivery/${deliveryId}/admin-confirm`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  updateExpressDeliveryStatus: async (
    deliveryId: string,
    data: {
      status: string;
      note?: string;
      locationLatitude?: number;
      locationLongitude?: number;
      driverNote?: string;
    }
  ) => {
    return apiCall(`/api/express-delivery/${deliveryId}/status`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  addExpressTrackingUpdate: async (
    deliveryId: string,
    data: {
      status: string;
      message?: string;
      location?: {
        latitude: number;
        longitude: number;
      };
    }
  ) => {
    return apiCall(`/api/express-delivery/${deliveryId}/tracking/update`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateDriverLocation: async (data: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  }) => {
    return apiCall("/api/express-delivery/driver/location", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Driver-specific endpoints
  getDriverExpressDeliveries: async (filters?: {
    isExpress?: boolean;
    priorityLevel?: string;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return apiCall(`/api/express-delivery/driver${queryString ? `?${queryString}` : ""}`);
  },

  // Admin endpoints for assignment and monitoring
  autoAssignExpressDelivery: async (deliveryId: string) => {
    return apiCall(`/api/express-delivery/${deliveryId}/assign`, {
      method: "POST",
    });
  },

  getUrgentExpressDeliveries: async () => {
    return apiCall("/api/express-delivery/urgent");
  },

  getExpressMetrics: async () => {
    return apiCall("/api/express-delivery/metrics/dashboard");
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
    },
  ) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return apiCall(
      `/api/admin/menuItems/restaurant/${restaurantId}?${params.toString()}`,
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
    },
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
    },
  ) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return apiCall(
      `/api/admin/medicines/pharmacy/${pharmacyId}?${params.toString()}`,
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
    },
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

export const notificationApi = {
  markOpened: async (notificationId: string) =>
    apiCall(`/api/notifications/${notificationId}/opened`, { method: "POST" }),

  markActionClicked: async (notificationId: string, action?: string) =>
    apiCall(`/api/notifications/${notificationId}/action-clicked`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  getUserHistory: async () => apiCall("/api/notifications/history"),
};
