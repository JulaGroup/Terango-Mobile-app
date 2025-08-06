# TeranGo API Integration Guide

This document provides comprehensive examples for integrating with TeranGo's backend API for handling uploads and CRUD operations.

## Table of Contents

- [Authentication](#authentication)
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

## Menu Items API

### Create Menu Item

#### Web/Admin Panel (FormData)

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

  const response = await fetch("/api/menu-items", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return await response.json();
};
```

### 2. Create a Menu Item Image Only (Base64 Upload - Mobile)

**Endpoint:** `POST /api/uploads/menu-item-image`
**Authentication:** Bearer Token required
**Content-Type:** `application/json`

**Request Body:**

```json
{
  "image": {
    "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQAB..." // Base64 encoded image with mime type prefix
  }
}
```

**Success Response:** 200 OK

```json
{
  "message": "Menu item image uploaded successfully",
  "imageUrl": "https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/teranggo/menu-items/abcdef.jpg"
}
```

## Products API

### 1. Create a Product (Form Data Upload)

**Endpoint:** `POST /api/products`
**Authentication:** Bearer Token required
**Content-Type:** `multipart/form-data`

**Request Body:**

```javascript
const formData = new FormData();
formData.append("name", "Classic T-Shirt"); // Required
formData.append("price", "24.99"); // Required - as string
formData.append("description", "Comfortable cotton t-shirt");
formData.append("shopId", "shop-id-here"); // Required
formData.append("subCategoryId", "subcategory-id-here"); // Required
// Multiple images (up to 5)
formData.append("images", image1File); // First image will be primary
formData.append("images", image2File);
formData.append("images", image3File);
```

**Success Response:** 201 Created with product data including image URLs

### 2. Upload Product Images Only (Base64 Upload - Mobile)

**Endpoint:** `POST /api/uploads/product-images`
**Authentication:** Bearer Token required
**Content-Type:** `application/json`

**Request Body:**

```json
{
  "images": [
    {
      "data": "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Base64 encoded image with mime type prefix
    },
    {
      "data": "data:image/jpeg;base64,/8d/4AAQSkZJRg..." // Base64 encoded image with mime type prefix
    }
  ]
}
```

**Success Response:** 200 OK with array of image URLs

## Implementation Notes

### Mobile Upload Implementation

For mobile apps (React Native/Expo), we use the base64 upload endpoints:

1. Read the image file as base64:

```javascript
import * as FileSystem from "expo-file-system";

// Convert image to base64
const base64 = await FileSystem.readAsStringAsync(imageUri, {
  encoding: FileSystem.EncodingType.Base64,
});

// Determine mime type
const fileType = imageUri.split(".").pop().toLowerCase() || "jpeg";
const mimeType = `image/${fileType === "jpg" ? "jpeg" : fileType}`;

// Create data URL with mime type prefix
const base64Image = `data:${mimeType};base64,${base64}`;
```

2. Send to the API:

```javascript
const response = await axios.post(
  `${API_URL}/api/uploads/menu-item-image`,
  {
    image: {
      data: base64Image,
    },
  },
  {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  }
);

const imageUrl = response.data.imageUrl;
```

## Important Notes

### Authentication

All routes require vendor authentication using Bearer token:

```javascript
{
  headers: {
    'Authorization': `Bearer ${token}`
  }
}
```

### File Size Limits

- Menu Item Images: 3MB max
- Product Images: 5MB max per image

### Supported Image Formats

JPEG, PNG, WebP

### Web vs Mobile

- Web frontend should use the multipart/form-data endpoints
- Mobile apps should use the base64 upload endpoints
