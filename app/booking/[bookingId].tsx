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
  Linking,
  AppState,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryColor } from "@/constants/Colors";
import { experienceApi, Booking } from "@/lib/api";

function formatWhen(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const date = d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${date} · ${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function BookingReceiptScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const [method, setMethod] = useState<string | null>("wave");
  const pollRef = useRef<any>(null);

  const isPaid =
    booking?.paymentStatus === "PAID" || booking?.paymentStatus === "SUCCEEDED";
  const isCancelled = booking?.status === "CANCELLED";
  const canCancel =
    !!booking &&
    !isCancelled &&
    booking.status !== "CHECKED_IN" &&
    booking.status !== "COMPLETED" &&
    new Date(booking.startTime).getTime() > Date.now();

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

  const handleCancel = () => {
    if (!booking) return;
    const paidNote = isPaid
      ? " Your refund will be arranged by TeranGO support."
      : "";
    Alert.alert(
      "Cancel booking?",
      `This frees your slot and can't be undone.${paidNote}`,
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
                isPaid
                  ? "Your slot was released. Support will arrange your refund."
                  : "Your slot was released.",
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

  // Poll while unpaid so the receipt flips to confirmed after Wave returns.
  useEffect(() => {
    if (isPaid || isCancelled) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(fetchBooking, 3000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") fetchBooking();
    });
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      sub.remove();
    };
  }, [isPaid, isCancelled, fetchBooking]);

  const handlePay = async () => {
    if (!booking) return;
    if (!method) {
      Alert.alert(
        "Choose a payment method",
        "Select how you'd like to pay to continue.",
      );
      return;
    }
    try {
      setPaying(true);
      const res = await experienceApi.payForBooking(
        booking.id,
        "teranggo://booking-success",
      );
      const url = res?.wave_launch_url;
      if (!url) throw new Error("No payment link received");
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error("Cannot open Wave. Is the app installed?");
      await Linking.openURL(url);
      setPaySheetOpen(false);
    } catch (e: any) {
      Alert.alert(
        "Payment failed",
        e?.message?.replace(/^API Error: \d+ - /, "") ||
          "Couldn't start the payment. Please try again.",
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={PrimaryColor} size="large" />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: "#94A3B8" }}>Booking not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

      {/* Header */}
      <LinearGradient
        colors={
          isCancelled
            ? ["#94A3B8", "#64748B"]
            : isPaid
              ? ["#10B981", "#059669"]
              : [PrimaryColor, "#FF8A34"]
        }
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/experiences" as any)}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isCancelled
              ? "Booking Cancelled"
              : isPaid
                ? "Your Ticket"
                : "Confirm & Pay"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: isCancelled
                ? "#FEF2F2"
                : isPaid
                  ? "#ECFDF5"
                  : "#FFF7ED",
            },
          ]}
        >
          <Ionicons
            name={
              isCancelled
                ? "close-circle"
                : isPaid
                  ? "checkmark-circle"
                  : "time-outline"
            }
            size={20}
            color={isCancelled ? "#DC2626" : isPaid ? "#059669" : PrimaryColor}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: isCancelled
                  ? "#B91C1C"
                  : isPaid
                    ? "#047857"
                    : "#C2410C",
              },
            ]}
          >
            {isCancelled
              ? "This booking was cancelled"
              : isPaid
                ? "Booking confirmed — show this QR at the venue"
                : "Almost there — pay to confirm your slot"}
          </Text>
        </View>

        {/* QR (paid only) */}
        {isPaid && !isCancelled && (
          <View style={styles.qrCard}>
            {booking.qrCodeUrl ? (
              <Image source={{ uri: booking.qrCodeUrl }} style={styles.qr} />
            ) : (
              <View style={[styles.qr, styles.qrPlaceholder]}>
                <Ionicons name="qr-code" size={64} color="#CBD5E1" />
              </View>
            )}
            <Text style={styles.bookingCode}>
              #{booking.id.slice(-8).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.expName}>{booking.experience?.name}</Text>
          <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={16} color="#94A3B8" />
            <Text style={styles.detailText}>{booking.option?.label}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
            <Text style={styles.detailText}>
              {formatWhen(booking.startTime)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={16} color="#94A3B8" />
            <Text style={styles.detailText}>
              {booking.quantity} × D{booking.unitPrice}
            </Text>
          </View>
          {!!booking.experience?.address && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color="#94A3B8" />
              <Text style={styles.detailText}>
                {booking.experience.address}
              </Text>
            </View>
          )}

          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>D{booking.totalAmount}</Text>
          </View>
        </View>

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

        {(isPaid || isCancelled) && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace("/experiences" as any)}
          >
            <Text style={styles.secondaryBtnText}>Browse more experiences</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Pay CTA — opens the payment-method sheet */}
      {!isPaid && !isCancelled && (
        <View style={styles.footer}>
          <View style={styles.footerTotalRow}>
            <Text style={styles.footerTotalLabel}>Total to pay</Text>
            <Text style={styles.footerTotalValue}>D{booking.totalAmount}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setPaySheetOpen(true)}
          >
            <LinearGradient
              colors={[PrimaryColor, "#FF8A34"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <Ionicons name="card" size={18} color="#fff" />
              <Text style={styles.ctaText}>Continue to payment</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Payment method sheet (same pattern as Express delivery) ─────── */}
      <Modal
        visible={paySheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => !paying && setPaySheetOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => !paying && setPaySheetOpen(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Payment</Text>
            <TouchableOpacity
              onPress={() => !paying && setPaySheetOpen(false)}
              hitSlop={10}
            >
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Breakdown */}
          <View style={styles.sheetBlock}>
            <Text style={styles.sheetBlockTitle}>Order summary</Text>
            <View style={styles.sheetRow}>
              <Text style={styles.sheetRowLabel} numberOfLines={1}>
                {booking.option?.label}
              </Text>
              <Text style={styles.sheetRowValue}>D{booking.unitPrice}</Text>
            </View>
            <View style={styles.sheetRow}>
              <Text style={styles.sheetRowLabel}>Quantity</Text>
              <Text style={styles.sheetRowValue}>× {booking.quantity}</Text>
            </View>
            <View style={styles.sheetRow}>
              <Text style={styles.sheetRowLabel}>When</Text>
              <Text style={styles.sheetRowValue}>
                {formatWhen(booking.startTime)}
              </Text>
            </View>
            <View style={styles.sheetDivider} />
            <View style={styles.sheetRow}>
              <Text style={styles.sheetTotalLabel}>Total</Text>
              <Text style={styles.sheetTotalValue}>D{booking.totalAmount}</Text>
            </View>
          </View>

          {/* Methods */}
          <View style={styles.sheetBlock}>
            <Text style={styles.sheetBlockTitle}>Payment method</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setMethod("wave")}
              style={[
                styles.methodCard,
                method === "wave" && styles.methodCardActive,
              ]}
            >
              <View
                style={[
                  styles.methodIcon,
                  method === "wave" && styles.methodIconActive,
                ]}
              >
                <Text style={{ fontSize: 22 }}>🐧</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodName}>Wave</Text>
                <Text style={styles.methodDesc}>Pay with the Wave app</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  method === "wave" && styles.radioActive,
                ]}
              >
                {method === "wave" && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>

            <View style={[styles.methodCard, styles.methodCardDisabled]}>
              <View style={styles.methodIcon}>
                <Ionicons name="cash-outline" size={20} color="#94A3B8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.methodName, { color: "#94A3B8" }]}>
                  Cash at venue
                </Text>
                <Text style={styles.methodDesc}>
                  Not available — slots are held only once paid
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.secureNote}>
            <Ionicons name="lock-closed" size={13} color="#059669" />
            <Text style={styles.secureNoteText}>
              Secured by Wave. You'll come straight back here for your QR.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={paying || !method}
            onPress={handlePay}
          >
            <LinearGradient
              colors={
                paying || !method
                  ? ["#CBD5E1", "#CBD5E1"]
                  : [PrimaryColor, "#FF8A34"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sheetCta}
            >
              {paying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.ctaText}>Pay with Wave</Text>
                  <Text style={styles.sheetCtaAmount}>
                    D{booking.totalAmount}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  center: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  statusText: { flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  qrCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  qr: { width: 200, height: 200 },
  qrPlaceholder: { justifyContent: "center", alignItems: "center" },
  bookingCode: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#0F172A",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  expName: { fontSize: 19, fontWeight: "900", color: "#0F172A", marginBottom: 12 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  detailText: { fontSize: 14, color: "#334155", flex: 1 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 6 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  totalLabel: { fontSize: 15, fontWeight: "700", color: "#64748B" },
  totalValue: { fontSize: 22, fontWeight: "900", color: PrimaryColor },
  secondaryBtn: { alignItems: "center", paddingVertical: 18, marginTop: 4 },
  secondaryBtnText: { color: PrimaryColor, fontWeight: "800", fontSize: 15 },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
  },
  cancelBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 15 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  footerTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  footerTotalLabel: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  footerTotalValue: { fontSize: 20, fontWeight: "900", color: "#0F172A" },

  /* Payment sheet */
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 21, fontWeight: "900", color: "#0F172A" },
  sheetBlock: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  sheetBlockTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
    gap: 12,
  },
  sheetRowLabel: { fontSize: 14, color: "#64748B", flex: 1 },
  sheetRowValue: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  sheetDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 6,
  },
  sheetTotalLabel: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  sheetTotalValue: { fontSize: 20, fontWeight: "900", color: PrimaryColor },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 13,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  methodCardActive: { borderColor: PrimaryColor, backgroundColor: "#FFFAF7" },
  methodCardDisabled: { opacity: 0.55, backgroundColor: "#F8FAFC" },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  methodIconActive: { backgroundColor: "#FFE6D4" },
  methodName: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  methodDesc: { fontSize: 12, color: "#94A3B8", marginTop: 2, lineHeight: 16 },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: { borderColor: PrimaryColor },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PrimaryColor,
  },
  secureNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  secureNoteText: {
    flex: 1,
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 16,
  },
  sheetCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 16,
  },
  sheetCtaAmount: { color: "#fff", fontSize: 17, fontWeight: "900" },
});
