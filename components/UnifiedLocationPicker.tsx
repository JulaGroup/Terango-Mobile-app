import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { gambianTowns, GambianTown } from "../constants/gambianTowns";

// ── Design tokens ─────────────────────────────────────────
const C = {
  primary: "#FF6B00",
  primaryFaint: "rgba(255,107,0,0.07)",
  primaryGlow: "rgba(255,107,0,0.18)",
  ink: "#1C1C1E",
  inkMid: "#3A3A3C",
  inkLight: "#6B6B6E",
  divider: "#E8E8EA",
  surface: "#FFFFFF",
  bg: "#F5F5F7",
  success: "#00A86B",
  successBg: "rgba(0,168,107,0.08)",
};

export interface LocationData {
  address: string;
  town?: string;
  latitude?: number;
  longitude?: number;
  isGPSLocation?: boolean;
  zone?: string;
}

export interface UnifiedLocationData {
  pickup: LocationData;
  dropoff: LocationData;
  deliveryType: "PICKUP_BY_USER" | "DELIVERY_TO_USER" | "SEND_TO_SOMEONE";
  senderInfo: { name: string; phone: string };
  receiverInfo: { name: string; phone: string };
}

interface UnifiedLocationPickerProps {
  onLocationChange: (data: UnifiedLocationData) => void;
  initialData?: Partial<UnifiedLocationData>;
  showDeliveryTypeSelector?: boolean;
  showContactInfo?: boolean;
  disabled?: boolean;
  style?: any;
}

export const UnifiedLocationPicker: React.FC<UnifiedLocationPickerProps> = ({
  onLocationChange,
  initialData,
  showDeliveryTypeSelector = true,
  showContactInfo = true,
  disabled = false,
  style,
}) => {
  const swapAnimation = new Animated.Value(0);
  const [isSwapping, setIsSwapping] = useState(false);

  const [pickupLocation, setPickupLocation] = useState<LocationData>(
    initialData?.pickup || { address: "", town: "", zone: "" },
  );
  const [dropoffLocation, setDropoffLocation] = useState<LocationData>(
    initialData?.dropoff || { address: "", town: "", zone: "" },
  );
  const [deliveryType, setDeliveryType] = useState<
    UnifiedLocationData["deliveryType"]
  >(initialData?.deliveryType || "DELIVERY_TO_USER");
  const [senderInfo, setSenderInfo] = useState({
    name: initialData?.senderInfo?.name || "",
    phone: initialData?.senderInfo?.phone || "",
  });
  const [receiverInfo, setReceiverInfo] = useState({
    name: initialData?.receiverInfo?.name || "",
    phone: initialData?.receiverInfo?.phone || "",
  });

  const [gpsLoading, setGpsLoading] = useState(false);
  const [pickupTownSearch, setPickupTownSearch] = useState("");
  const [dropoffTownSearch, setDropoffTownSearch] = useState("");
  const [showPickupTowns, setShowPickupTowns] = useState(false);
  const [showDropoffTowns, setShowDropoffTowns] = useState(false);

  const getFilteredTowns = (searchTerm: string): GambianTown[] => {
    if (!searchTerm) return gambianTowns;
    return gambianTowns.filter(
      (town) =>
        town.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        town.area.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  const getCurrentLocation = async (locationType: "pickup" | "dropoff") => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please enable location access to use GPS detection",
        );
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });
      const { latitude, longitude } = location.coords;
      const isInGambia =
        latitude >= 13.0 &&
        latitude <= 14.0 &&
        longitude >= -17.0 &&
        longitude <= -13.5;

      if (!isInGambia) {
        Alert.alert(
          "Location Error",
          "GPS location is outside The Gambia. Please select a town manually.",
        );
        return;
      }

      let nearestTown: GambianTown | null = null;
      let minDistance = Infinity;
      gambianTowns.forEach((town) => {
        const distance = Math.sqrt(
          Math.pow(town.latitude - latitude, 2) +
            Math.pow(town.longitude - longitude, 2),
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestTown = town;
        }
      });

      if (nearestTown) {
        const gpsLocation: LocationData = {
          address: `GPS Location near ${nearestTown.name}`,
          town: nearestTown.id,
          latitude,
          longitude,
          isGPSLocation: true,
          zone: nearestTown.deliveryZone,
        };
        if (locationType === "pickup") setPickupLocation(gpsLocation);
        else setDropoffLocation(gpsLocation);
      }
    } catch (error) {
      Alert.alert(
        "GPS Error",
        "Failed to get current location. Please try again or select manually.",
      );
    } finally {
      setGpsLoading(false);
    }
  };

  const selectTown = (
    town: GambianTown,
    locationType: "pickup" | "dropoff",
  ) => {
    const townLocation: LocationData = {
      address: `${town.name}, ${town.area}`,
      town: town.id,
      latitude: town.latitude,
      longitude: town.longitude,
      isGPSLocation: false,
      zone: town.deliveryZone,
    };
    if (locationType === "pickup") {
      setPickupLocation(townLocation);
      setShowPickupTowns(false);
      setPickupTownSearch("");
    } else {
      setDropoffLocation(townLocation);
      setShowDropoffTowns(false);
      setDropoffTownSearch("");
    }
  };

  const swapLocations = () => {
    if (isSwapping || disabled) return;
    setIsSwapping(true);
    Animated.sequence([
      Animated.timing(swapAnimation, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(swapAnimation, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setIsSwapping(false));
    const temp = { ...pickupLocation };
    setPickupLocation({ ...dropoffLocation });
    setDropoffLocation(temp);
  };

  useEffect(() => {
    onLocationChange({
      pickup: pickupLocation,
      dropoff: dropoffLocation,
      deliveryType,
      senderInfo,
      receiverInfo,
    });
  }, [pickupLocation, dropoffLocation, deliveryType, senderInfo, receiverInfo]);

  const swapRotation = swapAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const renderLocationInput = (
    location: LocationData,
    locationType: "pickup" | "dropoff",
    onLocationUpdate: (l: LocationData) => void,
    townSearch: string,
    setTownSearch: (t: string) => void,
    showTowns: boolean,
    setShowTowns: (s: boolean) => void,
  ) => (
    <View style={styles.locationBlock}>
      <View style={styles.locationLabelRow}>
        <View
          style={[
            styles.locationDotOuter,
            { borderColor: locationType === "pickup" ? C.primary : C.success },
          ]}
        >
          <View
            style={[
              styles.locationDotInner,
              {
                backgroundColor:
                  locationType === "pickup" ? C.primary : C.success,
              },
            ]}
          />
        </View>
        <Text style={styles.locationLabel}>
          {locationType === "pickup" ? "Pickup" : "Dropoff"}
        </Text>
      </View>

      <TextInput
        style={styles.addressInput}
        placeholder={`Enter ${locationType} address`}
        placeholderTextColor="#AEAEB2"
        value={location.address}
        onChangeText={(text) =>
          onLocationUpdate({ ...location, address: text })
        }
        multiline
        editable={!disabled}
      />

      <View style={styles.townRow}>
        <View style={styles.townInputWrap}>
          <Ionicons
            name="search-outline"
            size={13}
            color="#AEAEB2"
            style={{ marginRight: 6 }}
          />
          <TextInput
            style={styles.townInput}
            placeholder="Search town…"
            placeholderTextColor="#AEAEB2"
            value={townSearch}
            onChangeText={setTownSearch}
            onFocus={() => setShowTowns(true)}
            editable={!disabled}
          />
        </View>
        <TouchableOpacity
          style={styles.gpsBtn}
          onPress={() => getCurrentLocation(locationType)}
          disabled={gpsLoading || disabled}
          activeOpacity={0.75}
        >
          <Ionicons
            name={gpsLoading ? "reload-outline" : "locate-outline"}
            size={15}
            color={gpsLoading ? "#AEAEB2" : C.primary}
          />
        </TouchableOpacity>
      </View>

      {showTowns && (
        <View style={styles.townDropdown}>
          {getFilteredTowns(townSearch)
            .slice(0, 5)
            .map((town) => (
              <TouchableOpacity
                key={town.id}
                style={styles.townItem}
                onPress={() => selectTown(town, locationType)}
                activeOpacity={0.7}
              >
                <View style={styles.townItemLeft}>
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color={C.primary}
                    style={{ marginTop: 1 }}
                  />
                  <View>
                    <Text style={styles.townName}>{town.name}</Text>
                    <Text style={styles.townArea}>
                      {town.area} · Zone {town.deliveryZone.slice(-1)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={12} color="#C7C7CC" />
              </TouchableOpacity>
            ))}
          {getFilteredTowns(townSearch).length === 0 && (
            <Text style={styles.noTowns}>No towns found</Text>
          )}
        </View>
      )}

      {location.town && (
        <View style={styles.selectedChip}>
          <Ionicons name="checkmark-circle" size={13} color={C.success} />
          <Text style={styles.selectedChipText} numberOfLines={1}>
            {gambianTowns.find((t) => t.id === location.town)?.name ||
              location.town}
            {location.isGPSLocation ? " · GPS" : ""}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {/* ── Delivery Type ── */}
      {showDeliveryTypeSelector && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Delivery type</Text>
          <View style={styles.typeRow}>
            {[
              {
                key: "PICKUP_BY_USER",
                icon: "walk-outline",
                label: "I'll pick up",
              },
              {
                key: "DELIVERY_TO_USER",
                icon: "home-outline",
                label: "Deliver to me",
              },
              {
                key: "SEND_TO_SOMEONE",
                icon: "send-outline",
                label: "Send to someone",
              },
            ].map((opt) => {
              const active = deliveryType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.typeBtn, active && styles.typeBtnActive]}
                  onPress={() => setDeliveryType(opt.key as any)}
                  disabled={disabled}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={14}
                    color={active ? "#fff" : C.inkLight}
                    style={{ marginBottom: 3 }}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      active && styles.typeBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Locations ── */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Locations</Text>
          <TouchableOpacity
            style={styles.swapBtn}
            onPress={swapLocations}
            disabled={isSwapping || disabled}
            activeOpacity={0.75}
          >
            <Animated.View style={{ transform: [{ rotate: swapRotation }] }}>
              <Ionicons
                name="swap-vertical-outline"
                size={16}
                color={C.primary}
              />
            </Animated.View>
            <Text style={styles.swapText}>Swap</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.locationsCard}>
          {renderLocationInput(
            pickupLocation,
            "pickup",
            setPickupLocation,
            pickupTownSearch,
            setPickupTownSearch,
            showPickupTowns,
            setShowPickupTowns,
          )}
          <View style={styles.locationDivider} />
          {renderLocationInput(
            dropoffLocation,
            "dropoff",
            setDropoffLocation,
            dropoffTownSearch,
            setDropoffTownSearch,
            showDropoffTowns,
            setShowDropoffTowns,
          )}
        </View>
      </View>

      {/* ── Contact Info ── */}
      {showContactInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Contact info</Text>

          {/* Sender */}
          <View style={styles.contactCard}>
            <View style={styles.contactCardHeader}>
              <View style={styles.contactIconWrap}>
                <Ionicons name="person-outline" size={12} color={C.primary} />
              </View>
              <Text style={styles.contactCardLabel}>Sender</Text>
            </View>
            {/* Row wrapper → TextInput flex:1 = guaranteed full width */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.contactInput}
                placeholder="Full name"
                placeholderTextColor="#AEAEB2"
                value={senderInfo.name}
                onChangeText={(name) => setSenderInfo({ ...senderInfo, name })}
                editable={!disabled}
                autoCorrect={false}
              />
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.contactInput}
                placeholder="Phone number"
                placeholderTextColor="#AEAEB2"
                value={senderInfo.phone}
                onChangeText={(phone) =>
                  setSenderInfo({ ...senderInfo, phone })
                }
                keyboardType="phone-pad"
                editable={!disabled}
              />
            </View>
          </View>

          {/* Receiver */}
          <View style={[styles.contactCard, { marginBottom: 0 }]}>
            <View style={styles.contactCardHeader}>
              <View
                style={[
                  styles.contactIconWrap,
                  { backgroundColor: C.successBg },
                ]}
              >
                <Ionicons
                  name="person-add-outline"
                  size={12}
                  color={C.success}
                />
              </View>
              <Text style={styles.contactCardLabel}>Receiver</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.contactInput}
                placeholder="Full name"
                placeholderTextColor="#AEAEB2"
                value={receiverInfo.name}
                onChangeText={(name) =>
                  setReceiverInfo({ ...receiverInfo, name })
                }
                editable={!disabled}
                autoCorrect={false}
              />
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.contactInput}
                placeholder="Phone number"
                placeholderTextColor="#AEAEB2"
                value={receiverInfo.phone}
                onChangeText={(phone) =>
                  setReceiverInfo({ ...receiverInfo, phone })
                }
                keyboardType="phone-pad"
                editable={!disabled}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 0 },

  // ── Section ─────────────────────────────────────────────
  section: { marginBottom: 20 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.inkLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  // ── Delivery type ────────────────────────────────────────
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.divider,
    gap: 2,
  },
  typeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  typeBtnText: {
    fontSize: 10,
    fontWeight: "600",
    color: C.inkLight,
    textAlign: "center",
  },
  typeBtnTextActive: { color: "#fff" },

  // ── Swap ─────────────────────────────────────────────────
  swapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: C.primaryFaint,
    borderWidth: 1,
    borderColor: "rgba(255,107,0,0.15)",
    marginBottom: 10,
  },
  swapText: { fontSize: 11, fontWeight: "600", color: C.primary },

  // ── Locations card ───────────────────────────────────────
  locationsCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.divider,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  locationBlock: { padding: 14 },
  locationDivider: {
    height: 1,
    backgroundColor: C.divider,
    marginHorizontal: 14,
  },
  locationLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  locationDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  locationDotInner: { width: 5, height: 5, borderRadius: 3 },
  locationLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.inkMid,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addressInput: {
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: C.ink,
    fontWeight: "500",
    minHeight: 42,
    marginBottom: 8,
  },
  townRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  townInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.divider,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  townInput: { flex: 1, fontSize: 13, color: C.ink, fontWeight: "500" },
  gpsBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.primaryFaint,
    borderWidth: 1,
    borderColor: "rgba(255,107,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Town dropdown ────────────────────────────────────────
  townDropdown: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.divider,
    marginBottom: 8,
    overflow: "hidden",
  },
  townItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.bg,
  },
  townItemLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flex: 1,
  },
  townName: { fontSize: 13, fontWeight: "600", color: C.ink },
  townArea: { fontSize: 11, color: C.inkLight, marginTop: 1 },
  noTowns: {
    padding: 14,
    textAlign: "center",
    color: C.inkLight,
    fontSize: 12,
  },

  // ── Selected chip ────────────────────────────────────────
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: C.successBg,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  selectedChipText: { fontSize: 11, fontWeight: "600", color: C.success },

  // ── Contact cards ────────────────────────────────────────
  contactCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.divider,
    marginBottom: 10,
    // column direction so children stack vertically
    flexDirection: "column",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  contactCardHeader: {
    flexDirection: "column",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  contactIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: C.primaryFaint,
    alignItems: "center",
    justifyContent: "center",
  },
  contactCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.inkMid,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // The fix: a flex row wrapper forces TextInput to stretch to full card width
  inputRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  contactInput: {
    flex: 1, // ← this is the key: fills the row = fills card width
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.divider,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    color: C.ink,
    fontWeight: "500",
    // No width/height constraints that could cause clipping
  },
});

export default UnifiedLocationPicker;
