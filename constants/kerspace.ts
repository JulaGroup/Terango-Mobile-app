// KërSpace real-estate palette. Clean, premium, industry-standard: white
// surfaces with the TeranGO ORANGE as the accent (buttons, active states,
// price, circular controls) on a crisp white/soft-grey base. For-Sale /
// For-Rent keep subtle distinct tags.
export const KerSpace = {
  primary: "#FF6B00", // TeranGO orange accent
  primaryDark: "#E55F00",
  primaryLight: "#FFF1E8", // light tint bg
  primaryFaint: "#FFF8F3",
  forSale: "#0E7C66", // green = for sale
  forRent: "#7A3DB8", // purple = for rent
  bg: "#FFFFFF",
  bgSoft: "#F5F6F8",
  card: "#FFFFFF",
  ink: "#141A1F",
  inkMid: "#5B6472",
  inkLight: "#9AA1AD",
  border: "#ECEDF1",
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

// Rental price suffix. Short-lets are priced per night; everything else per
// month. Sales get no suffix. rentPeriod comes from the listing ("NIGHT" |
// "MONTH"); it falls back to per-month for older listings with no period set.
export const rentSuffix = (p?: {
  listingType?: string;
  rentPeriod?: string | null;
}) => {
  if (!p || p.listingType !== "FOR_RENT") return "";
  return p.rentPeriod === "NIGHT" ? "/night" : "/month";
};
