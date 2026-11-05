// KërSpace real-estate sub-brand palette. Distinct from the TeranGO orange —
// indigo/purple, matching the ker-space.vercel.app site + logo and the
// existing in-app For-Sale (navy) / For-Rent (purple) accents.
export const KerSpace = {
  primary: "#4F46E5", // indigo-600
  primaryDark: "#4338CA", // indigo-700
  primaryLight: "#EEF0FD",
  primaryFaint: "#F5F6FF",
  forSale: "#1E3A5F", // navy
  forRent: "#5B2D8E", // purple
  bg: "#F5F6FB",
  card: "#FFFFFF",
  ink: "#111827",
  inkMid: "#4B5563",
  inkLight: "#9CA3AF",
  border: "#E7E8F0",
  success: "#059669",
  warn: "#B45309",
  warnBg: "#FFFBEB",
  danger: "#DC2626",
};

export const listingTypeLabel = (t?: string) =>
  t === "FOR_RENT" ? "For Rent" : "For Sale";

export const listingTypeColor = (t?: string) =>
  t === "FOR_RENT" ? KerSpace.forRent : KerSpace.forSale;

export const money = (price?: number | null, currency = "GMD") => {
  if (price == null) return "--";
  const sym = currency === "GMD" ? "D" : currency + " ";
  return `${sym}${Number(price).toLocaleString()}`;
};
