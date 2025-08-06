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
              padding: 8,
              borderRadius: 8,
            }}
            onPress={handleLocationPress}
            activeOpacity={0.7}
          >
            <Ionicons name="location-sharp" size={30} color="#ff6b00" />
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
            onPress={() => console.log("Notifications")}
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
    </>
  );
};

export default Header;
