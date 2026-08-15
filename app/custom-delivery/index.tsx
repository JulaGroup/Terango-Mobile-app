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
import LocationSearchSheet, {
  type PickedLocation,
} from "@/components/express/LocationSearchSheet";
import { AddressService } from "@/services/AddressService";
import { useAddress } from "@/context/AddressContext";
import * as Location from "expo-location";
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
import { UserCacheManager } from "@/utils/userCache";

// Server-side ceilings from EXPRESS_CONFIG.VEHICLE_SUPPORT — create() throws
// past these. The old town list kept everything inside ~10km so this never
// mattered; with free-form pins it does, so we surface it before submit.
const VEHICLE_MAX_KM: Record<VehicleType, number> = {
  BIKE: 15,
  KEKE_CARGO: 25,
  CAR: 35,
  VAN: 40,
  LORRY: 50,
};

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
  const { fetchAddresses } = useAddress();

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

  // Both stops are free-form places now — searched, pinned, saved or GPS.
  // Neither is tied to the 16-town list any more.
  const [pickup, setPickup] = useState<PickedLocation | null>(null);
  const [dropoff, setDropoff] = useState<PickedLocation | null>(null);
  const [sheetFor, setSheetFor] = useState<"pickup" | "dropoff" | null>(null);
  const [prefillingPickup, setPrefillingPickup] = useState(false);

  const pickupLatitude = pickup?.latitude ?? null;
  const pickupLongitude = pickup?.longitude ?? null;
  const dropoffLatitude = dropoff?.latitude ?? null;
  const dropoffLongitude = dropoff?.longitude ?? null;

  // Optional now — a note for the driver, not a required landmark.
  const [pickupLandmark, setPickupLandmark] = useState("");
  const [dropoffLandmark, setDropoffLandmark] = useState("");
  const [showPickupNote, setShowPickupNote] = useState(false);
  const [showDropoffNote, setShowDropoffNote] = useState(false);

  // Surfaced when the server refuses quotes during the no-drivers window.
  const [quoteBlockedReason, setQuoteBlockedReason] = useState<string | null>(
    null,
  );

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
  const [recentDeliveries, setRecentDeliveries] = useState<DeliverySummary[]>(
    [],
  );
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const availableVehicleTypes = selectedWeight
    ? getAvailableVehicles(selectedWeight)
    : (["BIKE", "KEKE_CARGO", "CAR", "VAN", "LORRY"] as VehicleType[]);

  /** Distance for the route, from whichever quote came back first. */
  const routeDistanceKm =
    distanceKm ??
    Object.values(quotesByVehicle).find((q) => Number.isFinite(q?.distanceKm))
      ?.distanceKm ??
    null;

  const vehicleTooFar = (key: VehicleType) =>
    routeDistanceKm != null && routeDistanceKm > VEHICLE_MAX_KM[key];

  const vehicleOptions: VehicleOption[] = availableVehicleTypes.map((key) => {
    const vehicleQuote = quotesByVehicle[key];
    const tooFar = vehicleTooFar(key);
    return {
      key,
      label: VEHICLE_CONFIG[key].label,
      description: tooFar
        ? `Too far — max ${VEHICLE_MAX_KM[key]}km`
        : VEHICLE_CONFIG[key].description,
      iconName: VEHICLE_CONFIG[key].iconName,
      estimatedPrice: tooFar ? null : (vehicleQuote?.estimatedPrice ?? null),
      estimatedTime:
        !tooFar && vehicleQuote?.estimatedTimeMinutes
          ? `${vehicleQuote.estimatedTimeMinutes} min`
          : undefined,
    };
  });

  // Drop a selection that the route has since outgrown.
  useEffect(() => {
    if (selectedVehicle && vehicleTooFar(selectedVehicle)) {
      setSelectedVehicle(null);
    }
  }, [routeDistanceKm, selectedVehicle]);

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
          setQuoteBlockedReason(null);
        } catch (error: any) {
          console.error("Failed to fetch express quotes", error);
          if (!isCancelled) {
            setQuotesByVehicle({});
            // The server refuses quotes during the no-drivers window; say so
            // plainly instead of leaving an empty price block.
            const msg = String(error?.message || "");
            setQuoteBlockedReason(
              /no drivers/i.test(msg)
                ? msg.replace(/^API Error: \d+ - /, "")
                : null,
            );
          }
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
    fetchAddresses();
  }, [fetchAddresses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
  }, [fetchDeliveries]);

  // Pre-fill pickup from where the customer actually is, the way Uber does.
  // Silent by design: if permission is refused we just leave the field empty
  // rather than nagging before they've shown any intent to book.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        const granted =
          status === "granted"
            ? true
            : (await Location.requestForegroundPermissionsAsync()).status ===
              "granted";
        if (!granted || cancelled) return;

        setPrefillingPickup(true);
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          address = await AddressService.getAddressFromCoordinates(
            latitude,
            longitude,
          );
        } catch {
          /* keep the coordinate string */
        }
        if (cancelled) return;
        // Don't clobber a choice the customer already made while we waited.
        setPickup((prev) =>
          prev
            ? prev
            : {
                label: "Current location",
                address,
                latitude,
                longitude,
                source: "gps",
              },
        );
      } catch {
        /* pickup simply stays empty */
      } finally {
        if (!cancelled) setPrefillingPickup(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sender is always the signed-in customer — this used to live inside
  // UnifiedLocationSection, which the new flow no longer uses.
  useEffect(() => {
    (async () => {
      try {
        const { cached } = await UserCacheManager.smartLoadUserData();
        if (cached) {
          setSenderName(cached.fullName || "");
          setSenderPhone(cached.phone || "");
        }
      } catch {
        /* sender falls back to empty; the server accepts null */
      }
    })();
  }, []);

  const handlePlacePicked = (place: PickedLocation) => {
    if (sheetFor === "pickup") setPickup(place);
    else if (sheetFor === "dropoff") setDropoff(place);
  };

  const swapStops = () => {
    setPickup(dropoff);
    setDropoff(pickup);
    setPickupLandmark(dropoffLandmark);
    setDropoffLandmark(pickupLandmark);
  };

  const handleCreateDelivery = async () => {
    if (!pickup || !dropoff)
      return Alert.alert("Missing locations", "Set both pickup and drop-off.");
    if (!selectedVehicle || !selectedWeight)
      return Alert.alert(
        "Select delivery option",
        "Pick a vehicle and weight class.",
      );
    if (!receiverName.trim() || receiverPhone.trim().length !== 7)
      return Alert.alert(
        "Receiver required",
        "Add the receiver's name and 7-digit phone number.",
      );
    if (selectedVehicle && vehicleTooFar(selectedVehicle))
      return Alert.alert(
        "Vehicle can't cover this trip",
        `${VEHICLE_CONFIG[selectedVehicle].label} is limited to ${VEHICLE_MAX_KM[selectedVehicle]}km. Choose a larger vehicle.`,
      );

    setIsSubmitting(true);
    try {
      // Driver notes are optional; when empty the address is sent on its own.
      // The em-dash separator is what the driver app already expects.
      const pickupAddressWithLandmark = pickupLandmark.trim()
        ? `${pickup.address} — ${pickupLandmark.trim()}`
        : pickup.address;
      const dropoffAddressWithLandmark = dropoffLandmark.trim()
        ? `${dropoff.address} — ${dropoffLandmark.trim()}`
        : dropoff.address;

      const payload = {
        pickupAddress: pickupAddressWithLandmark,
        pickupCity: pickup.city,
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        dropoffAddress: dropoffAddressWithLandmark,
        dropoffCity: dropoff.city,
        dropoffLatitude: dropoff.latitude,
        dropoffLongitude: dropoff.longitude,
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
      setPickup(null);
      setDropoff(null);
      setPickupLandmark("");
      setDropoffLandmark("");
      setShowPickupNote(false);
      setShowDropoffNote(false);
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
  // Both stops set is all step 1 needs now — driver notes are optional.
  const step1Done = !!(pickup && dropoff);
  const step2Done = !!(selectedVehicle && selectedWeight);
  const step3Done = !!(
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

        {/* ── Step 1: Where to? ── */}
        <View style={s.block}>
          <View style={s.blockHeader}>
            <StepBadge n={1} />
            <Text style={s.blockTitle}>Route</Text>
            {step1Done && (
              <Ionicons name="checkmark-circle" size={18} color={T.success} />
            )}
          </View>

          {/* Uber-style stop card: two identical, independently editable rows */}
          <View style={s.routeCard}>
            <View style={s.routeRail}>
              <View style={[s.railDot, { backgroundColor: T.brand }]} />
              <View style={s.railLine} />
              <View style={[s.railSquare, { backgroundColor: "#111827" }]} />
            </View>

            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={s.stopRow}
                activeOpacity={0.7}
                onPress={() => setSheetFor("pickup")}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.stopLabel}>Pickup</Text>
                  {prefillingPickup && !pickup ? (
                    <View style={s.stopLoadingRow}>
                      <ActivityIndicator size="small" color={T.brand} />
                      <Text style={s.stopPlaceholder}>
                        Finding your location…
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={pickup ? s.stopValue : s.stopPlaceholder}
                      numberOfLines={1}
                    >
                      {pickup ? pickup.address : "Where from?"}
                    </Text>
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={T.textTertiary}
                />
              </TouchableOpacity>

              {pickup &&
                (showPickupNote ? (
                  <TextInput
                    style={s.stopNoteInput}
                    placeholder="Note for the driver (optional)"
                    placeholderTextColor={T.textTertiary}
                    value={pickupLandmark}
                    onChangeText={setPickupLandmark}
                    multiline
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowPickupNote(true)}
                    hitSlop={6}
                  >
                    <Text style={s.addNote}>+ Add directions</Text>
                  </TouchableOpacity>
                ))}

              <View style={s.stopDivider} />

              <TouchableOpacity
                style={s.stopRow}
                activeOpacity={0.7}
                onPress={() => setSheetFor("dropoff")}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.stopLabel}>Drop-off</Text>
                  <Text
                    style={dropoff ? s.stopValue : s.stopPlaceholder}
                    numberOfLines={1}
                  >
                    {dropoff ? dropoff.address : "Where to?"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={T.textTertiary}
                />
              </TouchableOpacity>

              {dropoff &&
                (showDropoffNote ? (
                  <TextInput
                    style={s.stopNoteInput}
                    placeholder="Note for the driver (optional)"
                    placeholderTextColor={T.textTertiary}
                    value={dropoffLandmark}
                    onChangeText={setDropoffLandmark}
                    multiline
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowDropoffNote(true)}
                    hitSlop={6}
                  >
                    <Text style={s.addNote}>+ Add directions</Text>
                  </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
              style={s.swapBtn}
              onPress={swapStops}
              disabled={!pickup && !dropoff}
              hitSlop={8}
            >
              <Ionicons name="swap-vertical" size={18} color={T.brand} />
            </TouchableOpacity>
          </View>

          {routeDistanceKm != null && (
            <Text style={s.routeDistance}>
              {routeDistanceKm.toFixed(1)} km apart
            </Text>
          )}

          {quoteBlockedReason && (
            <View style={s.warnBanner}>
              <Ionicons name="moon-outline" size={16} color="#B45309" />
              <Text style={s.warnText}>{quoteBlockedReason}</Text>
            </View>
          )}

          {/* Receiver — who the rider hands the package to */}
          {step1Done && (
            <View style={s.receiverCard}>
              <Text style={s.receiverTitle}>Receiver details</Text>
              <TextInput
                style={s.receiverInput}
                placeholder="Full name"
                placeholderTextColor={T.textTertiary}
                value={receiverName}
                onChangeText={setReceiverName}
                autoCapitalize="words"
              />
              <View style={s.phoneRow}>
                <View style={s.phonePrefix}>
                  <Text style={s.phonePrefixText}>+220</Text>
                </View>
                <TextInput
                  style={[s.receiverInput, { flex: 1, marginTop: 0 }]}
                  placeholder="7 digits"
                  placeholderTextColor={T.textTertiary}
                  value={receiverPhone}
                  onChangeText={(t) =>
                    setReceiverPhone(t.replace(/[^0-9]/g, "").slice(0, 7))
                  }
                  keyboardType="phone-pad"
                  maxLength={7}
                />
              </View>
            </View>
          )}
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

      <LocationSearchSheet
        visible={sheetFor !== null}
        mode={sheetFor ?? "pickup"}
        onClose={() => setSheetFor(null)}
        onSelect={handlePlacePicked}
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

  // Route card — Uber-style pickup/drop-off stops
  routeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FAFBFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  routeRail: { alignItems: "center", paddingTop: 20, width: 14 },
  railDot: { width: 10, height: 10, borderRadius: 5 },
  railLine: {
    width: 2,
    flex: 1,
    minHeight: 34,
    marginVertical: 4,
    backgroundColor: "#DDE1E6",
  },
  railSquare: { width: 9, height: 9, borderRadius: 2 },
  stopRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  stopLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: T.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  stopValue: { fontSize: 14.5, fontWeight: "600", color: T.textPrimary },
  stopPlaceholder: { fontSize: 14.5, color: T.textTertiary },
  stopLoadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stopDivider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 4,
  },
  addNote: {
    fontSize: 12.5,
    fontWeight: "700",
    color: T.brand,
    paddingVertical: 4,
  },
  stopNoteInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13.5,
    color: T.textPrimary,
    minHeight: 40,
    marginTop: 4,
    marginBottom: 4,
  },
  swapBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.brandSoft,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  routeDistance: {
    fontSize: 12.5,
    color: T.textSecondary,
    fontWeight: "600",
    marginTop: 8,
    marginLeft: 4,
  },
  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 11,
    marginTop: 12,
  },
  warnText: { flex: 1, fontSize: 12.5, color: "#92400E", lineHeight: 17 },

  // Receiver
  receiverCard: { marginTop: 16 },
  receiverTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: T.textPrimary,
    marginBottom: 8,
  },
  receiverInput: {
    backgroundColor: "#FAFBFC",
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14.5,
    color: T.textPrimary,
    marginTop: 8,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  phonePrefix: {
    backgroundColor: "#F1F3F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  phonePrefixText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: T.textSecondary,
  },

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
