import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Cart from "./Cart";
import LocationModal from "./LocationModal";
import { AddressContext } from "@/context/AddressContext";
import { Address } from "@/services/AddressService";
import { useNotifications } from "@/context/NotificationContext";

const { width } = Dimensions.get("window");

const Header = () => {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const addressCtx = React.useContext(AddressContext);
  const selectedAddress = addressCtx?.selectedAddress || null;
  const setSelectedAddress = addressCtx?.setSelectedAddress || (() => {});
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  // subtle "pop" animation when a new notification arrives
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevUnreadRef = useRef(unreadCount);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.18,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, scaleAnim]);

  const handleLocationPress = () => {
    console.log("Location arrow pressed, showing modal");
    setShowLocationModal(true);
  };

  const handleSelectAddress = (address: Address) => {
    try {
      setSelectedAddress(address);
    } catch (e) {
      console.warn("AddressContext not available, cannot set address", e);
    }
  };

  // Truncate address for display
  const getDisplayAddress = () => {
    if (!selectedAddress) return "Select Location";

    if (selectedAddress.id === "current") {
      return selectedAddress.addressLine || "Current Location";
    }

    const addressParts = [
      selectedAddress.addressLine,
      selectedAddress.city,
    ].filter(Boolean);

    const fullAddress = addressParts.join(", ");
    return fullAddress.length > 25
      ? `${fullAddress.substring(0, 25)}...`
      : fullAddress;
  };

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          paddingBottom: 12,
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 10,
          paddingTop: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: "#FFF5EEFF",
              padding: 6,
              borderRadius: 8,
            }}
            onPress={handleLocationPress}
            activeOpacity={0.7}
          >
            <Ionicons name="location-sharp" size={20} color="#ff6b00" />
          </TouchableOpacity>

          <View style={{ marginLeft: 8, flexDirection: "column" }}>
            <TouchableOpacity
              onPress={handleLocationPress}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: "#929292FF",
                  marginRight: 8,
                }}
              >
                {selectedAddress?.id === "current"
                  ? "Current Location"
                  : "Deliver to"}
              </Text>
              <Ionicons
                name="chevron-down-outline"
                size={19}
                color="#262626FF"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLocationPress} activeOpacity={0.7}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#262626FF",
                  maxWidth: width * 0.5,
                }}
              >
                {getDisplayAddress()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: "row" }}>
          <Cart />
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={{
                backgroundColor: "#F4F4F4CE",
                padding: 8,
                borderRadius: 8,
                position: "relative",
              }}
              onPress={() => setShowNotificationModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={22} color="black" />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    backgroundColor: "#ff6b00",
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
      {/* Location Modal */}
      {showLocationModal && (
        <LocationModal
          visible={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onSelectAddress={handleSelectAddress}
          currentAddress={getDisplayAddress()}
        />
      )}

      {/* Notification Modal */}
      {showNotificationModal && (
        <View
          style={{
            position: "absolute",
            top: 80,
            right: 30,
            width: 320,
            maxHeight: 400,
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 0,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            zIndex: 999,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: "#f0f0f0",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600" }}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={() => {
                  markAllAsRead();
                }}
                style={{
                  backgroundColor: "#ff6b00",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                >
                  Mark All Read
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Notifications List */}
          <ScrollView style={{ maxHeight: 280 }}>
            {notifications.length === 0 ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: "#888" }}>
                  No notifications yet
                </Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  onPress={() => {
                    if (!notification.opened) {
                      markAsRead(notification.id);
                    }
                  }}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "#f5f5f5",
                    backgroundColor: notification.opened ? "#fff" : "#f9f9f9",
                  }}
                >
                  <View
                    style={{ flexDirection: "row", alignItems: "flex-start" }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: notification.opened
                          ? "transparent"
                          : "#ff6b00",
                        marginTop: 6,
                        marginRight: 12,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#333",
                          marginBottom: 4,
                        }}
                      >
                        {notification.title}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#666",
                          lineHeight: 18,
                        }}
                      >
                        {notification.body}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#999",
                          marginTop: 6,
                        }}
                      >
                        {notification.sentAt
                          ? new Date(notification.sentAt).toLocaleDateString()
                          : ""}{" "}
                        at{" "}
                        {notification.sentAt
                          ? new Date(notification.sentAt).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : ""}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: "#f0f0f0",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: "#ff6b00",
                paddingHorizontal: 24,
                paddingVertical: 10,
                borderRadius: 8,
              }}
              onPress={() => setShowNotificationModal(false)}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
};

export default Header;
