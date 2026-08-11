import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Share,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryColor } from "@/constants/Colors";
import { experienceApi, Booking } from "@/lib/api";

const { width: SCREEN_W } = Dimensions.get("window");
const PAGE_BG = "#EEF1F5";
/** ~16s of grace for Wave's confirmation to land before we call it unpaid. */
const MAX_SETTLE_TRIES = 8;
const TICKET_W = SCREEN_W - 32;
const NOTCH = 26;

function parts(iso?: string) {
  if (!iso) return { date: "", time: "", weekday: "" };
  const d = new Date(iso);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    date: d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
    time: `${h}:${m.toString().padStart(2, "0")} ${ampm}`,
  };
}

export default function BookingTicketScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [settleTries, setSettleTries] = useState(0);
  const pollRef = useRef<any>(null);

  const isPaid =
    booking?.paymentStatus === "PAID" || booking?.paymentStatus === "SUCCEEDED";
  const isCancelled = booking?.status === "CANCELLED";
  const isCheckedIn = booking?.status === "CHECKED_IN";
  const isDone = booking?.status === "COMPLETED";
  const canCancel =
    !!booking &&
    !isCancelled &&
    !isCheckedIn &&
    !isDone &&
    new Date(booking.startTime).getTime() > Date.now();

  const subtotal =
    booking?.subtotalAmount ??
    (booking ? booking.unitPrice * booking.quantity : 0);
  const serviceFee =
    booking?.serviceFee ?? Math.max(0, (booking?.totalAmount ?? 0) - subtotal);

  const fetchBooking = useCallback(async () => {
    try {
      const b = await experienceApi.getBooking(bookingId);
      setBooking(b);
      return b;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // A ticket only exists once the booking is paid — but arriving straight back
  // from Wave we can beat the confirmation, so give it a few seconds before
  // deciding the booking really is unpaid and sending them to pay.
  useEffect(() => {
    if (loading || !booking || isPaid || isCancelled) return;

    if (settleTries >= MAX_SETTLE_TRIES) {
      router.replace({
        pathname: "/booking-payment" as any,
        params: { bookingId: String(booking.id) },
      });
      return;
    }
    const t = setTimeout(() => {
      fetchBooking();
      setSettleTries((n) => n + 1);
    }, 2000);
    return () => clearTimeout(t);
  }, [loading, booking, isPaid, isCancelled, settleTries, fetchBooking, router]);

  // Keep the ticket fresh so a check-in at the gate reflects immediately.
  useEffect(() => {
    if (isCancelled || isDone) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(fetchBooking, 15000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") fetchBooking();
    });
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      sub.remove();
    };
  }, [isCancelled, isDone, fetchBooking]);

  const handleCancel = () => {
    if (!booking) return;
    Alert.alert(
      "Cancel booking?",
      "This frees your slot and can't be undone. Your refund will be arranged by TeranGO support.",
      [
        { text: "Keep booking", style: "cancel" },
        {
          text: "Cancel booking",
          style: "destructive",
          onPress: async () => {
            try {
              setCancelling(true);
              await experienceApi.cancelBooking(booking.id);
              await fetchBooking();
              Alert.alert(
                "Booking cancelled",
                "Your slot was released. Support will arrange your refund.",
              );
            } catch (e: any) {
              Alert.alert(
                "Couldn't cancel",
                e?.message?.replace(/^API Error: \d+ - /, "") ||
                  "Please try again.",
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  const onShare = () => {
    if (!booking) return;
    const w = parts(booking.startTime);
    Share.share({
      message:
        `My TeranGO ticket — ${booking.experience?.name}\n` +
        `${w.weekday} ${w.date} at ${w.time}\n` +
        `${booking.option?.label} × ${booking.quantity}\n` +
        `Ref: ${booking.id.slice(-8).toUpperCase()}`,
    }).catch(() => {});
  };

  const openMap = () => {
    if (!booking?.experience) return;
    const q = encodeURIComponent(
      booking.experience.address ||
        booking.experience.city ||
        booking.experience.name ||
        "",
    );
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PrimaryColor} size="large" />
      </View>
    );
  }
  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#94A3B8" }}>Booking not found.</Text>
      </View>
    );
  }
  // Waiting on Wave's confirmation — don't flash the ticket, and don't imply
  // anything went wrong.
  if (!isPaid && !isCancelled) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PrimaryColor} size="large" />
        <Text style={styles.settleTitle}>Confirming your payment…</Text>
        <Text style={styles.settleSub}>
          This usually takes a few seconds. Your ticket appears as soon as it
          clears.
        </Text>
      </View>
    );
  }

  const w = parts(booking.startTime);
  const ref = booking.id.slice(-8).toUpperCase();

  const status = isCancelled
    ? { label: "Cancelled", bg: "#FEE2E2", fg: "#B91C1C", icon: "close-circle" }
    : isCheckedIn
      ? { label: "Checked in", bg: "#DBEAFE", fg: "#1D4ED8", icon: "checkmark-done-circle" }
      : isDone
        ? { label: "Completed", bg: "#E2E8F0", fg: "#475569", icon: "flag" }
        : { label: "Confirmed", bg: "#D1FAE5", fg: "#047857", icon: "checkmark-circle" };

  const dead = isCancelled || isDone;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />
      <SafeAreaView edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.replace("/experiences" as any)}
          >
            <Ionicons name="arrow-back" size={21} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>E-Ticket</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={onShare}>
            <Ionicons name="share-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Ticket ──────────────────────────────────────────────────── */}
        <View style={[styles.ticket, dead && { opacity: 0.62 }]}>
          {/* Stub head */}
          <LinearGradient
            colors={
              isCancelled
                ? ["#94A3B8", "#64748B"]
                : [PrimaryColor, "#FF8A34"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ticketHead}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.ticketBrand}>TERANGO</Text>
              <Text style={styles.ticketVenue} numberOfLines={1}>
                {booking.experience?.name}
              </Text>
            </View>
            <View style={styles.headIcon}>
              <Ionicons name="ticket" size={20} color="#fff" />
            </View>
          </LinearGradient>

          {/* QR */}
          <View style={styles.qrZone}>
            <View style={styles.qrFrame}>
              {booking.qrCodeUrl ? (
                <Image source={{ uri: booking.qrCodeUrl }} style={styles.qr} />
              ) : (
                <View style={[styles.qr, styles.qrEmpty]}>
                  <Ionicons name="qr-code-outline" size={56} color="#CBD5E1" />
                </View>
              )}
            </View>
            <Text style={styles.qrHint}>
              {isCheckedIn
                ? "Already scanned"
                : isCancelled
                  ? "This ticket is void"
                  : "Show this at the entrance"}
            </Text>
          </View>

          {/* Perforation */}
          <View style={styles.perforation}>
            <View style={[styles.notch, styles.notchLeft]} />
            <View style={styles.dashRow}>
              {Array.from({ length: 26 }).map((_, i) => (
                <View key={i} style={styles.dash} />
              ))}
            </View>
            <View style={[styles.notch, styles.notchRight]} />
          </View>

          {/* Stub body */}
          <View style={styles.stub}>
            <View style={styles.gridRow}>
              <Field label="Date" value={w.date} sub={w.weekday} />
              <Field label="Time" value={w.time} align="right" />
            </View>
            <View style={styles.gridRow}>
              <Field label="Package" value={booking.option?.label || "—"} />
              <Field
                label={booking.experience?.unitLabel ? `${booking.experience.unitLabel}s` : "Guests"}
                value={String(booking.quantity)}
                align="right"
              />
            </View>

            <View style={styles.stubDivider} />

            <View style={styles.gridRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Booking reference</Text>
                <Text style={styles.refValue}>{ref}</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                <Ionicons name={status.icon as any} size={13} color={status.fg} />
                <Text style={[styles.statusChipText, { color: status.fg }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            <View style={styles.stubDivider} />

            <View style={styles.payRow}>
              <Text style={styles.payLabel}>
                D{subtotal}
                {serviceFee > 0 ? ` + D${serviceFee} fee` : ""}
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.fieldLabel}>Total paid</Text>
                <Text style={styles.payTotal}>D{booking.totalAmount}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Venue */}
        {!!(booking.experience?.address || booking.experience?.city) && (
          <TouchableOpacity
            style={styles.venueRow}
            activeOpacity={0.85}
            onPress={openMap}
          >
            <View style={styles.venueIcon}>
              <Ionicons name="location" size={19} color={PrimaryColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.venueName}>Getting there</Text>
              <Text style={styles.venueSub} numberOfLines={1}>
                {booking.experience.address || booking.experience.city}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}

        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <Text style={styles.cancelBtnText}>Cancel booking</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace("/experiences" as any)}
        >
          <Text style={styles.secondaryBtnText}>Browse more experiences</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  sub,
  align,
}: {
  label: string;
  value: string;
  sub?: string;
  align?: "right";
}) {
  return (
    <View style={{ flex: 1, alignItems: align === "right" ? "flex-end" : "flex-start" }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text
        style={[styles.fieldValue, align === "right" && { textAlign: "right" }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {!!sub && <Text style={styles.fieldSub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  center: {
    flex: 1,
    backgroundColor: PAGE_BG,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  settleTitle: {
    marginTop: 18,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  settleSub: {
    marginTop: 8,
    fontSize: 13.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },

  /* Ticket */
  ticket: {
    width: TICKET_W,
    backgroundColor: "#fff",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 6,
  },
  ticketHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
  },
  ticketBrand: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.5,
  },
  ticketVenue: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 3,
    letterSpacing: -0.3,
  },
  headIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },

  qrZone: { alignItems: "center", paddingTop: 26, paddingBottom: 20 },
  qrFrame: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#EDF1F6",
  },
  qr: { width: 190, height: 190 },
  qrEmpty: { justifyContent: "center", alignItems: "center" },
  qrHint: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },

  perforation: {
    height: NOTCH,
    justifyContent: "center",
  },
  notch: {
    position: "absolute",
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: PAGE_BG,
    top: 0,
  },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },
  dashRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: NOTCH / 2 + 6,
  },
  dash: {
    width: 7,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#D8DEE6",
  },

  stub: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 20 },
  gridRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  fieldValue: { fontSize: 15.5, fontWeight: "800", color: "#0F172A" },
  fieldSub: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  stubDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 16,
  },
  refValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 3,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusChipText: { fontSize: 12, fontWeight: "800" },
  payRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  payLabel: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
  payTotal: { fontSize: 22, fontWeight: "900", color: PrimaryColor },

  /* Venue */
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
  },
  venueIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  venueName: { fontSize: 14.5, fontWeight: "800", color: "#0F172A" },
  venueSub: { fontSize: 12.5, color: "#94A3B8", marginTop: 2 },

  cancelBtn: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
  },
  cancelBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 15 },
  secondaryBtn: { alignItems: "center", paddingVertical: 18, marginTop: 2 },
  secondaryBtnText: { color: PrimaryColor, fontWeight: "800", fontSize: 15 },
});
