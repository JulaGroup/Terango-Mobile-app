import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Linking,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { orderApi, Order } from "../lib/api";
import { PrimaryColor } from "@/constants/Colors";
import StatusTimeline from "@/components/tracking/StatusTimeline";
import {
  on as socketOn,
  off as socketOff,
  emit,
} from "@/services/SocketService";
import MapView, { Marker, PROVIDER_DEFAULT, Polyline } from "react-native-maps";

const { height } = Dimensions.get("window");

const statusColors: { [key: string]: string } = {
  PENDING: "#F39C12",
  PROCESSING: "#3498DB",
  ACCEPTED: "#3498DB",
  PREPARING: "#3498DB",
  READY: "#10B981",
  DISPATCHED: "#9B59B6",
  DELIVERED: "#27AE60",
  CANCELLED: "#E74C3C",
};

const statusIcons: { [key: string]: any } = {
  PENDING: "time-outline",
  PROCESSING: "checkmark-circle-outline",
  ACCEPTED: "checkmark-circle-outline",
  PREPARING: "restaurant-outline",
  READY: "checkmark-done-outline",
  DISPATCHED: "car-outline",
  DELIVERED: "home-outline",
  CANCELLED: "close-circle-outline",
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const buildCurvedRoute = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
) => {
  const points: { latitude: number; longitude: number }[] = [];
  const numPoints = 20;

  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    const lat = start.latitude + (end.latitude - start.latitude) * fraction;
    const lng = start.longitude + (end.longitude - start.longitude) * fraction;
    const curveFactor = Math.sin(fraction * Math.PI) * 0.001;

    points.push({
      latitude: lat + curveFactor,
      longitude: lng + curveFactor,
    });
  }

  return points;
};

export default function OrderTrackingPage() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map and location state
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
    timestamp?: number;
  } | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<
    {
      latitude: number;
      longitude: number;
    }[]
  >([]);
  const mapRef = useRef<MapView>(null);
  const lastRouteRequestRef = useRef<{
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
  } | null>(null);
  const isFetchingRouteRef = useRef(false);

  // Calculate distance between two coordinates
  const calculateDistance = () => {
    if (!driverLocation || !deliveryLocation) {
      return "0.0";
    }

    const R = 6371; // Earth's radius in km
    const dLat = toRadians(deliveryLocation.latitude - driverLocation.latitude);
    const dLon = toRadians(
      deliveryLocation.longitude - driverLocation.longitude
    );
    const lat1 = toRadians(driverLocation.latitude);
    const lat2 = toRadians(deliveryLocation.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance.toFixed(1);
  };

  const calculateETA = () => {
    const distance = parseFloat(calculateDistance());
    const averageSpeed = 30; // km/h
    const timeInMinutes = Math.round((distance / averageSpeed) * 60);
    return timeInMinutes > 0 ? timeInMinutes : 1;
  };

  const distanceBetween = useCallback(
    (
      start: { latitude: number; longitude: number },
      end: { latitude: number; longitude: number }
    ) => {
      const R = 6371000;
      const dLat = toRadians(end.latitude - start.latitude);
      const dLon = toRadians(end.longitude - start.longitude);
      const lat1 = toRadians(start.latitude);
      const lat2 = toRadians(end.latitude);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) *
          Math.sin(dLon / 2) *
          Math.cos(lat1) *
          Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    },
    []
  );

  const fetchRoute = useCallback(
    async (
      origin: { latitude: number; longitude: number },
      destination: { latitude: number; longitude: number },
      force = false
    ) => {
      if (isFetchingRouteRef.current) {
        return;
      }

      const last = lastRouteRequestRef.current;
      const movedEnough =
        force ||
        !last ||
        distanceBetween(last.origin, origin) > 150 ||
        distanceBetween(last.destination, destination) > 50;

      if (!movedEnough) {
        return;
      }

      isFetchingRouteRef.current = true;

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`OSRM request failed with status ${response.status}`);
        }

        const data = await response.json();
        const coordinates = data?.routes?.[0]?.geometry?.coordinates;

        if (coordinates && Array.isArray(coordinates)) {
          const mapped = coordinates.map(([lng, lat]: [number, number]) => ({
            latitude: lat,
            longitude: lng,
          }));

          setRouteCoordinates(mapped);
          lastRouteRequestRef.current = { origin, destination };
          return;
        }

        throw new Error("OSRM response missing geometry data");
      } catch (error) {
        console.warn("Falling back to curved route for customer map:", error);
        setRouteCoordinates(buildCurvedRoute(origin, destination));
      } finally {
        isFetchingRouteRef.current = false;
      }
    },
    [distanceBetween]
  );

  useEffect(() => {
    if (driverLocation && deliveryLocation) {
      fetchRoute(
        driverLocation,
        deliveryLocation,
        routeCoordinates.length === 0
      );
    }
  }, [driverLocation, deliveryLocation, fetchRoute, routeCoordinates.length]);

  // Fetch order details
  const fetchOrderDetails = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);
        setError(null);

        const data = await orderApi.getOrderById(orderId as string);
        setOrder(data);

        // Set delivery location from order data
        if (data.customerLatitude && data.customerLongitude) {
          setDeliveryLocation({
            latitude: data.customerLatitude,
            longitude: data.customerLongitude,
          });
        }

        // Set initial driver location if available
        if (data.driverLatitude && data.driverLongitude) {
          setDriverLocation({
            latitude: data.driverLatitude,
            longitude: data.driverLongitude,
            timestamp: data.driverLastLocationUpdate
              ? new Date(data.driverLastLocationUpdate).getTime()
              : Date.now(),
          });
        }
      } catch (err: any) {
        console.error("Error fetching order details:", err);
        setError(err.message || "Failed to load order details");
      } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [orderId]
  );

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // WebSocket for real-time updates
  useEffect(() => {
    if (!orderId || !order) return;

    const onOrderStatusUpdate = (data: any) => {
      if (data.orderId === orderId) {
        console.log("📦 Order status updated:", data.status);
        fetchOrderDetails(true);
      }
    };

    const onDriverLocationUpdate = (data: any) => {
      // No need to check orderId since we're already in the correct room
      console.log("📍 Driver location updated:", data);
      setDriverLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp || Date.now(),
      });

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              driverLatitude: data.latitude,
              driverLongitude: data.longitude,
              driverLastLocationUpdate: new Date(
                data.timestamp || Date.now()
              ).toISOString(),
            }
          : null
      );
    };

    socketOn("orderStatusUpdate", onOrderStatusUpdate);
    socketOn("driver:locationUpdated", onDriverLocationUpdate);

    return () => {
      socketOff("orderStatusUpdate", onOrderStatusUpdate);
      socketOff("driver:locationUpdated", onDriverLocationUpdate);
    };
  }, [orderId, order, fetchOrderDetails]);

  // Center map on both locations
  useEffect(() => {
    if (mapRef.current && driverLocation && deliveryLocation) {
      mapRef.current.fitToCoordinates(
        [
          {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
          },
          {
            latitude: deliveryLocation.latitude,
            longitude: deliveryLocation.longitude,
          },
        ],
        {
          edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
          animated: true,
        }
      );
    }
  }, [driverLocation, deliveryLocation]);

  // Track order
  useEffect(() => {
    if (orderId) {
      emit("customer:trackOrder", orderId);
      return () => {
        emit("customer:stopTracking", orderId);
      };
    }
  }, [orderId]);

  const handleCallDriver = () => {
    if (order?.driverPhone) {
      Linking.openURL(`tel:${order.driverPhone}`);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrderDetails(true);
  };

  const hasDeliveryCoordinates = Boolean(
    order?.customerLatitude && order?.customerLongitude
  );
  const isGiftOrder = Boolean(order?.isGiftOrder);
  const deliveryNotes = order?.notes?.trim() || null;
  const shouldShowManualGuidance =
    order?.orderType !== "PICKUP" && !hasDeliveryCoordinates;
  const manualGuidanceDescription = isGiftOrder
    ? "This gift delivery does not include map coordinates. Use the contact details provided to coordinate the drop-off."
    : "This delivery does not include map coordinates. Coordinate directly with your driver using the address and notes provided.";

  if (loading) {
    return (
      <View style={styles.fullScreenContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={48} color={PrimaryColor} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.fullScreenContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color="#E74C3C" />
          <Text style={styles.errorText}>{error || "Order not found"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchOrderDetails()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullScreenContainer}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Full Screen Map Background */}
      {order.orderType !== "PICKUP" && deliveryLocation ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={styles.fullScreenMap}
          initialRegion={{
            latitude: deliveryLocation.latitude,
            longitude: deliveryLocation.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          zoomEnabled={true}
          scrollEnabled={true}
        >
          {/* Driver Marker */}
          {driverLocation ? (
            <Marker
              coordinate={{
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
              }}
              title="Your Driver"
            >
              <View style={styles.driverMarker}>
                <Ionicons name="car" size={24} color="#fff" />
              </View>
            </Marker>
          ) : null}

          {/* Delivery Location Marker */}
          <Marker
            coordinate={{
              latitude: deliveryLocation.latitude,
              longitude: deliveryLocation.longitude,
            }}
            title="Delivery Address"
          >
            <View style={styles.deliveryMarker}>
              <Ionicons name="home" size={20} color="#fff" />
            </View>
          </Marker>

          {/* Route Line following roads */}
          {routeCoordinates.length > 0 ? (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={5}
              strokeColor={PrimaryColor}
              lineCap="round"
              lineJoin="round"
            />
          ) : null}
        </MapView>
      ) : (
        <View style={styles.noMapBackground}>
          <Ionicons name="location-outline" size={80} color="#E5E7EB" />
        </View>
      )}

      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>

      {/* Bottom Sheet with Details */}
      <View style={styles.bottomSheet}>
        <View style={styles.dragHandle} />

        <ScrollView
          contentContainerStyle={styles.bottomSheetContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[PrimaryColor]}
              tintColor={PrimaryColor}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Status & Order Number Row */}
          <View style={styles.topRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColors[order.status] },
              ]}
            >
              <Ionicons
                name={statusIcons[order.status] as any}
                size={18}
                color="#fff"
              />
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
            <Text style={styles.orderNumber}>
              #{order.id.slice(-8).toUpperCase()}
            </Text>
          </View>

          <View style={styles.timelineCard}>
            <StatusTimeline status={order.status} />
          </View>

          {/* ETA & Distance (when driver is dispatched) */}
          {order.orderType !== "PICKUP" &&
          driverLocation &&
          deliveryLocation ? (
            <View style={styles.etaCard}>
              <View style={styles.etaItem}>
                <Ionicons name="time-outline" size={20} color={PrimaryColor} />
                <View>
                  <Text style={styles.etaLabel}>Estimated Time</Text>
                  <Text style={styles.etaValue}>{calculateETA()} min</Text>
                </View>
              </View>
              <View style={styles.etaDivider} />
              <View style={styles.etaItem}>
                <Ionicons
                  name="navigate-outline"
                  size={20}
                  color={PrimaryColor}
                />
                <View>
                  <Text style={styles.etaLabel}>Distance</Text>
                  <Text style={styles.etaValue}>{calculateDistance()} km</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Driver Info Card - Compact */}
          {order.orderType !== "PICKUP" &&
          (order.status === "DISPATCHED" || order.status === "DELIVERED") &&
          order.driverName ? (
            <View style={styles.driverCard}>
              <View style={styles.driverInfo}>
                {order.driverImage ? (
                  <Image
                    source={{ uri: order.driverImage }}
                    style={styles.driverAvatar}
                  />
                ) : (
                  <View style={styles.driverAvatarPlaceholder}>
                    <Ionicons name="person" size={24} color={PrimaryColor} />
                  </View>
                )}
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{order.driverName}</Text>
                  <View style={styles.driverStatusRow}>
                    <View style={styles.onlineIndicator} />
                    <Text style={styles.driverLabel}>On the way</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={handleCallDriver}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Delivery Address - Compact */}
          {order.orderType !== "PICKUP" && order.address ? (
            <View style={styles.addressCard}>
              <Ionicons
                name="location"
                size={18}
                color={PrimaryColor}
                style={{ marginRight: 10 }}
              />
              <Text style={styles.addressText} numberOfLines={2}>
                {order.address}
              </Text>
            </View>
          ) : null}

          {shouldShowManualGuidance ? (
            <View style={styles.manualGuidanceCard}>
              <View style={styles.manualGuidanceHeader}>
                <Ionicons name="alert-circle" size={18} color="#B45309" />
                <Text style={styles.manualGuidanceTitle}>
                  Manual coordination required
                </Text>
              </View>
              <Text style={styles.manualGuidanceBody}>
                {manualGuidanceDescription}
              </Text>
              {deliveryNotes ? (
                <>
                  <View style={styles.manualGuidanceDivider} />
                  <Text style={styles.manualGuidanceSubtitle}>
                    Notes from order
                  </Text>
                  <Text style={styles.manualGuidanceNotes}>
                    {deliveryNotes}
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}

          {/* Quick Summary */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Items</Text>
              <Text style={styles.summaryValue}>{order.items.length}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>
                D{order.totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  fullScreenMap: {
    ...StyleSheet.absoluteFillObject,
  },
  noMapBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#E74C3C",
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: PrimaryColor,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PrimaryColor,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  deliveryMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  bottomSheetContent: {
    padding: 16,
    paddingBottom: 30,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#6B7280",
  },
  etaCard: {
    flexDirection: "row",
    backgroundColor: `${PrimaryColor}08`,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: "space-around",
  },
  etaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  etaDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },
  etaLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  etaValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  driverAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${PrimaryColor}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  driverStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  driverLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PrimaryColor,
    justifyContent: "center",
    alignItems: "center",
  },
  addressCard: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: "600",
  },
  addressText: {
    fontSize: 13,
    color: "#111827",
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },
  timelineCard: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  manualGuidanceCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FBBF24",
  },
  manualGuidanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  manualGuidanceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },
  manualGuidanceBody: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 18,
  },
  manualGuidanceDivider: {
    height: 1,
    backgroundColor: "#FCD34D",
    opacity: 0.5,
    marginVertical: 10,
  },
  manualGuidanceSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  manualGuidanceNotes: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 18,
  },
});
