import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryColor } from "@/constants/Colors";
import { experienceApi, Booking } from "@/lib/api";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function buildDays(count = 10) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    return {
      key: ymd(d),
      top:
        i === 0
          ? "Today"
          : i === 1
            ? "Tmrw"
            : d.toLocaleDateString("en-US", { weekday: "short" }),
      day: String(d.getDate()),
    };
  });
}
function slotTime(iso: string) {
  const d = new Date(iso);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ap}`;
}

export default function VendorBookingsScreen() {
  const router = useRouter();
  const [days] = useState(buildDays());
  const [date, setDate] = useState(days[0].key);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const data = await experienceApi.getVendorBookings(date);
        setBookings(Array.isArray(data) ? data : []);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [date],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleCheckIn = (b: Booking) => {
    Alert.alert(
      "Check in guest?",
      `${b.userProfile?.user?.fullName || "Guest"} · ${b.option?.label} · ${
        b.quantity
      }`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Check in",
          onPress: async () => {
            try {
              setCheckingIn(b.id);
              const updated = await experienceApi.checkInBooking(b.id);
              setBookings((prev) =>
                prev.map((x) => (x.id === b.id ? { ...x, ...updated } : x)),
              );
            } catch (e: any) {
              Alert.alert(
                "Couldn't check in",
                e?.message?.replace(/^API Error: \d+ - /, "") ||
                  "Please try again.",
              );
            } finally {
              setCheckingIn(null);
            }
          },
        },
      ],
    );
  };

  const paidBookings = bookings.filter(
    (b) => b.paymentStatus === "PAID" || b.paymentStatus === "SUCCEEDED",
  );
  const totalGuests = paidBookings.reduce((s, b) => s + (b.quantity || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />
      <LinearGradient colors={[PrimaryColor, "#FF8A34"]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bookings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryNum}>{paidBookings.length}</Text>
            <Text style={styles.summaryLbl}>booked</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryNum}>{totalGuests}</Text>
            <Text style={styles.summaryLbl}>guests</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Date strip */}
      <View style={styles.dateStripWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          {days.map((d) => {
            const active = date === d.key;
            return (
              <TouchableOpacity
                key={d.key}
                onPress={() => setDate(d.key)}
                style={[styles.dayChip, active && styles.dayChipActive]}
              >
                <Text style={[styles.dayTop, active && styles.dayActive]}>
                  {d.top}
                </Text>
                <Text style={[styles.dayNum, active && styles.dayActive]}>
                  {d.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            colors={[PrimaryColor]}
          />
        }
      >
        {loading ? (
          <ActivityIndicator
            color={PrimaryColor}
            size="large"
            style={{ marginTop: 40 }}
          />
        ) : bookings.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={44} color="#CBD5E1" />
            <Text style={styles.emptyText}>No bookings for this day.</Text>
          </View>
        ) : (
          bookings.map((b) => {
            const paid =
              b.paymentStatus === "PAID" || b.paymentStatus === "SUCCEEDED";
            const checkedIn = b.status === "CHECKED_IN";
            const cancelled = b.status === "CANCELLED";
            return (
              <View
                key={b.id}
                style={[styles.card, cancelled && { opacity: 0.55 }]}
              >
                <View style={styles.timeCol}>
                  <Text style={styles.timeText}>{slotTime(b.startTime)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guestName}>
                    {b.userProfile?.user?.fullName || "Guest"}
                  </Text>
                  <Text style={styles.bookingMeta}>
                    {b.option?.label} · {b.quantity} × D{b.unitPrice}
                  </Text>
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: cancelled
                          ? "#DC2626"
                          : checkedIn
                            ? "#2563EB"
                            : paid
                              ? "#059669"
                              : "#C2410C",
                      },
                    ]}
                  >
                    {cancelled
                      ? "Cancelled"
                      : checkedIn
                        ? "Checked in ✓"
                        : paid
                          ? "Paid"
                          : "Awaiting payment"}
                  </Text>
                </View>
                {paid && !checkedIn && !cancelled && (
                  <TouchableOpacity
                    style={styles.checkInBtn}
                    onPress={() => handleCheckIn(b)}
                    disabled={checkingIn === b.id}
                  >
                    {checkingIn === b.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.checkInText}>Check in</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
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
  summaryRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  summaryPill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  summaryNum: { color: "#fff", fontSize: 18, fontWeight: "900" },
  summaryLbl: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
  dateStripWrap: { paddingVertical: 12, backgroundColor: "#fff" },
  dayChip: {
    width: 54,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  dayChipActive: { backgroundColor: PrimaryColor },
  dayTop: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  dayNum: { fontSize: 16, color: "#0F172A", fontWeight: "800", marginTop: 2 },
  dayActive: { color: "#fff" },
  empty: { alignItems: "center", paddingTop: 70 },
  emptyText: { color: "#94A3B8", fontSize: 15, marginTop: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  timeCol: {
    width: 62,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#F1F5F9",
    paddingRight: 10,
  },
  timeText: { fontSize: 13, fontWeight: "800", color: PrimaryColor },
  guestName: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  bookingMeta: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  statusText: { fontSize: 12, fontWeight: "700", marginTop: 6 },
  checkInBtn: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  checkInText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
