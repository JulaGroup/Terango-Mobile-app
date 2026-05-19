import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AddressContext } from "@/context/AddressContext";
import { Address } from "@/services/AddressService";
import { useNotifications } from "@/context/NotificationContext";
import LocationModal from "@/components/common/LocationModal";
import Cart from "@/components/common/Cart";
const { width } = Dimensions.get("window");

// ─── Time-aware greeting ──────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const HubHeader = () => {
  const greeting = getGreeting();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const router = useRouter();
  const addressCtx = useContext(AddressContext);
  const selectedAddress = addressCtx?.selectedAddress || null;
  const setSelectedAddress = addressCtx?.setSelectedAddress || (() => {});
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

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

  const getDisplayAddress = () => {
    if (!selectedAddress) return "Select Location";
    if (selectedAddress.id === "current")
      return selectedAddress.addressLine || "Current Location";
    const parts = [selectedAddress.addressLine, selectedAddress.city].filter(
      Boolean,
    );
    const full = parts.join(", ");
    return full.length > 28 ? `${full.substring(0, 28)}...` : full;
  };

  const handleSelectAddress = (address: Address) => {
    try {
      setSelectedAddress(address);
    } catch (_e) {}
  };

  return (
    <>
      {/* ── Orange Header Bar ────────────────────────────── */}
      <View
        style={{
          backgroundColor: "#ff6b00",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 14,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Location */}
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            onPress={() => setShowLocationModal(true)}
            activeOpacity={0.8}
          >
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.25)",
                borderRadius: 8,
                padding: 5,
                marginRight: 8,
              }}
            >
              <Ionicons name="location-sharp" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: "400",
                }}
              >
                Your location
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#fff",
                    maxWidth: width * 0.48,
                  }}
                  numberOfLines={1}
                >
                  {getDisplayAddress()}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color="#fff"
                  style={{ marginLeft: 4 }}
                />
              </View>
            </View>
          </TouchableOpacity>

          {/* Right Icons: Bell + Profile */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(255,255,255,0.22)",
                  padding: 8,
                  borderRadius: 10,
                  position: "relative",
                }}
                onPress={() => setShowNotifPanel(!showNotifPanel)}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications-outline" size={21} color="#fff" />
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      backgroundColor: "#fff",
                      borderRadius: 8,
                      minWidth: 16,
                      height: 16,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingHorizontal: 3,
                    }}
                  >
                    <Text
                      style={{
                        color: "#ff6b00",
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* <TouchableOpacity
              style={{
                backgroundColor: "rgba(255,255,255,0.22)",
                padding: 8,
                borderRadius: 10,
              }}
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={21} color="#fff" />
            </TouchableOpacity> */}
            <Cart />
          </View>
        </View>

        {/* ── Greeting row ──────────────────────────────── */}
        <View style={{ marginTop: 10, marginBottom: 2 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "900",
              color: "#fff",
              letterSpacing: -0.4,
            }}
          >
            {greeting} 👋
          </Text>
        </View>
      </View>

      {/* ── Notification Panel ──────────────────────────── */}
      {showNotifPanel && (
        <View
          style={{
            position: "absolute",
            top: 75,
            right: 12,
            width: Math.min(320, width - 24),
            maxHeight: 380,
            backgroundColor: "#fff",
            borderRadius: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.18,
            shadowRadius: 14,
            elevation: 10,
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#f0f0f0",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1a1a1a" }}>
              Notifications
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={() => markAllAsRead()}
                  style={{
                    backgroundColor: "#ff6b00",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}
                  >
                    Mark All Read
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowNotifPanel(false)}>
                <Ionicons name="close" size={20} color="#888" />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={{ maxHeight: 300 }}>
            {notifications.length === 0 ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Ionicons
                  name="notifications-off-outline"
                  size={32}
                  color="#ddd"
                />
                <Text style={{ fontSize: 13, color: "#aaa", marginTop: 8 }}>
                  No notifications yet
                </Text>
              </View>
            ) : (
              notifications.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  onPress={() => {
                    if (!n.opened) markAsRead(n.id);
                  }}
                  style={{
                    padding: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: "#f5f5f5",
                    backgroundColor: n.opened ? "#fff" : "#fff8f3",
                    flexDirection: "row",
                    alignItems: "flex-start",
                  }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: n.opened ? "transparent" : "#ff6b00",
                      marginTop: 6,
                      marginRight: 10,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#1a1a1a",
                      }}
                    >
                      {n.title}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: "#666", marginTop: 2 }}
                      numberOfLines={2}
                    >
                      {n.body}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <LocationModal
          visible={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onSelectAddress={handleSelectAddress}
          currentAddress={getDisplayAddress()}
        />
      )}
    </>
  );
};

export default HubHeader;
