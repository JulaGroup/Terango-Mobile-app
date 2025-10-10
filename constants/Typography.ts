/**
 * Typography Constants
 * Centralized font sizes and weights for consistent UI across all screens
 */

export const Typography = {
  // Headers
  headerLarge: {
    fontSize: 28,
    fontWeight: "bold" as const,
    lineHeight: 34,
  },
  headerMedium: {
    fontSize: 24,
    fontWeight: "bold" as const,
    lineHeight: 30,
  },
  headerSmall: {
    fontSize: 20,
    fontWeight: "bold" as const,
    lineHeight: 26,
  },

  // Titles
  title: {
    fontSize: 18,
    fontWeight: "bold" as const,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    lineHeight: 22,
  },

  // Body text
  bodyLarge: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 18,
  },

  // Captions
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: "600" as const,
    lineHeight: 16,
  },

  // Labels
  label: {
    fontSize: 14,
    fontWeight: "500" as const,
    lineHeight: 20,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: "500" as const,
    lineHeight: 16,
  },

  // Buttons
  button: {
    fontSize: 16,
    fontWeight: "600" as const,
    lineHeight: 22,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: "600" as const,
    lineHeight: 20,
  },
};

/**
 * Font Weights
 * Use these for custom font weight combinations
 */
export const FontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};
