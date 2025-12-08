import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";
import { customDeliveryApi } from "@/lib/api";

interface DeliverySummary {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  weightClass: "LIGHT" | "MEDIUM" | "HEAVY";
  vehicleType: "BIKE" | "CAR" | "VAN" | "LORRY";
  status: string;
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

const weightOptions = [
  {
    key: "LIGHT" as const,
    label: "Light",
    description: "Documents, parcels up to 5kg",
    icon: "document-text-outline" as const,
  },
  {
    key: "MEDIUM" as const,
    label: "Medium",
    description: "Boxes or small appliances up to 20kg",
    icon: "cube-outline" as const,
  },
  {
    key: "HEAVY" as const,
    label: "Heavy",
    description: "Large items or bulky loads",
    icon: "archive-outline" as const,
  },
];

const vehicleOptions = [
  {
    key: "BIKE" as const,
    label: "Bike",
    description: "Fast city hops",
    icon: "bicycle" as const,
  },
  {
    key: "CAR" as const,
    label: "Car",
    description: "Everyday parcel runs",
    icon: "car" as const,
  },
  {
    key: "VAN" as const,
    label: "Van",
    description: "Courier for medium loads",
    icon: "bus-outline" as const,
  },
  {
    key: "LORRY" as const,
    label: "Lorry",
    description: "Heavy duty logistics",
    icon: "trail-sign-outline" as const,
  },
];

const statusChipStyles: Record<
  string,
  { label: string; background: string; color: string }
> = {
  PENDING: {
    label: "Pending",
    background: "rgba(255, 107, 0, 0.12)",
    color: PrimaryColor,
  },
  DRIVER_ASSIGNED: {
    label: "Driver assigned",
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
  },
  PICKED_UP: {
    label: "Picked up",
    background: "rgba(56, 189, 248, 0.16)",
    color: "#1D4ED8",
  },
  IN_TRANSIT: {
    label: "In transit",
    background: "rgba(251, 146, 60, 0.18)",
    color: "#EA580C",
  },
  DELIVERED: {
    label: "Delivered",
    background: "rgba(40, 167, 69, 0.16)",
    color: "#15803D",
  },
  CANCELLED: {
    label: "Cancelled",
    background: "rgba(239, 68, 68, 0.16)",
    color: "#B91C1C",
  },
};

const formatCurrency = (amount?: number | null) => {
  if (amount === undefined || amount === null) return "--";
  return `D${amount.toFixed(2)}`;
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString();
};

export default function CustomDeliveryScreen() {
  const router = useRouter();

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [weightClass, setWeightClass] = useState<"LIGHT" | "MEDIUM" | "HEAVY">(
    "LIGHT"
  );
  const [vehicleType, setVehicleType] = useState<
    "BIKE" | "CAR" | "VAN" | "LORRY"
  >("BIKE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentDeliveries, setRecentDeliveries] = useState<DeliverySummary[]>(
    []
  );
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const selectedWeightCopy = useMemo(
    () =>
      weightOptions.find((option) => option.key === weightClass)?.description,
    [weightClass]
  );

  const selectedVehicleCopy = useMemo(
    () =>
      vehicleOptions.find((option) => option.key === vehicleType)?.description,
    [vehicleType]
  );

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
    } catch (error) {
      console.error("Failed to load custom deliveries", error);
      Alert.alert(
        "Unable to load",
        "We could not load your delivery history right now. Pull to refresh to try again."
      );
    } finally {
      setLoadingDeliveries(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchDeliveries();
    } finally {
      setRefreshing(false);
    }
  }, [fetchDeliveries]);

  const handleCreateDelivery = async () => {
    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      Alert.alert(
        "Missing details",
        "Please enter both pickup and drop-off addresses."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        pickupAddress: pickupAddress.trim(),
        dropoffAddress: dropoffAddress.trim(),
        packageDescription: packageDescription.trim() || undefined,
        customerNote: customerNote.trim() || undefined,
        weightClass,
        vehicleType,
      };

      const result = await customDeliveryApi.createDelivery(payload);
      const deliveryId = result?.data?.id ?? result?.id;

      setPickupAddress("");
      setDropoffAddress("");
      setPackageDescription("");
      setCustomerNote("");
      setWeightClass("LIGHT");
      setVehicleType("BIKE");

      fetchDeliveries();

      if (deliveryId) {
        router.push({
          pathname: "/custom-delivery/[deliveryId]",
          params: { deliveryId },
        });
      } else {
        Alert.alert(
          "Delivery created",
          "Your custom delivery request has been created successfully."
        );
      }
    } catch (error: any) {
      console.error("Failed to create custom delivery", error);
      Alert.alert(
        "Request failed",
        error?.message ||
          "We could not submit your delivery request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSummaryCard = ({ item }: { item: DeliverySummary }) => {
    const chip = statusChipStyles[item.status] ?? statusChipStyles.PENDING;
    const latestUpdate = item.trackingUpdates?.[0];

    return (
      <TouchableOpacity
        style={styles.deliveryCard}
        activeOpacity={0.88}
        onPress={() =>
          router.push({
            pathname: "/custom-delivery/[deliveryId]",
            params: { deliveryId: item.id },
          })
        }
      >
        <LinearGradient
          colors={["#121212", "#0B0D0F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.deliveryCardGradient}
        >
          <View style={styles.deliveryCardHeader}>
            <View>
              <Text style={styles.deliveryCardTitle} numberOfLines={1}>
                {item.pickupAddress}
              </Text>
              <Text style={styles.deliveryCardSubtitle} numberOfLines={1}>
                → {item.dropoffAddress}
              </Text>
            </View>
            <View
              style={[styles.statusChip, { backgroundColor: chip.background }]}
            >
              <Text style={[styles.statusChipText, { color: chip.color }]}>
                {chip.label}
              </Text>
            </View>
          </View>

          <View style={styles.deliveryMetaRow}>
            <View style={styles.metaBadge}>
              <Ionicons name="speedometer-outline" size={14} color="#F9FAFB" />
              <Text style={styles.metaBadgeText}>{item.weightClass}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Ionicons name="car-outline" size={14} color="#F9FAFB" />
              <Text style={styles.metaBadgeText}>{item.vehicleType}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Ionicons name="cash-outline" size={14} color="#F9FAFB" />
              <Text style={styles.metaBadgeText}>
                {formatCurrency(item.estimatedFee)}
              </Text>
            </View>
          </View>

          {latestUpdate ? (
            <View style={styles.timelinePreview}>
              <Ionicons
                name="time-outline"
                size={16}
                color="rgba(255,255,255,0.56)"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.timelineStatus}>
                  {latestUpdate.message ?? latestUpdate.status}
                </Text>
                <Text style={styles.timelineTimestamp}>
                  {formatDate(latestUpdate.createdAt)}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="rgba(255,255,255,0.5)"
              />
            </View>
          ) : null}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PrimaryColor}
          />
        }
      >
        <LinearGradient
          colors={["#121214", "#0A0A0C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.heroEyebrow}>Custom Delivery</Text>
          <Text style={styles.heroTitle}>Send anything across the city</Text>
          <Text style={styles.heroCopy}>
            Build a parcel run in seconds. Choose weight, preferred vehicle, and
            hand off to a TeranGO courier you can track live.
          </Text>
        </LinearGradient>

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Plan your delivery</Text>
            <Text style={styles.sectionSubtitle}>
              Match weight, vehicle, and precise stops.
            </Text>
          </View>

          <Text style={styles.inputLabel}>Pickup location</Text>
          <TextInput
            style={styles.input}
            placeholder="Where should the courier collect from?"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={pickupAddress}
            onChangeText={setPickupAddress}
          />

          <Text style={styles.inputLabel}>Drop-off location</Text>
          <TextInput
            style={styles.input}
            placeholder="Where is this headed?"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
          />

          <Text style={styles.inputLabel}>Package details</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Add context like package size or receiver instructions"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={packageDescription}
            onChangeText={setPackageDescription}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.inputLabel}>Courier note (optional)</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Share handoff notes or gate codes"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={customerNote}
            onChangeText={setCustomerNote}
            multiline
            numberOfLines={2}
          />

          <Text style={styles.optionLabel}>Weight class</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.optionRow}
          >
            {weightOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionChip,
                  weightClass === option.key && styles.optionChipActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setWeightClass(option.key)}
              >
                <Ionicons
                  name={option.icon}
                  size={18}
                  color={
                    weightClass === option.key
                      ? "#0B0D0F"
                      : "rgba(255,255,255,0.74)"
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.optionChipTitle,
                      weightClass === option.key &&
                        styles.optionChipTitleActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.optionChipSubtitle,
                      weightClass === option.key &&
                        styles.optionChipSubtitleActive,
                    ]}
                    numberOfLines={2}
                  >
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.optionLabel, { marginTop: 18 }]}>
            Preferred vehicle
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.optionRow}
          >
            {vehicleOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.vehicleChip,
                  vehicleType === option.key && styles.vehicleChipActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setVehicleType(option.key)}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={
                    vehicleType === option.key
                      ? "#0B0D0F"
                      : "rgba(255,255,255,0.74)"
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.vehicleChipTitle,
                      vehicleType === option.key &&
                        styles.vehicleChipTitleActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.vehicleChipSubtitle,
                      vehicleType === option.key &&
                        styles.vehicleChipSubtitleActive,
                    ]}
                    numberOfLines={2}
                  >
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.selectionSummary}>
            <Text style={styles.selectionSummaryText}>
              {selectedWeightCopy} · {selectedVehicleCopy}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleCreateDelivery}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={
                isSubmitting
                  ? ["#B4B4B4", "#8C8C8C"]
                  : [PrimaryColor, "#ff8e3c"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitButtonGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#0B0D0F" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#0B0D0F" />
                  <Text style={styles.submitButtonText}>Request courier</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent deliveries</Text>
            <Text style={styles.sectionSubtitle}>
              Track the progress of every parcel run.
            </Text>
          </View>

          {loadingDeliveries ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={PrimaryColor} />
              <Text style={styles.loadingStateText}>
                Loading your parcels...
              </Text>
            </View>
          ) : recentDeliveries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="cube-outline"
                size={34}
                color="rgba(255,255,255,0.32)"
              />
              <Text style={styles.emptyTitle}>No parcel runs yet</Text>
              <Text style={styles.emptySubtitle}>
                Your upcoming deliveries will appear here once you submit your
                first request.
              </Text>
            </View>
          ) : (
            <FlatList
              data={recentDeliveries}
              keyExtractor={(item) => item.id}
              renderItem={renderSummaryCard}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  hero: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 12,
  },
  heroCopy: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 340,
  },
  formSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sectionHeader: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    marginTop: 4,
  },
  inputLabel: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#141418",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 16,
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  optionLabel: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  optionRow: {
    gap: 12,
    paddingBottom: 4,
  },
  optionChip: {
    width: 240,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#111216",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    gap: 14,
  },
  optionChipActive: {
    borderColor: PrimaryColor,
    backgroundColor: "#FFEFE3",
  },
  optionChipTitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 16,
    fontWeight: "700",
  },
  optionChipTitleActive: {
    color: "#0B0D0F",
  },
  optionChipSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    marginTop: 4,
  },
  optionChipSubtitleActive: {
    color: "#3F3F46",
  },
  vehicleChip: {
    width: 220,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#111216",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    gap: 14,
  },
  vehicleChipActive: {
    backgroundColor: "#FFEFE3",
    borderColor: PrimaryColor,
  },
  vehicleChipTitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 16,
    fontWeight: "700",
  },
  vehicleChipTitleActive: {
    color: "#0B0D0F",
  },
  vehicleChipSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    marginTop: 4,
  },
  vehicleChipSubtitleActive: {
    color: "#3F3F46",
  },
  selectionSummary: {
    marginTop: 10,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "rgba(255, 107, 0, 0.12)",
  },
  selectionSummaryText: {
    color: PrimaryColor,
    fontSize: 13,
    fontWeight: "600",
  },
  submitButton: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  submitButtonText: {
    color: "#0B0D0F",
    fontSize: 16,
    fontWeight: "700",
  },
  historySection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingState: {
    backgroundColor: "#0B0D0F",
    borderRadius: 20,
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingStateText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: "#0B0D0F",
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  deliveryCard: {
    borderRadius: 24,
    overflow: "hidden",
  },
  deliveryCardGradient: {
    padding: 18,
    borderRadius: 24,
  },
  deliveryCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  deliveryCardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  deliveryCardSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginTop: 4,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  deliveryMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaBadgeText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
  },
  timelinePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timelineStatus: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
  },
  timelineTimestamp: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    marginTop: 2,
  },
});
