/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#ff6b00";
const tintColorDark = "#fff";

export const PrimaryColor = "#ff6b00";
export const SecondaryColor = "#f0f0f0";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

/**
 * Extended Color Palette
 * Centralized colors used across the vendor app
 */
export const AppColors = {
  // Primary
  primary: "#2196F3",
  primaryDark: "#1976D2",
  primaryLight: "#BBDEFB",

  // Text colors
  text: {
    primary: "#333333",
    secondary: "#666666",
    tertiary: "#999999",
    disabled: "#CCCCCC",
    white: "#FFFFFF",
    light: "rgba(255, 255, 255, 0.8)",
  },

  // Background colors
  background: {
    primary: "#f8f9fa",
    card: "#FFFFFF",
    secondary: "#f5f5f5",
    disabled: "#f0f0f0",
    overlay: "rgba(0, 0, 0, 0.5)",
  },

  // Status colors
  status: {
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
    info: "#2196F3",
    pending: "#FF9800",
    accepted: "#2196F3",
    preparing: "#9C27B0",
    ready: "#4CAF50",
    dispatched: "#FF5722",
    delivered: "#4CAF50",
    cancelled: "#F44336",
  },

  // Border colors
  border: {
    light: "#e0e0e0",
    medium: "#cccccc",
    dark: "#999999",
  },

  // Semantic colors
  success: "#4CAF50",
  warning: "#FFC107",
  error: "#F44336",
  info: "#2196F3",

  // Gradient colors
  gradient: {
    primary: ["#2196F3", "#1976D2"],
    success: ["#4CAF50", "#388E3C"],
    warning: ["#FF9800", "#F57C00"],
    error: ["#F44336", "#D32F2F"],
  },

  // Shadow
  shadow: "#000000",
};
