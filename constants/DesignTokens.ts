/**
 * TeranGO Design System
 * Modern, industry-standard design tokens
 * Inspired by Apple HIG and Material Design 3
 */

// ══════════════════════════════════════════════════════════
// COLOR SYSTEM
// ══════════════════════════════════════════════════════════

export const Colors = {
  // Primary Brand
  primary: "#FF6B00",
  primaryDark: "#E05A00",
  primaryDeep: "#CC5200",
  primaryLight: "#FF8533",
  primaryGlow: "rgba(255,107,0,0.18)",
  primaryFaint: "rgba(255,107,0,0.07)",

  // Neutrals
  black: "#0A0A0A",
  blackSoft: "#111111",
  ink: "#1C1C1E",
  inkMid: "#3A3A3C",
  inkLight: "#6B6B6E",
  inkLighter: "#8E8E93",
  gray: "#C7C7CC",
  grayLight: "#E5E5EA",
  divider: "#E8E8EA",
  surface: "#FFFFFF",
  surfaceRaised: "#FAFAFA",
  bg: "#F5F5F7",
  bgDark: "#F0F0F2",

  // Semantic Colors
  success: "#00A86B",
  successDark: "#008C5A",
  successBg: "rgba(0,168,107,0.08)",

  warning: "#FF9F0A",
  warningDark: "#E08C00",
  warningBg: "rgba(255,159,10,0.08)",

  error: "#FF3B30",
  errorDark: "#E03228",
  errorBg: "rgba(255,59,48,0.08)",

  info: "#0A84FF",
  infoDark: "#0070E0",
  infoBg: "rgba(10,132,255,0.08)",

  // Status-specific
  status: {
    pending: "#FF9F0A",
    accepted: "#0A84FF",
    preparing: "#9C27B0",
    picked_up: "#00A86B",
    in_transit: "#0A84FF",
    delivered: "#00A86B",
    cancelled: "#FF3B30",
  },

  // Overlays
  backdrop: "rgba(0,0,0,0.5)",
  backdropLight: "rgba(0,0,0,0.25)",
  overlay: "rgba(255,255,255,0.95)",
  scrim: "rgba(0,0,0,0.15)",
};

// ══════════════════════════════════════════════════════════
// TYPOGRAPHY SYSTEM
// ══════════════════════════════════════════════════════════

export const Typography = {
  // Display/Hero (for major headings)
  hero: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },

  // Headings
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "600" as const,
    letterSpacing: -0.1,
  },

  // Body Text
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },
  bodyBold: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600" as const,
    letterSpacing: 0,
  },

  // Subheadline
  subheadline: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  subheadlineMedium: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },

  // Footnote
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  footnoteMedium: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },

  // Caption
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  captionMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },

  // Caption2 (smallest)
  caption2: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "400" as const,
    letterSpacing: 0.1,
  },
};

// ══════════════════════════════════════════════════════════
// SPACING SYSTEM (8pt grid)
// ══════════════════════════════════════════════════════════

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 64,
};

// ══════════════════════════════════════════════════════════
// BORDER RADIUS
// ══════════════════════════════════════════════════════════

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,
};

// ══════════════════════════════════════════════════════════
// SHADOWS (elevation system)
// ══════════════════════════════════════════════════════════

export const Shadows = {
  none: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ══════════════════════════════════════════════════════════
// ANIMATION TIMING
// ══════════════════════════════════════════════════════════

export const Animation = {
  fast: 150,
  normal: 250,
  slow: 350,
  verySlow: 500,
};

// ══════════════════════════════════════════════════════════
// COMPONENT SIZES
// ══════════════════════════════════════════════════════════

export const ComponentSizes = {
  button: {
    sm: { height: 36, paddingHorizontal: 16 },
    md: { height: 44, paddingHorizontal: 20 },
    lg: { height: 52, paddingHorizontal: 24 },
    xl: { height: 60, paddingHorizontal: 28 },
  },
  input: {
    sm: { height: 40 },
    md: { height: 48 },
    lg: { height: 56 },
  },
  icon: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 40,
  },
};

// ══════════════════════════════════════════════════════════
// LAYOUT CONSTANTS
// ══════════════════════════════════════════════════════════

export const Layout = {
  screenPadding: 20,
  cardPadding: 16,
  sectionGap: 24,
  itemGap: 12,
  maxContentWidth: 600,
};

// ══════════════════════════════════════════════════════════
// HELPER UTILITIES
// ══════════════════════════════════════════════════════════

export const getStatusColor = (status?: string | null): string => {
  const statusLower = String(status ?? "")
    .trim()
    .toLowerCase();
  if (!statusLower) {
    return Colors.inkMid;
  }
  if (statusLower.includes("deliver") || statusLower.includes("complete")) {
    return Colors.success;
  }
  if (statusLower.includes("cancel") || statusLower.includes("fail")) {
    return Colors.error;
  }
  if (statusLower.includes("transit") || statusLower.includes("picked")) {
    return Colors.info;
  }
  if (statusLower.includes("pend") || statusLower.includes("wait")) {
    return Colors.warning;
  }
  return Colors.inkMid;
};

export const formatCurrency = (amount: number): string => {
  return `D${amount.toFixed(2)}`;
};

export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)} km`;
};

export const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};
