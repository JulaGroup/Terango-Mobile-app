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
import { SavedLocationDropdown } from "./SavedLocationDropdown";
import { Address } from "@/services/AddressService";
import { UserCacheManager } from "@/utils/userCache";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadows,
  Animation,
} from "@/constants/DesignTokens";

const PRIMARY = Colors.primary;

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
  // Optional dynamic towns list (e.g. fetched from the admin panel).
  // Falls back to the static GAMBIAN_TOWNS list when not provided.
  towns?: GambianTown[];
  // Dropoff source mode: pick a location on the map/town list, or use one
  // of the user's own saved addresses (e.g. "deliver to my home").
  dropoffMode?: "town" | "saved";
  onDropoffModeChange?: (mode: "town" | "saved") => void;
  savedAddresses?: Address[];
  selectedDropoffAddress?: Address | null;
  onSelectSavedDropoffAddress?: (address: Address) => void;
  onAddNewDropoffAddress?: () => void;
  // When true, the dropoff "Choose" (town/GPS) option is disabled because
  // pickup is already in "choose a location" mode — one side must always
  // be a known saved address.
  dropoffTownDisabled?: boolean;
  // Optional extra content (e.g. a landmark/directions input) rendered
  // directly under the pickup location selector, before the sender
  // contact details.
  pickupExtraContent?: React.ReactNode;
  // Same, but rendered under the dropoff location selector, before the
  // receiver contact details.
  dropoffExtraContent?: React.ReactNode;
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
  towns,
  dropoffMode,
  onDropoffModeChange,
  savedAddresses,
  selectedDropoffAddress,
  onSelectSavedDropoffAddress,
  onAddNewDropoffAddress,
  dropoffTownDisabled = false,
  pickupExtraContent,
  dropoffExtraContent,
}) => {
  const [swapAnimation] = useState(new Animated.Value(0));
  const [swapScale] = useState(new Animated.Value(1));
  const [isSwapping, setIsSwapping] = useState(false);
  const [senderName, setSenderName] = useState(propSenderName);
  const [senderPhone, setSenderPhone] = useState(propSenderPhone);
  const [pickupModalVisible, setPickupModalVisible] = useState(false);
  const [dropoffModalVisible, setDropoffModalVisible] = useState(false);
  // Store user's cached data for "saved" mode (receiving to their address)
  const [userCachedName, setUserCachedName] = useState("");
  const [userCachedPhone, setUserCachedPhone] = useState("");

  // Load sender details from user cache using same method as checkout
  // BUT: only load if NOT in "saved" mode (To My Address flow)
  useEffect(() => {
    const loadSenderData = async () => {
      try {
        // In normal mode, load user's data as the sender
        if (dropoffMode !== "saved") {
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
        }
      } catch (error) {
        console.log("Could not load sender data from cache:", error);
      }
    };

    loadSenderData();
  }, [
    dropoffMode,
    onSenderDataLoaded,
    onSenderNameChange,
    onSenderPhoneChange,
  ]);

  // Initialize empty sender fields when entering "saved" mode — including the
  // parent's state, which may still hold the user's own details loaded while
  // in "I'm Sending" mode (the user is the receiver here, not the sender).
  useEffect(() => {
    if (dropoffMode === "saved") {
      setSenderName("");
      setSenderPhone("");
      onSenderNameChange?.("");
      onSenderPhoneChange?.("");
    }
  }, [dropoffMode]);

  // Load user's cached data when in "saved" mode so we can display it as the receiver
  useEffect(() => {
    if (dropoffMode !== "saved") return;

    const loadUserCachedData = async () => {
      try {
        const { cached } = await UserCacheManager.smartLoadUserData();
        if (cached) {
          const name = cached.fullName || "";
          const phone = cached.phone || "";
          // Normalize to the 7-digit local format (strip +220 etc.) — the
          // read-only display adds its own "+220" prefix, and the booking
          // screen validates receiverPhone as exactly 7 digits.
          const digits = phone.replace(/\D/g, "");
          const localPhone = digits.length > 7 ? digits.slice(-7) : digits;
          setUserCachedName(name);
          setUserCachedPhone(localPhone);
          // Propagate to the parent form too — the booking screen only
          // enables the Book button once receiverName/receiverPhone are set,
          // and in this flow the user IS the receiver.
          onReceiverNameChange?.(name);
          onReceiverPhoneChange?.(localPhone);
        }
      } catch (error) {
        console.log("Could not load user cached data:", error);
      }
    };

    loadUserCachedData();
  }, [dropoffMode]);

  const handleSwapLocations = () => {
    if (isSwapping) return;

    setIsSwapping(true);

    Animated.timing(swapAnimation, {
      toValue: 1,
      duration: Animation.slow,
      useNativeDriver: true,
    }).start(() => {
      swapAnimation.setValue(0);
      setIsSwapping(false);
    });

    Animated.sequence([
      Animated.timing(swapScale, {
        toValue: 1.12,
        duration: Animation.fast,
        useNativeDriver: true,
      }),
      Animated.timing(swapScale, {
        toValue: 1,
        duration: Animation.normal,
        useNativeDriver: true,
      }),
    ]).start();

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
                    <View style={styles.locationTextWrapper}>
                      {pickupSelectedText ? (
                        <>
                          <Text
                            style={styles.locationSelectedText}
                            numberOfLines={1}
                          >
                            {pickupSelectedText}
                          </Text>
                          {useSavedPickupAddress ? (
                            <Text
                              style={styles.locationAreaText}
                              numberOfLines={1}
                            >
                              From your saved locations
                            </Text>
                          ) : pickupTown?.area ? (
                            <Text
                              style={styles.locationAreaText}
                              numberOfLines={1}
                            >
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
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={Colors.inkLighter}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {pickupExtraContent}

              {/*
                Pickup contact — one editable block, every mode.

                This used to be read-only ("Sender Details (You)"), auto-filled
                from the account holder, in every mode except "saved". Two
                problems. It showed "Loading..." forever and submitted an empty
                string whenever the profile had no name or phone — 10 of 65
                deliveries ended up with no sender name and 6 with no sender
                phone, while receiver phone was filled on all 65 because those
                were real inputs. And it assumed the account holder is always
                the person the rider collects from, which is wrong the moment
                someone is having something sent TO them.

                Prefilled from the profile, but editable and required.
              */}
              {pickupTown && (
                <View style={styles.contactSection}>
                  <Text style={styles.contactLabel}>
                    Who is the rider collecting from? *
                  </Text>
                  <View style={styles.contactStack}>
                    <View style={styles.contactFieldFull}>
                      <View style={styles.contactInputWrapper}>
                        <Ionicons
                          name="person-outline"
                          size={16}
                          color={Colors.inkLighter}
                        />
                        <TextInput
                          style={styles.contactInput}
                          placeholder="Full name"
                          placeholderTextColor={Colors.inkLighter}
                          value={senderName}
                          onChangeText={(text) => {
                            setSenderName(text);
                            onSenderNameChange?.(text);
                          }}
                          autoCapitalize="words"
                          autoCorrect={false}
                        />
                      </View>
                    </View>
                    <View style={styles.contactFieldFull}>
                      <View style={styles.contactInputWrapper}>
                        <Ionicons
                          name="call-outline"
                          size={16}
                          color={Colors.inkLighter}
                        />
                        <Text style={styles.phonePrefix}>+220</Text>
                        <TextInput
                          style={styles.contactInput}
                          placeholder="7 digit number"
                          placeholderTextColor={Colors.inkLighter}
                          value={senderPhone}
                          onChangeText={(text) => {
                            const digitsOnly = text
                              .replace(/[^0-9]/g, "")
                              .slice(0, 7);
                            setSenderPhone(digitsOnly);
                            onSenderPhoneChange?.(digitsOnly);
                          }}
                          keyboardType="phone-pad"
                          maxLength={7}
                          autoCorrect={false}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Swap Button */}
        {!hidePickupSection &&
          pickupTown &&
          dropoffTown &&
          dropoffMode !== "saved" && (
            <View style={styles.swapButtonContainer}>
              <TouchableOpacity
                style={styles.swapButton}
                onPress={handleSwapLocations}
                disabled={isSwapping}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={{
                    transform: [
                      { rotate: rotateInterpolate },
                      { scale: swapScale },
                    ],
                  }}
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
              <View style={styles.locationLabelRow}>
                <Text style={styles.locationLabel}>Deliver to</Text>
                {onDropoffModeChange && (
                  <View style={styles.modeToggle}>
                    <TouchableOpacity
                      style={[
                        styles.modeToggleOption,
                        (dropoffMode ?? "town") === "town" &&
                          styles.modeToggleOptionActive,
                        dropoffTownDisabled && styles.modeToggleOptionDisabled,
                      ]}
                      onPress={() => {
                        if (dropoffTownDisabled) return;
                        onDropoffModeChange("town");
                      }}
                      disabled={dropoffTownDisabled}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modeToggleText,
                          (dropoffMode ?? "town") === "town" &&
                            styles.modeToggleTextActive,
                        ]}
                      >
                        Choose
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modeToggleOption,
                        dropoffMode === "saved" &&
                          styles.modeToggleOptionActive,
                      ]}
                      onPress={() => onDropoffModeChange("saved")}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modeToggleText,
                          dropoffMode === "saved" &&
                            styles.modeToggleTextActive,
                        ]}
                      >
                        My Address
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {dropoffTownDisabled && (
                <Text style={styles.modeHintText}>
                  Pickup is a chosen location, so delivery must be to one of
                  your saved addresses.
                </Text>
              )}
              {dropoffMode === "saved" ? (
                savedAddresses && savedAddresses.length > 0 ? (
                  <SavedLocationDropdown
                    selectedAddress={selectedDropoffAddress ?? null}
                    onSelectAddress={(address) =>
                      onSelectSavedDropoffAddress?.(address)
                    }
                    addresses={savedAddresses}
                    onAddNew={() => onAddNewDropoffAddress?.()}
                    label="Deliver to"
                    placeholder="Select from your saved locations"
                    hideLabel
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.savedLocationEmpty}
                    onPress={() => onAddNewDropoffAddress?.()}
                    activeOpacity={0.7}
                  >
                    <View style={styles.savedLocationEmptyLeft}>
                      <View style={styles.savedLocationIconWrap}>
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color={Colors.inkLighter}
                        />
                      </View>
                      <Text
                        style={styles.savedLocationEmptyText}
                        numberOfLines={1}
                      >
                        Add your first saved location
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={Colors.inkLighter}
                    />
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  style={[
                    styles.locationButton,
                    dropoffSelectedText && styles.locationButtonFilled,
                  ]}
                  onPress={() => setDropoffModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.locationButtonContent}>
                    <View style={styles.locationTextWrapper}>
                      {dropoffSelectedText ? (
                        <>
                          <Text
                            style={styles.locationSelectedText}
                            numberOfLines={1}
                          >
                            {dropoffSelectedText}
                          </Text>
                          {dropoffTown?.area ? (
                            <Text
                              style={styles.locationAreaText}
                              numberOfLines={1}
                            >
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
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={Colors.inkLighter}
                    />
                  </View>
                </TouchableOpacity>
              )}

              {dropoffMode !== "saved" && dropoffExtraContent}
            </View>

            {/* Receiver Contact - editable in normal mode, or pre-filled with user info in "saved" mode */}
            {(dropoffTown ||
              (dropoffMode === "saved" && selectedDropoffAddress)) &&
              onReceiverNameChange &&
              onReceiverPhoneChange && (
                <View style={styles.contactSection}>
                  <Text style={styles.contactLabel}>
                    {dropoffMode === "saved"
                      ? "Receiving to (You)"
                      : "Receiver Details *"}
                  </Text>
                  <View style={styles.contactStack}>
                    <View style={styles.contactFieldFull}>
                      {dropoffMode === "saved" ? (
                        /* In "saved" mode: show user's cached name as read-only */
                        <View style={styles.readOnlyContactContainer}>
                          <Ionicons
                            name="person-outline"
                            size={16}
                            color={Colors.inkMid}
                          />
                          <Text
                            style={styles.readOnlyContactText}
                            numberOfLines={1}
                          >
                            {userCachedName || "Loading..."}
                          </Text>
                        </View>
                      ) : (
                        /* In normal mode: editable receiver name */
                        <View style={styles.contactInputWrapper}>
                          <Ionicons
                            name="person-outline"
                            size={16}
                            color={Colors.inkLighter}
                          />
                          <TextInput
                            style={styles.contactInput}
                            placeholder="Full name"
                            placeholderTextColor={Colors.inkLighter}
                            value={receiverName}
                            onChangeText={onReceiverNameChange}
                            autoCapitalize="words"
                            autoCorrect={false}
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.contactFieldFull}>
                      {dropoffMode === "saved" ? (
                        /* In "saved" mode: show user's cached phone as read-only */
                        <View style={styles.readOnlyContactContainer}>
                          <Ionicons
                            name="call-outline"
                            size={16}
                            color={Colors.inkMid}
                          />
                          <Text style={styles.phonePrefix}>+220</Text>
                          <Text
                            style={styles.readOnlyContactText}
                            numberOfLines={1}
                          >
                            {userCachedPhone || "Loading..."}
                          </Text>
                        </View>
                      ) : (
                        /* In normal mode: editable receiver phone */
                        <View style={styles.contactInputWrapper}>
                          <Ionicons
                            name="call-outline"
                            size={16}
                            color={Colors.inkLighter}
                          />
                          <Text style={styles.phonePrefix}>+220</Text>
                          <TextInput
                            style={styles.contactInput}
                            placeholder="7 digit number"
                            placeholderTextColor={Colors.inkLighter}
                            value={receiverPhone}
                            onChangeText={(text) => {
                              const digitsOnly = text
                                .replace(/[^0-9]/g, "")
                                .slice(0, 7);
                              onReceiverPhoneChange?.(digitsOnly);
                            }}
                            keyboardType="phone-pad"
                            maxLength={7}
                            autoCorrect={false}
                          />
                        </View>
                      )}
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
          groupByZone={true}
          showLocationMeta={false}
          onGPSLocation={onPickupGPS}
          towns={towns}
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
        towns={towns}
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
    color: Colors.ink,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.inkMid,
    lineHeight: 18,
  },
  locationContainer: {
    // Flat wrapper — this component is always rendered inside an outer
    // card in the booking form, so it should not have its own
    // background/shadow/border (that created a "card on card" look).
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  locationIndicator: {
    alignItems: "center",
    marginRight: 14,
    paddingTop: 28,
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
    backgroundColor: Colors.success,
  },
  dropoffDot: {
    backgroundColor: PRIMARY,
  },
  indicatorLine: {
    width: 2,
    height: 30,
    backgroundColor: Colors.divider,
    marginVertical: 4,
  },
  locationContent: {
    flex: 1,
  },
  locationInputSection: {
    marginBottom: 12,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.inkMid,
    marginBottom: 7,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  locationLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.bg,
    borderRadius: 20,
    padding: 3,
  },
  modeToggleOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 17,
  },
  modeToggleOptionActive: {
    backgroundColor: PRIMARY,
  },
  modeToggleOptionDisabled: {
    opacity: 0.4,
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.inkMid,
  },
  modeToggleTextActive: {
    color: Colors.surface,
  },
  modeHintText: {
    fontSize: 12,
    color: Colors.inkLighter,
    fontStyle: "italic",
    marginBottom: 10,
  },
  locationButton: {
    backgroundColor: Colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  locationButtonFilled: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primaryGlow,
  },
  locationButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  locationIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  locationIconWrapperFilled: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primaryGlow,
  },
  locationTextWrapper: {
    flex: 1,
  },
  locationSelectedText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.ink,
    lineHeight: 20,
    marginBottom: 1,
  },
  locationAreaText: {
    fontSize: 12,
    color: Colors.inkMid,
    fontWeight: "500",
  },
  locationPlaceholder: {
    fontSize: 14,
    color: Colors.inkLighter,
    fontWeight: "500",
    lineHeight: 18,
  },
  contactSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.bg,
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.inkMid,
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
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  contactInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.ink,
    fontWeight: "600",
    padding: 0,
  },
  phonePrefix: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.inkMid,
  },
  // Read-only sender fields — same sizing as editable ones
  readOnlyContactContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  readOnlyContactText: {
    fontSize: 15,
    color: Colors.inkMid,
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
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.lg,
    shadowColor: PRIMARY,
  },
  distanceInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    gap: 10,
  },
  distanceIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  distanceText: {
    flex: 1,
    fontSize: 13,
    color: Colors.inkMid,
    fontWeight: "600",
    lineHeight: 18,
  },
  savedLocationEmpty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  savedLocationEmptyLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  savedLocationIconWrap: {
    width: 24,
    alignItems: "center",
  },
  savedLocationEmptyText: {
    fontSize: 15,
    color: Colors.inkLighter,
    fontWeight: "500",
    flexShrink: 1,
  },
});
