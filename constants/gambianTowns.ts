/**
 * Gambian Towns and Areas
 * Used for "Order for Someone Else" feature
 * Coordinates are approximate centers for delivery fee calculation
 *
 * BETA LAUNCH: Limited to West Coast Region only
 * Towns: Brusubi, Serrekunda, Kanifing, Brufut, Senegambia, Kotu, Kololi,
 *        Pipeline, Manjai, Bakau/Nijil, Kerr Serign, Sukuta, Fajara
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
    description: "Bakau, Fajara, Kotu, Kololi",
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
    area: "Kanifing",
    latitude: 13.4397,
    longitude: -16.6775,
    deliveryZone: "zone1",
  },
  {
    id: "kanifing",
    name: "Kanifing",
    area: "Kanifing",
    latitude: 13.4531,
    longitude: -16.6638,
    deliveryZone: "zone1",
  },
  {
    id: "pipeline",
    name: "Pipeline",
    area: "Kanifing",
    latitude: 13.4495,
    longitude: -16.712,
    deliveryZone: "zone1",
  },

  // Zone 2 - Greater Banjul Area
  {
    id: "bakau",
    name: "Bakau",
    area: "Greater Banjul",
    latitude: 13.4783,
    longitude: -16.6839,
    deliveryZone: "zone2",
  },
  {
    id: "nijil",
    name: "Bakau Nijil",
    area: "Greater Banjul",
    latitude: 13.475,
    longitude: -16.68,
    deliveryZone: "zone2",
  },
  {
    id: "fajara",
    name: "Fajara",
    area: "Greater Banjul",
    latitude: 13.4725,
    longitude: -16.713,
    deliveryZone: "zone2",
  },
  {
    id: "kotu",
    name: "Kotu",
    area: "Greater Banjul",
    latitude: 13.455,
    longitude: -16.72,
    deliveryZone: "zone2",
  },
  {
    id: "kololi",
    name: "Kololi",
    area: "Greater Banjul",
    latitude: 13.442,
    longitude: -16.735,
    deliveryZone: "zone2",
  },
  {
    id: "senegambia",
    name: "Senegambia",
    area: "Greater Banjul",
    latitude: 13.438,
    longitude: -16.742,
    deliveryZone: "zone2",
  },
  {
    id: "manjai",
    name: "Manjai",
    area: "Greater Banjul",
    latitude: 13.465,
    longitude: -16.7,
    deliveryZone: "zone2",
  },

  // Zone 3 - West Coast
  {
    id: "brusubi",
    name: "Brusubi",
    area: "West Coast",
    latitude: 13.415,
    longitude: -16.728,
    deliveryZone: "zone3",
  },
  {
    id: "brufut",
    name: "Brufut",
    area: "West Coast",
    latitude: 13.39,
    longitude: -16.77,
    deliveryZone: "zone3",
  },
  {
    id: "kerr_serign",
    name: "Kerr Serign",
    area: "West Coast",
    latitude: 13.418,
    longitude: -16.758,
    deliveryZone: "zone3",
  },
  {
    id: "sukuta",
    name: "Sukuta",
    area: "West Coast",
    latitude: 13.402,
    longitude: -16.705,
    deliveryZone: "zone3",
  },
];

// Group towns by area for easier display
export const TOWNS_BY_AREA = GAMBIAN_TOWNS.reduce((acc, town) => {
  if (!acc[town.area]) {
    acc[town.area] = [];
  }
  acc[town.area].push(town);
  return acc;
}, {} as Record<string, GambianTown[]>);

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
  const lowerQuery = query.toLowerCase();
  return GAMBIAN_TOWNS.filter(
    (town) =>
      town.name.toLowerCase().includes(lowerQuery) ||
      town.area.toLowerCase().includes(lowerQuery)
  );
}
