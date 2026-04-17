import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GambianTown } from "@/constants/gambianTowns";
import { LocationPickerModal } from "./LocationPickerModal";
import { UserCacheManager } from "@/utils/userCache";

const PRIMARY = "#FF6B00";

interface UnifiedLocationSectionProps {
  pickupTown: GambianTown | null;
  dropoffTown: GambianTown | null;
  pickupAddressDisplay?: string;
  dropoffAddressDisplay?: string;
  useSavedPickupAddress?: boolean;
  hidePickupSection?: boolean; // New prop to hide pickup section entirely
  onOpenPickupAddressModal?: () => void;
  onPickupSelect: (town: GambianTown) => void;
  onDropoffSelect: (town: GambianTown) => void;
  onPickupGPS?: (lat: number, lon: number, address: string) => void;
  onDropoffGPS?: (lat: number, lon: number, address: string) => void;
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  onSenderNameChange?: (text: string) => void;
  onSenderPhoneChange?: (text: string) => void;
  onReceiverNameChange?: (text: string) => void;
  onReceiverPhoneChange?: (text: string) => void;
  onSenderDataLoaded?: (name: string, phone: string) => void;
}

export const UnifiedLocationSection: React.FC<UnifiedLocationSectionProps> = ({
  pickupTown,
  dropoffTown,
  pickupAddressDisplay,
  dropoffAddressDisplay,
  useSavedPickupAddress = false,
  hidePickupSection = false, // New prop
  onOpenPickupAddressModal,
  onPickupSelect,
  onDropoffSelect,
  onPickupGPS,
  onDropoffGPS,
  senderName: propSenderName = "",
  senderPhone: propSenderPhone = "",
  receiverName = "",
  receiverPhone = "",
  onSenderNameChange,
  onSenderPhoneChange,
  onReceiverNameChange,
  onReceiverPhoneChange,
  onSenderDataLoaded,
}) => {
  const [swapAnimation] = useState(new Animated.Value(0));
  const [isSwapping, setIsSwapping] = useState(false);
  const [senderName, setSenderName] = useState(propSenderName);
  const [senderPhone, setSenderPhone] = useState(propSenderPhone);
  const [pickupModalVisible, setPickupModalVisible] = useState(false);
  const [dropoffModalVisible, setDropoffModalVisible] = useState(false);

  // Load sender details from user cache using same method as checkout
  useEffect(() => {
    const loadSenderData = async () => {
      try {
        const { cached } = await UserCacheManager.smartLoadUserData();
        if (cached) {
          const name = cached.fullName || "";
          const phone = cached.phone || "";
          setSenderName(name);
          setSenderPhone(phone);
          onSenderDataLoaded?.(name, phone);
          onSenderNameChange?.(name);
          onSenderPhoneChange?.(phone);
        }
      } catch (error) {
        console.log("Could not load sender data from cache:", error);
      }
    };

    loadSenderData();
  }, [onSenderDataLoaded, onSenderNameChange, onSenderPhoneChange]);

  const handleSwapLocations = () => {
    if (isSwapping) return;

    setIsSwapping(true);

    Animated.timing(swapAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      swapAnimation.setValue(0);
      setIsSwapping(false);
    });

    const tempPickup = pickupTown;
    const tempDropoff = dropoffTown;

    if (tempPickup) onDropoffSelect(tempPickup);
    if (tempDropoff) onPickupSelect(tempDropoff);

    if (
      onSenderNameChange &&
      onSenderPhoneChange &&
      onReceiverNameChange &&
      onReceiverPhoneChange
    ) {
      const tempSenderName = senderName;
      const tempSenderPhone = senderPhone;

      setSenderName(receiverName);
      setSenderPhone(receiverPhone);
      onSenderNameChange(receiverName);
      onSenderPhoneChange(receiverPhone);

      onReceiverNameChange(tempSenderName);
      onReceiverPhoneChange(tempSenderPhone);
    }
  };

  const rotateInterpolate = swapAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const pickupSelectedText =
    pickupAddressDisplay ||
    (pickupTown
      ? `${pickupTown.name}${pickupTown.area ? `, ${pickupTown.area}` : ""}`
      : "");
  const dropoffSelectedText =
    dropoffAddressDisplay || (dropoffTown ? dropoffTown.name : "");

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Delivery Details</Text>
        <Text style={styles.sectionSubtitle}>
          Where should we pick up and deliver?
        </Text>
      </View>

      {/* Location Container */}
      <View style={styles.locationContainer}>
        {/* Pickup Location - only show if not hidden */}
        {!hidePickupSection && (
          <View style={styles.locationRow}>
            <View style={styles.locationIndicator}>
              <View style={[styles.indicatorDot, styles.pickupDot]} />
              <View style={styles.indicatorLine} />
            </View>

            <View style={styles.locationContent}>
              <View style={styles.locationInputSection}>
                <Text style={styles.locationLabel}>Pickup from</Text>
                <TouchableOpacity
                  style={[
                    styles.locationButton,
                    pickupSelectedText && styles.locationButtonFilled,
                  ]}
                  onPress={() => {
                    if (useSavedPickupAddress) {
                      onOpenPickupAddressModal?.();
                      return;
                    }
                    setPickupModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.locationButtonContent}>
                    <View
                      style={[
                        styles.locationIconWrapper,
                        pickupTown && styles.locationIconWrapperFilled,
                      ]}
                    >
                      <Ionicons
                        name="arrow-up-circle"
                        size={20}
                        color={pickupSelectedText ? PRIMARY : "#6B7280"}
                      />
                    </View>
                    <View style={styles.locationTextWrapper}>
                      {pickupSelectedText ? (
                        <>
                          <Text style={styles.locationSelectedText}>
                            {pickupSelectedText}
                          </Text>
                          {useSavedPickupAddress ? (
                            <Text style={styles.locationAreaText}>
                              From your saved locations
                            </Text>
                          ) : pickupTown?.area ? (
                            <Text style={styles.locationAreaText}>
                              {pickupTown.area}
                            </Text>
                          ) : null}
                        </>
                      ) : (
                        <Text style={styles.locationPlaceholder}>
                          {useSavedPickupAddress
                            ? "Select pickup from your saved locations"
                            : "Select pickup location"}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Sender Contact - Read Only, stacked vertically */}
              {pickupTown && (
                <View style={styles.contactSection}>
                  <Text style={styles.contactLabel}>Sender Details (You)</Text>
                  <View style={styles.contactStack}>
                    <View style={styles.contactFieldFull}>
                      <View style={styles.readOnlyContactContainer}>
                        <Ionicons
                          name="person-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text
                          style={styles.readOnlyContactText}
                          numberOfLines={1}
                        >
                          {senderName || "Loading..."}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.contactFieldFull}>
                      <View style={styles.readOnlyContactContainer}>
                        <Ionicons name="call-outline" size={16} color="#6B7280" />
                        <Text
                          style={styles.readOnlyContactText}
                          numberOfLines={1}
                        >
                          {senderPhone || "Loading..."}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Swap Button */}
        {!hidePickupSection && pickupTown && dropoffTown && (
          <View style={styles.swapButtonContainer}>
            <TouchableOpacity
              style={styles.swapButton}
              onPress={handleSwapLocations}
              disabled={isSwapping}
              activeOpacity={0.7}
            >
              <Animated.View
                style={{ transform: [{ rotate: rotateInterpolate }] }}
              >
                <Ionicons name="swap-vertical" size={20} color={PRIMARY} />
              </Animated.View>
            </TouchableOpacity>
          </View>
        )}

        {/* Dropoff Location */}
        <View style={styles.locationRow}>
          <View style={styles.locationIndicator}>
            <View style={[styles.indicatorDot, styles.dropoffDot]} />
          </View>

          <View style={styles.locationContent}>
            <View style={styles.locationInputSection}>
              <Text style={styles.locationLabel}>Deliver to</Text>
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  dropoffSelectedText && styles.locationButtonFilled,
                ]}
                onPress={() => setDropoffModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.locationButtonContent}>
                  <View
                    style={[
                      styles.locationIconWrapper,
                      dropoffTown && styles.locationIconWrapperFilled,
                    ]}
                  >
                    <Ionicons
                      name="arrow-down-circle"
                      size={20}
                      color={dropoffSelectedText ? PRIMARY : "#6B7280"}
                    />
                  </View>
                  <View style={styles.locationTextWrapper}>
                    {dropoffSelectedText ? (
                      <>
                        <Text style={styles.locationSelectedText}>
                          {dropoffSelectedText}
                        </Text>
                        {dropoffTown?.area ? (
                          <Text style={styles.locationAreaText}>
                            {dropoffTown.area}
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text style={styles.locationPlaceholder}>
                        Select recipient delivery city
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Receiver Contact - editable, stacked vertically */}
            {dropoffTown && onReceiverNameChange && onReceiverPhoneChange && (
              <View style={styles.contactSection}>
                <Text style={styles.contactLabel}>Receiver Details *</Text>
                <View style={styles.contactStack}>
                  <View style={styles.contactFieldFull}>
                    <View style={styles.contactInputWrapper}>
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color="#9CA3AF"
                      />
                      <TextInput
                        style={styles.contactInput}
                        placeholder="Full name"
                        placeholderTextColor="#9CA3AF"
                        value={receiverName}
                        onChangeText={onReceiverNameChange}
                        autoCapitalize="words"
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                  <View style={styles.contactFieldFull}>
                    <View style={styles.contactInputWrapper}>
                      <Ionicons name="call-outline" size={16} color="#9CA3AF" />
                      <TextInput
                        style={styles.contactInput}
                        placeholder="Phone number"
                        placeholderTextColor="#9CA3AF"
                        value={receiverPhone}
                        onChangeText={onReceiverPhoneChange}
                        keyboardType="phone-pad"
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Distance Info */}
      {pickupTown && dropoffTown && (
        <View style={styles.distanceInfo}>
          <View style={styles.distanceIconWrapper}>
            <Ionicons name="navigate" size={16} color={PRIMARY} />
          </View>
          <Text style={styles.distanceText}>
            Price will be calculated based on distance and vehicle type
          </Text>
        </View>
      )}

      {/* Modals */}
      {!useSavedPickupAddress && (
        <LocationPickerModal
          visible={pickupModalVisible}
          onClose={() => setPickupModalVisible(false)}
          onSelect={(town) => {
            onPickupSelect(town);
            if (onPickupGPS) {
              onPickupGPS(town.latitude, town.longitude, town.name);
            }
          }}
          selectedTown={pickupTown}
          title="Select Pickup Location"
          allowGPS={true}
          allowGooglePlaces={false}
          onGPSLocation={onPickupGPS}
        />
      )}

      <LocationPickerModal
        visible={dropoffModalVisible}
        onClose={() => setDropoffModalVisible(false)}
        onSelect={(town) => {
          onDropoffSelect(town);
          if (onDropoffGPS) {
            onDropoffGPS(town.latitude, town.longitude, town.name);
          }
        }}
        selectedTown={dropoffTown}
        title="Select Delivery Location"
        allowGPS={false}
        allowGooglePlaces={false}
        groupByZone={true}
        showLocationMeta={false}
        onGPSLocation={onDropoffGPS}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 18,
  },
  locationContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationIndicator: {
    alignItems: "center",
    marginRight: 16,
    paddingTop: 32,
  },
  indicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  pickupDot: {
    backgroundColor: "#10B981",
  },
  dropoffDot: {
    backgroundColor: PRIMARY,
  },
  indicatorLine: {
    width: 2,
    height: 40,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },
  locationContent: {
    flex: 1,
  },
  locationInputSection: {
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  locationButton: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  locationButtonFilled: {
    backgroundColor: "rgba(255,107,0,0.04)",
    borderColor: "rgba(255,107,0,0.2)",
  },
  locationButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  locationIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  locationIconWrapperFilled: {
    backgroundColor: "rgba(255,107,0,0.1)",
    borderColor: "rgba(255,107,0,0.3)",
  },
  locationTextWrapper: {
    flex: 1,
  },
  locationSelectedText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 22,
    marginBottom: 3,
  },
  locationAreaText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  locationPlaceholder: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
    lineHeight: 16,
  },
  contactSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  // Shared vertical stack for both sender and receiver fields
  contactStack: {
    flexDirection: "column",
    gap: 10,
  },
  contactFieldFull: {
    width: "100%",
  },
  // Editable receiver inputs
  contactInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  contactInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
    padding: 0,
  },
  // Read-only sender fields — same sizing as editable ones
  readOnlyContactContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  readOnlyContactText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "600",
    flex: 1,
  },
  swapButtonContainer: {
    alignItems: "center",
    marginVertical: 12,
    zIndex: 10,
  },
  swapButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "rgba(255,107,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  distanceInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(255,107,0,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,107,0,0.15)",
    gap: 10,
  },
  distanceIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  distanceText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    lineHeight: 18,
  },
});
