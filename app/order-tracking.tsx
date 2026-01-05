/**
 * Modern Order Tracking Page
 * Professional delivery app style with:
 * - Full screen map with driver tracking
 * - Pull-up bottom sheet with order details
 * - Real-time driver location updates
 * - ETA and distance calculations
 * - Gift order support with zone-based tracking
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Linking,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { orderApi, Order } from "../lib/api";
import { PrimaryColor } from "@/constants/Colors";
import {
  on as socketOn,
  off as socketOff,
  emit,
} from "@/services/SocketService";
import MapView, { Marker, PROVIDER_DEFAULT, Polyline } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import { getTownById } from "@/constants/gambianTowns";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Snap points for bottom sheet
const SNAP_POINTS = {
  collapsed: SCREEN_HEIGHT * 0.28,
  half: SCREEN_HEIGHT * 0.48,
  expanded: SCREEN_HEIGHT * 0.78,
};

// Status configurations
const STATUS_CONFIG: {
  [key: string]: {
    color: string;
    icon: string;
    label: string;
    progress: number;
  };
} = {
  PENDING: {
    color: "#F59E0B",
    icon: "time",
    label: "Order Placed",
    progress: 0.15,
  },
  PROCESSING: {
    color: "#3B82F6",
    icon: "checkmark-circle",
    label: "Order Confirmed",
    progress: 0.3,
  },
  ACCEPTED: {
    color: "#3B82F6",
    icon: "checkmark-circle",
    label: "Order Confirmed",
    progress: 0.3,
  },
  PREPARING: {
    color: "#8B5CF6",
    icon: "restaurant",
    label: "Preparing",
    progress: 0.5,
  },
  READY: {
    color: "#10B981",
    icon: "checkmark-done-circle",
    label: "Ready for Pickup",
    progress: 0.7,
  },
  DISPATCHED: {
    color: "#06B6D4",
    icon: "bicycle",
    label: "On the Way",
    progress: 0.85,
  },
  DELIVERED: {
    color: "#22C55E",
    icon: "checkmark-circle",
    label: "Delivered",
    progress: 1,
  },
  CANCELLED: {
    color: "#EF4444",
    icon: "close-circle",
    label: "Cancelled",
    progress: 0,
  },
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const buildCurvedRoute = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
) => {
  const points: { latitude: number; longitude: number }[] = [];
  const numPoints = 25;

  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    const lat = start.latitude + (end.latitude - start.latitude) * fraction;
    const lng = start.longitude + (end.longitude - start.longitude) * fraction;
    const curveFactor = Math.sin(fraction * Math.PI) * 0.0008;

    points.push({
      latitude: lat + curveFactor,
      longitude: lng,
    });
  }

  return points;
};

export default function OrderTrackingPage() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [vendorLocation, setVendorLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  const mapRef = useRef<MapView>(null);
  const lastRouteRequestRef = useRef<any>(null);
  const isFetchingRouteRef = useRef(false);

  // Bottom sheet animation
  const sheetY = useRef(
    new Animated.Value(SCREEN_HEIGHT - SNAP_POINTS.half)
  ).current;
  const lastGestureY = useRef(0);
  const currentSnap = useRef<"collapsed" | "half" | "expanded">("half");

  // Calculate distance between two coordinates
  const calculateDistance = useCallback(() => {
    if (!driverLocation || !deliveryLocation) return null;

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
    return R * c;
  }, [driverLocation, deliveryLocation]);

  const calculateETA = useCallback(() => {
    const distance = calculateDistance();
    if (!distance) return null;
    const averageSpeed = 25; // km/h in city traffic
    const timeInMinutes = Math.round((distance / averageSpeed) * 60);
    return Math.max(timeInMinutes, 2);
  }, [calculateDistance]);

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

  // Fetch route using OSRM
  const fetchRoute = useCallback(
    async (
      origin: { latitude: number; longitude: number },
      destination: { latitude: number; longitude: number },
      force = false
    ) => {
      if (isFetchingRouteRef.current) return;

      const last = lastRouteRequestRef.current;
      const movedEnough =
        force ||
        !last ||
        distanceBetween(last.origin, origin) > 100 ||
        distanceBetween(last.destination, destination) > 50;

      if (!movedEnough) return;

      isFetchingRouteRef.current = true;

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
        const response = await fetch(url);

        if (!response.ok) throw new Error(`OSRM request failed`);

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
        throw new Error("No route data");
      } catch (error) {
        console.warn("Falling back to curved route:", error);
        setRouteCoordinates(buildCurvedRoute(origin, destination));
      } finally {
        isFetchingRouteRef.current = false;
      }
    },
    [distanceBetween]
  );

  // Fetch order details
  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await orderApi.getOrderById(orderId as string);
      setOrder(data);

      // Set delivery location - for gift orders, use town coordinates
      if (data.isGiftOrder && data.recipientTown) {
        const town = getTownById(data.recipientTown);
        if (town) {
          setDeliveryLocation({
            latitude: town.latitude,
            longitude: town.longitude,
          });
        }
      } else if (data.customerLatitude && data.customerLongitude) {
        setDeliveryLocation({
          latitude: data.customerLatitude,
          longitude: data.customerLongitude,
        });
      }

      // Set vendor location if available
      const vendor = data.restaurant || data.shop || data.pharmacy;
      const vendorAddress = vendor?.address;
      if (
        typeof vendorAddress === "object" &&
        vendorAddress &&
        "coordinates" in vendorAddress
      ) {
        const coords = (vendorAddress as { coordinates?: number[] })
          .coordinates;
        if (coords && coords.length === 2) {
          setVendorLocation({
            latitude: coords[1],
            longitude: coords[0],
          });
        }
      }

      // Set driver location if available
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
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // WebSocket for real-time updates
  useEffect(() => {
    if (!orderId || !order) return;

    const onOrderStatusUpdate = (data: any) => {
      if (data.orderId === orderId) {
        fetchOrderDetails();
      }
    };

    const onDriverLocationUpdate = (data: any) => {
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

  // Fetch route when locations change
  useEffect(() => {
    if (driverLocation && deliveryLocation) {
      fetchRoute(
        driverLocation,
        deliveryLocation,
        routeCoordinates.length === 0
      );
    }
  }, [driverLocation, deliveryLocation, fetchRoute, routeCoordinates.length]);

  // Center map on markers
  useEffect(() => {
    if (mapRef.current && deliveryLocation) {
      const markers = [deliveryLocation];
      if (driverLocation) markers.push(driverLocation);
      if (vendorLocation) markers.push(vendorLocation);

      setTimeout(() => {
        mapRef.current?.fitToCoordinates(markers, {
          edgePadding: {
            top: 100,
            right: 50,
            bottom: SNAP_POINTS.half + 50,
            left: 50,
          },
          animated: true,
        });
      }, 500);
    }
  }, [driverLocation, deliveryLocation, vendorLocation]);

  // Track order via socket
  useEffect(() => {
    if (orderId) {
      emit("customer:trackOrder", orderId);
      return () => {
        emit("customer:stopTracking", orderId);
      };
    }
  }, [orderId]);

  // Pan responder for bottom sheet
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        sheetY.stopAnimation((value) => {
          lastGestureY.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const newY = lastGestureY.current + gestureState.dy;
        const minY = SCREEN_HEIGHT - SNAP_POINTS.expanded;
        const maxY = SCREEN_HEIGHT - SNAP_POINTS.collapsed + 30;
        sheetY.setValue(Math.max(minY, Math.min(maxY, newY)));
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentY = lastGestureY.current + gestureState.dy;
        const velocity = gestureState.vy;

        // Determine snap point based on position and velocity
        let targetSnap: "collapsed" | "half" | "expanded" = "half";

        if (velocity > 0.5) {
          // Swiping down
          if (currentSnap.current === "expanded") targetSnap = "half";
          else targetSnap = "collapsed";
        } else if (velocity < -0.5) {
          // Swiping up
          if (currentSnap.current === "collapsed") targetSnap = "half";
          else targetSnap = "expanded";
        } else {
          // Find nearest snap
          const snapValues = [
            {
              name: "collapsed" as const,
              y: SCREEN_HEIGHT - SNAP_POINTS.collapsed,
            },
            { name: "half" as const, y: SCREEN_HEIGHT - SNAP_POINTS.half },
            {
              name: "expanded" as const,
              y: SCREEN_HEIGHT - SNAP_POINTS.expanded,
            },
          ];

          let minDist = Infinity;
          snapValues.forEach((snap) => {
            const dist = Math.abs(currentY - snap.y);
            if (dist < minDist) {
              minDist = dist;
              targetSnap = snap.name;
            }
          });
        }

        currentSnap.current = targetSnap;
        Animated.spring(sheetY, {
          toValue: SCREEN_HEIGHT - SNAP_POINTS[targetSnap],
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleCallDriver = () => {
    if (order?.driverPhone) {
      Linking.openURL(`tel:${order.driverPhone}`);
    }
  };

  const handleCallRecipient = () => {
    if (order?.recipientPhone) {
      Linking.openURL(`tel:${order.recipientPhone}`);
    }
  };

  const recenterMap = () => {
    if (!deliveryLocation || !mapRef.current) return;
    const markers = [deliveryLocation];
    if (driverLocation) markers.push(driverLocation);
    mapRef.current.fitToCoordinates(markers, {
      edgePadding: {
        top: 100,
        right: 50,
        bottom: SNAP_POINTS.half + 50,
        left: 50,
      },
      animated: true,
    });
  };

  // Derived values
  const statusConfig = STATUS_CONFIG[order?.status || "PENDING"];
  const distance = calculateDistance();
  const eta = calculateETA();
  const isGiftOrder = Boolean(order?.isGiftOrder);
  const hasDriver = Boolean(order?.driverName);
  const isDispatched = order?.status === "DISPATCHED";
  const isDelivered = order?.status === "DELIVERED";
  const isPickup = order?.orderType === "PICKUP";

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <ActivityIndicator size="large" color={PrimaryColor} />
        <Text style={styles.loadingText}>Loading your order...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButtonFloat}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error || "Order not found"}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchOrderDetails}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Full Screen Map */}
      {!isPickup && deliveryLocation ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: deliveryLocation.latitude,
            longitude: deliveryLocation.longitude,
            latitudeDelta: 0.025,
            longitudeDelta: 0.025,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {/* Vendor/Pickup Location */}
          {vendorLocation && (
            <Marker coordinate={vendorLocation} title="Restaurant">
              <View style={styles.vendorMarker}>
                <Ionicons name="storefront" size={16} color="#FFF" />
              </View>
            </Marker>
          )}

          {/* Driver Marker */}
          {driverLocation && isDispatched && (
            <Marker coordinate={driverLocation} title="Driver">
              <View style={styles.driverMarkerContainer}>
                <LinearGradient
                  colors={[PrimaryColor, "#FF8C00"]}
                  style={styles.driverMarker}
                >
                  <Ionicons name="bicycle" size={20} color="#FFF" />
                </LinearGradient>
                <View style={styles.driverMarkerPulse} />
              </View>
            </Marker>
          )}

          {/* Delivery Location */}
          <Marker coordinate={deliveryLocation} title="Delivery">
            <View style={styles.deliveryMarkerContainer}>
              <View style={styles.deliveryMarker}>
                <Ionicons name="location" size={20} color="#FFF" />
              </View>
              <View style={styles.deliveryMarkerShadow} />
            </View>
          </Marker>

          {/* Route Line */}
          {routeCoordinates.length > 0 && isDispatched && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={4}
              strokeColor={PrimaryColor}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>
      ) : (
        <View style={styles.noMapContainer}>
          <View style={styles.noMapIcon}>
            <Ionicons
              name={isPickup ? "storefront" : "location"}
              size={48}
              color="#D1D5DB"
            />
          </View>
          <Text style={styles.noMapText}>
            {isPickup ? "Pick up at restaurant" : "Map not available"}
          </Text>
        </View>
      )}

      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButtonFloat}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={22} color="#1F2937" />
      </TouchableOpacity>

      {/* Recenter Button */}
      {!isPickup && deliveryLocation && (
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={recenterMap}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={20} color="#1F2937" />
        </TouchableOpacity>
      )}

      {/* Bottom Sheet */}
      <Animated.View
        style={[styles.bottomSheet, { transform: [{ translateY: sheetY }] }]}
      >
        {/* Handle */}
        <View {...panResponder.panHandlers} style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
          bounces={false}
        >
          {/* Status Header */}
          <View style={styles.statusHeader}>
            <View style={styles.statusLeft}>
              <View
                style={[
                  styles.statusIconContainer,
                  { backgroundColor: statusConfig.color + "15" },
                ]}
              >
                <Ionicons
                  name={statusConfig.icon as any}
                  size={24}
                  color={statusConfig.color}
                />
              </View>
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>{statusConfig.label}</Text>
                {eta && isDispatched && (
                  <Text style={styles.etaText}>Arriving in ~{eta} min</Text>
                )}
                {!isDispatched && !isDelivered && (
                  <Text style={styles.orderIdText}>
                    Order #{order.id.slice(-6).toUpperCase()}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.statusRight}>
              {distance && isDispatched && (
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceText}>
                    {distance.toFixed(1)} km
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${statusConfig.progress * 100}%`,
                    backgroundColor: statusConfig.color,
                  },
                ]}
              />
            </View>
          </View>

          {/* Driver Card */}
          {hasDriver && (isDispatched || isDelivered) && (
            <View style={styles.driverCard}>
              <View style={styles.driverInfo}>
                {order.driverImage ? (
                  <Image
                    source={{ uri: order.driverImage }}
                    style={styles.driverAvatar}
                  />
                ) : (
                  <View style={styles.driverAvatarPlaceholder}>
                    <Ionicons name="person" size={24} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{order.driverName}</Text>
                  <Text style={styles.driverRole}>Your Driver</Text>
                </View>
              </View>
              <View style={styles.driverActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleCallDriver}
                >
                  <Ionicons name="call" size={20} color={PrimaryColor} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Gift Order Recipient */}
          {isGiftOrder && order.recipientName && (
            <View style={styles.recipientCard}>
              <View style={styles.recipientBadge}>
                <Text style={styles.recipientBadgeText}>🎁 Gift Order</Text>
              </View>
              <View style={styles.recipientInfo}>
                <View style={styles.recipientDetails}>
                  <Text style={styles.recipientLabel}>Delivering to</Text>
                  <Text style={styles.recipientName}>
                    {order.recipientName}
                  </Text>
                  {order.recipientAddress && (
                    <Text style={styles.recipientAddress} numberOfLines={2}>
                      {order.recipientAddress}
                    </Text>
                  )}
                </View>
                {order.recipientPhone && (
                  <TouchableOpacity
                    style={styles.recipientCallButton}
                    onPress={handleCallRecipient}
                  >
                    <Ionicons
                      name="call-outline"
                      size={18}
                      color={PrimaryColor}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Delivery Address (non-gift orders) */}
          {!isGiftOrder && !isPickup && order.address && (
            <View style={styles.addressCard}>
              <View style={styles.addressIcon}>
                <Ionicons name="location" size={18} color={PrimaryColor} />
              </View>
              <Text style={styles.addressText} numberOfLines={2}>
                {order.address}
              </Text>
            </View>
          )}

          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {order.items.length} items
              </Text>
              <Text style={styles.summaryValue}>
                D{order.totalAmount.toFixed(2)}
              </Text>
            </View>
            {order.notes && (
              <View style={styles.notesContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={14}
                  color="#6B7280"
                />
                <Text style={styles.notesText} numberOfLines={2}>
                  {order.notes}
                </Text>
              </View>
            )}
          </View>

          {/* Vendor Info */}
          <View style={styles.vendorCard}>
            <View style={styles.vendorIcon}>
              <Ionicons name="storefront-outline" size={18} color="#6B7280" />
            </View>
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorName}>
                {order.restaurant?.shopName ||
                  order.shop?.shopName ||
                  order.pharmacy?.shopName ||
                  "Vendor"}
              </Text>
              <Text style={styles.vendorAddress} numberOfLines={1}>
                {typeof (
                  order.restaurant?.address ||
                  order.shop?.address ||
                  order.pharmacy?.address
                ) === "string"
                  ? order.restaurant?.address ||
                    order.shop?.address ||
                    order.pharmacy?.address
                  : "See order details"}
              </Text>
            </View>
          </View>

          {/* No GPS Warning */}
          {!isPickup && !deliveryLocation && (
            <View style={styles.warningCard}>
              <Ionicons name="alert-circle" size={20} color="#B45309" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>
                  Manual coordination required
                </Text>
                <Text style={styles.warningText}>
                  {isGiftOrder
                    ? "Coordinate with the driver using the contact details provided."
                    : "No GPS coordinates available. Contact your driver directly."}
                </Text>
              </View>
            </View>
          )}

          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: PrimaryColor,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  backButtonFloat: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 44,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  recenterButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 44,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  noMapContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingBottom: SNAP_POINTS.half,
  },
  noMapIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  noMapText: {
    fontSize: 16,
    color: "#9CA3AF",
  },

  // Map markers
  vendorMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  driverMarkerContainer: {
    alignItems: "center",
  },
  driverMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  driverMarkerPulse: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PrimaryColor + "30",
  },
  deliveryMarkerContainer: {
    alignItems: "center",
  },
  deliveryMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  deliveryMarkerShadow: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.2)",
    marginTop: 4,
  },

  // Bottom Sheet
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  sheetContent: {
    paddingHorizontal: 20,
  },

  // Status Header
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  etaText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  orderIdText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
  },
  statusRight: {},
  distanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },

  // Progress Bar
  progressContainer: {
    marginBottom: 20,
  },
  progressBackground: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },

  // Driver Card
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  driverDetails: {},
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  driverRole: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  driverActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PrimaryColor + "15",
    justifyContent: "center",
    alignItems: "center",
  },

  // Recipient Card
  recipientCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FDBA7420",
  },
  recipientBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#FDBA74",
    borderRadius: 12,
    marginBottom: 12,
  },
  recipientBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7C2D12",
  },
  recipientInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  recipientDetails: {
    flex: 1,
  },
  recipientLabel: {
    fontSize: 12,
    color: "#9A3412",
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7C2D12",
  },
  recipientAddress: {
    fontSize: 13,
    color: "#9A3412",
    marginTop: 4,
  },
  recipientCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FED7AA",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },

  // Address Card
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  addressIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PrimaryColor + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 15,
    color: "#4B5563",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 8,
    lineHeight: 18,
  },

  // Vendor Card
  vendorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  vendorIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  vendorAddress: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  // Warning Card
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
  },
  warningText: {
    fontSize: 13,
    color: "#B45309",
    marginTop: 4,
    lineHeight: 18,
  },
});
