import { API_BASE_URL } from "../constants/config";

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  rating?: number;
  totalReviews?: number;
  minimumOrderAmount?: number;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  acceptsOrders: boolean;
  openingHours?: any;
  latitude?: number;
  longitude?: number;
  vendor?: {
    id: string;
    isActive: boolean;
  };
  menus?: any[];
  service?: any;
}

export interface Shop {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  rating?: number;
  address?: string;
  city?: string;
  phone?: string;
  isActive: boolean;
  acceptsOrders: boolean;
  minimumOrderAmount?: number;
  service?: {
    name: string;
    category?: {
      name: string;
    };
  };
  products?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  brand?: string;
  stock?: number;
  isAvailable: boolean;
  shop?: {
    id: string;
    name: string;
    city?: string;
  };
  subCategory?: {
    name: string;
    imageUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  mealTime?: string;
  preparationTime?: number;
  isAvailable: boolean;
  menu?: {
    restaurant?: {
      id: string;
      name: string;
    };
  };
  subCategory?: {
    name: string;
    imageUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginationResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class RestaurantAPI {
  private baseUrl = `${API_BASE_URL}/api/restaurants`;

  async getRestaurants(
    page = 1,
    limit = 20,
    filters?: {
      city?: string;
      search?: string;
      sortBy?: "rating" | "name" | "reviews";
      sortOrder?: "asc" | "desc";
    }
  ): Promise<PaginationResponse<Restaurant>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      if (filters.city) params.append("city", filters.city);
      if (filters.search) params.append("search", filters.search);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
    }

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch restaurants: ${response.statusText}`);
    }

    return response.json();
  }

  async getRestaurantById(id: string): Promise<Restaurant> {
    const response = await fetch(`${this.baseUrl}/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch restaurant: ${response.statusText}`);
    }

    return response.json();
  }

  async searchRestaurants(
    query: string,
    page = 1,
    limit = 20
  ): Promise<PaginationResponse<Restaurant>> {
    return this.getRestaurants(page, limit, { search: query });
  }
}

export const restaurantAPI = new RestaurantAPI();

// Similar API classes for other entities
class ShopAPI {
  private baseUrl = `${API_BASE_URL}/api/shops`;

  async getShops(
    page = 1,
    limit = 20,
    filters?: {
      city?: string;
      search?: string;
      shopType?: string;
      sortBy?: "rating" | "name" | "reviews";
      sortOrder?: "asc" | "desc";
    }
  ): Promise<PaginationResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch shops: ${response.statusText}`);
    }

    return response.json();
  }
}

class ProductAPI {
  private baseUrl = `${API_BASE_URL}/api/public/products`;

  async getProducts(
    page = 1,
    limit = 20,
    filters?: {
      shopId?: string;
      subCategoryId?: string;
      search?: string;
      brand?: string;
      minPrice?: number;
      maxPrice?: number;
      sortBy?: "price" | "name" | "rating" | "createdAt";
      sortOrder?: "asc" | "desc";
      isAvailable?: boolean;
    }
  ): Promise<PaginationResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    return response.json();
  }
}

class MenuItemAPI {
  private baseUrl = `${API_BASE_URL}/api/menu-items`;

  async getMenuItems(
    page = 1,
    limit = 20,
    filters?: {
      restaurantId?: string;
      menuId?: string;
      subCategoryId?: string;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
      mealTime?: string;
      sortBy?: "price" | "name" | "rating";
      sortOrder?: "asc" | "desc";
      isAvailable?: boolean;
    }
  ): Promise<PaginationResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch menu items: ${response.statusText}`);
    }

    return response.json();
  }
}

export const shopAPI = new ShopAPI();
export const productAPI = new ProductAPI();
export const menuItemAPI = new MenuItemAPI();
