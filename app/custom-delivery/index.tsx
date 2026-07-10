import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

// ── Brand palette (unchanged) ─────────────────────────────
const T = {
  brand: "#FF6B00",
  brandDark: "#E55A00",
  brandSoft: "rgba(255,107,0,0.10)",
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  pageBg: "#F7F8FA",
  border: "#EBEBEB",
  textPrimary: "#111111",
  textSecondary: "#555555",
  textTertiary: "#9CA3AF",
  success: "#10B981",
  successSoft: "rgba(16,185,129,0.10)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.08)",
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.10)",
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
  PENDING: { label: "Pending", bg: T.brandSoft, color: T.brand, dot: T.brand },
  READY_FOR_PAYMENT: {
    label: "Ready to Pay",
    bg: T.successSoft,
    color: T.success,
    dot: T.success,
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
    bg: T.brandSoft,
    color: T.brand,
    dot: T.brand,
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

// ── Gradient step badge ────────────────────────────────────
function StepBadge({ n }: { n: number }) {
  return (
    <LinearGradient
      colors={[T.brand, T.brandDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.stepBadge}
    >
      <Text style={s.stepBadgeText}>{n}</Text>
    </LinearGradient>
  );
}

// ── Main Screen ────────────────────────────────────────────
export default function CustomDeliveryScreen() {
  const { flags, refetch: refetchMaintenanceFlags } = useMaintenance();
  const router = useRouter();
  const { addresses, fetchAddresses } = useAddress();

  useEffect(() => {
    refetchMaintenanceFlags();
  }, [refetchMaintenanceFlags]);

  // Gentle floating animation for the hero rider
  const bikeFloat = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bikeFloat, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(bikeFloat, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bikeFloat]);
  const bikeTranslateY = bikeFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const [deliveryTowns, setDeliveryTowns] = useState<DeliveryTown[]>([]);
  const [pickupTown, setPickupTown] = useState<GambianTown | null>(null);
  const [dropoffTown, setDropoffTown] = useState<GambianTown | null>(null);
  const [pickupAddressLabel, setPickupAddressLabel] = useState("");
  const [dropoffAddressLabel, setDropoffAddressLabel] = useState("");
  const [pickupLatitude, setPickupLatitude] = useState<number | null>(null);
  const [pickupLongitude, setPickupLongitude] = useState<number | null>(null);
  const [dropoffLatitude, setDropoffLatitude] = useState<number | null>(null);
  const [dropoffLongitude, setDropoffLongitude] = useState<number | null>(null);

  const [flowDirection, setFlowDirection] = useState<
    "pickupSaved" | "dropoffSaved"
  >("pickupSaved");
  const pickupMode = flowDirection === "pickupSaved" ? "saved" : "town";
  const dropoffMode = flowDirection === "pickupSaved" ? "town" : "saved";

  const [selectedPickupAddress, setSelectedPickupAddress] =
    useState<Address | null>(null);
  const [selectedDropoffAddress, setSelectedDropoffAddress] =
    useState<Address | null>(null);
  const [showDropoffAddressModal, setShowDropoffAddressModal] = useState(false);
  const [pickupLandmark, setPickupLandmark] = useState("");
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

  const availableVehicleTypes = selectedWeight
    ? getAvailableVehicles(selectedWeight)
    : (["BIKE", "KEKE_CARGO", "CAR", "VAN", "LORRY"] as VehicleType[]);

  const vehicleOptions: VehicleOption[] = availableVehicleTypes.map((key) => {
    const vehicleQuote = quotesByVehicle[key];
    return {
      key,
      label: VEHICLE_CONFIG[key].label,
      description: VEHICLE_CONFIG[key].description,
      iconName: VEHICLE_CONFIG[key].iconName,
      estimatedPrice: vehicleQuote?.estimatedPrice ?? null,
      estimatedTime: vehicleQuote?.estimatedTimeMinutes
        ? `${vehicleQuote.estimatedTimeMinutes} min`
        : undefined,
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
          if (isCancelled) return;
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
          if (!isCancelled) setQuotesByVehicle({});
        } finally {
          if (!isCancelled) setLoadingQuotes(false);
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
      const response = await customDeliveryApi.listDeliveries({ limit: 5 });
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

  useFocusEffect(
    useCallback(() => {
      fetchDeliveries();
    }, [fetchDeliveries]),
  );

  useEffect(() => {
    let isMounted = true;
    fetchDeliveryTowns()
      .then((res) => {
        const towns = Array.isArray(res?.data) ? res.data : [];
        if (isMounted) setDeliveryTowns(towns);
      })
      .catch((error) =>
        console.error("Could not fetch delivery towns:", error),
      );
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

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

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
    let towns = deliveryTowns;
    if (towns.length === 0) {
      try {
        const townsResponse = await fetchDeliveryTowns();
        towns = Array.isArray(townsResponse?.data) ? townsResponse.data : [];
        setDeliveryTowns(towns);
      } catch (error) {
        Alert.alert(
          "Error",
          "Could not load delivery areas. Please check your connection and try again.",
        );
        return;
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
    if (pickupMode !== "saved" && !pickupLandmark.trim())
      return Alert.alert(
        "Pickup directions required",
        "Describe a landmark so the driver can find the pickup.",
      );
    if (dropoffMode === "town" && !dropoffLandmark.trim())
      return Alert.alert(
        "Delivery directions required",
        "Describe a landmark so the driver can find the delivery.",
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
          "Request Sent!",
          "Your booking is with our team. We'll notify you once confirmed and ready for payment.",
          [
            {
              text: "Track It",
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

      // Reset form
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

  // ── Progress ──────────────────────────────────────────────
  const step1Done = !!(
    pickupTown &&
    dropoffTown &&
    (pickupMode === "saved" || pickupLandmark.trim().length > 0) &&
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

  // ── Render delivery card ───────────────────────────────────
  const renderDeliveryCard = ({ item }: { item: DeliverySummary }) => {
    let displayStatus = item.status;
    if (
      item.status !== "CANCELLED" &&
      item.status !== "DELIVERED" &&
      item.paymentStatus === "UNPAID" &&
      item.trackingUpdates?.some(
        (u) =>
          u.message?.includes("Order Approved") ||
          u.message?.startsWith("[ADMIN_APPROVED_FOR_PAYMENT]"),
      )
    ) {
      displayStatus = "READY_FOR_PAYMENT";
    }
    const chip = STATUS_MAP[displayStatus] ?? STATUS_MAP.PENDING;

    return (
      <TouchableOpacity
        style={s.deliveryCard}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/custom-delivery/[deliveryId]",
            params: { deliveryId: item.id },
          })
        }
      >
        {/* Route */}
        <View style={s.cardRoute}>
          <View style={s.cardRouteLine}>
            <View style={[s.cardDot, { backgroundColor: T.brand }]} />
            <View style={s.cardConnector} />
            <View style={[s.cardDot, { backgroundColor: T.success }]} />
          </View>
          <View style={s.cardAddresses}>
            <Text style={s.cardFrom} numberOfLines={1}>
              {item.pickupAddress}
            </Text>
            <View style={{ height: 14 }} />
            <Text style={s.cardTo} numberOfLines={1}>
              {item.dropoffAddress}
            </Text>
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
          <Text style={s.cardMeta}>
            {item.vehicleType.replace("_", " ")} · {item.weightClass}
          </Text>
          <View style={s.cardRight}>
            {item.estimatedFee != null && (
              <Text style={s.cardFee}>{fmtCurrency(item.estimatedFee)}</Text>
            )}
            <Text style={s.cardDate}>{fmtDate(item.createdAt)}</Text>
            <Ionicons name="chevron-forward" size={14} color={T.textTertiary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Maintenance gates ──────────────────────────────────────
  if (flags.expressDeliveryMaintenance) {
    return <MaintenanceScreen serviceName="Express Delivery" />;
  }
  if (flags.noDriversWindow?.active) {
    const fmt = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;
    return (
      <MaintenanceScreen
        serviceName="Express Delivery"
        message={`No drivers available (${fmt(flags.noDriversWindow.startHour)} – ${fmt(flags.noDriversWindow.endHour)}). Please check back later.`}
      />
    );
  }

  // ── Render ─────────────────────────────────────────────────
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
        {/* ── Hero ── */}
        <View style={s.hero}>
          <LinearGradient
            colors={["#1B1714", "#2A211A", "#171310"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Ambient orange glow */}
          <View style={s.heroGlowTop} />

          {/* Top bar */}
          <View style={s.heroTopBar}>
            <TouchableOpacity
              style={s.heroIconBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={s.heroBrand}>
              TeranGO <Text style={s.heroBrandAccent}>Express</Text>
            </Text>
            <TouchableOpacity style={s.heroIconBtn} activeOpacity={0.8}>
              <Ionicons
                name="help-circle-outline"
                size={20}
                color="rgba(255,255,255,0.55)"
              />
            </TouchableOpacity>
          </View>

          {/* Headline */}
          <View style={s.heroContent}>
            <View style={s.heroPill}>
              <View style={s.heroPillDot} />
              <Text style={s.heroPillText}>LIVE TRACKING</Text>
            </View>
            <Text style={s.heroHeadline}>Send it now.{"\n"}Track it live.</Text>
            <Text style={s.heroSub}>Fast local riders, anywhere in Gambia</Text>
          </View>

          {/* Driver graphic */}
          <View style={s.heroImageWrap} pointerEvents="none">
            <View style={s.heroImageGlow} />
            <View style={[s.speedLine, { top: 52, width: 26, opacity: 0.4 }]} />
            <View style={[s.speedLine, { top: 70, width: 42, opacity: 0.6 }]} />
            <View
              style={[s.speedLine, { top: 88, width: 20, opacity: 0.35 }]}
            />
            <Animated.Image
              source={require("@/assets/images/motorbike.png")}
              style={[
                s.heroImage,
                { transform: [{ translateY: bikeTranslateY }] },
              ]}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ── Role Toggle: I'm Sending / I'm Receiving ── */}
        <View style={s.roleWrap}>
          <TouchableOpacity
            style={[
              s.roleBtn,
              flowDirection === "pickupSaved" && s.roleBtnActive,
            ]}
            onPress={() => handleFlowDirectionChange("pickupSaved")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-up-circle-outline"
              size={18}
              color={flowDirection === "pickupSaved" ? "#fff" : T.textTertiary}
            />
            <Text
              style={[
                s.roleBtnText,
                flowDirection === "pickupSaved" && s.roleBtnTextActive,
              ]}
            >
              I'm Sending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.roleBtn,
              flowDirection === "dropoffSaved" && s.roleBtnActive,
            ]}
            onPress={() => handleFlowDirectionChange("dropoffSaved")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-down-circle-outline"
              size={18}
              color={flowDirection === "dropoffSaved" ? "#fff" : T.textTertiary}
            />
            <Text
              style={[
                s.roleBtnText,
                flowDirection === "dropoffSaved" && s.roleBtnTextActive,
              ]}
            >
              I'm Receiving
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Step 1: Location ── */}
        <View style={s.block}>
          <View style={s.blockHeader}>
            <StepBadge n={1} />
            <Text style={s.blockTitle}>Route</Text>
            {step1Done && (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={T.success}
                style={{ marginLeft: "auto" }}
              />
            )}
          </View>

          {/* Pickup — your saved address (only shown in "I'm Sending" mode;
              in "I'm Receiving" mode the pickup town selector is rendered by
              UnifiedLocationSection below). */}
          {pickupMode === "saved" && (
            <View style={s.pickupRow}>
              <View style={s.pickupDotCol}>
                <View style={[s.locDot, { backgroundColor: T.success }]} />
                <View style={s.pickupDotLine} />
              </View>
              <View style={s.pickupBody}>
                <Text style={s.fieldLabel}>Pickup · your location</Text>
                {addresses && addresses.length > 0 ? (
                  <SavedLocationDropdown
                    selectedAddress={selectedPickupAddress}
                    onSelectAddress={handleSavedPickupAddressSelect}
                    addresses={addresses}
                    onAddNew={() => setShowPickupAddressModal(true)}
                    label="Pickup From"
                    placeholder="Select your saved location"
                    hideLabel
                  />
                ) : (
                  <TouchableOpacity
                    style={s.locEmptyBtn}
                    onPress={() => setShowPickupAddressModal(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={T.textTertiary}
                    />
                    <Text style={s.locEmptyText}>Add a saved location</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={T.textTertiary}
                      style={{ marginLeft: "auto" }}
                    />
                  </TouchableOpacity>
                )}
                {selectedPickupAddress && senderName ? (
                  <Text style={s.senderHint}>Sending as {senderName}</Text>
                ) : null}
              </View>
            </View>
          )}

          {/* The existing location section handles the detailed dropoff / pickup-town / contacts */}
          <View style={s.unifiedWrap}>
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
                  <View style={s.landmarkWrap}>
                    <Text style={s.landmarkLabel}>
                      Pickup landmark / directions *
                    </Text>
                    <TextInput
                      style={s.landmarkInput}
                      placeholder="e.g. Near the big mango tree, opposite the mosque..."
                      placeholderTextColor={T.textTertiary}
                      value={pickupLandmark}
                      onChangeText={setPickupLandmark}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                ) : undefined
              }
              dropoffExtraContent={
                dropoffMode === "town" ? (
                  <View style={s.landmarkWrap}>
                    <Text style={s.landmarkLabel}>
                      Delivery landmark / directions *
                    </Text>
                    <TextInput
                      style={s.landmarkInput}
                      placeholder="e.g. Near the big mango tree, opposite the mosque..."
                      placeholderTextColor={T.textTertiary}
                      value={dropoffLandmark}
                      onChangeText={setDropoffLandmark}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                ) : undefined
              }
            />
          </View>
        </View>

        {/* ── Step 2: Package weight ── */}
        {step1Done && (
          <View style={s.block}>
            <View style={s.blockHeader}>
              <StepBadge n={2} />
              <Text style={s.blockTitle}>Package Size</Text>
              {selectedWeight && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={T.success}
                  style={{ marginLeft: "auto" }}
                />
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.hScrollContent}
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

        {/* ── Step 2b: Vehicle ── */}
        {step1Done && selectedWeight && (
          <View style={s.block}>
            <View style={s.blockHeader}>
              <StepBadge n={3} />
              <Text style={s.blockTitle}>Vehicle</Text>
              {selectedVehicle && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={T.success}
                  style={{ marginLeft: "auto" }}
                />
              )}
            </View>
            {loadingQuotes && (
              <View style={s.quotingRow}>
                <ActivityIndicator size="small" color={T.brand} />
                <Text style={s.quotingText}>Getting prices…</Text>
              </View>
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.hScrollContent}
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

        {/* ── Step 4: Package notes (optional) ── */}
        {step2Done && (
          <View style={s.block}>
            <View style={s.blockHeader}>
              <StepBadge n={4} />
              <Text style={s.blockTitle}>Package Notes</Text>
              <Text style={s.blockOptional}>Optional</Text>
            </View>
            <TextInput
              style={s.noteInput}
              placeholder="What are you sending? Any special instructions?"
              placeholderTextColor={T.textTertiary}
              value={packageDescription}
              onChangeText={setPackageDescription}
              maxLength={200}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* ── Price Summary ── */}
        {estimatedPrice != null && distanceKm != null && (
          <View style={s.priceCard}>
            <View style={s.priceRow}>
              <View>
                <Text style={s.priceSub}>Estimated total</Text>
                <Text style={s.priceAmount}>D{estimatedPrice.toFixed(0)}</Text>
              </View>
              <View style={s.priceMeta}>
                <View style={s.priceMetaItem}>
                  <Ionicons name="navigate-outline" size={13} color={T.brand} />
                  <Text style={s.priceMetaText}>
                    {distanceKm.toFixed(1)} km
                  </Text>
                </View>
                <View style={s.priceMetaItem}>
                  <Ionicons name="time-outline" size={13} color={T.brand} />
                  <Text style={s.priceMetaText}>{estimatedTime} min</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Book Button ── */}
        <View style={s.ctaWrap}>
          <TouchableOpacity
            style={[s.bookBtn, !canSubmit && s.bookBtnOff]}
            onPress={handleCreateDelivery}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[s.bookBtnText, !canSubmit && s.bookBtnTextOff]}>
                {canSubmit
                  ? `Book · D${estimatedPrice?.toFixed(0)}`
                  : "Complete all steps above"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Recent Deliveries (last 5 — full history lives in Activities) ── */}
        <View style={s.recentWrap}>
          <View style={s.recentHeader}>
            <Text style={s.recentTitle}>Recent Deliveries</Text>
          </View>

          {loadingDeliveries ? (
            <View style={s.stateBox}>
              <ActivityIndicator color={T.brand} size="small" />
            </View>
          ) : recentDeliveries.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="cube-outline" size={28} color={T.textTertiary} />
              <Text style={s.emptyText}>No deliveries yet</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={recentDeliveries}
                keyExtractor={(item) => item.id}
                renderItem={renderDeliveryCard}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
              <TouchableOpacity
                style={s.seeMoreBtn}
                onPress={() => router.push("/(tabs)/orders")}
                activeOpacity={0.75}
              >
                <Text style={s.seeMoreText}>See more</Text>
                <Ionicons name="chevron-forward" size={14} color={T.brand} />
              </TouchableOpacity>
            </>
          )}
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

// ── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#1B1714" },
  scroll: { flex: 1, backgroundColor: T.pageBg },
  scrollContent: { paddingBottom: 48 },

  // Hero
  hero: {
    paddingBottom: 34,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
    position: "relative",
  },
  heroGlowTop: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255,107,0,0.16)",
    top: -90,
    right: -50,
  },
  heroTopBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBrand: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  heroBrandAccent: { color: T.brand, fontWeight: "600" },
  heroContent: {
    paddingHorizontal: 22,
    paddingTop: 20,
    maxWidth: "66%",
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,107,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,107,0,0.32)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  heroPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.brand,
  },
  heroPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: T.brand,
    letterSpacing: 1,
  },
  heroHeadline: {
    fontSize: 29,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 34,
    letterSpacing: -1,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.62)",
    fontWeight: "500",
    lineHeight: 18,
  },
  heroImageWrap: {
    position: "absolute",
    right: -8,
    bottom: 0,
    width: 190,
    height: 180,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  heroImageGlow: {
    position: "absolute",
    bottom: 18,
    width: 155,
    height: 155,
    borderRadius: 78,
    backgroundColor: "rgba(255,107,0,0.20)",
  },
  heroImage: { width: 186, height: 164 },
  speedLine: {
    position: "absolute",
    left: 2,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.brand,
  },

  // Role toggle
  roleWrap: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: -22,
    marginBottom: 18,
    backgroundColor: T.bg,
    borderRadius: 18,
    padding: 5,
    borderWidth: 1,
    borderColor: T.border,
    gap: 5,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
  },
  roleBtnActive: { backgroundColor: T.brand },
  roleBtnText: { fontSize: 13, fontWeight: "700", color: T.textTertiary },
  roleBtnTextActive: { color: "#fff" },

  // Blocks
  block: {
    backgroundColor: T.bg,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 18,
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
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: T.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  blockTitle: { fontSize: 15, fontWeight: "700", color: T.textPrimary },
  blockOptional: {
    marginLeft: "auto",
    fontSize: 11,
    fontWeight: "600",
    color: T.textTertiary,
    backgroundColor: T.pageBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // Location card (visual route indicator)
  pickupRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  pickupDotCol: { alignItems: "center", paddingTop: 6, width: 14 },
  pickupDotLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: T.border,
    marginTop: 4,
  },
  pickupBody: { flex: 1 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: T.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  locDot: { width: 10, height: 10, borderRadius: 5 },
  locEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.bg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locEmptyText: {
    fontSize: 14,
    color: T.textTertiary,
    fontWeight: "500",
    flex: 1,
  },
  senderHint: {
    fontSize: 12,
    color: T.brand,
    fontWeight: "600",
    marginTop: 6,
  },

  // Unified section wrapper (keeps existing component, just adds spacing)
  unifiedWrap: { marginTop: 4 },

  // Landmark input
  landmarkWrap: { marginBottom: 16, paddingTop: 20 },
  landmarkLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: T.textPrimary,
    marginBottom: 8,
  },
  landmarkInput: {
    backgroundColor: T.pageBg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: T.textPrimary,
    minHeight: 80,
    textAlignVertical: "top",
  },

  // Horizontal scroll
  hScrollContent: { gap: 10, paddingHorizontal: 2, paddingBottom: 4 },

  // Quotes loading
  quotingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  quotingText: { fontSize: 13, color: T.textTertiary, fontWeight: "500" },

  // Optional notes input
  noteInput: {
    backgroundColor: T.pageBg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: T.textPrimary,
    minHeight: 80,
    textAlignVertical: "top",
  },

  // Price card
  priceCard: {
    backgroundColor: T.bg,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: T.brand,
    ...Platform.select({
      ios: {
        shadowColor: T.brand,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceSub: {
    fontSize: 11,
    fontWeight: "600",
    color: T.textTertiary,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: "900",
    color: T.textPrimary,
    letterSpacing: -1,
  },
  priceMeta: { gap: 8, alignItems: "flex-end" },
  priceMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  priceMetaText: { fontSize: 13, fontWeight: "600", color: T.textSecondary },

  // CTA
  ctaWrap: { paddingHorizontal: 16, marginBottom: 8 },
  bookBtn: {
    backgroundColor: T.brand,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: T.brand,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  bookBtnOff: { backgroundColor: "#E5E7EB", shadowOpacity: 0, elevation: 0 },
  bookBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.2,
  },
  bookBtnTextOff: { color: T.textTertiary },

  // Recent deliveries
  recentWrap: { paddingHorizontal: 16, paddingTop: 8 },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  recentTitle: { fontSize: 16, fontWeight: "800", color: T.textPrimary },
  seeMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 13,
    marginTop: 10,
    backgroundColor: T.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  seeMoreText: { fontSize: 13, fontWeight: "700", color: T.brand },

  stateBox: { alignItems: "center", paddingVertical: 32 },
  emptyBox: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: T.textTertiary, fontWeight: "500" },

  // Delivery card
  deliveryCard: {
    backgroundColor: T.bg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  cardRoute: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardRouteLine: { alignItems: "center", width: 12 },
  cardDot: { width: 10, height: 10, borderRadius: 5 },
  cardConnector: {
    width: 2,
    height: 16,
    backgroundColor: T.border,
    marginVertical: 2,
  },
  cardAddresses: { flex: 1 },
  cardFrom: { fontSize: 13, fontWeight: "700", color: T.textPrimary },
  cardTo: { fontSize: 13, fontWeight: "500", color: T.textSecondary },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: "700" },
  cardDivider: { height: 1, backgroundColor: T.pageBg, marginBottom: 10 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardMeta: { fontSize: 11, color: T.textTertiary, fontWeight: "600" },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardFee: { fontSize: 13, fontWeight: "800", color: T.textPrimary },
  cardDate: { fontSize: 11, color: T.textTertiary, fontWeight: "500" },
});
