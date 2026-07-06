import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

const BRAND = "#FF6B00";
const SUCCESS = "#28A745";

interface ExpressRouteMapPreviewProps {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  driverLat?: number | null;
  driverLng?: number | null;
  distanceKm?: number | null;
  height?: number;
  /** Show a distance pill overlay in the bottom-left corner */
  showDistancePill?: boolean;
  /** Show a "LIVE" badge when driver coordinates are present */
  showLiveBadge?: boolean;
  borderRadius?: number;
}

const ExpressRouteMapPreview: React.FC<ExpressRouteMapPreviewProps> = ({
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  driverLat,
  driverLng,
  distanceKm,
  height = 190,
  showDistancePill = true,
  showLiveBadge = false,
  borderRadius = 16,
}) => {
  const mapRef = useRef<MapView>(null);

  const hasDriver = driverLat != null && driverLng != null;

  const fitMap = () => {
    const coords = [
      { latitude: pickupLat, longitude: pickupLng },
      { latitude: dropoffLat, longitude: dropoffLng },
    ];
    if (hasDriver) {
      coords.push({ latitude: driverLat!, longitude: driverLng! });
    }
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 44, right: 44, bottom: 44, left: 44 },
      animated: false,
    });
  };

  // Re-fit whenever coordinates change (e.g. driver moves)
  useEffect(() => {
    const t = setTimeout(fitMap, 350);
    return () => clearTimeout(t);
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, driverLat, driverLng]);

  const midLat = (pickupLat + dropoffLat) / 2;
  const midLng = (pickupLng + dropoffLng) / 2;
  const latDelta = Math.max(Math.abs(pickupLat - dropoffLat) * 2.4, 0.06);
  const lngDelta = Math.max(Math.abs(pickupLng - dropoffLng) * 2.4, 0.06);

  return (
    <View style={[s.container, { height, borderRadius }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }}
        onMapReady={fitMap}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
      >
        {/* Dashed route line */}
        <Polyline
          coordinates={[
            { latitude: pickupLat, longitude: pickupLng },
            ...(hasDriver
              ? [{ latitude: driverLat!, longitude: driverLng! }]
              : []),
            { latitude: dropoffLat, longitude: dropoffLng },
          ]}
          strokeColor={BRAND}
          strokeWidth={3}
          lineDashPattern={[8, 5]}
        />

        {/* Pickup marker — green ring */}
        <Marker
          coordinate={{ latitude: pickupLat, longitude: pickupLng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={s.pickupMarkerOuter}>
            <View style={s.pickupMarkerInner} />
          </View>
        </Marker>

        {/* Dropoff marker — brand pin */}
        <Marker
          coordinate={{ latitude: dropoffLat, longitude: dropoffLng }}
          anchor={{ x: 0.5, y: 1.0 }}
          tracksViewChanges={false}
        >
          <View style={s.dropoffMarkerWrap}>
            <View style={s.dropoffMarkerBubble}>
              <Ionicons name="location" size={16} color="#fff" />
            </View>
            <View style={s.dropoffMarkerTail} />
          </View>
        </Marker>

        {/* Driver marker — dark car */}
        {hasDriver && (
          <Marker
            coordinate={{ latitude: driverLat!, longitude: driverLng! }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges
          >
            <View style={s.driverMarker}>
              <Text style={{ fontSize: 18 }}>🛵</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Bottom-left distance pill */}
      {showDistancePill && distanceKm != null && (
        <View style={s.distancePill}>
          <Ionicons name="resize-outline" size={11} color={BRAND} />
          <Text style={s.distancePillText}>{distanceKm.toFixed(1)} km</Text>
        </View>
      )}

      {/* Top-right LIVE badge */}
      {showLiveBadge && hasDriver && (
        <View style={s.liveBadge}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      )}

      {/* Legend */}
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: SUCCESS }]} />
          <Text style={s.legendText}>Pickup</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: BRAND }]} />
          <Text style={s.legendText}>Dropoff</Text>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#E8EAF0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },

  // Pickup — green ring
  pickupMarkerOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 2.5,
    borderColor: SUCCESS,
    alignItems: "center",
    justifyContent: "center",
  },
  pickupMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SUCCESS,
  },

  // Dropoff — orange pin
  dropoffMarkerWrap: { alignItems: "center" },
  dropoffMarkerBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
      },
      android: { elevation: 5 },
    }),
  },
  dropoffMarkerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: BRAND,
    marginTop: -1,
  },

  // Driver marker
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a1a1a",
    borderWidth: 2.5,
    borderColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },

  // Distance pill
  distancePill: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  distancePillText: { fontSize: 11, fontWeight: "700", color: BRAND },

  // LIVE badge
  liveBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  liveText: { fontSize: 10, fontWeight: "800", color: "#fff", letterSpacing: 1 },

  // Legend
  legend: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { fontSize: 10, fontWeight: "600", color: "#374151" },
});

export default ExpressRouteMapPreview;
