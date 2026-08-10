import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { experienceApi, Booking } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";

// Mirrors the Express delivery payment screen so both verticals pay the same
// way: summary -> pricing breakdown -> payment method -> sticky pay button.
const C = {
  primary: "#FF6B00",
  primarySoft: "rgba(255,107,0,0.1)",
  primaryBorder: "rgba(255,107,0,0.25)",
  bg: "#F5F5F7",
  surface: "#FFFFFF",
  divider: "#E8E8EA",
  ink: "#1C1C1E",
  inkMid: "#3A3A3C",
  inkLight: "#6B6B6E",
  success: "#00A86B",
};

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

function formatWhen(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const date = d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `${date} · ${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function BookingPaymentScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const paymentMethods: PaymentMethod[] = [
    {
      id: "wave",
      name: "Wave",
      description: "Pay with Wave app",
      enabled: true,
    },
  ];

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const b = await experienceApi.getBooking(String(bookingId));
      setBooking(b);
    } catch (error) {
      console.error("Load booking error:", error);
      Alert.alert("Error", "Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    const method = paymentMethods.find((m) => m.id === methodId);
    if (!method?.enabled) {
      Alert.alert(
        "Coming Soon",
        `${method?.name} payment will be available soon.`,
      );
      return;
    }
    setSelectedPaymentMethod(methodId);
  };

  const handlePayNow = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert(
        "Payment Method Required",
        "Please select a payment method to continue.",
      );
      return;
    }
    if (!booking) {
      Alert.alert("Error", "Booking details not loaded.");
      return;
    }

    setPaymentLoading(true);
    try {
      const res = await experienceApi.payForBooking(
        booking.id,
        "teranggo://booking-success",
      );
      const launchUrl = res?.wave_launch_url;
      if (!launchUrl) throw new Error("No Wave launch URL returned");

      const canOpen = await Linking.canOpenURL(launchUrl);
      if (!canOpen) {
        throw new Error("Cannot open Wave app URL. Ensure Wave is installed.");
      }

      await Linking.openURL(launchUrl);

      Alert.alert(
        "Wave Opened",
        "Complete your payment in Wave. You will be redirected back automatically.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace({
                pathname: "/booking/[bookingId]" as any,
                params: { bookingId: String(booking.id) },
              }),
          },
        ],
      );
    } catch (error) {
      console.error("Payment error:", error);
      Alert.alert(
        "Error",
        (error as any)?.message?.replace(/^API Error: \d+ - /, "") ||
          "Failed to process payment. Please try again.",
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColor} />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Booking not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Older bookings predate the split columns — derive so the maths still adds up.
  const subtotal =
    booking.subtotalAmount ?? booking.unitPrice * booking.quantity;
  const serviceFee =
    booking.serviceFee ?? Math.max(0, booking.totalAmount - subtotal);
  const alreadyPaid =
    booking.paymentStatus === "PAID" || booking.paymentStatus === "SUCCEEDED";

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Payment</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <LinearGradient
          colors={["#FF8A3D", "#FF6B00"]}
          style={styles.banner}
        >
          <View style={styles.bannerContent}>
            <Ionicons name="ticket" size={24} color="#FFFFFF" />
            <Text style={styles.bannerTitle}>
              {booking.experience?.name || "Experience Booking"}
            </Text>
          </View>
          <Text style={styles.bannerSubtitle}>
            Your slot is held until you pay
          </Text>
        </LinearGradient>

        {alreadyPaid && (
          <View style={styles.paidCard}>
            <Ionicons name="checkmark-circle" size={18} color={C.success} />
            <Text style={styles.paidText}>
              This booking is already paid. Open your ticket to see the QR code.
            </Text>
          </View>
        )}

        {/* Booking Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>

          <View style={styles.detailRow}>
            <View style={[styles.detailDot, { backgroundColor: C.primary }]} />
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Package</Text>
              <Text style={styles.detailValue}>{booking.option?.label}</Text>
            </View>
          </View>

          <View style={styles.detailConnector} />

          <View style={styles.detailRow}>
            <View style={[styles.detailDot, { backgroundColor: "#059669" }]} />
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>When</Text>
              <Text style={styles.detailValue}>
                {formatWhen(booking.startTime)}
              </Text>
            </View>
          </View>

          <View style={styles.detailConnector} />

          <View style={styles.detailRow}>
            <View style={[styles.detailDot, { backgroundColor: "#2563EB" }]} />
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Guests</Text>
              <Text style={styles.detailValue}>
                {booking.quantity}{" "}
                {booking.experience?.unitLabel
                  ? `${booking.experience.unitLabel}${booking.quantity === 1 ? "" : "s"}`
                  : booking.quantity === 1
                    ? "guest"
                    : "guests"}
              </Text>
            </View>
          </View>

          {!!booking.experience?.address && (
            <>
              <View style={styles.detailConnector} />
              <View style={styles.detailRow}>
                <View
                  style={[styles.detailDot, { backgroundColor: "#8B5CF6" }]}
                />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Where</Text>
                  <Text style={styles.detailValue}>
                    {booking.experience.address}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Pricing Breakdown */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Pricing Details</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {booking.option?.label} × {booking.quantity}
            </Text>
            <Text style={styles.priceValue}>D{subtotal.toLocaleString()}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service fee (5%)</Text>
            <Text style={[styles.priceValue, { color: "#2563EB" }]}>
              +D{serviceFee.toLocaleString()}
            </Text>
          </View>

          <View style={styles.priceDivider} />

          <View style={styles.priceRow}>
            <Text style={styles.priceLabelTotal}>Total Amount</Text>
            <Text style={styles.priceValueTotal}>
              D{booking.totalAmount.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === method.id &&
                  styles.paymentMethodSelected,
                !method.enabled && styles.paymentMethodDisabled,
              ]}
              onPress={() => handlePaymentMethodSelect(method.id)}
              disabled={!method.enabled}
            >
              <View style={styles.paymentMethodLeft}>
                <View
                  style={[
                    styles.paymentMethodIcon,
                    selectedPaymentMethod === method.id &&
                      styles.paymentMethodIconSelected,
                  ]}
                >
                  <Text style={styles.penguinIcon}>🐧</Text>
                </View>

                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodName}>{method.name}</Text>
                  <Text style={styles.paymentMethodDescription}>
                    {method.description}
                  </Text>
                </View>
              </View>

              {method.enabled && (
                <View
                  style={[
                    styles.paymentMethodRadio,
                    selectedPaymentMethod === method.id &&
                      styles.paymentMethodRadioSelected,
                  ]}
                >
                  {selectedPaymentMethod === method.id && (
                    <View style={styles.paymentMethodRadioInner} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Ticket note */}
        <View style={styles.qrSection}>
          <View style={styles.qrInfo}>
            <Ionicons name="qr-code" size={20} color={C.success} />
            <Text style={styles.qrText}>
              Your QR ticket is issued the moment payment clears
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedPaymentMethod || paymentLoading || alreadyPaid) &&
              styles.payButtonDisabled,
          ]}
          onPress={
            alreadyPaid
              ? () =>
                  router.replace({
                    pathname: "/booking/[bookingId]" as any,
                    params: { bookingId: String(booking.id) },
                  })
              : handlePayNow
          }
          disabled={!selectedPaymentMethod && !alreadyPaid ? true : paymentLoading}
        >
          {paymentLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.payButtonText}>
                {alreadyPaid ? "View Ticket" : "Pay with Wave"}
              </Text>
              {!alreadyPaid && (
                <Text style={styles.payButtonAmount}>
                  D{booking.totalAmount.toLocaleString()}
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: C.ink },
  placeholder: { width: 40 },

  content: { flex: 1, paddingHorizontal: 16 },

  banner: {
    marginVertical: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.92)",
  },

  paidCard: {
    backgroundColor: "rgba(0,168,107,0.08)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,168,107,0.2)",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  paidText: {
    flex: 1,
    fontSize: 13,
    color: C.inkMid,
    lineHeight: 18,
    fontWeight: "600",
  },

  summarySection: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.divider,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: C.ink,
    marginBottom: 16,
  },
  detailRow: { flexDirection: "row", alignItems: "flex-start" },
  detailDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  detailInfo: { flex: 1 },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.inkLight,
    marginBottom: 2,
  },
  detailValue: { fontSize: 14, color: C.ink, lineHeight: 20 },
  detailConnector: {
    width: 2,
    height: 16,
    backgroundColor: C.divider,
    marginLeft: 6,
    marginVertical: 8,
  },

  pricingSection: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.divider,
    padding: 16,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  priceLabel: { fontSize: 14, color: C.inkLight, flex: 1 },
  priceValue: { fontSize: 14, fontWeight: "600", color: C.ink },
  priceDivider: {
    height: 1,
    backgroundColor: C.divider,
    marginVertical: 8,
  },
  priceLabelTotal: { fontSize: 16, fontWeight: "bold", color: C.ink },
  priceValueTotal: { fontSize: 18, fontWeight: "bold", color: C.primary },

  paymentSection: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.divider,
    padding: 16,
    marginBottom: 16,
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.divider,
    marginBottom: 12,
  },
  paymentMethodSelected: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  paymentMethodDisabled: {
    backgroundColor: C.bg,
    borderColor: C.divider,
  },
  paymentMethodLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  paymentMethodIconSelected: { backgroundColor: "#FFE6D4" },
  penguinIcon: { fontSize: 22 },
  paymentMethodInfo: { flex: 1 },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: "600",
    color: C.ink,
    marginBottom: 2,
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: C.inkLight,
    lineHeight: 16,
  },
  paymentMethodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.divider,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentMethodRadioSelected: { borderColor: C.primary },
  paymentMethodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },

  qrSection: {
    backgroundColor: "rgba(0,168,107,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,168,107,0.2)",
    padding: 16,
    marginBottom: 16,
  },
  qrInfo: { flexDirection: "row", alignItems: "center" },
  qrText: {
    flex: 1,
    fontSize: 14,
    color: C.success,
    fontWeight: "600",
    marginLeft: 8,
  },

  footer: {
    padding: 16,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  payButton: {
    backgroundColor: C.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  payButtonDisabled: { backgroundColor: "#D1D5DB" },
  payButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginRight: 8,
  },
  payButtonAmount: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { fontSize: 16, color: C.inkLight, marginTop: 16 },
});
