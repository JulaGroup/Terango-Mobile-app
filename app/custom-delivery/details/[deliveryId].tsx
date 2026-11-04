import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { customDeliveryApi } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";

const ORANGE = PrimaryColor;

// Statuses where the driver already has the package → live tracking is useful.
const TRACKABLE = ["PICKED_UP", "IN_TRANSIT", "ARRIVED"];

const STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string; icon: string; msg: string }
> = {
  PENDING: {
    label: "Pending",
    color: "#B45309",
    bg: "#FFFBEB",
    icon: "time-outline",
    msg: "Waiting for admin confirmation.",
  },
  DRIVER_ASSIGNED: {
    label: "Driver Assigned",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    icon: "person-outline",
    msg: "A driver is heading to the pickup point.",
  },
  PICKED_UP: {
    label: "Picked Up",
    color: ORANGE,
    bg: "#FFF5EE",
    icon: "bag-check-outline",
    msg: "Package collected — on the way.",
  },
  IN_TRANSIT: {
    label: "In Transit",
    color: ORANGE,
    bg: "#FFF5EE",
    icon: "navigate-outline",
    msg: "Your package is on the move.",
  },
  ARRIVED: {
    label: "Driver Arrived",
    color: "#00A86B",
    bg: "#ECFDF5",
    icon: "location-outline",
    msg: "Driver has arrived — confirming delivery.",
  },
  DELIVERED: {
    label: "Delivered",
    color: "#00A86B",
    bg: "#ECFDF5",
    icon: "checkmark-circle-outline",
    msg: "Delivered successfully.",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "#EF4444",
    bg: "#FEF2F2",
    icon: "close-circle-outline",
    msg: "This delivery was cancelled.",
  },
};

const money = (v?: number | null) => (v == null ? "--" : `D${Number(v).toFixed(0)}`);

export default function ExpressDeliveryDetails() {
  const { deliveryId } = useLocalSearchParams<{ deliveryId: string }>();
  const router = useRouter();
  const [delivery, setDelivery] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDelivery = useCallback(async () => {
    if (!deliveryId) return;
    try {
      const res: any = await customDeliveryApi.getDeliveryById(deliveryId);
      setDelivery(res?.data ?? res);
    } catch {
      // keep whatever we had
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    fetchDelivery();
  }, [fetchDelivery]);

  const goToMap = () =>
    router.push({
      pathname: "/custom-delivery/[deliveryId]",
      params: { deliveryId: String(deliveryId) },
    });

  if (loading && !delivery) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: "center" }]}>
        <ActivityIndicator color={ORANGE} />
      </SafeAreaView>
    );
  }

  const status = String(delivery?.status ?? "PENDING");
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.PENDING;
  const paid =
    delivery?.paymentStatus === "PAID" ||
    delivery?.paymentStatus === "SUCCEEDED";
  const canTrack = TRACKABLE.includes(status);
  const isClosed = status === "DELIVERED" || status === "CANCELLED";

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Delivery Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchDelivery();
            }}
            tintColor={ORANGE}
          />
        }
      >
        {/* Status */}
        <View style={s.card}>
          <View style={s.cardRowBetween}>
            <View>
              <Text style={s.orderNo}>
                Express TG{String(deliveryId).slice(-6).toUpperCase()}
              </Text>
              <Text style={s.muted}>{cfg.msg}</Text>
            </View>
            <View style={[s.statusPill, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
              <Text style={[s.statusText, { color: cfg.color }]}>
                {cfg.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Route */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Route</Text>
          <View style={s.routeRow}>
            <View style={[s.dot, { backgroundColor: "#2563EB" }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.routeLabel}>Pickup</Text>
              <Text style={s.routeValue}>{delivery?.pickupAddress || "--"}</Text>
            </View>
          </View>
          <View style={s.routeConnector} />
          <View style={s.routeRow}>
            <View style={[s.dot, { backgroundColor: "#EF4444" }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.routeLabel}>Drop-off</Text>
              <Text style={s.routeValue}>
                {delivery?.dropoffAddress || "--"}
              </Text>
            </View>
          </View>
        </View>

        {/* Contacts */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Contacts</Text>
          <InfoRow
            icon="person-outline"
            label="Sender"
            value={`${delivery?.senderName || "--"}${
              delivery?.senderPhone ? ` · ${delivery.senderPhone}` : ""
            }`}
          />
          <InfoRow
            icon="person-circle-outline"
            label="Receiver"
            value={`${delivery?.receiverName || "--"}${
              delivery?.receiverPhone ? ` · ${delivery.receiverPhone}` : ""
            }`}
          />
        </View>

        {/* Package / vehicle */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Package</Text>
          <InfoRow
            icon="bicycle-outline"
            label="Vehicle"
            value={String(delivery?.vehicleType || "--").replace("_", " ")}
          />
          {!!delivery?.weightClass && (
            <InfoRow
              icon="cube-outline"
              label="Size"
              value={String(delivery.weightClass)}
            />
          )}
          {!!delivery?.packageDescription && (
            <InfoRow
              icon="document-text-outline"
              label="Notes"
              value={delivery.packageDescription}
            />
          )}
        </View>

        {/* Price */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Payment</Text>
          {delivery?.subtotalFee != null && (
            <Row label="Transport + booking" value={money(delivery.subtotalFee)} />
          )}
          {delivery?.serviceFee != null && (
            <Row label="Service fee" value={money(delivery.serviceFee)} />
          )}
          <View style={s.divider} />
          <Row
            label="Total"
            value={money(delivery?.estimatedFee ?? delivery?.subtotalFee)}
            bold
          />
          <View style={[s.statusPill, s.payPill, { marginTop: 10 }]}>
            <Ionicons
              name={paid ? "checkmark-circle" : "time-outline"}
              size={14}
              color={paid ? "#00A86B" : "#B45309"}
            />
            <Text
              style={[
                s.statusText,
                { color: paid ? "#00A86B" : "#B45309" },
              ]}
            >
              {paid ? "Paid" : "Awaiting payment"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky action */}
      {!isClosed && (
        <View style={s.actionBar}>
          {!paid && delivery?.adminApprovedForPayment ? (
            <TouchableOpacity style={s.payBtn} onPress={goToMap}>
              <Ionicons name="card-outline" size={20} color="#fff" />
              <Text style={s.payBtnText}>Pay Now</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.trackBtn, !canTrack && s.trackBtnOff]}
              onPress={goToMap}
              disabled={!canTrack}
              activeOpacity={0.85}
            >
              <Ionicons
                name="navigate"
                size={20}
                color={canTrack ? "#fff" : "#9CA3AF"}
              />
              <Text
                style={[s.trackBtnText, !canTrack && s.trackBtnTextOff]}
              >
                {canTrack
                  ? "Track Delivery"
                  : "Track available once driver picks up"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon as any} size={16} color={ORANGE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={s.priceRow}>
      <Text style={[s.priceLabel, bold && s.priceBold]}>{label}</Text>
      <Text style={[s.priceValue, bold && s.priceBold]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Platform.OS === "web" ? 12 : 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: ORANGE,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRowBetween: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  orderNo: { fontSize: 18, fontWeight: "800", color: "#111827" },
  muted: { fontSize: 13, color: "#6B7280", marginTop: 4, maxWidth: 210 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  payPill: { alignSelf: "flex-start", backgroundColor: "#F3F4F6" },
  statusText: { fontSize: 12, fontWeight: "700" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  routeConnector: {
    width: 2,
    height: 18,
    backgroundColor: "#E5E7EB",
    marginLeft: 5,
    marginVertical: 2,
  },
  routeLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
  routeValue: { fontSize: 15, color: "#1F2937", fontWeight: "600", marginTop: 1 },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#1F2937", marginTop: 1 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  priceLabel: { fontSize: 14, color: "#6B7280" },
  priceValue: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  priceBold: { fontSize: 17, fontWeight: "800", color: "#111827" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 8 },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 26,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  payBtn: {
    backgroundColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 16,
  },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  trackBtn: {
    backgroundColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 16,
  },
  trackBtnOff: { backgroundColor: "#E5E7EB" },
  trackBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  trackBtnTextOff: { color: "#9CA3AF", fontSize: 14, fontWeight: "700" },
});
