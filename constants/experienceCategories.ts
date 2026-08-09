import { Ionicons } from "@expo/vector-icons";

// Curated, authentic experience categories for TeranGO. Karting/paintball/etc.
// live under "Activities" — categories are broad, not per-venue.
export interface ExperienceCategory {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const EXPERIENCE_CATEGORIES: ExperienceCategory[] = [
  { label: "Activities", icon: "flash" },
  { label: "Tours", icon: "map" },
  { label: "Beach & Water", icon: "boat" },
  { label: "Sports", icon: "football" },
  { label: "Wellness", icon: "flower" },
  { label: "Arts & Culture", icon: "color-palette" },
  { label: "Events", icon: "calendar" },
];

export function iconForCategory(
  cat?: string,
): keyof typeof Ionicons.glyphMap {
  if (!cat) return "sparkles";
  const found = EXPERIENCE_CATEGORIES.find(
    (c) => c.label.toLowerCase() === cat.toLowerCase(),
  );
  return found?.icon || "sparkles";
}
