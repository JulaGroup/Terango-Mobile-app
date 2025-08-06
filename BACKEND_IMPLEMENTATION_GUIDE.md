# Backend Implementation Guide for TeranGo Home Page

## Database Schema Updates

First, ensure your database has the following structure and indexes for optimal performance:

```sql
-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_active_stock ON products(is_active, stock);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_shops_location ON shops(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_advertisements_active_dates ON advertisements(is_active, start_date, end_date);

-- Add display_order to categories if not exists
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add coordinates to restaurants and shops if not exists
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
```

## Node.js/Express Implementation

### 1. Install Required Dependencies

```bash
npm install express cors helmet compression express-rate-limit
```

### 2. Create Controllers

Create `controllers/homeController.js`:

```javascript
const { Op, QueryTypes } = require("sequelize");
const {
  sequelize,
  Product,
  Category,
  Restaurant,
  Shop,
  Advertisement,
} = require("../models");

// Subcategory IDs from your database
const SUBCATEGORY_IDS = {
  localDishes: "557e0c1d-4e5f-4c3e-8477-987e5ab07d73",
  fastFood: "092780fb-8b37-4675-9e49-f4e7a99376a7",
  beverages: "e5c6f708-f820-4c13-8691-e989ca8720e4",
  riceGrains: "cca76ff8-bc4e-4544-acc1-872c119943a5",
  oilsSpices: "6ac60d93-a199-4cc0-a85d-3636dc0c4508",
  medicines: "f41dd4c6-b7df-4df2-8190-36a02a152006",
  personalCare: "91769bbc-c354-4b97-ae8f-3b8b27727d57",
  cleaningSupplies: "b8f9cf07-7875-492d-8269-8ea393515ebe",
  homeUtilities: "4a72494c-3929-461b-ae0a-1f5f6e4be0fb",
  toiletries: "d2633442-5433-4001-8611-3ec49c881482",
  cannedPackaged: "da6110fb-5229-4448-b835-f298d677b764",
  babyProducts: "f7f6a7aa-d232-4f73-840b-546e2e68db58",
};

// Main home page data endpoint (optimized single request)
const getHomePageData = async (req, res) => {
  try {
    const { userLat, userLng, limit = 6 } = req.query;

    // Fetch all data in parallel for performance
    const [
      categories,
      restaurants,
      shops,
      localDishes,
      fastFood,
      beverages,
      riceGrains,
      oilsSpices,
      medicines,
      personalCare,
      cleaningSupplies,
      homeUtilities,
      toiletries,
      advertisements,
    ] = await Promise.all([
      // Categories with icons
      Category.findAll({
        attributes: ["id", "name", "icon", "color", "image"],
        where: { isActive: true },
        order: [["displayOrder", "ASC"]],
        limit: 8,
      }),

      // Nearby restaurants
      getNearbyRestaurants(userLat, userLng, limit),

      // Nearby shops
      getNearbyShops(userLat, userLng, limit),

      // Products by subcategory
      getProductsBySubcategory(SUBCATEGORY_IDS.localDishes, limit),
      getProductsBySubcategory(SUBCATEGORY_IDS.fastFood, limit),
      getProductsBySubcategory(SUBCATEGORY_IDS.beverages, limit),
      getProductsBySubcategory(SUBCATEGORY_IDS.riceGrains, limit),
      getProductsBySubcategory(SUBCATEGORY_IDS.oilsSpices, limit),
      getProductsBySubcategory(SUBCATEGORY_IDS.medicines, limit),
      getProductsBySubcategory(SUBCATEGORY_IDS.personalCare, limit),
      getProductsBySubcategory(SUBCATEGORY_IDS.cleaningSupplies, limit),
      getProductsBySubcategory(SUBCATEGORY_IDS.homeUtilities, limit),
      getProductsBySubcategory(SUBCATEGORY_IDS.toiletries, limit),

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
          localDishes,
          fastFood,
          beverages,
          riceGrains,
          oilsSpices,
          medicines,
          personalCare,
          cleaningSupplies,
          homeUtilities,
          toiletries,
        },
        advertisements,
      },
    });
  } catch (error) {
    console.error("Home page data error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Helper function for nearby restaurants
const getNearbyRestaurants = async (lat, lng, limit) => {
  if (!lat || !lng) {
    return Restaurant.findAll({
      attributes: ["id", "name", "image", "rating", "deliveryTime", "address"],
      where: { isActive: true },
      order: [["rating", "DESC"]],
      limit: parseInt(limit),
    });
  }

  // Use Haversine formula for distance calculation
  const query = `
    SELECT id, name, image, rating, "deliveryTime", address,
           ( 6371 * acos( cos( radians(:lat) ) 
           * cos( radians( latitude ) ) 
           * cos( radians( longitude ) - radians(:lng) ) 
           + sin( radians(:lat) ) 
           * sin( radians( latitude ) ) ) ) AS distance
    FROM restaurants 
    WHERE "isActive" = true
    HAVING distance < 10
    ORDER BY distance ASC
    LIMIT :limit
  `;

  return sequelize.query(query, {
    type: QueryTypes.SELECT,
    replacements: {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      limit: parseInt(limit),
    },
  });
};

// Helper function for nearby shops
const getNearbyShops = async (lat, lng, limit) => {
  if (!lat || !lng) {
    return Shop.findAll({
      attributes: ["id", "name", "image", "rating", "deliveryTime", "address"],
      where: { isActive: true },
      order: [["rating", "DESC"]],
      limit: parseInt(limit),
    });
  }

  const query = `
    SELECT id, name, image, rating, "deliveryTime", address,
           ( 6371 * acos( cos( radians(:lat) ) 
           * cos( radians( latitude ) ) 
           * cos( radians( longitude ) - radians(:lng) ) 
           + sin( radians(:lat) ) 
           * sin( radians( latitude ) ) ) ) AS distance
    FROM shops 
    WHERE "isActive" = true
    HAVING distance < 10
    ORDER BY distance ASC
    LIMIT :limit
  `;

  return sequelize.query(query, {
    type: QueryTypes.SELECT,
    replacements: {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      limit: parseInt(limit),
    },
  });
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
        model: Shop, // or Store, depending on your model name
        attributes: ["id", "name", "rating"],
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
  });
};

// Individual endpoint for products by subcategory (for lazy loading)
const getProductsBySubcategoryEndpoint = async (req, res) => {
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
          model: Shop, // or Store
          attributes: ["id", "name", "rating", "deliveryTime"],
          required: false,
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

// Get categories
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

// Search products
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
          model: Shop, // or Store
          attributes: ["id", "name", "rating"],
          required: false,
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

module.exports = {
  getHomePageData,
  getProductsBySubcategoryEndpoint,
  getCategories,
  searchProducts,
  getNearbyRestaurants: async (req, res) => {
    try {
      const { lat, lng, radius = 10, limit = 10 } = req.query;
      const restaurants = await getNearbyRestaurants(lat, lng, limit);
      res.json({ success: true, data: restaurants });
    } catch (error) {
      console.error("Nearby restaurants error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
  getNearbyShops: async (req, res) => {
    try {
      const { lat, lng, radius = 10, limit = 10 } = req.query;
      const shops = await getNearbyShops(lat, lng, limit);
      res.json({ success: true, data: shops });
    } catch (error) {
      console.error("Nearby shops error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
};
```

### 3. Create Routes

Create `routes/publicRoutes.js`:

```javascript
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const homeController = require("../controllers/homeController");

// Rate limiting for public APIs
const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Apply rate limiting to all public routes
router.use(publicApiLimiter);

// Home page data (main endpoint)
router.get("/home-data", homeController.getHomePageData);

// Individual sections for lazy loading
router.get("/categories", homeController.getCategories);
router.get("/nearby-restaurants", homeController.getNearbyRestaurants);
router.get("/nearby-shops", homeController.getNearbyShops);
router.get(
  "/products-by-subcategory/:subcategoryId",
  homeController.getProductsBySubcategoryEndpoint
);

// Search
router.get("/search", homeController.searchProducts);

module.exports = router;
```

### 4. Update Main App

In your main `app.js` or `server.js`:

```javascript
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const publicRoutes = require("./routes/publicRoutes");

const app = express();

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com"]
        : ["http://localhost:3000", "http://localhost:19006"],
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Public routes (no authentication required)
app.use("/api/public", publicRoutes);

// Your other routes...
// app.use('/api/auth', authRoutes);
// app.use('/api/user', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Frontend Optimization Tips

1. **Use the optimized hook**: The new `useHomeData` hook includes caching and error handling
2. **Lazy loading**: Individual components fetch their own data to prevent blocking
3. **Error boundaries**: Add React error boundaries around each section
4. **Image optimization**: Use expo-image for better performance
5. **Virtualization**: For long lists, consider using FlashList or VirtualizedList

## API Response Structure

Your backend should return data in this format:

```json
{
  "success": true,
  "data": {
    "categories": [...],
    "nearbyRestaurants": [...],
    "nearbyShops": [...],
    "sections": {
      "localDishes": [...],
      "fastFood": [...],
      "beverages": [...],
      "riceGrains": [...],
      "oilsSpices": [...],
      "medicines": [...],
      "personalCare": [...],
      "cleaningSupplies": [...],
      "homeUtilities": [...],
      "toiletries": [...]
    },
    "advertisements": [...]
  }
}
```

## Performance Monitoring

Add these to monitor your API performance:

```javascript
// Add to your middleware
const responseTime = require("response-time");
app.use(
  responseTime((req, res, time) => {
    console.log(`${req.method} ${req.originalUrl} - ${time}ms`);
  })
);
```

This setup will give you a fast, optimized home page that loads quickly and provides a smooth user experience!
