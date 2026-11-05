// KërSpace real-estate sub-brand palette. Clean, premium, industry-standard:
// white surfaces with a dark navy/charcoal accent (buttons, active states,
// circular controls), per the reference design — not orange, not a heavy
// gradient. For-Sale / For-Rent keep subtle distinct tags.
export const KerSpace = {
  primary: "#1B2430", // dark navy/charcoal accent
  primaryDark: "#10161F",
  primaryLight: "#EDEFF3", // light chip/tint bg
  primaryFaint: "#F6F7F9",
  forSale: "#1B2430", // navy
  forRent: "#5B2D8E", // purple
  bg: "#FFFFFF",
  bgSoft: "#F6F7F9",
  card: "#FFFFFF",
  ink: "#0F172A",
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
