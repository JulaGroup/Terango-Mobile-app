/**
 * Smooth movement and heading for a live map marker.
 *
 * Location arrives as discrete pings — every 3 seconds on an active job, every
 * 5 metres of movement. Binding a Marker straight to that state makes the
 * marker teleport: it sits still, jumps, sits still. Uber and Bolt both glide
 * the vehicle between fixes and rotate it to the direction of travel, and that
 * animation is most of what makes tracking read as "live" rather than "a dot
 * that updates".
 *
 * This interpolates between the last two fixes and derives a bearing from
 * them.
 *
 * Note the useNativeDriver: false — AnimatedRegion drives latitude/longitude,
 * which are not native-animatable props. Passing true silently breaks the
 * animation on Android.
 */

import { useEffect, useRef, useState } from 'react';

/**
 * Required lazily rather than imported. On web, react-native-maps resolves to
 * an empty module (see metro.config.js), so a static import would leave
 * AnimatedRegion undefined and `new AnimatedRegion(...)` would throw at
 * module scope. This way the hook simply reports no region and callers render
 * nothing.
 */
let AnimatedRegion: any;
try {
  AnimatedRegion = require('react-native-maps').AnimatedRegion;
} catch {
  AnimatedRegion = undefined;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in metres. */
export function metresBetween(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Initial bearing from a to b, in degrees clockwise from north. */
export function bearingBetween(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

interface Options {
  /** How long to glide between two fixes. Roughly the ping interval. */
  durationMs?: number;
  /**
   * Ignore heading changes under this distance. GPS jitters by a few metres
   * while parked, and without a floor the marker spins on the spot.
   */
  minHeadingMetres?: number;
}

export function useSmoothedMarker(
  target: LatLng | null | undefined,
  options: Options = {},
) {
  const { durationMs = 1500, minHeadingMetres = 8 } = options;

  const regionRef = useRef<any>(null);
  const previous = useRef<LatLng | null>(null);
  const [heading, setHeading] = useState(0);
  const [ready, setReady] = useState(false);

  const lat = target?.latitude;
  const lng = target?.longitude;

  useEffect(() => {
    if (lat == null || lng == null || !AnimatedRegion) return;
    const next: LatLng = { latitude: lat, longitude: lng };

    // First fix: place the marker rather than animating to it from nowhere.
    if (!regionRef.current) {
      regionRef.current = new AnimatedRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0,
        longitudeDelta: 0,
      });
      previous.current = next;
      setReady(true);
      return;
    }

    if (
      previous.current &&
      metresBetween(previous.current, next) >= minHeadingMetres
    ) {
      setHeading(bearingBetween(previous.current, next));
    }

    regionRef.current
      .timing({
        latitude: lat,
        longitude: lng,
        duration: durationMs,
        useNativeDriver: false,
      } as any)
      .start();

    previous.current = next;
  }, [lat, lng, durationMs, minHeadingMetres]);

  return { region: regionRef.current, heading, ready };
}
