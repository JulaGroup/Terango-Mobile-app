# TeranGo API Integration Guide (Admin Version)

This document provides comprehensive examples for integrating with TeranGo's backend API for handling uploads, CRUD operations, and admin functionalities.

## Table of Contents

- [Authentication](#authentication)
- [Admin-Only Operations](#admin-only-operations)
- [Menu Items API](#menu-items-api)
- [Products API](#products-api)
- [Category API](#category-api)
- [File Upload Guidelines](#file-upload-guidelines)
- [Error Handling](#error-handling)

## Authentication

All API requests require authentication using a Bearer token:

```javascript
headers: {
  "Authorization": "Bearer your-token-here"
}
```

## Admin-Only Operations

The following operations are restricted to admin users only in the MVP version:

### Creating Menu Items

```javascript
const createMenuItem = async (
  name,
  price,
  description,
  imageFile,
  menuId,
  restaurantId,
  subCategoryId
) => {
  const formData = new FormData();
  formData.append("name", name); // Required
  formData.append("price", price.toString()); // Required
  if (description) formData.append("description", description);
  if (imageFile) formData.append("image", imageFile);

  // Either menuId OR restaurantId is required
  if (menuId) {
    formData.append("menuId", menuId);
  } else if (restaurantId) {
    formData.append("restaurantId", restaurantId); // Creates default menu
  }

  if (subCategoryId) formData.append("subCategoryId", subCategoryId);

  const response = await fetch("/api/admin/menu-items", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return await response.json();
};
```

### Updating Menu Items

```javascript
const updateMenuItem = async (
  menuItemId,
  name,
  price,
  description,
  imageFile
) => {
  const formData = new FormData();

  if (name) formData.append("name", name);
  if (price) formData.append("price", price.toString());
  if (description) formData.append("description", description);
  if (imageFile) formData.append("image", imageFile);

  const response = await fetch(`/api/admin/menu-items/${menuItemId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return await response.json();
};
```

### Creating Products (Shops)

```javascript
const createProduct = async (
  name,
  price,
  description,
  shopId,
  subCategoryId,
  imageFiles
) => {
  const formData = new FormData();
  formData.append("name", name); // Required
  formData.append("price", price.toString()); // Required
  if (description) formData.append("description", description);
  formData.append("shopId", shopId); // Required
  formData.append("subCategoryId", subCategoryId); // Required

  // Multiple images (up to 5)
  if (imageFiles && imageFiles.length) {
    imageFiles.forEach((file) => {
      formData.append("images", file); // First image will be primary
    });
  }

  const response = await fetch("/api/admin/products", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return await response.json();
};
```

## Menu Items API

### Fetch Menu Items (Vendor Access)

```javascript
// Get by Restaurant (Vendor has access)
const getMenuItemsByRestaurant = async (restaurantId) => {
  const response = await fetch(`/api/menu-items/restaurant/${restaurantId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await response.json();
};

// Get menu item details (Vendor has access)
const getMenuItem = async (menuItemId) => {
  const response = await fetch(`/api/menu-items/${menuItemId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await response.json();
};
```

## Products API

### Fetch Products (Vendor Access)

```javascript
// Get by Shop ID (Vendor has access)
const getProductsByShop = async (shopId) => {
  const response = await fetch(`/api/products/shop/${shopId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await response.json();
};

// Get product details (Vendor has access)
const getProduct = async (productId) => {
  const response = await fetch(`/api/products/${productId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await response.json();
};
```

## Orders API

### Vendor Order Operations

```javascript
// Get orders for a vendor
const getVendorOrders = async (vendorId, status) => {
  const queryParams = status ? `?status=${status}` : "";
  const response = await fetch(
    `/api/vendors/${vendorId}/orders${queryParams}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return await response.json();
};

// Update order status (Vendor allowed)
const updateOrderStatus = async (orderId, status) => {
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  return await response.json();
};
```

### Admin-Only Order Operations

```javascript
// Get all orders (Admin only)
const getAllOrders = async (filters) => {
  const queryString = new URLSearchParams(filters).toString();
  const response = await fetch(`/api/admin/orders?${queryString}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await response.json();
};

// Override order status (Admin only)
const adminUpdateOrder = async (orderId, data) => {
  const response = await fetch(`/api/admin/orders/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return await response.json();
};
```

## File Upload Guidelines

### File Size Limits

- Menu Item Images: 3MB max
- Product Images: 5MB max per image
- Category Images: 5MB max
- Vendor Logos: 2MB max
- Documents: 10MB max

### Supported Image Formats

- JPEG
- PNG
- WebP

### Image Processing

- Images are automatically optimized
- Original aspect ratio is preserved
- Maximum width is limited to 800px (configurable)

## Error Handling

```javascript
try {
  const result = await createMenuItem(...);
  // Handle success
} catch (error) {
  if (error.response) {
    // Server responded with error status
    console.error("Operation failed:", error.response.data.error);

    // Common error codes
    if (error.response.status === 413) {
      alert("Image file too large, please use a smaller image");
    } else if (error.response.status === 415) {
      alert("File type not supported");
    } else if (error.response.status === 401) {
      alert("Authentication required. Please log in again.");
    } else if (error.response.status === 403) {
      alert("You don't have permission to perform this action");
    } else if (error.response.status === 404) {
      alert("Resource not found");
    } else {
      alert("An error occurred: " + error.response.data.error);
    }
  } else {
    // Network error or other issue
    console.error("Request failed:", error);
    alert("Network error. Please check your connection and try again.");
  }
}
```

---

## Implementation Notes

### MVP Access Restrictions

In the MVP version of TeranGo:

- Only admin users can create, update, and delete menu items, products, and categories
- Vendors can only view their assigned items and manage orders
- Future versions will allow vendors to manage their own content with admin approval

### Role-Based Endpoints

```
/api/menu-items/* - Vendor read access
/api/products/* - Vendor read access
/api/admin/menu-items/* - Admin-only write access
/api/admin/products/* - Admin-only write access
```
