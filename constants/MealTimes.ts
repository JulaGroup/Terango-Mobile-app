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
    id: 'all',
    name: 'All',
    displayName: 'All Items',
    icon: 'grid-outline',
    order: 0,
  },
  {
    id: 'appetizers',
    name: 'Appetizers',
    displayName: 'Appetizers',
    icon: 'restaurant-outline',
    order: 1,
  },
  {
    id: 'soups',
    name: 'Soups',
    displayName: 'Soups',
    icon: 'cafe-outline',
    order: 2,
  },
  {
    id: 'salads',
    name: 'Salads',
    displayName: 'Salads',
    icon: 'leaf-outline',
    order: 3,
  },
  {
    id: 'main-course',
    name: 'Main Course',
    displayName: 'Main Course',
    icon: 'fast-food-outline',
    order: 4,
  },
  {
    id: 'sides',
    name: 'Sides',
    displayName: 'Sides',
    icon: 'nutrition-outline',
    order: 5,
  },
  {
    id: 'desserts',
    name: 'Desserts',
    displayName: 'Desserts',
    icon: 'ice-cream-outline',
    order: 6,
  },
  {
    id: 'beverages',
    name: 'Beverages',
    displayName: 'Beverages',
    icon: 'wine-outline',
    order: 7,
  },
];

// Helper function to get meal time by ID
export const getMealTimeById = (id: string): MealTimeCategory | undefined => {
  return MEAL_TIMES.find(mt => mt.id === id);
};

// Helper function to get meal time by name
export const getMealTimeByName = (name: string): MealTimeCategory | undefined => {
  return MEAL_TIMES.find(mt => mt.name.toLowerCase() === name.toLowerCase());
};

// Get all meal times except "All"
export const getSelectableMealTimes = (): MealTimeCategory[] => {
  return MEAL_TIMES.filter(mt => mt.id !== 'all');
};
