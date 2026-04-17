/**
 * TeranGO Express - Price Calculation Utilities
 * Haversine distance calculation and dynamic pricing for deliveries
 */

export type VehicleType = "BIKE" | "KEKE_CARGO" | "CAR" | "VAN" | "LORRY";
export type WeightClass = "LIGHT" | "MEDIUM" | "HEAVY";

// Haversine formula to calculate distance between two coordinates
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Weight-based base fees (GMD) - Synced with server
const WEIGHT_BASE_FEES: Record<WeightClass, number> = {
  LIGHT: 80,
  MEDIUM: 120,
  HEAVY: 180,
};

// Vehicle multipliers - Synced with server
const VEHICLE_MULTIPLIERS: Record<VehicleType, number> = {
  BIKE: 1.0,
  KEKE_CARGO: 1.1,
  CAR: 1.2,
  VAN: 1.4,
  LORRY: 1.7,
};

// Rate per kilometer per vehicle type (GMD/km) - Synced with server
const VEHICLE_RATE_PER_KM: Record<VehicleType, number> = {
  BIKE: 18,
  KEKE_CARGO: 25,
  CAR: 26,
  VAN: 34,
  LORRY: 44,
};

// Average speed per vehicle type (km/h) for ETA calculation
// Note: ETA includes pickup time + travel time
const VEHICLE_SPEEDS: Record<VehicleType, number> = {
  BIKE: 30,       // Slower due to traffic
  KEKE_CARGO: 25, // Moderate speed
  CAR: 35,        // Faster on good roads
  VAN: 30,        // Moderate with cargo
  LORRY: 25,      // Slower with heavy loads
};

// Estimated pickup/preparation time (minutes)
const PICKUP_PREP_TIME = 15;

export interface PriceCalculation {
  vehicleType: VehicleType;
  weightClass: WeightClass;
  estimatedPrice: number;
  distanceKm: number;
  estimatedTimeMinutes: number;
  breakdown: {
    baseFee: number;
    distanceFee: number;
    weightMultiplier: number;
  };
}

export function calculateDeliveryPrice(
  pickupLat: number,
  pickupLon: number,
  dropoffLat: number,
  dropoffLon: number,
  vehicleType: VehicleType,
  weightClass: WeightClass,
): PriceCalculation {
  const distanceKm = haversineDistance(
    pickupLat,
    pickupLon,
    dropoffLat,
    dropoffLon,
  );

  // Server formula: (baseFee + distance × perKm × 1.3) × vehicleMultiplier
  // 1.3 multiplier accounts for driver's pickup journey
  const baseFee = WEIGHT_BASE_FEES[weightClass];
  const perKm = VEHICLE_RATE_PER_KM[vehicleType];
  const vehicleMultiplier = VEHICLE_MULTIPLIERS[vehicleType];

  // Apply 1.3x multiplier to account for driver's pickup journey
  const totalDistanceWithPickup = distanceKm * 1.3;
  const travelPortion = totalDistanceWithPickup * perKm;
  const estimatedPrice = Math.round((baseFee + travelPortion) * vehicleMultiplier);

  // Calculate ETA: pickup time + travel time (using total distance)
  const speed = VEHICLE_SPEEDS[vehicleType];
  const travelTimeMinutes = Math.round((totalDistanceWithPickup / speed) * 60);
  const estimatedTimeMinutes = PICKUP_PREP_TIME + travelTimeMinutes;

  return {
    vehicleType,
    weightClass,
    estimatedPrice,
    distanceKm: Math.round(distanceKm * 10) / 10,
    estimatedTimeMinutes,
    breakdown: {
      baseFee,
      distanceFee: Math.round(travelPortion),
      weightMultiplier: vehicleMultiplier,
    },
  };
}

// Calculate prices for all combinations
export function calculateAllPrices(
  pickupLat: number,
  pickupLon: number,
  dropoffLat: number,
  dropoffLon: number,
): PriceCalculation[] {
  const vehicles: VehicleType[] = ["BIKE", "KEKE_CARGO", "CAR", "VAN", "LORRY"];
  const weights: WeightClass[] = ["LIGHT", "MEDIUM", "HEAVY"];

  const prices: PriceCalculation[] = [];

  for (const vehicle of vehicles) {
    for (const weight of weights) {
      const calculation = calculateDeliveryPrice(
        pickupLat,
        pickupLon,
        dropoffLat,
        dropoffLon,
        vehicle,
        weight,
      );
      prices.push(calculation);
    }
  }

  return prices;
}

// Format estimated time for display
export function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

// Get vehicle icon name
export function getVehicleIcon(vehicleType: VehicleType): string {
  const icons: Record<VehicleType, string> = {
    BIKE: "bicycle",
    KEKE_CARGO: "car-sport-outline",
    CAR: "car",
    VAN: "bus-outline",
    LORRY: "trail-sign-outline",
  };
  return icons[vehicleType];
}
