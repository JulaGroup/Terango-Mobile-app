import { Dimensions, Platform } from "react-native";

const { width } = Dimensions.get("window");

export const isTablet = width >= 768;
export const isDesktop = width >= 1024;
export const isWeb = Platform.OS === "web";

// Responsive horizontal padding
export const getResponsivePadding = () => {
  if (!isWeb) return 16;
  if (isDesktop) return Math.min(48, width * 0.05);
  if (isTablet) return 32;
  return 16;
};

// Responsive content max width
export const getContentMaxWidth = () => {
  if (!isWeb) return "100%";
  if (isDesktop) return 1400;
  return "100%";
};

// Number of columns for grid layouts
export const getGridColumns = () => {
  if (!isWeb) return 2;
  if (isDesktop) return 6;
  if (isTablet) return 4;
  return 2;
};

// Card width for product grids
export const getProductCardWidth = (columns: number = getGridColumns()) => {
  const padding = getResponsivePadding();
  const gap = 12;
  const availableWidth = width - padding * 2;
  return (availableWidth - gap * (columns - 1)) / columns;
};
