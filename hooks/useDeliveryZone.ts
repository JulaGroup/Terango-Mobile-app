/**
 * useDeliveryZone
 *
 * Client-side delivery zone validation using Haversine distance from the
 * Kairaba Avenue hub. Mirrors the server-side check so users get instant
 * feedback before the /api/delivery-fee/estimate call even fires.
 *
 * Hub: 13.464254, -16.688879  (centre of Kairaba Avenue, The Gambia)
 * Default radius: 15 km  (covers Brusubi -> Fajara corridor comfortably)
 */

import { useMemo } from "react";

// ─── Hub definition ──────────────────────────────────────────────────────────

export const DELIVERY_HUB = {
  latitude: 13.4071,
  longitude: -16.729799,
  label: "Brusubi Turn Table (dispatch)",
} as const;

/** Maximum straight-line distance (km) a customer can be from the hub */
export const MAX_DELIVERY_RADIUS_KM = 15;

// ─── Haversine helper ────────────────────────────────────────────────────────

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DeliveryZoneResult {
  /** null = not yet checked (no coordinates) */
  isServiceable: boolean | null;
  /** Distance in km from the hub, null if coords unknown */
  distanceFromHubKm: number | null;
  /** Human-readable message to show the customer */
  message: string;
  /** Visual severity for the UI badge */
  status: "idle" | "ok" | "warning" | "error";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param customerCoords  - live coords after geocoding, or null
 * @param radiusKm        - override max radius (defaults to MAX_DELIVERY_RADIUS_KM)
 */
export function useDeliveryZone(
  customerCoords: { latitude: number; longitude: number } | null,
  radiusKm: number = MAX_DELIVERY_RADIUS_KM,
): DeliveryZoneResult {
  return useMemo<DeliveryZoneResult>(() => {
    if (!customerCoords) {
      return {
        isServiceable: null,
        distanceFromHubKm: null,
        message: "",
        status: "idle",
      };
    }

    const dist = haversineKm(
      DELIVERY_HUB.latitude,
      DELIVERY_HUB.longitude,
      customerCoords.latitude,
      customerCoords.longitude,
    );

    const distRounded = Math.round(dist * 10) / 10;

    if (dist <= radiusKm) {
      const remaining = Math.round((radiusKm - dist) * 10) / 10;
      return {
        isServiceable: true,
        distanceFromHubKm: distRounded,
        message: `✓ We deliver here — ${distRounded} km from our hub`,
        status: "ok",
      };
    }

    // Outside zone
    const overshoot = Math.round((dist - radiusKm) * 10) / 10;
    return {
      isServiceable: false,
      distanceFromHubKm: distRounded,
      message: `Sorry, this address is ${distRounded} km away — ${overshoot} km outside our current delivery zone (${radiusKm} km radius). We're expanding soon!`,
      status: "error",
    };
  }, [customerCoords, radiusKm]);
}

// ─── Standalone utility (for non-hook contexts) ───────────────────────────────

export function checkDeliveryZone(
  coords: { latitude: number; longitude: number },
  radiusKm: number = MAX_DELIVERY_RADIUS_KM,
): { isServiceable: boolean; distanceKm: number } {
  const dist = haversineKm(
    DELIVERY_HUB.latitude,
    DELIVERY_HUB.longitude,
    coords.latitude,
    coords.longitude,
  );
  return {
    isServiceable: dist <= radiusKm,
    distanceKm: Math.round(dist * 10) / 10,
  };
}
