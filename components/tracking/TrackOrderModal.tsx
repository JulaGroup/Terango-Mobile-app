import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Linking,
  Alert,
  Image,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PrimaryColor } from "@/constants/Colors";
import { io, Socket } from "socket.io-client";

const { width, height } = Dimensions.get("window");

interface TrackOrderModalProps {
  visible: boolean;
  onClose: () => void;
  order: {
    id: string;
    status: string;
    driver?: {
      id: string;
      name: string;
      phone: string;
      vehicleNumber?: string;
      vehicleType?: string;
      profileImageUrl?: string;
      currentLocation?: {
        latitude: number;
        longitude: number;
      };
    };
    deliveryAddress?: {
      address: string;
      latitude: number;
      longitude: number;
    };
  };
}

export default function TrackOrderModal({
  visible,
  onClose,
  order,
}: TrackOrderModalProps) {
  const [region, setRegion] = useState({
    latitude: order.deliveryAddress?.latitude || 13.4549,
    longitude: order.deliveryAddress?.longitude || -16.579,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const mapRef = useRef<MapView>(null);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const socketRef = useRef<Socket | null>(null);

  // Real-time driver location tracking
  const [driverLocation, setDriverLocation] = useState(
    order.driver?.currentLocation || {
      latitude: 13.4549,
      longitude: -16.579,
    },
  );

  // WebSocket connection for real-time tracking
  useEffect(() => {
    if (visible && order.id) {
      // Connect to your backend WebSocket
      // Replace 'YOUR_BACKEND_URL' with your actual backend URL
      const SOCKET_URL =
        process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      // Join room for this specific order
      socketRef.current.emit("customer:trackOrder", order.id);

      // Listen for real-time driver location updates
      socketRef.current.on(
        "driver:locationUpdated",
        (data: { latitude: number; longitude: number; timestamp: number }) => {
          console.log("📍 Driver location updated:", data);

          // Smooth update to driver location
          setDriverLocation({
            latitude: data.latitude,
            longitude: data.longitude,
          });

          // Recenter map if driver moved significantly
          if (mapRef.current) {
            const distance = calculateDistanceRaw(
              driverLocation.latitude,
              driverLocation.longitude,
              data.latitude,
              data.longitude,
            );

            // If driver moved more than 100m, recenter map
            if (distance > 0.1) {
              setTimeout(() => centerMap(), 300);
            }
          }
        },
      );

      // Listen for order status updates
      socketRef.current.on(
        "order:statusUpdated",
        (data: { orderId: string; status: string; timestamp: number }) => {
          console.log("🔔 Order status updated:", data.status);
          // You can trigger a refresh or show notification here
        },
      );

      // Connection events
      socketRef.current.on("connect", () => {
        console.log("✅ WebSocket connected for order:", order.id);
      });

      socketRef.current.on("disconnect", () => {
        console.log("❌ WebSocket disconnected");
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error.message);
      });

      // Cleanup on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.emit("customer:stopTracking", order.id);
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }
  }, [visible, order.id]);

  // Helper function for distance calculation (raw km value)
  const calculateDistanceRaw = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // Earth radius in km

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Animate modal entrance
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Start pulse animation
      startPulseAnimation();
    } else {
      slideAnim.setValue(height);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  // Calculate distance and ETA
  const calculateDistance = () => {
    if (!order.deliveryAddress || !driverLocation) return "-- km";

    const R = 6371; // Earth's radius in km
    const dLat = toRad(
      order.deliveryAddress.latitude - driverLocation.latitude,
    );
    const dLon = toRad(
      order.deliveryAddress.longitude - driverLocation.longitude,
    );
    const lat1 = toRad(driverLocation.latitude);
    const lat2 = toRad(order.deliveryAddress.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance.toFixed(1) + " km";
  };

  const toRad = (value: number) => (value * Math.PI) / 180;

  const calculateETA = () => {
    const distance = parseFloat(calculateDistance());
    const averageSpeed = 30; // km/h in city
    const timeInHours = distance / averageSpeed;
    const timeInMinutes = Math.round(timeInHours * 60);
    return timeInMinutes + " min";
  };

  // Call driver
  const handleCallDriver = () => {
    if (!order.driver?.phone) {
      Alert.alert("Error", "Driver phone number not available");
      return;
    }

    const phoneNumber = order.driver.phone;
    const phoneUrl =
      Platform.OS === "ios" ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;

    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          Alert.alert("Error", "Phone calling is not supported on this device");
        }
      })
      .catch((err) => {
        console.error("Error opening phone dialer:", err);
        Alert.alert("Error", "Could not open phone dialer");
      });
  };

  // Center map on both locations
  const centerMap = () => {
    if (mapRef.current && order.deliveryAddress && driverLocation) {
      mapRef.current.fitToCoordinates(
        [
          {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
          },
          {
            latitude: order.deliveryAddress.latitude,
            longitude: order.deliveryAddress.longitude,
          },
        ],
        {
          edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
          animated: true,
        },
      );
    }
  };

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        centerMap();
      }, 500);
    }
  }, [visible]);

  // Get status color
  const getStatusColor = () => {
    switch (order.status?.toUpperCase()) {
      case "PREPARING":
        return "#FF9800";
      case "READY":
        return "#2196F3";
      case "DISPATCHED":
      case "ON_THE_WAY":
        return PrimaryColor;
      case "DELIVERED":
        return "#4CAF50";
      default:
        return "#9E9E9E";
    }
  };

  const getStatusText = () => {
    switch (order.status?.toUpperCase()) {
      case "PREPARING":
        return "Preparing your order";
      case "READY":
        return "Ready for pickup";
      case "DISPATCHED":
      case "ON_THE_WAY":
        return "Driver is on the way";
      case "DELIVERED":
        return "Order delivered";
      default:
        return order.status;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Track Order</Text>
              <Text style={styles.headerSubtitle}>
                Order TG{order.id.slice(-4).toUpperCase()}
              </Text>
            </View>

            <TouchableOpacity style={styles.centerButton} onPress={centerMap}>
              <Ionicons name="locate" size={24} color={PrimaryColor} />
            </TouchableOpacity>
          </View>

          {/* Map */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              initialRegion={region}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass={true}
              rotateEnabled={true}
              pitchEnabled={false}
            >
              {/* Customer Location Marker */}
              {order.deliveryAddress && (
                <Marker
                  coordinate={{
                    latitude: order.deliveryAddress.latitude,
                    longitude: order.deliveryAddress.longitude,
                  }}
                  title="Delivery Location"
                  description={order.deliveryAddress.address}
                >
                  <View style={styles.customerMarker}>
                    <View style={styles.customerMarkerInner}>
                      <Ionicons name="home" size={20} color="#fff" />
                    </View>
                    <Animated.View
                      style={[
                        styles.markerPulse,
                        {
                          backgroundColor: "#4CAF50",
                          transform: [{ scale: pulseAnim }],
                        },
                      ]}
                    />
                  </View>
                </Marker>
              )}

              {/* Driver Location Marker */}
              {order.driver && driverLocation && (
                <Marker
                  coordinate={driverLocation}
                  title={order.driver.name}
                  description="Your driver"
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.driverMarker}>
                    <View style={styles.driverMarkerInner}>
                      <Ionicons name="car-sport" size={24} color="#fff" />
                    </View>
                    <Animated.View
                      style={[
                        styles.markerPulse,
                        {
                          backgroundColor: PrimaryColor,
                          transform: [{ scale: pulseAnim }],
                        },
                      ]}
                    />
                  </View>
                </Marker>
              )}

              {/* Route Line */}
              {order.deliveryAddress && driverLocation && (
                <Polyline
                  coordinates={[
                    driverLocation,
                    {
                      latitude: order.deliveryAddress.latitude,
                      longitude: order.deliveryAddress.longitude,
                    },
                  ]}
                  strokeColor={PrimaryColor}
                  strokeWidth={4}
                  lineDashPattern={[1, 10]}
                />
              )}
            </MapView>
          </View>

          {/* Order Info Card */}
          <View style={styles.infoCard}>
            {/* Status Bar */}
            <View
              style={[styles.statusBar, { backgroundColor: getStatusColor() }]}
            >
              <Ionicons
                name={
                  order.status === "DELIVERED"
                    ? "checkmark-circle"
                    : "time-outline"
                }
                size={18}
                color="#fff"
              />
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>

            {/* Enhanced Driver Profile Display */}
            {order.driver && (
              <View style={styles.driverInfo}>
                {/* Driver Photo */}
                <View style={styles.driverAvatar}>
                  {order.driver.profileImageUrl ? (
                    <Image
                      source={{ uri: order.driver.profileImageUrl }}
                      style={styles.driverPhoto}
                    />
                  ) : (
                    <View style={styles.driverInitials}>
                      <Text style={styles.initialsText}>
                        {order.driver.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {/* Vehicle Type Badge */}
                  {order.driver.vehicleType && (
                    <View style={styles.vehicleBadge}>
                      <Text style={styles.vehicleBadgeText}>
                        {order.driver.vehicleType === "BIKE" && "🏍️"}
                        {order.driver.vehicleType === "KEKE_CARGO" && "🛺"}
                        {order.driver.vehicleType === "CAR" && "🚗"}
                        {order.driver.vehicleType === "VAN" && "🚐"}
                        {order.driver.vehicleType === "LORRY" && "🚛"}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{order.driver.name}</Text>
                  {order.driver.vehicleNumber && (
                    <Text style={styles.driverVehicle}>
                      {order.driver.vehicleType === "BIKE" && "🏍️"}
                      {order.driver.vehicleType === "KEKE_CARGO" && "🛺"}
                      {order.driver.vehicleType === "CAR" && "🚗"}
                      {order.driver.vehicleType === "VAN" && "🚐"}
                      {order.driver.vehicleType === "LORRY" && "🚛"}
                      {!order.driver.vehicleType && "🚗"}{" "}
                      {order.driver.vehicleNumber}
                    </Text>
                  )}
                  {order.driver.vehicleType && (
                    <Text style={styles.vehicleTypeText}>
                      {order.driver.vehicleType.replace("_", " ").toLowerCase()}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.callButton}
                  onPress={handleCallDriver}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={["#4CAF50", "#45a049"]}
                    style={styles.callButtonGradient}
                  >
                    <Ionicons name="call" size={20} color="#fff" />
                    <Text style={styles.callButtonText}>Call</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Delivery Info */}
            <View style={styles.deliveryInfo}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={PrimaryColor}
                  />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Distance</Text>
                    <Text style={styles.infoValue}>{calculateDistance()}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={PrimaryColor}
                  />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>ETA</Text>
                    <Text style={styles.infoValue}>{calculateETA()}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Delivery Address */}
            {order.deliveryAddress && (
              <View style={styles.addressContainer}>
                <Ionicons name="pin" size={20} color="#666" />
                <Text style={styles.addressText}>
                  {order.deliveryAddress.address}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    marginTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  centerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  mapContainer: {
    flex: 1,
    backgroundColor: "#E0E0E0",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  customerMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  customerMarkerInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  driverMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  driverMarkerInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PrimaryColor,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerPulse: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    opacity: 0.2,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  statusText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF4ED",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: PrimaryColor,
    position: "relative",
  },
  driverPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  driverInitials: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PrimaryColor,
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  vehicleBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  vehicleBadgeText: {
    fontSize: 10,
  },
  driverDetails: {
    flex: 1,
    marginLeft: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  driverVehicle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  vehicleTypeText: {
    fontSize: 12,
    color: "#999",
    textTransform: "capitalize",
  },
  callButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  callButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  callButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  deliveryInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    alignItems: "flex-start",
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
});
