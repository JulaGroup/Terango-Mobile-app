import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { customDeliveryApi, expressDeliveryApi } from "@/lib/api";
import {
  fetchDeliveryTowns,
  DeliveryTown,
} from "@/services/deliveryTowns.service";
import { GambianTown } from "@/constants/gambianTowns";
import { UnifiedLocationSection } from "@/components/express/UnifiedLocationSection";
import { SavedLocationDropdown } from "@/components/express/SavedLocationDropdown";
import LocationModal from "@/components/common/LocationModal";
import { useAddress } from "@/context/AddressContext";
import { Address } from "@/services/AddressService";
import { useMaintenance } from "@/context/MaintenanceContext";
import MaintenanceScreen from "@/components/common/MaintenanceScreen";
import {
  ExpressVehicleCard,
  VehicleOption,
  VEHICLE_CONFIG,
  getAvailableVehicles,
} from "@/components/express/ExpressVehicleCard";
import {
  ExpressWeightClassCard,
  WeightClassOption,
  WEIGHT_CONFIG,
} from "@/components/express/ExpressWeightClassCard";
import { VehicleType, WeightClass } from "@/utils/expressPriceCalculator";

const { width: SCREEN_W } = Dimensions.get("window");

// ── Design System ─────────────────────────────────────────
const T = {
  // Brand - Orange
  brand: "#FF6B00", // Primary orange
  brandDark: "#E55A00",
  brandDeep: "#CC4E00",
  brandSoft: "rgba(255,107,0,0.12)",
  brandGlow: "rgba(255,107,0,0.20)",
  brandFaint: "rgba(255,107,0,0.06)",

  // Accent
  accent: "#FF8C42", // Lighter orange for highlights
  accentSoft: "rgba(255,140,66,0.10)",

  // Neutrals – black theme hero, white body
  heroBase: "#000000",
  heroCard: "rgba(255,255,255,0.06)",
  heroBorder: "rgba(255,255,255,0.10)",
  heroText: "#FFFFFF",
  heroTextDim: "rgba(255,255,255,0.70)",
  heroTextFaint: "rgba(255,255,255,0.40)",

  // White body
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceHover: "#F8F9FA",
  border: "#E9ECEF",
  borderFocus: "#FF6B00",

  // Text - Black based
  textPrimary: "#000000",
  textSecondary: "#495057",
  textTertiary: "#6C757D",

  // Status
  blue: "#007BFF",
  blueSoft: "rgba(0,123,255,0.10)",
  amber: "#FF6B00", // Use brand orange for amber
  amberSoft: "rgba(255,107,0,0.10)",
  red: "#DC3545",
  redSoft: "rgba(220,53,69,0.08)",
  success: "#28A745",
  successSoft: "rgba(40,167,69,0.10)",
};

// ── Types ─────────────────────────────────────────────────
interface DeliverySummary {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  weightClass: "LIGHT" | "MEDIUM" | "HEAVY";
  vehicleType: "BIKE" | "KEKE_CARGO" | "CAR" | "VAN" | "LORRY";
  status: string;
  paymentStatus?: "UNPAID" | "PAID" | "FAILED" | "REFUNDED";
  estimatedFee?: number | null;
  estimatedDistanceKm?: number | null;
  createdAt: string;
  trackingUpdates?: {
    id: string;
    status: string;
    message?: string | null;
    createdAt: string;
  }[];
}

interface DeliveryQuote {
  estimatedPrice: number;
  estimatedTimeMinutes: number;
  distanceKm: number;
}

// ── Helpers ───────────────────────────────────────────────
const findNearestTown = (
  lat: number,
  lon: number,
  towns: DeliveryTown[],
): DeliveryTown | null => {
  let nearest: DeliveryTown | null = null;
  let minD = Infinity;
  for (const town of towns) {
    const d = Math.hypot(town.latitude - lat, town.longitude - lon);
    if (d < minD) {
      minD = d;
      nearest = town;
    }
  }
  return nearest;
};

const STATUS_MAP: Record<
  string,
  { label: string; bg: string; color: string; dot: string }
> = {
  PENDING: {
    label: "Pending",
    bg: T.accentSoft,
    color: T.accent,
    dot: T.accent,
  },
  READY_FOR_PAYMENT: {
    label: "Ready for Payment",
    bg: T.brandSoft,
    color: T.brand,
    dot: T.brand,
  },
  DRIVER_ASSIGNED: {
    label: "Driver Assigned",
    bg: T.blueSoft,
    color: T.blue,
    dot: T.blue,
  },
  PICKED_UP: {
    label: "Picked Up",
    bg: T.brandSoft,
    color: T.brandDark,
    dot: T.brand,
  },
  IN_TRANSIT: {
    label: "In Transit",
    bg: T.amberSoft,
    color: T.amber,
    dot: T.amber,
  },
  DELIVERED: {
    label: "Delivered",
    bg: T.successSoft,
    color: T.success,
    dot: T.success,
  },
  CANCELLED: { label: "Cancelled", bg: T.redSoft, color: T.red, dot: T.red },
};

const fmtCurrency = (v?: number | null) =>
  v == null ? "--" : `D${v.toFixed(0)}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

// ── Field Input ───────────────────────────────────────────
interface FieldInputProps {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "phone-pad" | "email-address";
  maxLength?: number;
  multiline?: boolean;
  label?: string;
}

function FieldInput({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  maxLength,
  multiline,
  label,
}: FieldInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fi.outer}>
      {label && <Text style={fi.label}>{label}</Text>}
      <View style={[fi.wrap, focused && fi.wrapFocused]}>
        <View style={fi.iconBox}>
          <Ionicons
            name={icon as any}
            size={16}
            color={focused ? T.brand : T.textTertiary}
          />
        </View>
        <TextInput
          style={[fi.text, multiline && fi.multiText]}
          placeholder={placeholder}
          placeholderTextColor={T.textTertiary}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

const fi = StyleSheet.create({
  outer: { marginBottom: 10 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: T.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  wrapFocused: { borderColor: T.brand, backgroundColor: "#FAFFFE" },
  iconBox: { width: 24, alignItems: "center", marginRight: 10 },
  text: { flex: 1, fontSize: 15, color: T.textPrimary, fontWeight: "500" },
  multiText: { minHeight: 72, paddingTop: 2 },
});

// ── Section Header ────────────────────────────────────────
function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={sh.row}>
      <View style={sh.pill}>
        <Ionicons name={icon as any} size={14} color={T.brand} />
      </View>
      <View>
        <Text style={sh.title}>{title}</Text>
        {subtitle && <Text style={sh.sub}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const sh = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  pill: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: T.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.2,
  },
  sub: { fontSize: 11, color: T.textTertiary, fontWeight: "500", marginTop: 1 },
});

// ── Step Badge ────────────────────────────────────────────
function StepBadge({ n, active }: { n: number; active: boolean }) {
  return (
    <View style={[sb.base, active ? sb.active : sb.idle]}>
      <Text style={[sb.num, active ? sb.numActive : sb.numIdle]}>{n}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  base: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  active: { backgroundColor: T.brand },
  idle: { backgroundColor: T.border },
  num: { fontSize: 11, fontWeight: "800" },
  numActive: { color: "#fff" },
  numIdle: { color: T.textTertiary },
});

// ── Quick Stat Chip ───────────────────────────────────────
function QuickStat({
  icon,
  val,
  label,
}: {
  icon: string;
  val: string;
  label: string;
}) {
  return (
    <View style={qs.cell}>
      <View style={qs.icon}>
        <Ionicons name={icon as any} size={15} color={T.brand} />
      </View>
      <Text style={qs.val}>{val}</Text>
      <Text style={qs.lbl}>{label}</Text>
    </View>
  );
}
const qs = StyleSheet.create({
  cell: { flex: 1, alignItems: "center", paddingVertical: 14 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: T.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  val: { fontSize: 13, fontWeight: "800", color: "#fff", marginBottom: 2 },
  lbl: { fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: "600" },
});

// ── Main Screen ────────────────────────────────────────────
export default function CustomDeliveryScreen() {
  const { flags, refetch: refetchMaintenanceFlags } = useMaintenance();
  const router = useRouter();
  const { addresses, fetchAddresses } = useAddress();

  // Re-check maintenance flags every time this screen opens so an admin
  // toggle takes effect immediately (flags are otherwise only fetched at
  // app launch / foreground resume)
  useEffect(() => {
    refetchMaintenanceFlags();
  }, [refetchMaintenanceFlags]);

  // 🏙️ Dynamic delivery towns from API
  const [deliveryTowns, setDeliveryTowns] = useState<DeliveryTown[]>([]);

  const [pickupTown, setPickupTown] = useState<GambianTown | null>(null);
  const [dropoffTown, setDropoffTown] = useState<GambianTown | null>(null);
  const [pickupAddressLabel, setPickupAddressLabel] = useState("");
  const [dropoffAddressLabel, setDropoffAddressLabel] = useState("");
  const [pickupLatitude, setPickupLatitude] = useState<number | null>(null);
  const [pickupLongitude, setPickupLongitude] = useState<number | null>(null);
  const [dropoffLatitude, setDropoffLatitude] = useState<number | null>(null);
  const [dropoffLongitude, setDropoffLongitude] = useState<number | null>(null);

  // Exactly two valid flows:
  //  - "pickupSaved": pickup is one of your saved addresses, dropoff is a
  //    location/town you choose.
  //  - "dropoffSaved": pickup is a location/town you choose (with a
  //    landmark description), dropoff is one of your saved addresses.
  const [flowDirection, setFlowDirection] = useState<
    "pickupSaved" | "dropoffSaved"
  >("pickupSaved");
  const pickupMode = flowDirection === "pickupSaved" ? "saved" : "town";
  const dropoffMode = flowDirection === "pickupSaved" ? "town" : "saved";
  // Pickup saved-address selection is LOCAL to this booking — deliberately
  // not the app-wide default address, so nothing appears pre-selected until
  // the user explicitly picks a location.
  const [selectedPickupAddress, setSelectedPickupAddress] =
    useState<Address | null>(null);
  const [selectedDropoffAddress, setSelectedDropoffAddress] =
    useState<Address | null>(null);
  const [showDropoffAddressModal, setShowDropoffAddressModal] = useState(false);
  // Required when pickup is a chosen location (not a saved address) so the
  // driver can actually find the pickup spot.
  const [pickupLandmark, setPickupLandmark] = useState("");
  // Same, but for dropoff — required when dropoff is a chosen location
  // (not a saved address) so the driver can find where to deliver.
  const [dropoffLandmark, setDropoffLandmark] = useState("");

  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(
    null,
  );
  const [selectedWeight, setSelectedWeight] = useState<WeightClass | null>(
    null,
  );
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [quotesByVehicle, setQuotesByVehicle] = useState<
    Partial<Record<VehicleType, DeliveryQuote>>
  >({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const [packageDescription, setPackageDescription] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPickupAddressModal, setShowPickupAddressModal] = useState(false);
  const [recentDeliveries, setRecentDeliveries] = useState<DeliverySummary[]>(
    [],
  );
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter vehicles based on selected weight class
  const availableVehicleTypes = selectedWeight
    ? getAvailableVehicles(selectedWeight)
    : (["BIKE", "KEKE_CARGO", "CAR", "VAN", "LORRY"] as VehicleType[]);

  const vehicleOptions: VehicleOption[] = availableVehicleTypes.map((key) => {
    const vehicleQuote = quotesByVehicle[key];
    const vehiclePrice = vehicleQuote?.estimatedPrice ?? null;
    const vehicleTime = vehicleQuote?.estimatedTimeMinutes ?? null;

    return {
      key,
      label: VEHICLE_CONFIG[key].label,
      description: VEHICLE_CONFIG[key].description,
      iconName: VEHICLE_CONFIG[key].iconName,
      estimatedPrice: vehiclePrice,
      estimatedTime: vehicleTime ? `${vehicleTime} min` : undefined,
    };
  });

  const weightOptions: WeightClassOption[] = (
    ["LIGHT", "MEDIUM", "HEAVY"] as WeightClass[]
  ).map((key) => ({
    key,
    label: WEIGHT_CONFIG[key].label,
    description: WEIGHT_CONFIG[key].description,
    iconName: WEIGHT_CONFIG[key].iconName,
  }));

  // Clear selected vehicle if it's not compatible with new weight selection
  useEffect(() => {
    if (selectedWeight && selectedVehicle) {
      const availableVehicles = getAvailableVehicles(selectedWeight);
      if (!availableVehicles.includes(selectedVehicle)) {
        setSelectedVehicle(null);
        Alert.alert(
          "Vehicle Changed",
          `${VEHICLE_CONFIG[selectedVehicle].label} cannot carry ${selectedWeight.toLowerCase()} packages. Please select a different vehicle.`,
        );
      }
    }
  }, [selectedWeight]);

  useEffect(() => {
    let isCancelled = false;

    if (
      selectedWeight &&
      pickupLatitude != null &&
      pickupLongitude != null &&
      dropoffLatitude != null &&
      dropoffLongitude != null
    ) {
      const fetchQuotes = async () => {
        setLoadingQuotes(true);

        try {
          const vehicles = getAvailableVehicles(selectedWeight);
          const quoteEntries = await Promise.all(
            vehicles.map(async (vehicleType) => {
              const response = await expressDeliveryApi.quoteExpressDelivery({
                pickupLatitude,
                pickupLongitude,
                dropoffLatitude,
                dropoffLongitude,
                weightClass: selectedWeight,
                vehicleType,
                isExpress: true,
                priorityLevel: "EXPRESS",
              });

              const payload = response?.data ?? response;
              const pricing = payload?.pricing ?? {};
              const quote: DeliveryQuote = {
                estimatedPrice: Number(
                  pricing.totalFee ?? payload?.estimatedFee ?? NaN,
                ),
                estimatedTimeMinutes: Number(
                  pricing.estimatedTime ?? payload?.estimatedTime ?? NaN,
                ),
                distanceKm: Number(payload?.distanceKm ?? NaN),
              };

              return [vehicleType, quote] as const;
            }),
          );

          if (isCancelled) {
            return;
          }

          const nextQuotes: Partial<Record<VehicleType, DeliveryQuote>> = {};
          quoteEntries.forEach(([vehicleType, quote]) => {
            if (
              Number.isFinite(quote.estimatedPrice) &&
              quote.estimatedPrice > 0 &&
              Number.isFinite(quote.estimatedTimeMinutes) &&
              Number.isFinite(quote.distanceKm)
            ) {
              nextQuotes[vehicleType] = quote;
            }
          });

          setQuotesByVehicle(nextQuotes);
        } catch (error) {
          console.error("Failed to fetch express quotes", error);
          if (!isCancelled) {
            setQuotesByVehicle({});
          }
        } finally {
          if (!isCancelled) {
            setLoadingQuotes(false);
          }
        }
      };

      fetchQuotes();
    } else {
      setQuotesByVehicle({});
      setEstimatedPrice(null);
      setEstimatedTime(null);
      setDistanceKm(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [
    selectedWeight,
    pickupLatitude,
    pickupLongitude,
    dropoffLatitude,
    dropoffLongitude,
  ]);

  useEffect(() => {
    if (!selectedVehicle) {
      setEstimatedPrice(null);
      setEstimatedTime(null);
      setDistanceKm(null);
      return;
    }

    const quote = quotesByVehicle[selectedVehicle];
    setEstimatedPrice(quote?.estimatedPrice ?? null);
    setEstimatedTime(quote?.estimatedTimeMinutes ?? null);
    setDistanceKm(quote?.distanceKm ?? null);
  }, [selectedVehicle, quotesByVehicle]);

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoadingDeliveries(true);
      const response = await customDeliveryApi.listDeliveries();
      const deliveries = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
      setRecentDeliveries(deliveries);
    } catch (e) {
      console.error("Failed to load deliveries", e);
    } finally {
      setLoadingDeliveries(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Refetch whenever the screen regains focus (e.g. returning after a cancel
  // on the detail screen) so recent-delivery cards never show stale status
  useFocusEffect(
    useCallback(() => {
      fetchDeliveries();
    }, [fetchDeliveries]),
  );

  // Load delivery towns once on mount so pickup/dropoff matching works immediately
  useEffect(() => {
    let isMounted = true;
    fetchDeliveryTowns()
      .then((res) => {
        const towns = Array.isArray(res?.data) ? res.data : [];
        if (isMounted) setDeliveryTowns(towns);
      })
      .catch((error) => {
        console.error("Could not fetch delivery towns:", error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedPickupAddress || pickupMode !== "saved") return;
    const nearestTown = findNearestTown(
      selectedPickupAddress.latitude,
      selectedPickupAddress.longitude,
      deliveryTowns,
    );
    if (nearestTown) setPickupTown(nearestTown);
    setPickupLatitude(selectedPickupAddress.latitude);
    setPickupLongitude(selectedPickupAddress.longitude);
    setPickupAddressLabel(
      selectedPickupAddress.addressLine ||
        nearestTown?.name ||
        "Pickup location",
    );
  }, [selectedPickupAddress, pickupMode]);

  // Fetch addresses when component mounts
  useEffect(() => {
    console.log("Custom delivery: fetching addresses...");
    fetchAddresses().then(() => {
      console.log(
        "Custom delivery: addresses fetched, count:",
        addresses?.length || 0,
      );
    });
  }, [fetchAddresses]);

  // Debug log for addresses
  useEffect(() => {
    console.log(
      "Custom delivery: addresses updated:",
      addresses?.length || 0,
      addresses,
    );
  }, [addresses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
  }, [fetchDeliveries]);

  const handlePickupTownSelect = (town: GambianTown) => {
    setPickupTown(town);
    setPickupAddressLabel(town.name);
    setPickupLatitude(town.latitude);
    setPickupLongitude(town.longitude);
  };
  const handleDropoffTownSelect = (town: GambianTown) => {
    setDropoffTown(town);
    setDropoffAddressLabel(town.name);
    setDropoffLatitude(town.latitude);
    setDropoffLongitude(town.longitude);
  };
  const handlePickupGPSLocation = (
    lat: number,
    lon: number,
    address: string,
  ) => {
    setPickupAddressLabel(address || "Pickup location");
    setPickupLatitude(lat);
    setPickupLongitude(lon);
  };
  const handleDropoffGPSLocation = (
    lat: number,
    lon: number,
    address: string,
  ) => {
    setDropoffAddressLabel(address || "Dropoff location");
    setDropoffLatitude(lat);
    setDropoffLongitude(lon);
  };
  const handleSenderDataLoaded = (name: string, phone: string) => {
    setSenderName(name);
    setSenderPhone(phone);
  };

  const handleSavedPickupAddressSelect = async (address: Address) => {
    // Ensure delivery towns are available (fetch on-demand if mount fetch hasn't resolved yet)
    let towns = deliveryTowns;
    if (towns.length === 0) {
      try {
        const townsResponse = await fetchDeliveryTowns();
        towns = Array.isArray(townsResponse?.data) ? townsResponse.data : [];
        setDeliveryTowns(towns);
      } catch (error) {
        console.error("Could not fetch delivery towns:", error);
        Alert.alert(
          "Error",
          "Could not load delivery areas. Please check your connection and try again.",
        );
        return; // Stop execution if towns can't be loaded
      }
    }

    if (towns.length > 0) {
      const nearestTown = findNearestTown(
        address.latitude,
        address.longitude,
        towns,
      );
      if (nearestTown) setPickupTown(nearestTown);
    }

    // Now, set the rest of the address details (local to this booking only)
    setSelectedPickupAddress(address);
    setPickupLatitude(address.latitude);
    setPickupLongitude(address.longitude);
    setPickupAddressLabel(address.addressLine || "Pickup location");
    setShowPickupAddressModal(false);
  };

  const handleSavedDropoffAddressSelect = (address: Address) => {
    setSelectedDropoffAddress(address);
    setDropoffLatitude(address.latitude);
    setDropoffLongitude(address.longitude);
    setDropoffAddressLabel(address.addressLine || "Delivery location");
    // Build a town-like object so existing step/price/payload logic keeps working.
    setDropoffTown({
      id: address.id,
      name: address.addressLine || "Saved location",
      area: address.city || "",
      latitude: address.latitude,
      longitude: address.longitude,
      deliveryZone: "zone1",
    });
    setShowDropoffAddressModal(false);
  };

  const handleFlowDirectionChange = (
    direction: "pickupSaved" | "dropoffSaved",
  ) => {
    if (direction === flowDirection) return;
    setFlowDirection(direction);
    // Clear both pickup and dropoff so stale state from the previous flow
    // doesn't leak into the new one.
    setPickupTown(null);
    setPickupAddressLabel("");
    setPickupLatitude(null);
    setPickupLongitude(null);
    setPickupLandmark("");
    setDropoffTown(null);
    setDropoffAddressLabel("");
    setDropoffLatitude(null);
    setDropoffLongitude(null);
    setDropoffLandmark("");
    setSelectedDropoffAddress(null);
  };

  const handleCreateDelivery = async () => {
    if (!pickupTown || !dropoffTown)
      return Alert.alert("Missing locations", "Select pickup & dropoff.");
    if (!selectedVehicle || !selectedWeight)
      return Alert.alert(
        "Select delivery option",
        "Pick a vehicle and weight class.",
      );
    if (!receiverName.trim() || !receiverPhone.trim())
      return Alert.alert("Receiver required", "Add receiver contact info.");
    if (!pickupLandmark.trim())
      return Alert.alert(
        "Pickup directions required",
        "Describe a landmark or directions so the driver can find the pickup location.",
      );
    if (dropoffMode === "town" && !dropoffLandmark.trim())
      return Alert.alert(
        "Delivery directions required",
        "Describe a landmark or directions so the driver can find the delivery location.",
      );

    setIsSubmitting(true);
    try {
      const pickupAddressWithLandmark = pickupLandmark.trim()
        ? `${pickupAddressLabel || pickupTown.name} — ${pickupLandmark.trim()}`
        : pickupAddressLabel || pickupTown.name;
      const dropoffAddressWithLandmark = dropoffLandmark.trim()
        ? `${dropoffAddressLabel || dropoffTown.name} — ${dropoffLandmark.trim()}`
        : dropoffAddressLabel || dropoffTown.name;

      const payload = {
        pickupAddress: pickupAddressWithLandmark,
        pickupCity: pickupTown.area,
        pickupLatitude: pickupLatitude ?? undefined,
        pickupLongitude: pickupLongitude ?? undefined,
        dropoffAddress: dropoffAddressWithLandmark,
        dropoffCity: dropoffTown.area,
        dropoffLatitude: dropoffLatitude ?? undefined,
        dropoffLongitude: dropoffLongitude ?? undefined,
        packageDescription: packageDescription.trim() || undefined,
        customerNote: customerNote.trim() || undefined,
        weightClass: selectedWeight,
        vehicleType: selectedVehicle,
        senderName: senderName.trim(),
        senderPhone: senderPhone.trim(),
        receiverName: receiverName.trim(),
        receiverPhone: receiverPhone.trim(),
        priorityLevel: "EXPRESS" as const,
        expressDeadlineMinutes: 60,
      };
      const result = await expressDeliveryApi.createExpressDelivery(payload);
      const deliveryId = result?.data?.id ?? result?.id;
      if (deliveryId) {
        Alert.alert(
          "🎉 Request Sent!",
          "Your booking is waiting for admin confirmation. You can pay after admin approves.",
          [
            {
              text: "Track Request",
              onPress: () =>
                router.push({
                  pathname: "/custom-delivery/[deliveryId]",
                  params: { deliveryId },
                }),
            },
            { text: "Done", style: "cancel" },
          ],
        );
      }
      // Reset
      setPickupTown(null);
      setDropoffTown(null);
      setPickupLatitude(null);
      setPickupLongitude(null);
      setDropoffLatitude(null);
      setDropoffLongitude(null);
      setPickupAddressLabel("");
      setDropoffAddressLabel("");
      setSelectedDropoffAddress(null);
      setSelectedPickupAddress(null);
      setFlowDirection("pickupSaved");
      setPickupLandmark("");
      setReceiverName("");
      setReceiverPhone("");
      setPackageDescription("");
      setCustomerNote("");
      setSelectedVehicle(null);
      setSelectedWeight(null);
      fetchDeliveries();
    } catch (error: any) {
      Alert.alert(
        "Request failed",
        error?.message || "Could not submit request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDeliveryCard = ({ item }: { item: DeliverySummary }) => {
    // Determine status to display
    let displayStatus = item.status;

    // Check if it's ready for payment (admin approved but not paid).
    // Terminal states always win — a cancelled/delivered order is never payable.
    if (
      item.status !== "CANCELLED" &&
      item.status !== "DELIVERED" &&
      item.paymentStatus === "UNPAID" &&
      item.trackingUpdates?.some(
        (update) =>
          update.message?.includes("Order Approved") ||
          update.message?.startsWith("[ADMIN_APPROVED_FOR_PAYMENT]"),
      )
    ) {
      displayStatus = "READY_FOR_PAYMENT";
    }

    const chip = STATUS_MAP[displayStatus] ?? STATUS_MAP.PENDING;
    return (
      <TouchableOpacity
        style={s.deliveryCard}
        activeOpacity={0.75}
        onPress={() =>
          router.push({
            pathname: "/custom-delivery/[deliveryId]",
            params: { deliveryId: item.id },
          })
        }
      >
        {/* Route line */}
        <View style={s.routeRow}>
          <View style={s.routeLine}>
            <View style={[s.routeDotTop, { backgroundColor: T.brand }]} />
            <View style={s.routeConnector} />
            <View style={[s.routeDotBot, { backgroundColor: T.accent }]} />
          </View>
          <View style={s.routeAddresses}>
            <View style={s.routeAddrRow}>
              <Text style={s.routeFrom} numberOfLines={1}>
                {item.pickupAddress}
              </Text>
            </View>
            <View style={[s.routeAddrRow, { marginTop: 10 }]}>
              <Text style={s.routeTo} numberOfLines={1}>
                {item.dropoffAddress}
              </Text>
            </View>
          </View>
          <View style={[s.statusChip, { backgroundColor: chip.bg }]}>
            <View style={[s.statusDot, { backgroundColor: chip.dot }]} />
            <Text style={[s.statusLabel, { color: chip.color }]}>
              {chip.label}
            </Text>
          </View>
        </View>

        <View style={s.cardDivider} />

        {/* Footer */}
        <View style={s.cardFooter}>
          <View style={s.cardMeta}>
            <Ionicons name="car-outline" size={11} color={T.textTertiary} />
            <Text style={s.cardMetaText}>
              {item.vehicleType.replace("_", " ")}
            </Text>
            <View style={s.metaDot} />
            <Text style={s.cardMetaText}>{item.weightClass}</Text>
          </View>
          <View style={s.cardRight}>
            {item.estimatedFee != null && (
              <Text style={s.cardFee}>{fmtCurrency(item.estimatedFee)}</Text>
            )}
            <Text style={s.cardDate}>{fmtDate(item.createdAt)}</Text>
            <View style={s.cardArrow}>
              <Ionicons name="chevron-forward" size={12} color={T.brand} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Progress steps
  const step1Done = !!(
    pickupTown &&
    dropoffTown &&
    pickupLandmark.trim().length > 0 &&
    (dropoffMode !== "town" || dropoffLandmark.trim().length > 0)
  );
  const step2Done = !!(selectedVehicle && selectedWeight);
  const step3Done = !!(
    senderName.trim() &&
    senderPhone.trim() &&
    receiverName.trim() &&
    receiverPhone.trim().replace(/\s/g, "").length === 7
  );

  const canSubmit =
    step1Done &&
    step2Done &&
    step3Done &&
    estimatedPrice != null &&
    !loadingQuotes &&
    !isSubmitting;

  if (flags.expressDeliveryMaintenance) {
    return <MaintenanceScreen serviceName="Express Delivery" />;
  }

  if (flags.noDriversWindow?.active) {
    const formatHour = (hour: number) => {
      const period = hour < 12 ? "AM" : "PM";
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      return `${displayHour}:00 ${period}`;
    };
    return (
      <MaintenanceScreen
        serviceName="Express Delivery"
        message={`No drivers are available right now (${formatHour(
          flags.noDriversWindow.startHour,
        )} - ${formatHour(
          flags.noDriversWindow.endHour,
        )}). Please check back later.`}
      />
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.brand}
          />
        }
      >
        {/* ── Hero ─────────────────────────────────────── */}
        <View style={s.hero}>
          {/* Decorative circles */}
          <View style={s.heroDeco1} />
          <View style={s.heroDeco2} />

          {/* Top bar */}
          <View style={s.topBar}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={s.brandRow}>
              <View style={s.brandDot} />
              <Text style={s.brandName}>
                TeranGO <Text style={s.brandTag}>Express</Text>
              </Text>
            </View>
            <TouchableOpacity style={s.helpBtn} activeOpacity={0.8}>
              <Ionicons
                name="help-circle-outline"
                size={22}
                color="rgba(255,255,255,0.5)"
              />
            </TouchableOpacity>
          </View>

          {/* Headline */}
          <View style={s.heroContent}>
            <View style={s.liveBadge}>
              <View style={s.liveDot} />
              <Text style={s.liveTxt}>LIVE TRACKING</Text>
            </View>
            <Text style={s.heroH1}>Send it fast.{"\n"}Track it live.</Text>
            <Text style={s.heroSub}>Local drivers · Instant confirmation</Text>
          </View>

          {/* Stats bar */}
          {/* <View style={s.statsBar}>
            <QuickStat icon="flash-outline" val="~30m" label="Avg Delivery" />
            <View style={s.statsDivider} />
            <QuickStat icon="time-outline" val="~30min" label="Delivery Time" />
            <View style={s.statsDivider} />
            <QuickStat icon="star-outline" val="4.9★" label="Driver Rating" />
          </View> */}
        </View>

        {/* ── Body ─────────────────────────────────────── */}
        <View style={s.body}>
          {/* Progress bar */}
          <View style={s.progressRow}>
            {[
              { n: 1, label: "Route", done: step1Done },
              { n: 2, label: "Vehicle", done: step2Done },
              { n: 3, label: "Details", done: step3Done },
            ].map((step, i, arr) => (
              <React.Fragment key={step.n}>
                <View style={s.progressStep}>
                  <View
                    style={[s.progressBadge, step.done && s.progressBadgeDone]}
                  >
                    {step.done ? (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    ) : (
                      <Text
                        style={[
                          s.progressNum,
                          step.n === 1 && s.progressNumActive,
                        ]}
                      >
                        {step.n}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[s.progressLabel, step.done && s.progressLabelDone]}
                  >
                    {step.label}
                  </Text>
                </View>
                {i < arr.length - 1 && (
                  <View
                    style={[s.progressLine, step.done && s.progressLineDone]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* ── STEP 1: Route ── */}
          <View style={s.section}>
            <SectionHeader
              icon="navigate-outline"
              title="Step 1 · Route"
              subtitle="Pickup & dropoff locations"
            />
            <View style={s.card}>
              {/* Flow direction: exactly two supported flows */}
              <View style={s.flowToggle}>
                <TouchableOpacity
                  style={[
                    s.flowToggleOption,
                    flowDirection === "pickupSaved" && s.flowToggleOptionActive,
                  ]}
                  onPress={() => handleFlowDirectionChange("pickupSaved")}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="home-outline"
                    size={14}
                    color={flowDirection === "pickupSaved" ? "#fff" : "#6B7280"}
                  />
                  <Text
                    style={[
                      s.flowToggleText,
                      flowDirection === "pickupSaved" && s.flowToggleTextActive,
                    ]}
                  >
                    From My Address
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.flowToggleOption,
                    flowDirection === "dropoffSaved" &&
                      s.flowToggleOptionActive,
                  ]}
                  onPress={() => handleFlowDirectionChange("dropoffSaved")}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="home-outline"
                    size={14}
                    color={
                      flowDirection === "dropoffSaved" ? "#fff" : "#6B7280"
                    }
                  />
                  <Text
                    style={[
                      s.flowToggleText,
                      flowDirection === "dropoffSaved" &&
                        s.flowToggleTextActive,
                    ]}
                  >
                    To My Address
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Pickup Location Dropdown */}
              {pickupMode === "saved" && (
                <View style={s.savedLocationBlock}>
                  <Text style={s.savedLocationLabel}>Pickup From</Text>

                  {addresses && addresses.length > 0 ? (
                    <SavedLocationDropdown
                      selectedAddress={selectedPickupAddress}
                      onSelectAddress={handleSavedPickupAddressSelect}
                      addresses={addresses}
                      onAddNew={() => setShowPickupAddressModal(true)}
                      label="Pickup From"
                      placeholder="Select from your saved locations"
                      hideLabel
                    />
                  ) : (
                    <TouchableOpacity
                      style={s.savedLocationEmpty}
                      onPress={() => setShowPickupAddressModal(true)}
                      activeOpacity={0.7}
                    >
                      <View style={s.savedLocationEmptyLeft}>
                        <View style={s.savedLocationIconWrap}>
                          <Ionicons
                            name="location-outline"
                            size={16}
                            color={T.textTertiary}
                          />
                        </View>
                        <Text
                          style={s.savedLocationEmptyText}
                          numberOfLines={1}
                        >
                          {addresses?.length === 0
                            ? "Add your first saved location"
                            : "Loading saved locations…"}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color={T.textTertiary}
                      />
                    </TouchableOpacity>
                  )}

                  {selectedPickupAddress && (
                    <View style={{ marginTop: 16 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: "#111827",
                          marginBottom: 8,
                        }}
                      >
                        Pickup Landmark / Directions *
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: "#F9FAFB",
                          borderWidth: 1.5,
                          borderColor: "#E5E7EB",
                          borderRadius: 16,
                          padding: 14,
                          fontSize: 14,
                          color: "#111827",
                          minHeight: 72,
                          textAlignVertical: "top",
                        }}
                        placeholder="e.g., Near the big mango tree, opposite the mosque, 3rd house on the left..."
                        placeholderTextColor="#9CA3AF"
                        value={pickupLandmark}
                        onChangeText={setPickupLandmark}
                        multiline
                        numberOfLines={3}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 6,
                        }}
                      >
                        Describe landmarks or clear directions so the driver can
                        find your pickup address. This is compulsory.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {selectedPickupAddress && senderName && pickupMode === "saved" ? (
                <View style={s.senderChip}>
                  <Ionicons name="person-circle" size={16} color={T.brand} />
                  <Text style={s.senderChipText} numberOfLines={1}>
                    Sending as {senderName}
                  </Text>
                </View>
              ) : null}

              <View style={s.stepDivider} />

              <UnifiedLocationSection
                pickupTown={pickupTown}
                dropoffTown={dropoffTown}
                pickupAddressDisplay={
                  pickupMode === "saved"
                    ? pickupAddressLabel ||
                      selectedPickupAddress?.addressLine ||
                      ""
                    : pickupAddressLabel
                }
                dropoffAddressDisplay={dropoffAddressLabel || ""}
                useSavedPickupAddress={false}
                hidePickupSection={pickupMode === "saved"}
                onPickupSelect={handlePickupTownSelect}
                onDropoffSelect={handleDropoffTownSelect}
                onPickupGPS={handlePickupGPSLocation}
                onDropoffGPS={handleDropoffGPSLocation}
                senderName={senderName}
                senderPhone={senderPhone}
                receiverName={receiverName}
                receiverPhone={receiverPhone}
                onSenderNameChange={setSenderName}
                onSenderPhoneChange={setSenderPhone}
                onReceiverNameChange={setReceiverName}
                onReceiverPhoneChange={setReceiverPhone}
                onSenderDataLoaded={handleSenderDataLoaded}
                towns={deliveryTowns}
                dropoffMode={dropoffMode}
                savedAddresses={addresses}
                selectedDropoffAddress={selectedDropoffAddress}
                onSelectSavedDropoffAddress={handleSavedDropoffAddressSelect}
                onAddNewDropoffAddress={() => setShowDropoffAddressModal(true)}
                pickupExtraContent={
                  pickupMode === "town" ? (
                    <View style={{ marginBottom: 20 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: "#111827",
                          marginBottom: 8,
                        }}
                      >
                        Pickup Landmark / Directions *
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: "#F9FAFB",
                          borderWidth: 1.5,
                          borderColor: "#E5E7EB",
                          borderRadius: 16,
                          padding: 14,
                          fontSize: 14,
                          color: "#111827",
                          minHeight: 72,
                          textAlignVertical: "top",
                        }}
                        placeholder="e.g., Near the big mango tree, opposite the mosque, 3rd house on the left..."
                        placeholderTextColor="#9CA3AF"
                        value={pickupLandmark}
                        onChangeText={setPickupLandmark}
                        multiline
                        numberOfLines={3}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 6,
                        }}
                      >
                        Describe landmarks or clear directions so the driver can
                        find the pickup location
                      </Text>
                    </View>
                  ) : undefined
                }
                dropoffExtraContent={
                  dropoffMode === "town" ? (
                    <View style={{ marginBottom: 20 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: "#111827",
                          marginBottom: 8,
                        }}
                      >
                        Delivery Landmark / Directions *
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: "#F9FAFB",
                          borderWidth: 1.5,
                          borderColor: "#E5E7EB",
                          borderRadius: 16,
                          padding: 14,
                          fontSize: 14,
                          color: "#111827",
                          minHeight: 72,
                          textAlignVertical: "top",
                        }}
                        placeholder="e.g., Near the big mango tree, opposite the mosque, 3rd house on the left..."
                        placeholderTextColor="#9CA3AF"
                        value={dropoffLandmark}
                        onChangeText={setDropoffLandmark}
                        multiline
                        numberOfLines={3}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 6,
                        }}
                      >
                        Describe landmarks or clear directions so the driver can
                        find the delivery location
                      </Text>
                    </View>
                  ) : undefined
                }
              />
            </View>
          </View>

          {/* ── STEP 2a: Weight ── */}
          {step1Done && (
            <View style={s.section}>
              <SectionHeader
                icon="scale-outline"
                title="Step 2 · Package Weight"
                subtitle="How heavy is the item?"
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.hScrollContent}
                style={s.hScroll}
              >
                {weightOptions.map((w) => (
                  <ExpressWeightClassCard
                    key={w.key}
                    weightClass={w}
                    selected={selectedWeight === w.key}
                    onPress={() => setSelectedWeight(w.key)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── STEP 2b: Vehicle with Prices ── */}
          {step1Done && selectedWeight && (
            <View style={s.section}>
              <SectionHeader
                icon="car-sport-outline"
                title="Choose Vehicle"
                subtitle="Prices vary by vehicle type"
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.hScrollContent}
                style={s.hScroll}
              >
                {vehicleOptions.map((v) => (
                  <ExpressVehicleCard
                    key={v.key}
                    vehicle={v}
                    selected={selectedVehicle === v.key}
                    onPress={() => setSelectedVehicle(v.key)}
                    showPrice
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── STEP 3: Package details ── */}
          {step2Done && (
            <View style={s.section}>
              <SectionHeader
                icon="cube-outline"
                title="Step 3 · Package Info"
                subtitle="Optional but helpful for driver"
              />
              <View style={s.card}>
                <FieldInput
                  icon="cube-outline"
                  placeholder="What are you sending? (e.g. documents, food)"
                  value={packageDescription}
                  onChangeText={setPackageDescription}
                  maxLength={100}
                  label="Package Description"
                />
                <FieldInput
                  icon="chatbubble-ellipses-outline"
                  placeholder="Any special instructions for the driver?"
                  value={customerNote}
                  onChangeText={setCustomerNote}
                  maxLength={200}
                  multiline
                  label="Driver Notes"
                />
              </View>
            </View>
          )}

          {/* ── Price Summary ── */}
          {estimatedPrice != null && distanceKm != null && (
            <View style={s.priceCard}>
              <View style={s.priceTop}>
                <View>
                  <Text style={s.priceTitleSmall}>Estimated Total</Text>
                  <Text style={s.priceBig}>D{estimatedPrice.toFixed(0)}</Text>
                </View>
                <View style={s.priceTagBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={T.brand} />
                  <Text style={s.priceTagText}>Price confirmed</Text>
                </View>
              </View>
              <View style={s.priceDivider} />
              <View style={s.priceMeta}>
                <View style={s.priceMetaItem}>
                  <View style={s.priceMetaIcon}>
                    <Ionicons
                      name="navigate-outline"
                      size={13}
                      color={T.brand}
                    />
                  </View>
                  <View>
                    <Text style={s.priceMetaVal}>
                      {distanceKm.toFixed(1)} km
                    </Text>
                    <Text style={s.priceMetaLbl}>Distance</Text>
                  </View>
                </View>
                <View style={s.priceMetaDivider} />
                <View style={s.priceMetaItem}>
                  <View style={s.priceMetaIcon}>
                    <Ionicons name="time-outline" size={13} color={T.brand} />
                  </View>
                  <View>
                    <Text style={s.priceMetaVal}>{estimatedTime} min</Text>
                    <Text style={s.priceMetaLbl}>Est. Time</Text>
                  </View>
                </View>
                <View style={s.priceMetaDivider} />
                <View style={s.priceMetaItem}>
                  <View style={s.priceMetaIcon}>
                    <Ionicons name="car-outline" size={13} color={T.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.priceMetaVal} numberOfLines={1}>
                      {selectedVehicle === "KEKE_CARGO"
                        ? "Keke"
                        : selectedVehicle?.replace("_", " ")}
                    </Text>
                    <Text style={s.priceMetaLbl}>Vehicle</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ── CTA Button ── */}
          <TouchableOpacity
            style={[s.bookBtn, !canSubmit && s.bookBtnOff]}
            onPress={handleCreateDelivery}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={s.bookBtnRow}>
                <View style={s.bookBtnLeft}>
                  <View style={[s.bookIcon, !canSubmit && s.bookIconOff]}>
                    <Ionicons
                      name="flash"
                      size={14}
                      color={canSubmit ? T.brand : T.textTertiary}
                    />
                  </View>
                  <Text style={[s.bookBtnText, !canSubmit && s.bookBtnTextOff]}>
                    {canSubmit
                      ? `Continue · D${estimatedPrice?.toFixed(0)}`
                      : "Complete all steps"}
                  </Text>
                </View>
                <View style={[s.bookArrow, !canSubmit && s.bookArrowOff]}>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={canSubmit ? "#fff" : T.textTertiary}
                  />
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* ── Trust signals ── */}
          <View style={s.trustRow}>
            {[
              { icon: "location-outline", text: "Real-time tracking" },
              // { icon: "cash-outline", text: "Pay with wave" },
              { icon: "people-outline", text: "Trusted drivers" },
            ].map((t) => (
              <View style={s.trustItem} key={t.text}>
                <Ionicons name={t.icon as any} size={12} color={T.brand} />
                <Text style={s.trustText}>{t.text}</Text>
              </View>
            ))}
          </View>

          {/* ── Recent Deliveries ── */}
          <View style={s.recentSection}>
            <View style={s.recentHeader}>
              <View style={s.recentTitleRow}>
                <Text style={s.recentTitle}>Recent Deliveries</Text>
                {recentDeliveries.length > 0 && (
                  <View style={s.recentBadge}>
                    <Text style={s.recentBadgeTxt}>
                      {recentDeliveries.length}
                    </Text>
                  </View>
                )}
              </View>
              {recentDeliveries.length > 0 && (
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/orders")}
                  activeOpacity={0.7}
                >
                  <Text style={s.seeAll}>See all</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingDeliveries ? (
              <View style={s.stateBox}>
                <ActivityIndicator color={T.brand} size="small" />
                <Text style={s.stateText}>Loading deliveries…</Text>
              </View>
            ) : recentDeliveries.length === 0 ? (
              <View style={s.emptyBox}>
                <View style={s.emptyIconWrap}>
                  <Ionicons name="cube-outline" size={32} color={T.brand} />
                </View>
                <Text style={s.emptyTitle}>No deliveries yet</Text>
                <Text style={s.emptyText}>
                  Your delivery history will appear here once you create your
                  first booking.
                </Text>
              </View>
            ) : (
              <FlatList
                data={recentDeliveries}
                keyExtractor={(item) => item.id}
                renderItem={renderDeliveryCard}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            )}
          </View>
        </View>
      </ScrollView>

      <LocationModal
        visible={showPickupAddressModal}
        onClose={() => setShowPickupAddressModal(false)}
        onSelectAddress={handleSavedPickupAddressSelect}
        currentAddress={
          pickupAddressLabel || selectedPickupAddress?.addressLine
        }
      />

      <LocationModal
        visible={showDropoffAddressModal}
        onClose={() => setShowDropoffAddressModal(false)}
        onSelectAddress={handleSavedDropoffAddressSelect}
        currentAddress={dropoffAddressLabel}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.heroBase },
  scroll: { flex: 1, backgroundColor: T.heroBase },
  scrollContent: { paddingBottom: 48 },

  // ── Hero ───────────────────────────────────────────────
  hero: {
    backgroundColor: T.heroBase,
    paddingBottom: 20,
    overflow: "hidden",
    position: "relative",
  },
  heroDeco1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: T.brandSoft,
    top: -80,
    right: -60,
  },
  heroDeco2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,107,0,0.06)",
    bottom: 10,
    left: -40,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: T.heroCard,
    borderWidth: 1,
    borderColor: T.heroBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  brandRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.brand,
  },
  brandName: {
    fontSize: 17,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  brandTag: {
    color: T.brand,
    fontWeight: "500",
    fontSize: 14,
  },
  helpBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  heroContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: T.brandSoft,
    borderWidth: 1,
    borderColor: "rgba(0,177,79,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.brand,
  },
  liveTxt: {
    fontSize: 10,
    fontWeight: "800",
    color: T.brand,
    letterSpacing: 1.2,
  },
  heroH1: {
    fontSize: 34,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 40,
    letterSpacing: -1,
    marginBottom: 8,
  },
  heroSub: { fontSize: 14, color: T.heroTextDim, fontWeight: "500" },

  statsBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: T.heroCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.heroBorder,
    overflow: "hidden",
  },
  statsDivider: { width: 1, backgroundColor: T.heroBorder },

  // ── Body ───────────────────────────────────────────────
  body: {
    backgroundColor: T.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 20,
    minHeight: 500,
  },

  // ── Progress ───────────────────────────────────────────
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  progressStep: { alignItems: "center", gap: 5 },
  progressBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBadgeDone: { backgroundColor: T.brand },
  progressNum: { fontSize: 12, fontWeight: "800", color: T.textTertiary },
  progressNumActive: { color: T.brand },
  progressLabel: { fontSize: 10, fontWeight: "600", color: T.textTertiary },
  progressLabelDone: { color: T.brand },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: T.border,
    borderRadius: 1,
    marginHorizontal: 6,
    marginBottom: 14,
  },
  progressLineDone: { backgroundColor: T.brand },

  // ── Section ────────────────────────────────────────────
  section: { marginBottom: 20 },
  card: {
    backgroundColor: T.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  stepDivider: {
    height: 1,
    backgroundColor: T.border,
    marginBottom: 20,
  },

  hScroll: { marginHorizontal: -18 },
  hScrollContent: { paddingHorizontal: 18, gap: 10 },

  senderChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: T.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  senderChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: T.brandDark,
  },

  locationLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  flowToggle: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  flowToggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  flowToggleOptionActive: {
    backgroundColor: T.brand,
  },
  flowToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  flowToggleTextActive: {
    color: "#FFFFFF",
  },

  // ── Price card ─────────────────────────────────────────
  priceCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: T.brand,
    ...Platform.select({
      ios: {
        shadowColor: T.brand,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  priceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  priceTitleSmall: {
    fontSize: 11,
    fontWeight: "700",
    color: T.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceBig: {
    fontSize: 36,
    fontWeight: "900",
    color: T.textPrimary,
    letterSpacing: -1,
  },
  priceTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: T.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceTagText: { fontSize: 11, fontWeight: "700", color: T.brand },
  priceDivider: { height: 1, backgroundColor: T.bg, marginBottom: 14 },
  priceMeta: { flexDirection: "row", alignItems: "center" },
  priceMetaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceMetaIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: T.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  priceMetaVal: {
    fontSize: 13,
    fontWeight: "800",
    color: T.textPrimary,
    flexShrink: 1,
  },
  priceMetaLbl: { fontSize: 10, color: T.textTertiary, fontWeight: "500" },
  priceMetaDivider: {
    width: 1,
    height: 28,
    backgroundColor: T.border,
    marginHorizontal: 4,
  },

  // ── Book button ────────────────────────────────────────
  bookBtn: {
    backgroundColor: T.brand,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: T.brand,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  bookBtnOff: { backgroundColor: "#E8EDF2", shadowOpacity: 0, elevation: 0 },
  bookBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bookBtnLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  bookIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  bookIconOff: { backgroundColor: T.border },
  bookBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.2,
  },
  bookBtnTextOff: { color: T.textTertiary },
  bookArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  bookArrowOff: { backgroundColor: T.border },

  // ── Trust ──────────────────────────────────────────────
  trustRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 28,
  },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustText: { fontSize: 10, color: T.textTertiary, fontWeight: "600" },

  // ── Recent ─────────────────────────────────────────────
  recentSection: {},
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  recentTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  recentTitle: { fontSize: 16, fontWeight: "800", color: T.textPrimary },
  recentBadge: {
    backgroundColor: T.brandSoft,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recentBadgeTxt: { fontSize: 11, fontWeight: "800", color: T.brand },
  seeAll: { fontSize: 13, fontWeight: "700", color: T.brand },

  stateBox: {
    backgroundColor: T.surface,
    borderRadius: 18,
    padding: 36,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  stateText: { fontSize: 13, color: T.textTertiary, fontWeight: "500" },

  emptyBox: {
    backgroundColor: T.surface,
    borderRadius: 18,
    padding: 36,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: T.brandFaint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: T.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: T.textTertiary,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },

  // ── Delivery card ──────────────────────────────────────
  deliveryCard: {
    backgroundColor: T.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  routeLine: { alignItems: "center", width: 12, paddingVertical: 2 },
  routeDotTop: { width: 10, height: 10, borderRadius: 5 },
  routeConnector: {
    width: 2,
    height: 18,
    backgroundColor: T.border,
    marginVertical: 2,
  },
  routeDotBot: { width: 10, height: 10, borderRadius: 5 },
  routeAddresses: { flex: 1, gap: 0 },
  routeAddrRow: { justifyContent: "center" },
  routeFrom: { fontSize: 13, fontWeight: "700", color: T.textPrimary },
  routeTo: { fontSize: 13, fontWeight: "600", color: T.textSecondary },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: "800" },
  cardDivider: { height: 1, backgroundColor: T.bg, marginBottom: 12 },
  cardFooter: { flexDirection: "row", alignItems: "center" },
  cardMeta: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  cardMetaText: { fontSize: 11, color: T.textTertiary, fontWeight: "600" },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: T.border },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardFee: { fontSize: 13, fontWeight: "800", color: T.textPrimary },
  cardDate: { fontSize: 10, color: T.textTertiary, fontWeight: "500" },
  cardArrow: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: T.brandFaint,
    alignItems: "center",
    justifyContent: "center",
  },
  savedLocationBlock: { marginBottom: 20 },
  savedLocationLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: T.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  savedLocationEmpty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
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
    color: T.textTertiary,
    fontWeight: "500",
    flexShrink: 1,
  },
});
