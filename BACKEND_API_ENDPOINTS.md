# Backend API Endpoints for TeranGo Home Page

## Required Backend Endpoints

### 1. Home Page Data Endpoint (Single Request)

**GET /api/public/home-data**

This single endpoint should return all home page sections in one optimized response:

```javascript
// Controller: controllers/homeController.js
const getHomePageData = async (req, res) => {
  try {
    const { userLat, userLng, limit = 6 } = req.query;

    // Fetch all data in parallel for performance
    const [
      categories,
      restaurants,
      shops,
      snackingProducts,
      breakfastProducts,
      traditionalMeals,
      localBeverages,
      freshFarmProducts,
      techProducts,
      advertisements,
    ] = await Promise.all([
      // Categories with icons
      Category.findAll({
        attributes: ["id", "name", "icon", "color"],
        where: { isActive: true },
        order: [["displayOrder", "ASC"]],
        limit: 8,
      }),

      // Nearby restaurants
      getNearbyRestaurants(userLat, userLng, limit),

      // Nearby shops
      getNearbyShops(userLat, userLng, limit),

      // Products by subcategory
      getProductsBySubcategory("557e0c1d-4e5f-4c3e-8477-987e5ab07d73", limit), // Local Dishes
      getProductsBySubcategory("092780fb-8b37-4675-9e49-f4e7a99376a7", limit), // Fast Food
      getProductsBySubcategory("e5c6f708-f820-4c13-8691-e989ca8720e4", limit), // Beverages
      getProductsBySubcategory("cca76ff8-bc4e-4544-acc1-872c119943a5", limit), // Rice & Grains
      getProductsBySubcategory("6ac60d93-a199-4cc0-a85d-3636dc0c4508", limit), // Oils & Spices
      getProductsBySubcategory("f41dd4c6-b7df-4df2-8190-36a02a152006", limit), // Medicines

      // Active advertisements
      Advertisement.findAll({
        where: {
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() },
        },
        order: [["priority", "DESC"]],
        limit: 5,
      }),
    ]);

    res.json({
      success: true,
      data: {
        categories,
        nearbyRestaurants: restaurants,
        nearbyShops: shops,
        sections: {
          localDishes: localDishes,
          fastFood: fastFood,
          beverages: beverages,
          riceGrains: riceGrains,
          oilsSpices: oilsSpices,
          medicines: medicines,
        },
        advertisements,
      },
    });
  } catch (error) {
    console.error("Home page data error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Helper function for nearby restaurants
const getNearbyRestaurants = async (lat, lng, limit) => {
  if (!lat || !lng) {
    return Restaurant.findAll({
      attributes: ["id", "name", "image", "rating", "deliveryTime", "address"],
      where: { isActive: true },
      order: [["rating", "DESC"]],
      limit,
    });
  }

  // Use Haversine formula for distance calculation
  const query = `
    SELECT id, name, image, rating, deliveryTime, address,
           ( 6371 * acos( cos( radians(${lat}) ) 
           * cos( radians( latitude ) ) 
           * cos( radians( longitude ) - radians(${lng}) ) 
           + sin( radians(${lat}) ) 
           * sin( radians( latitude ) ) ) ) AS distance
    FROM restaurants 
    WHERE isActive = true
    HAVING distance < 10
    ORDER BY distance ASC
    LIMIT ${limit}
  `;

  return sequelize.query(query, { type: QueryTypes.SELECT });
};

// Helper function for products by subcategory
const getProductsBySubcategory = async (subcategoryId, limit) => {
  return Product.findAll({
    attributes: ["id", "name", "price", "image", "description"],
    where: {
      subcategoryId,
      isActive: true,
      stock: { [Op.gt]: 0 },
    },
    include: [
      {
        model: Store,
        attributes: ["id", "name", "rating"],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
  });
};
```

### 2. Individual Section Endpoints (For Lazy Loading)

```javascript
// GET /api/public/products-by-subcategory/:subcategoryId
const getProductsBySubcategory = async (req, res) => {
  try {
    const { subcategoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const products = await Product.findAndCountAll({
      where: {
        subcategoryId,
        isActive: true,
        stock: { [Op.gt]: 0 },
      },
      include: [
        {
          model: Store,
          attributes: ["id", "name", "rating", "deliveryTime"],
        },
      ],
      attributes: ["id", "name", "price", "image", "description", "stock"],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: products.rows,
      pagination: {
        total: products.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(products.count / limit),
      },
    });
  } catch (error) {
    console.error("Products by subcategory error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/public/nearby-restaurants
const getNearbyRestaurants = async (req, res) => {
  try {
    const { lat, lng, radius = 10, limit = 10 } = req.query;

    const restaurants = await getNearbyRestaurants(lat, lng, limit);

    res.json({
      success: true,
      data: restaurants,
    });
  } catch (error) {
    console.error("Nearby restaurants error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/public/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ["id", "name", "icon", "color", "image"],
      where: { isActive: true },
      order: [["displayOrder", "ASC"]],
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Categories error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
```

### 3. Search & Filter Endpoints

```javascript
// GET /api/public/search
const searchProducts = async (req, res) => {
  try {
    const {
      q,
      categoryId,
      subcategoryId,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
    } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      isActive: true,
      stock: { [Op.gt]: 0 },
    };

    if (q) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
      ];
    }

    if (categoryId) whereClause.categoryId = categoryId;
    if (subcategoryId) whereClause.subcategoryId = subcategoryId;
    if (minPrice) whereClause.price = { [Op.gte]: parseFloat(minPrice) };
    if (maxPrice) {
      whereClause.price = whereClause.price
        ? { ...whereClause.price, [Op.lte]: parseFloat(maxPrice) }
        : { [Op.lte]: parseFloat(maxPrice) };
    }

    const results = await Product.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Store,
          attributes: ["id", "name", "rating"],
        },
      ],
      attributes: ["id", "name", "price", "image", "description"],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: results.rows,
      pagination: {
        total: results.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(results.count / limit),
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
```

## Database Schema Updates

```sql
-- Add indexes for better performance
CREATE INDEX idx_products_subcategory ON products(subcategory_id);
CREATE INDEX idx_products_active_stock ON products(is_active, stock);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_restaurants_location ON restaurants(latitude, longitude);
CREATE INDEX idx_shops_location ON shops(latitude, longitude);
CREATE INDEX idx_advertisements_active_dates ON advertisements(is_active, start_date, end_date);

-- Add display_order to categories
ALTER TABLE categories ADD COLUMN display_order INTEGER DEFAULT 0;

-- Add coordinates to restaurants and shops
ALTER TABLE restaurants ADD COLUMN latitude DECIMAL(10, 8);
ALTER TABLE restaurants ADD COLUMN longitude DECIMAL(11, 8);
ALTER TABLE shops ADD COLUMN latitude DECIMAL(10, 8);
ALTER TABLE shops ADD COLUMN longitude DECIMAL(11, 8);
```

## Routes Setup

```javascript
// routes/publicRoutes.js
const express = require("express");
const router = express.Router();
const homeController = require("../controllers/homeController");

// Home page data
router.get("/home-data", homeController.getHomePageData);

// Individual sections
router.get("/categories", homeController.getCategories);
router.get("/nearby-restaurants", homeController.getNearbyRestaurants);
router.get("/nearby-shops", homeController.getNearbyShops);
router.get(
  "/products-by-subcategory/:subcategoryId",
  homeController.getProductsBySubcategory
);

// Search
router.get("/search", homeController.searchProducts);

module.exports = router;

// In your main app.js
app.use("/api/public", publicRoutes);
```
