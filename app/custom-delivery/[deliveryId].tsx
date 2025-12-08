import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { customDeliveryApi } from "@/lib/api";

interface TrackingEvent {
  id: string;
  status: string;
  message?: string | null;
  createdAt: string;
}

interface DeliveryDetail {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  packageDescription?: string | null;
  customerNote?: string | null;
  weightClass: "LIGHT" | "MEDIUM" | "HEAVY";
  vehicleType: "BIKE" | "CAR" | "VAN" | "LORRY";
  estimatedFee?: number | null;
  estimatedDistanceKm?: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  driver?: {
    id: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
  } | null;
  trackingUpdates?: TrackingEvent[];
}

const statusVocabulary: Record<string, { label: string; helper: string }> = {
  PENDING: {
    label: "Pending",
    helper: "We are lining up the best courier for this run.",
  },
  DRIVER_ASSIGNED: {
    label: "Driver assigned",
    helper: "A driver is reviewing the job and preparing for pickup.",
  },
  PICKED_UP: {
    label: "Picked up",
    helper: "Your parcel is with the courier and on the move.",
  },
  IN_TRANSIT: {
    label: "In transit",
    helper: "The courier is heading to the drop-off location.",
  },
  DELIVERED: {
    label: "Delivered",
    helper: "Package delivered. Thanks for shipping with TeranGO!",
  },
  CANCELLED: {
    label: "Cancelled",
    helper: "This delivery was cancelled. Reach out if you need support.",
  },
};

const weightCopy: Record<DeliveryDetail["weightClass"], string> = {
  LIGHT: "Light parcel",
  MEDIUM: "Medium parcel",
  HEAVY: "Heavy parcel",
};

const vehicleCopy: Record<DeliveryDetail["vehicleType"], string> = {
  BIKE: "Bike courier",
  CAR: "Car courier",
  VAN: "Van",
  LORRY: "Lorry",
};

const formatCurrency = (amount?: number | null) => {
  if (amount === undefined || amount === null) return "--";
  return `D${amount.toFixed(2)}`;
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString();
};

export default function CustomDeliveryDetailScreen() {
  const { deliveryId } = useLocalSearchParams<{ deliveryId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);

  const loadDelivery = useCallback(async () => {
    if (!deliveryId) return;

    try {
      setLoading(true);
      const response = await customDeliveryApi.getDeliveryById(
        String(deliveryId)
      );
      const payload = response?.data ?? response;
      setDelivery(payload);
    } catch (error) {
      console.error("Failed to load delivery detail", error);
      Alert.alert(
        "Unable to load",
        "We could not load this delivery. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    loadDelivery();
  }, [loadDelivery]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadDelivery();
    } finally {
      setRefreshing(false);
    }
  }, [loadDelivery]);

  const statusMeta = useMemo(() => {
    if (!delivery) return statusVocabulary.PENDING;
    return statusVocabulary[delivery.status] ?? statusVocabulary.PENDING;
  }, [delivery]);

  const trackingTimeline = useMemo(() => {
    if (!delivery?.trackingUpdates) return [] as TrackingEvent[];
    return [...delivery.trackingUpdates].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [delivery]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PrimaryColor}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#121316", "#0A0C0F"]}
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
          <Text style={styles.heroEyebrow}>Delivery ID</Text>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {delivery?.id ?? deliveryId}
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaItem}>
              <Ionicons name="speedometer-outline" size={16} color="#FFB472" />
              <Text style={styles.heroMetaText}>
                {weightCopy[delivery?.weightClass ?? "LIGHT"]}
              </Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Ionicons name="car-outline" size={16} color="#FFB472" />
              <Text style={styles.heroMetaText}>
                {vehicleCopy[delivery?.vehicleType ?? "BIKE"]}
              </Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Ionicons name="cash-outline" size={16} color="#FFB472" />
              <Text style={styles.heroMetaText}>
                {formatCurrency(delivery?.estimatedFee)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={PrimaryColor} />
            <Text style={styles.loadingCopy}>Fetching delivery details...</Text>
          </View>
        ) : !delivery ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="warning-outline"
              size={34}
              color="rgba(255,255,255,0.32)"
            />
            <Text style={styles.emptyTitle}>Delivery unavailable</Text>
            <Text style={styles.emptySubtitle}>
              We could not find this delivery. Pull down to refresh or go back
              to your deliveries list.
            </Text>
          </View>
        ) : (
          <View style={styles.detailBody}>
            <View style={styles.statusPanel}>
              <View>
                <Text style={styles.statusLabel}>{statusMeta.label}</Text>
                <Text style={styles.statusHelper}>{statusMeta.helper}</Text>
              </View>
              <TouchableOpacity
                style={styles.refreshPill}
                onPress={loadDelivery}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={15} color="#0B0D0F" />
                <Text style={styles.refreshPillText}>Refresh status</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.addressCard}>
              <View style={styles.addressRow}>
                <View style={styles.dotPickup} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>Pickup</Text>
                  <Text style={styles.addressValue}>
                    {delivery.pickupAddress}
                  </Text>
                </View>
              </View>
              <View style={styles.addressDivider} />
              <View style={styles.addressRow}>
                <View style={styles.dotDropoff} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>Drop-off</Text>
                  <Text style={styles.addressValue}>
                    {delivery.dropoffAddress}
                  </Text>
                </View>
              </View>
            </View>

            {delivery.packageDescription ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardLabel}>Package details</Text>
                <Text style={styles.infoCardValue}>
                  {delivery.packageDescription}
                </Text>
              </View>
            ) : null}

            {delivery.customerNote ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardLabel}>Courier note</Text>
                <Text style={styles.infoCardValue}>
                  {delivery.customerNote}
                </Text>
              </View>
            ) : null}

            <View style={styles.timelineCard}>
              <Text style={styles.timelineTitle}>Tracking timeline</Text>
              {trackingTimeline.length === 0 ? (
                <View style={styles.timelineEmpty}>
                  <Ionicons
                    name="time-outline"
                    size={24}
                    color="rgba(255,255,255,0.36)"
                  />
                  <Text style={styles.timelineEmptyText}>
                    Updates appear here once the courier gets on the move.
                  </Text>
                </View>
              ) : (
                trackingTimeline.map((event, index) => {
                  const isLast = index === trackingTimeline.length - 1;
                  return (
                    <View key={event.id} style={styles.timelineItem}>
                      <View style={styles.timelineRail}>
                        <View style={styles.timelineDot} />
                        {!isLast && <View style={styles.timelineConnector} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.timelineEventTitle}>
                          {event.message ?? event.status.replace(/_/g, " ")}
                        </Text>
                        <Text style={styles.timelineEventDate}>
                          {formatDate(event.createdAt)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.summaryFooter}>
              <View>
                <Text style={styles.summaryLabel}>Estimated distance</Text>
                <Text style={styles.summaryValue}>
                  {delivery.estimatedDistanceKm
                    ? `${delivery.estimatedDistanceKm.toFixed(1)} km`
                    : "--"}
                </Text>
              </View>
              <View>
                <Text style={styles.summaryLabel}>Created</Text>
                <Text style={styles.summaryValue}>
                  {formatDate(delivery.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontSize: 12,
    marginBottom: 6,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroMetaText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingState: {
    paddingVertical: 60,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingCopy: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  detailBody: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 18,
  },
  statusPanel: {
    backgroundColor: "rgba(255,107,0,0.12)",
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  statusLabel: {
    color: PrimaryColor,
    fontSize: 18,
    fontWeight: "800",
  },
  statusHelper: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    lineHeight: 18,
  },
  refreshPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  refreshPillText: {
    color: "#0B0D0F",
    fontSize: 12,
    fontWeight: "700",
  },
  addressCard: {
    backgroundColor: "#0B0D0F",
    borderRadius: 20,
    padding: 18,
    gap: 16,
  },
  addressRow: {
    flexDirection: "row",
    gap: 12,
  },
  dotPickup: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: PrimaryColor,
    marginTop: 4,
  },
  dotDropoff: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    marginTop: 4,
  },
  addressLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  addressValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 4,
  },
  addressDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  infoCard: {
    backgroundColor: "#0B0D0F",
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  infoCardLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  infoCardValue: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
  },
  timelineCard: {
    backgroundColor: "#0B0D0F",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  timelineTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 18,
  },
  timelineEmpty: {
    alignItems: "center",
    gap: 10,
  },
  timelineEmptyText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  timelineItem: {
    flexDirection: "row",
    paddingBottom: 18,
  },
  timelineRail: {
    width: 28,
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#1F2937",
    backgroundColor: PrimaryColor,
    marginTop: 4,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginTop: 4,
  },
  timelineEventTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  timelineEventDate: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    marginTop: 4,
  },
  summaryFooter: {
    backgroundColor: "#0B0D0F",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },
});
