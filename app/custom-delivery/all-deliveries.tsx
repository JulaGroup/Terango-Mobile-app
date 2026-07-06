import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { customDeliveryApi } from "@/lib/api";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

// ── Design System ─────────────────────────────────────────
const T = {
  brand: "#FF6B00",
  brandDark: "#E55A00",
  brandSoft: "rgba(255,107,0,0.12)",
  heroBase: "#000000",
  heroCard: "rgba(255,255,255,0.06)",
  heroBorder: "rgba(255,255,255,0.10)",
  heroText: "#FFFFFF",
  heroTextDim: "rgba(255,255,255,0.65)",
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  border: "#EDEEF0",
  textPrimary: "#0A0A0A",
  textSecondary: "#4B4F54",
  textTertiary: "#8A8F98",
  blue: "#007BFF",
  blueSoft: "rgba(0,123,255,0.10)",
  amber: "#FF6B00",
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

type StatusChipConfig = {
  label: string;
  bg: string;
  color: string;
  dot: string;
};

const STATUS_MAP: Record<string, StatusChipConfig> = {
  PENDING: { label: "Pending", bg: T.amberSoft, color: T.amber, dot: T.amber },
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

const VEHICLE_ICON: Record<DeliverySummary["vehicleType"], string> = {
  BIKE: "bicycle-outline",
  KEKE_CARGO: "car-sport-outline",
  CAR: "car-outline",
  VAN: "bus-outline",
  LORRY: "cube-outline",
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

// ── Status Filter Type ────────────────────────────────────
type StatusFilter = "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED";

type StatusFilterEntry = {
  label: string;
  icon: string;
  statuses: string[];
};

const statusFilterConfig: Record<StatusFilter, StatusFilterEntry> = {
  ALL: { label: "All", icon: "apps-outline", statuses: [] },
  PENDING: {
    label: "Pending",
    icon: "time-outline",
    statuses: ["PENDING", "READY_FOR_PAYMENT"],
  },
  IN_PROGRESS: {
    label: "On the way",
    icon: "flash-outline",
    statuses: ["DRIVER_ASSIGNED", "PICKED_UP", "IN_TRANSIT"],
  },
  COMPLETED: {
    label: "Completed",
    icon: "checkmark-circle-outline",
    statuses: ["DELIVERED", "CANCELLED"],
  },
};

// ── Helper Functions ─────────────────────────────────────
const getDisplayStatus = (delivery: DeliverySummary): string => {
  if (
    delivery.paymentStatus === "UNPAID" &&
    delivery.trackingUpdates?.some(
      (update) =>
        update.message?.includes("Order Approved") ||
        update.message?.startsWith("[ADMIN_APPROVED_FOR_PAYMENT]"),
    )
  ) {
    return "READY_FOR_PAYMENT";
  }
  return delivery.status;
};

const filterDeliveries = (
  deliveries: DeliverySummary[],
  filter: StatusFilter,
): DeliverySummary[] => {
  if (filter === "ALL") return deliveries;
  const statuses = statusFilterConfig[filter].statuses;
  return deliveries.filter((d) => statuses.includes(getDisplayStatus(d)));
};

// ── Main Screen ────────────────────────────────────────────
export default function AllDeliveriesScreen() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliverySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filteredDeliveries = filterDeliveries(deliveries, statusFilter);
  const activeCount = filterDeliveries(deliveries, "IN_PROGRESS").length;

  const fetchAllDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      const response = await customDeliveryApi.listDeliveries();
      const allDeliveries = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
      setDeliveries(allDeliveries);
    } catch (e) {
      console.error("Failed to load deliveries", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllDeliveries();
  }, [fetchAllDeliveries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllDeliveries();
    setRefreshing(false);
  }, [fetchAllDeliveries]);

  const renderDeliveryCard = ({ item }: { item: DeliverySummary }) => {
    const displayStatus = getDisplayStatus(item);
    const chip = STATUS_MAP[displayStatus] ?? STATUS_MAP.PENDING;
    const vehicleIcon = VEHICLE_ICON[item.vehicleType] ?? "cube-outline";

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
        <View style={s.cardTopRow}>
          <View style={s.vehicleBadge}>
            <Ionicons name={vehicleIcon as any} size={14} color={T.brand} />
          </View>
          <View style={[s.statusChip, { backgroundColor: chip.bg }]}>
            <View style={[s.statusDot, { backgroundColor: chip.dot }]} />
            <Text style={[s.statusLabel, { color: chip.color }]}>
              {chip.label}
            </Text>
          </View>
          <Text style={s.cardFee}>{fmtCurrency(item.estimatedFee)}</Text>
        </View>

        {/* Route visualization */}
        <View style={s.routeRow}>
          <View style={s.routeLine}>
            <View style={[s.routeDotTop, { backgroundColor: chip.dot }]} />
            <View style={s.routeConnector} />
            <View style={s.routeDotBot} />
          </View>
          <View style={s.routeAddresses}>
            <Text style={s.routeFrom} numberOfLines={1}>
              {item.pickupAddress}
            </Text>
            <Text style={s.routeTo} numberOfLines={1}>
              {item.dropoffAddress}
            </Text>
          </View>
        </View>

        <View style={s.cardDivider} />

        <View style={s.cardFooter}>
          <Ionicons name="time-outline" size={12} color={T.textTertiary} />
          <Text style={s.cardMetaText}>{fmtDate(item.createdAt)}</Text>
          {item.estimatedDistanceKm != null && (
            <>
              <View style={s.metaDot} />
              <Text style={s.cardMetaText}>
                {item.estimatedDistanceKm.toFixed(1)} km
              </Text>
            </>
          )}
          <View style={{ flex: 1 }} />
          <View style={s.cardArrow}>
            <Ionicons name="arrow-forward" size={13} color={T.brand} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
        {/* ── Hero Bar ─────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.topBar}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={s.brandRow}>
              <Ionicons name="flash" size={13} color={T.brand} />
              <Text style={s.brandName}>Deliveries</Text>
            </View>
            <View style={{ width: 38 }} />
          </View>

          <View style={s.heroContent}>
            <Text style={s.heroH1}>Your{"\n"}Delivery History</Text>
            <View style={s.heroStatsRow}>
              <View style={s.heroStat}>
                <Text style={s.heroStatNum}>{deliveries.length}</Text>
                <Text style={s.heroStatLabel}>Total</Text>
              </View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}>
                <Text style={[s.heroStatNum, { color: T.brand }]}>
                  {activeCount}
                </Text>
                <Text style={s.heroStatLabel}>On the way</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Body ─────────────────────────────────────── */}
        <View style={s.body}>
          {/* Status Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterTabsContent}
            style={s.filterTabs}
          >
            {(Object.keys(statusFilterConfig) as StatusFilter[]).map(
              (filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    s.filterTab,
                    statusFilter === filter && s.filterTabActive,
                  ]}
                  onPress={() => setStatusFilter(filter)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={statusFilterConfig[filter].icon as any}
                    size={11}
                    color={statusFilter === filter ? "#fff" : T.textTertiary}
                  />
                  <Text
                    style={[
                      s.filterTabText,
                      statusFilter === filter && s.filterTabTextActive,
                    ]}
                  >
                    {statusFilterConfig[filter].label}
                  </Text>
                  {filter !== "ALL" && (
                    <View
                      style={[
                        s.filterBadge,
                        statusFilter === filter && s.filterBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          s.filterBadgeText,
                          statusFilter === filter && s.filterBadgeTextActive,
                        ]}
                      >
                        {
                          filterDeliveries(deliveries, filter as StatusFilter)
                            .length
                        }
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ),
            )}
          </ScrollView>

          {/* Deliveries List */}
          {loading ? (
            <View style={s.centerBox}>
              <ActivityIndicator color={T.brand} size="large" />
              <Text style={s.centerText}>Loading deliveries…</Text>
            </View>
          ) : filteredDeliveries.length === 0 ? (
            <View style={s.emptyBox}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="cube-outline" size={36} color={T.brand} />
              </View>
              <Text style={s.emptyTitle}>
                {deliveries.length === 0 ? "No deliveries yet" : "Nothing here"}
              </Text>
              <Text style={s.emptyText}>
                {deliveries.length === 0
                  ? "Book your first delivery and track it here in real time."
                  : `Try another filter — you have ${deliveries.length} deliveries in total.`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredDeliveries}
              keyExtractor={(item) => item.id}
              renderItem={renderDeliveryCard}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.heroBase },
  scroll: { flex: 1, backgroundColor: T.heroBase },
  // flexGrow ensures the content stretches to fill the screen even when
  // there are few items — this is what was leaving a black strip visible.
  scrollContent: { flexGrow: 1, paddingBottom: 20 },

  // ── Hero ───────────────────────────────────────────────
  hero: {
    backgroundColor: T.heroBase,
    paddingBottom: 20,
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
  brandName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },

  heroContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 4,
  },
  heroH1: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 34,
    letterSpacing: -0.8,
    marginBottom: 20,
  },
  heroStatsRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  heroStat: { gap: 2 },
  heroStatNum: { fontSize: 20, fontWeight: "900", color: "#fff" },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: T.heroTextDim,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: T.heroBorder,
  },

  // ── Body ───────────────────────────────────────────────
  // flex:1 lets the white card fill any leftover vertical space instead
  // of stopping at a fixed height and exposing the black background below.
  body: {
    flex: 1,
    backgroundColor: T.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // ── Filter Tabs ─────────────────────────────────────────
  filterTabs: {
    marginHorizontal: -18,
    marginBottom: 14,
    flexGrow: 0,
  },
  filterTabsContent: {
    paddingHorizontal: 18,
    gap: 6,
    alignItems: "center",
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#F5F5F6",
    borderWidth: 1,
    borderColor: T.border,
  },
  filterTabActive: {
    backgroundColor: T.brand,
    borderColor: T.brand,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.textTertiary,
  },
  filterTabTextActive: {
    color: "#fff",
  },
  filterBadge: {
    paddingHorizontal: 4,
    minWidth: 16,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: T.brandSoft,
  },
  filterBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: T.brand,
    lineHeight: 12,
  },
  filterBadgeTextActive: {
    color: "#fff",
  },

  // ── States ─────────────────────────────────────────────
  centerBox: { paddingVertical: 60, alignItems: "center" },
  centerText: {
    fontSize: 13,
    color: T.textTertiary,
    fontWeight: "500",
    marginTop: 12,
  },

  emptyBox: {
    backgroundColor: "#FAFAFA",
    borderRadius: 18,
    padding: 36,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: T.brandSoft,
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

  // ── Delivery Card ──────────────────────────────────────
  deliveryCard: {
    backgroundColor: T.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  vehicleBadge: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: T.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFee: {
    fontSize: 13,
    fontWeight: "800",
    color: T.textPrimary,
    marginLeft: "auto",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  routeLine: { alignItems: "center", width: 10, paddingVertical: 2 },
  routeDotTop: { width: 8, height: 8, borderRadius: 4 },
  routeConnector: {
    width: 2,
    height: 16,
    backgroundColor: T.border,
    marginVertical: 3,
  },
  routeDotBot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: T.border,
    backgroundColor: "#fff",
  },
  routeAddresses: { flex: 1, gap: 3 },
  routeFrom: { fontSize: 13, fontWeight: "700", color: T.textPrimary },
  routeTo: { fontSize: 13, fontWeight: "600", color: T.textSecondary },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: "800" },
  cardDivider: { height: 1, backgroundColor: "#F2F2F2", marginBottom: 10 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardMetaText: { fontSize: 11, color: T.textTertiary, fontWeight: "600" },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: T.border },
  cardArrow: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: T.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
