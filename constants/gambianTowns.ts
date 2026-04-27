/**
 * Gambian Towns and Areas
 * Used for "Order for Someone Else" feature
 * Coordinates are approximate centers for delivery fee calculation
 *
 * BETA LAUNCH: Limited to West Coast Region only
 * Towns: Brusubi, Serrekunda, Kanifing, Brufut, Senegambia, Kotu, Kololi,
 *        Pipeline, Manjai, Bakau, Kerr Serign, Sukuta, Fajara,
 *        Kairaba Avenue, Bijilo
 *
 * NOTE: Delivery fees are now fetched dynamically from admin panel.
 * The static DELIVERY_ZONES values are fallbacks only.
 */

export interface GambianTown {
  id: string;
  name: string;
  area: string; // Greater Banjul Area, West Coast, etc.
  latitude: number;
  longitude: number;
  deliveryZone: "zone1" | "zone2" | "zone3"; // For tiered delivery pricing
}

// Delivery zones with FALLBACK fees (actual fees come from admin panel)
// These are used when the API is unavailable
export const DELIVERY_ZONES = {
  zone1: {
    name: "Central",
    baseFee: 35,
    description: "Serrekunda, Kanifing, Pipeline",
  },
  zone2: {
    name: "Greater Banjul",
    baseFee: 50,
    description: "Bakau, Fajara, Kotu, Kololi, Kairaba Avenue, Bijilo",
  },
  zone3: {
    name: "West Coast",
    baseFee: 75,
    description: "Brusubi, Brufut, Sukuta",
  },
} as const;

// BETA LAUNCH: Only West Coast Region towns
export const GAMBIAN_TOWNS: GambianTown[] = [
  // Zone 1 - Central (Serrekunda & Kanifing area)
  {
    id: "serrekunda",
    name: "Serrekunda",
    area: "Zone 1",
    latitude: 13.438762,
    longitude: -16.674807,
    deliveryZone: "zone1",
  },
  {
    id: "kanifing",
    name: "Kanifing",
    area: "Zone 1",
    latitude: 13.453768,
    longitude: -16.674822,
    deliveryZone: "zone1",
  },
  {
    id: "pipeline",
    name: "Pipeline",
    area: "Zone 1",
    latitude: 13.458312,
    longitude: -16.684491,
    deliveryZone: "zone1",
  },

  // Zone 2 - Greater Banjul Area
  {
    id: "kairaba_avenue",
    name: "Kairaba Avenue",
    area: "Zone 2",
    latitude: 13.454347,
    longitude: -16.682122,
    deliveryZone: "zone2",
  },
  {
    id: "bakau",
    name: "Bakau",
    area: "Zone 2",
    latitude: 13.475264,
    longitude: -16.676071,
    deliveryZone: "zone2",
  },
  {
    id: "fajara",
    name: "Fajara",
    area: "Zone 2",
    latitude: 13.471065,
    longitude: -16.695437,
    deliveryZone: "zone2",
  },
  {
    id: "kotu",
    name: "Kotu",
    area: "Zone 2",
    latitude: 13.45422,
    longitude: -16.704328,
    deliveryZone: "zone2",
  },
  {
    id: "kololi",
    name: "Kololi",
    area: "Zone 2",
    latitude: 13.441142,
    longitude: -16.708187,
    deliveryZone: "zone2",
  },
  {
    id: "senegambia",
    name: "Senegambia",
    area: "Zone 2",
    latitude: 13.441176,
    longitude: -16.719614,
    deliveryZone: "zone2",
  },
  {
    id: "bijilo",
    name: "Bijilo",
    area: "Zone 2",
    latitude: 13.42109,
    longitude: -16.729352,
    deliveryZone: "zone3",
  },
  {
    id: "manjai",
    name: "Manjai",
    area: "Zone 2",
    latitude: 13.44496,
    longitude: -16.70131,
    deliveryZone: "zone2",
  },

  // Zone 3 - West Coast
  {
    id: "brusubi",
    name: "Brusubi",
    area: "Zone 3",
    latitude: 13.406691,
    longitude: -16.729346,
    deliveryZone: "zone3",
  },
  {
    id: "brufut",
    name: "Brufut",
    area: "Zone 3",
    latitude: 13.380278,
    longitude: -16.750301,
    deliveryZone: "zone3",
  },
  {
    id: "kerr_serign",
    name: "Kerr Serign",
    area: "Zone 3",
    latitude: 13.431773,
    longitude: -16.721298,
    deliveryZone: "zone3",
  },
  {
    id: "sukuta",
    name: "Sukuta",
    area: "Zone 3",
    latitude: 13.41427,
    longitude: -16.707112,
    deliveryZone: "zone3",
  },
];

// Group towns by area for easier display
export const TOWNS_BY_AREA = GAMBIAN_TOWNS.reduce(
  (acc, town) => {
    if (!acc[town.area]) {
      acc[town.area] = [];
    }
    acc[town.area].push(town);
    return acc;
  },
  {} as Record<string, GambianTown[]>,
);

// Get delivery fee for a town
export function getDeliveryFeeForTown(townId: string): number {
  const town = GAMBIAN_TOWNS.find((t) => t.id === townId);
  if (!town) return DELIVERY_ZONES.zone3.baseFee; // Default to highest zone (zone3 for beta)
  return DELIVERY_ZONES[town.deliveryZone].baseFee;
}

// Get town by ID
export function getTownById(townId: string): GambianTown | undefined {
  return GAMBIAN_TOWNS.find((t) => t.id === townId);
}

// Get zone info for a town
export function getZoneInfoForTown(townId: string) {
  const town = GAMBIAN_TOWNS.find((t) => t.id === townId);
  if (!town) return DELIVERY_ZONES.zone3; // Default to highest zone (zone3 for beta)
  return DELIVERY_ZONES[town.deliveryZone];
}

// Search towns by name
export function searchTowns(query: string): GambianTown[] {
  const lowerQuery = typeof query === "string" ? query.toLowerCase() : "";
  return GAMBIAN_TOWNS.filter(
    (town) =>
      (town.name || "").toLowerCase().includes(lowerQuery) ||
      (town.area || "").toLowerCase().includes(lowerQuery),
  );
}
