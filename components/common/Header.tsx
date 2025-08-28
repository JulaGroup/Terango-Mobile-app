import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  Dimensions,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Cart from "./Cart";
import LocationModal from "./LocationModalNew";
import { useAddress } from "@/context/AddressContext";
import { Address } from "@/services/AddressService";

const { width } = Dimensions.get("window");

const Header = () => {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const { selectedAddress, setSelectedAddress } = useAddress();
  const handleLocationPress = () => {
    console.log("Location arrow pressed, showing modal");
    setShowLocationModal(true);
  };

  const handleSelectAddress = (address: Address) => {
    setSelectedAddress(address);
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

          <View
            style={{ marginLeft: 8, display: "flex", flexDirection: "column" }}
          >
            <Pressable
              onPress={handleLocationPress}
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
            </Pressable>

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
          <TouchableOpacity
            style={{
              backgroundColor: "#F4F4F4CE",
              padding: 8,
              borderRadius: 8,
            }}
            onPress={() => setShowNotificationModal(true)}
          >
            <Ionicons name="notifications-outline" size={22} color="black" />
          </TouchableOpacity>
        </View>
      </View>
      {/* Location Modal */}
      <LocationModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelectAddress={handleSelectAddress}
        currentAddress={getDisplayAddress()}
      />

      {/* Notification Modal */}
      {showNotificationModal && (
        <View
          style={{
            position: "absolute",
            top: 80,
            right: 30,
            width: 240,
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            alignItems: "center",
            zIndex: 999,
          }}
        >
          {/* Arrow pointer to bell icon */}
          <View
            style={{
              position: "absolute",
              top: -12,
              right: 24,
              width: 0,
              height: 0,
              borderLeftWidth: 10,
              borderRightWidth: 10,
              borderBottomWidth: 12,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderBottomColor: "#fff",
            }}
          />
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            Notifications
          </Text>
          <Text style={{ fontSize: 14, color: "#888" }}>
            No notifications yet
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 18,
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
      )}
    </>
  );
};

export default Header;
