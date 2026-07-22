/**
 * Professional Meal Time Categories
 * Used across the app for consistent categorization
 */

export interface MealTimeCategory {
  id: string;
  name: string;
  displayName: string;
  icon: string; // Ionicons name
  order: number;
}

export const MEAL_TIMES: MealTimeCategory[] = [
  {
    id: "all",
    name: "All",
    displayName: "All Items",
    icon: "grid-outline",
    order: 0,
  },
  {
    id: "appetizers",
    name: "Appetizers",
    displayName: "Appetizers",
    icon: "restaurant-outline",
    order: 1,
  },
  {
    id: "soups",
    name: "Soups",
    displayName: "Soups",
    icon: "cafe-outline",
    order: 2,
  },
  {
    id: "salads",
    name: "Salads",
    displayName: "Salads",
    icon: "leaf-outline",
    order: 3,
  },
  {
    id: "starter",
    name: "Starter",
    displayName: "Starter",
    icon: "fast-food-outline",
    order: 4,
  },
  {
    id: "main-course",
    name: "Main Course",
    displayName: "Main Course",
    icon: "fast-food-outline",
    order: 5,
  },
  {
    id: "breakfast",
    name: "Breakfast",
    displayName: "Breakfast Specials",
    icon: "sunrise-outline",
    order: 6,
  },
  {
    id: "lunch",
    name: "Lunch",
    displayName: "Lunch Specials",
    icon: "sunny-outline",
    order: 7,
  },
  {
    id: "dinner",
    name: "Dinner",
    displayName: "Dinner Specials",
    icon: "moon-outline",
    order: 8,
  },
  {
    id: "sides",
    name: "Sides",
    displayName: "Sides",
    icon: "nutrition-outline",
    order: 9,
  },
  {
    id: "desserts",
    name: "Desserts",
    displayName: "Desserts",
    icon: "ice-cream-outline",
    order: 10,
  },
  {
    id: "beverages",
    name: "Beverages",
    displayName: "Beverages",
    icon: "wine-outline",
    order: 11,
  },
  {
    id: "bread",
    name: "Bread",
    displayName: "Bread",
    icon: "restaurant-outline",
    order: 12,
  },
  {
    id: "pastries-snacks",
    name: "Pastries & Snacks",
    displayName: "Pastries & Snacks",
    icon: "fast-food-outline",
    order: 13,
  },
  {
    id: "cakes",
    name: "Cakes",
    displayName: "Cakes",
    icon: "gift-outline",
    order: 14,
  },
  {
    id: "cake-slices-cupcakes",
    name: "Cake Slices & Cupcakes",
    displayName: "Slices & Cupcakes",
    icon: "ice-cream-outline",
    order: 15,
  },
  {
    id: "cake-add-ons",
    name: "Cake Add-Ons",
    displayName: "Cake Add-Ons",
    icon: "sparkles-outline",
    order: 16,
  },
  {
    id: "juices",
    name: "Juices",
    displayName: "Juices",
    icon: "wine-outline",
    order: 17,
  },
];

// Helper function to get meal time by ID
export const getMealTimeById = (id: string): MealTimeCategory | undefined => {
  return MEAL_TIMES.find((mt) => mt.id === id);
};

// Helper function to get meal time by name
export const getMealTimeByName = (
  name: string,
): MealTimeCategory | undefined => {
  return MEAL_TIMES.find((mt) => mt.name.toLowerCase() === name.toLowerCase());
};

// Get all meal times except "All"
export const getSelectableMealTimes = (): MealTimeCategory[] => {
  return MEAL_TIMES.filter((mt) => mt.id !== "all");
};
