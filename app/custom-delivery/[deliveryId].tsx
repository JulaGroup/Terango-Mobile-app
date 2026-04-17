import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Platform,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { customDeliveryApi } from "@/lib/api";
import { apiCall } from "@/lib/apiClient";
import { formatExpressDeliveryId } from "@/utils/formatExpressDeliveryId";
import { TrackingTimeline } from "@/components/express/TrackingTimeline";
import { API_URL } from "@/constants/config";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ── Design System ─────────────────────────────────────────
const T = {
  brand: "#FF6B00",
  brandDark: "#E55A00",
  brandSoft: "rgba(255,107,0,0.12)",
  brandFaint: "rgba(255,107,0,0.06)",
  heroBase: "#000000",
  heroCard: "rgba(255,255,255,0.06)",
  heroBorder: "rgba(255,255,255,0.10)",
  heroTextDim: "rgba(255,255,255,0.70)",
  bg: "#F4F6F9",
  surface: "#FFFFFF",
  border: "#E9ECEF",
  textPrimary: "#000000",
  textSecondary: "#495057",
  textTertiary: "#6C757D",
  blue: "#007BFF",
  blueSoft: "rgba(0,123,255,0.10)",
  amber: "#FF6B00",
  amberSoft: "rgba(255,107,0,0.10)",
  red: "#DC3545",
  redSoft: "rgba(220,53,69,0.08)",
  success: "#28A745",
  successSoft: "rgba(40,167,69,0.10)",
};

const STATUS_MAP: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    dot: string;
    icon: string;
    heroMsg: string;
  }
> = {
  PENDING: {
    label: "Pending",
    color: T.amber,
    bg: T.amberSoft,
    dot: T.amber,
    icon: "time-outline",
    heroMsg: "Waiting for admin confirmation",
  },
  DRIVER_ASSIGNED: {
    label: "Driver Assigned",
    color: T.blue,
    bg: T.blueSoft,
    dot: T.blue,
    icon: "person-outline",
    heroMsg: "A driver is on the way to pickup",
  },
  PICKED_UP: {
    label: "Picked Up",
    color: T.brand,
    bg: T.brandSoft,
    dot: T.brand,
    icon: "bag-check-outline",
    heroMsg: "Package collected · En route",
  },
  IN_TRANSIT: {
    label: "In Transit",
    color: T.brand,
    bg: T.brandSoft,
    dot: T.brand,
    icon: "navigate-outline",
    heroMsg: "Your package is on the move",
  },
  DELIVERED: {
    label: "Delivered ✓",
    color: T.success,
    bg: T.successSoft,
    dot: T.success,
    icon: "checkmark-circle-outline",
    heroMsg: "Package delivered successfully",
  },
  CANCELLED: {
    label: "Cancelled",
    color: T.red,
    bg: T.redSoft,
    dot: T.red,
    icon: "close-circle-outline",
    heroMsg: "This delivery was cancelled",
  },
};

interface DeliveryDetails {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  weightClass: string;
  vehicleType: string;
  status?: string | null;
  estimatedFee?: number | null;
  estimatedDistanceKm?: number | null;
  isExpress?: boolean;
  priorityLevel?: string | null;
  packageDescription?: string | null;
  customerNote?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  paymentStatus?: "UNPAID" | "PAID" | "FAILED" | "REFUNDED" | null;
  adminApprovedForPayment?: boolean;
  bookingFee?: number | null;
  serviceFee?: number | null;
  subtotalFee?: number | null;
  serviceFeePercent?: number | null;
  expressFeesApplied?: number | null;
  guaranteedDeliveryTime?: string | null;
  createdAt: string;
  trackingUpdates?: {
    id: string;
    status: string;
    message?: string | null;
    createdAt: string;
  }[];
  driver?: {
    id: string;
    user: { fullName: string; phone: string };
    currentLatitude?: number | null;
    currentLongitude?: number | null;
  } | null;
}

const fmtCurrency = (v?: number | null) =>
  v == null ? "--" : `D${v.toFixed(0)}`;
const fmtDistance = (v?: number | null) =>
  v == null ? "--" : `${v.toFixed(1)} km`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ── Info Row ──────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
  onPress,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
  accent?: boolean;
}) {
  return (
    <TouchableOpacity
      style={ir.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[ir.iconBox, accent && ir.iconBoxAccent]}>
        <Ionicons
          name={icon as any}
          size={16}
          color={accent ? T.brand : T.textTertiary}
        />
      </View>
      <View style={ir.content}>
        <Text style={ir.label}>{label}</Text>
        <Text style={[ir.value, accent && ir.valueAccent]}>{value}</Text>
      </View>
      {onPress && (
        <View style={ir.actionChip}>
          <Ionicons name="call" size={12} color={T.brand} />
          <Text style={ir.actionText}>Call</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
const ir = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.bg,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxAccent: { backgroundColor: T.brandFaint },
  content: { flex: 1 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: T.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: T.textPrimary,
    marginTop: 2,
  },
  valueAccent: { color: T.brand },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  actionText: { fontSize: 11, fontWeight: "700", color: T.brand },
});

// ── Section Card ──────────────────────────────────────────
function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <View style={sc.iconPill}>
          <Ionicons name={icon as any} size={14} color={T.brand} />
        </View>
        <Text style={sc.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  iconPill: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: T.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.2,
  },
});

// ── Payment Bottom Sheet ──────────────────────────────────
function PaymentSheet({
  visible,
  onClose,
  delivery,
}: {
  visible: boolean;
  onClose: () => void;
  delivery: DeliveryDetails;
}) {
  const slideY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.5) closeSheet();
        else
          Animated.spring(slideY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
      },
    }),
  ).current;

  const openSheet = useCallback(() => {
    slideY.setValue(SCREEN_H);
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: SCREEN_H,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      setSelectedMethod(null);
      openSheet();
    }
  }, [visible]);

  const handlePay = async () => {
    if (!selectedMethod)
      return Alert.alert("Select Payment", "Please select a payment method.");
    if (!delivery.adminApprovedForPayment)
      return Alert.alert(
        "Awaiting Approval",
        "Payment is enabled only after admin confirms delivery timing.",
      );

    setPaymentLoading(true);
    try {
      const backendBase = API_URL
        ? String(API_URL).replace(/\/api\/?(.*)?$/, "")
        : "https://monkfish-app-korrv.ondigitalocean.app";
      const successUrl = `${backendBase}/api/redirect/payment-success?deliveryId=${delivery.id}`;
      const cancelUrl = `${backendBase}/api/redirect/payment-cancel?deliveryId=${delivery.id}`;

      const response = await apiCall(
        `/api/payments/express-delivery/${delivery.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            paymentMethod: "WAVE",
            success_url: successUrl,
            cancel_url: cancelUrl,
            error_url: cancelUrl,
          }),
        },
      );

      const launchUrl =
        response?.wave_launch_url ||
        response?.data?.wave_launch_url ||
        response?.session?.wave_launch_url ||
        response?.data?.checkoutUrl ||
        response?.checkoutUrl;
      if (!launchUrl)
        throw new Error(response?.message || "No Wave launch URL returned");

      const canOpen = await Linking.canOpenURL(launchUrl);
      if (!canOpen)
        throw new Error(
          "Cannot open Wave app. Please ensure Wave is installed.",
        );

      await Linking.openURL(launchUrl);
      closeSheet();
      Alert.alert(
        "Wave Opened",
        "Complete your payment in the Wave app. Your order status will update automatically.",
      );
    } catch (error) {
      Alert.alert(
        "Payment Error",
        (error as any)?.message ||
          "Failed to process payment. Please try again.",
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  if (!visible) return null;

  const transportFee = Math.max(
    0,
    (delivery.subtotalFee || delivery.estimatedFee || 0) -
      (delivery.bookingFee || 0),
  );

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={closeSheet}
    >
      <Animated.View style={[ps.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={closeSheet}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[ps.sheet, { transform: [{ translateY: slideY }] }]}
      >
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={ps.handleArea}>
          <View style={ps.handle} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 36 }}
        >
          {/* Header */}
          <View style={ps.sheetHeader}>
            <View style={ps.sheetHeaderLeft}>
              <View style={ps.sheetIconWrap}>
                <Ionicons name="card-outline" size={18} color={T.brand} />
              </View>
              <View>
                <Text style={ps.sheetTitle}>Complete Payment</Text>
                <Text style={ps.sheetSubtitle}>
                  Secure checkout via Wave Money
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={ps.closeBtn}
              onPress={closeSheet}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={16} color={T.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Approval warning */}
          {!delivery.adminApprovedForPayment && (
            <View style={ps.approvalBanner}>
              <Ionicons name="time-outline" size={15} color={T.amber} />
              <Text style={ps.approvalText}>
                Payment unlocks after admin confirms driver availability.
              </Text>
            </View>
          )}

          {/* Big amount card */}
          <View style={ps.amountCard}>
            <View style={ps.amountDeco} />
            <Text style={ps.amountEyebrow}>TOTAL TO PAY</Text>
            <Text style={ps.amountValue}>
              {fmtCurrency(delivery.estimatedFee)}
            </Text>
            <View style={ps.amountPills}>
              <View style={ps.amountPill}>
                <Ionicons name="navigate-outline" size={10} color={T.brand} />
                <Text style={ps.amountPillText}>
                  {fmtDistance(delivery.estimatedDistanceKm)}
                </Text>
              </View>
              <View style={ps.amountPill}>
                <Ionicons name="flash-outline" size={10} color={T.brand} />
                <Text style={ps.amountPillText}>
                  {delivery.priorityLevel || "STANDARD"}
                </Text>
              </View>
            </View>
          </View>

          {/* Breakdown */}
          <View style={ps.breakdownWrap}>
            <Text style={ps.breakdownHeading}>Price Breakdown</Text>
            {(delivery.bookingFee ?? 0) > 0 && (
              <View style={ps.breakdownRow}>
                <Text style={ps.breakdownLabel}>Booking fee</Text>
                <Text style={ps.breakdownVal}>
                  D{(delivery.bookingFee || 0).toFixed(0)}
                </Text>
              </View>
            )}
            <View style={ps.breakdownRow}>
              <Text style={ps.breakdownLabel}>Transport fee</Text>
              <Text style={ps.breakdownVal}>D{transportFee.toFixed(0)}</Text>
            </View>
            {(delivery.expressFeesApplied ?? 0) > 0 && (
              <View style={ps.breakdownRow}>
                <Text style={ps.breakdownLabel}>Express surcharge</Text>
                <Text style={[ps.breakdownVal, { color: T.amber }]}>
                  +D{(delivery.expressFeesApplied || 0).toFixed(0)}
                </Text>
              </View>
            )}
            {(delivery.serviceFee ?? 0) > 0 && (
              <View style={ps.breakdownRow}>
                <Text style={ps.breakdownLabel}>
                  Service fee
                  {delivery.serviceFeePercent
                    ? ` (${delivery.serviceFeePercent}%)`
                    : " (5%)"}
                </Text>
                <Text style={[ps.breakdownVal, { color: T.blue }]}>
                  +D{(delivery.serviceFee || 0).toFixed(0)}
                </Text>
              </View>
            )}
            <View style={ps.breakdownDivider} />
            <View style={ps.breakdownRow}>
              <Text style={ps.breakdownTotal}>Total</Text>
              <Text style={ps.breakdownTotalVal}>
                {fmtCurrency(delivery.estimatedFee)}
              </Text>
            </View>
          </View>

          {/* Method section */}
          <Text style={ps.methodHeading}>Payment Method</Text>

          <TouchableOpacity
            style={[
              ps.methodCard,
              selectedMethod === "wave" && ps.methodCardSelected,
            ]}
            onPress={() => setSelectedMethod("wave")}
            activeOpacity={0.8}
          >
            <View
              style={[
                ps.methodEmoji,
                selectedMethod === "wave" && ps.methodEmojiSelected,
              ]}
            >
              <Text style={{ fontSize: 26 }}>🐧</Text>
            </View>
            <View style={ps.methodInfo}>
              <Text style={ps.methodName}>Wave</Text>
              <Text style={ps.methodDesc}>
                Pay securely via Wave mobile money
              </Text>
            </View>
            <View
              style={[ps.radio, selectedMethod === "wave" && ps.radioSelected]}
            >
              {selectedMethod === "wave" && <View style={ps.radioInner} />}
            </View>
          </TouchableOpacity>

          <View style={ps.secureRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={12}
              color={T.success}
            />
            <Text style={ps.secureText}>
              End-to-end encrypted · Secured by Wave
            </Text>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[
              ps.payBtn,
              (!selectedMethod ||
                paymentLoading ||
                !delivery.adminApprovedForPayment) &&
                ps.payBtnDisabled,
            ]}
            onPress={handlePay}
            disabled={
              !selectedMethod ||
              paymentLoading ||
              !delivery.adminApprovedForPayment
            }
            activeOpacity={0.85}
          >
            {paymentLoading ? (
              <View style={ps.payBtnInner}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : (
              <LinearGradient
                colors={
                  delivery.adminApprovedForPayment && selectedMethod
                    ? [T.brand, T.brandDark]
                    : ["#C4C4C4", "#ABABAB"]
                }
                style={ps.payBtnInner}
              >
                <Ionicons
                  name="flash"
                  size={16}
                  color="#fff"
                  style={{ marginRight: 4 }}
                />
                <Text style={ps.payBtnText}>
                  {delivery.adminApprovedForPayment
                    ? "Pay"
                    : "Awaiting Admin Approval"}
                </Text>
                {delivery.adminApprovedForPayment && (
                  <View style={ps.payBtnBadge}>
                    <Text style={ps.payBtnBadgeText}>
                      {fmtCurrency(delivery.estimatedFee)}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const ps = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: T.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_H * 0.9,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 24 },
    }),
  },
  handleArea: { alignItems: "center", paddingTop: 12, paddingBottom: 4 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#DDE0E6" },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.bg,
  },
  sheetHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: T.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: T.textPrimary },
  sheetSubtitle: {
    fontSize: 11,
    color: T.textTertiary,
    fontWeight: "500",
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  approvalBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    margin: 16,
    marginBottom: 0,
    backgroundColor: T.amberSoft,
    borderWidth: 1,
    borderColor: "rgba(255,107,0,0.2)",
    borderRadius: 14,
    padding: 14,
  },
  approvalText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: T.amber,
    lineHeight: 17,
  },

  amountCard: {
    margin: 16,
    borderRadius: 22,
    backgroundColor: T.heroBase,
    padding: 22,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  amountDeco: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: T.brandSoft,
    top: -80,
    right: -60,
  },
  amountEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -2,
    marginBottom: 14,
  },
  amountPills: { flexDirection: "row", gap: 8 },
  amountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  amountPillText: { fontSize: 11, fontWeight: "700", color: T.brand },

  breakdownWrap: {
    marginHorizontal: 16,
    marginBottom: 22,
    backgroundColor: T.bg,
    borderRadius: 16,
    padding: 16,
  },
  breakdownHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: T.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  breakdownLabel: { fontSize: 13, color: T.textSecondary, fontWeight: "500" },
  breakdownVal: { fontSize: 13, fontWeight: "700", color: T.textPrimary },
  breakdownDivider: { height: 1, backgroundColor: T.border, marginVertical: 8 },
  breakdownTotal: { fontSize: 14, fontWeight: "800", color: T.textPrimary },
  breakdownTotalVal: { fontSize: 17, fontWeight: "900", color: T.brand },

  methodHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: T.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: T.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: T.border,
    padding: 16,
  },
  methodCardSelected: { borderColor: T.brand, backgroundColor: T.brandFaint },
  methodEmoji: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  methodEmojiSelected: { backgroundColor: "rgba(255,107,0,0.10)" },
  methodInfo: { flex: 1 },
  methodName: { fontSize: 16, fontWeight: "800", color: T.textPrimary },
  methodDesc: {
    fontSize: 11,
    color: T.textTertiary,
    fontWeight: "500",
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: T.brand },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: T.brand,
  },

  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginBottom: 18,
  },
  secureText: { fontSize: 11, color: T.textTertiary, fontWeight: "500" },

  payBtn: { marginHorizontal: 16, borderRadius: 18, overflow: "hidden" },
  payBtnDisabled: { opacity: 0.55 },
  payBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 8,
  },
  payBtnText: { fontSize: 16, fontWeight: "800", color: "#fff", flex: 1 },
  payBtnBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  payBtnBadgeText: { fontSize: 13, fontWeight: "900", color: "#fff" },
});

// ── Main Screen ────────────────────────────────────────────
export default function DeliveryTrackingPage() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const deliveryId = params.deliveryId as string;
  const fromPayment = params.fromPayment as string; // Check if coming from payment

  const [delivery, setDelivery] = useState<DeliveryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  const normalizePayload = (payload: any): DeliveryDetails | null => {
    const c = payload?.data ?? payload?.delivery ?? payload;
    return c && typeof c === "object" ? (c as DeliveryDetails) : null;
  };

  const fetchDelivery = useCallback(async () => {
    if (!deliveryId) return;
    try {
      setLoading(true);
      const res = await customDeliveryApi.getDeliveryById(deliveryId);
      setDelivery(normalizePayload(res));
    } catch {
      Alert.alert("Error", "Failed to load delivery details");
    } finally {
      setLoading(false);
    }
  }, [deliveryId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDelivery();
    setRefreshing(false);
  }, [fetchDelivery]);

  useEffect(() => {
    fetchDelivery();
  }, [fetchDelivery]);
  
  // Refresh delivery data when returning from payment
  useEffect(() => {
    if (fromPayment === "true") {
      console.log("[DeliveryTracking] Returned from payment, refreshing...");
      // Wait a moment for backend to process, then refresh
      const timer = setTimeout(() => {
        fetchDelivery();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [fromPayment, fetchDelivery]);

  useEffect(() => {
    if (delivery?.status === "DELIVERED" || delivery?.status === "CANCELLED")
      return;
    const interval = setInterval(() => {
      fetchDelivery();
    }, 10000);
    return () => clearInterval(interval);
  }, [delivery?.status, fetchDelivery]);

  useEffect(() => {
    const setupNotificationListener = async () => {
      const { default: NotificationService } =
        await import("@/services/notification.service");
      const subscription = NotificationService.addNotificationReceivedListener(
        (notification) => {
          const data = notification.request.content.data;
          if (
            data?.type === "express_delivery" &&
            data?.deliveryId === deliveryId
          )
            fetchDelivery();
        },
      );
      return subscription;
    };
    const sub = setupNotificationListener();
    return () => {
      sub.then((s) => s?.remove());
    };
  }, [deliveryId, fetchDelivery]);

  if (loading && !delivery) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <View style={s.loadingSpinner}>
            <ActivityIndicator size="large" color={T.brand} />
          </View>
          <Text style={s.loadingTitle}>Loading delivery</Text>
          <Text style={s.loadingText}>Fetching the latest details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!delivery) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.notFoundWrap}>
          <View style={s.notFoundIcon}>
            <Ionicons name="alert-circle-outline" size={40} color={T.brand} />
          </View>
          <Text style={s.notFoundTitle}>Delivery Not Found</Text>
          <Text style={s.notFoundText}>
            This delivery may have been removed or doesn't exist.
          </Text>
          <TouchableOpacity style={s.goBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={16} color="#fff" />
            <Text style={s.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const normalizedStatus = String(delivery.status ?? "PENDING");
  const statusCfg = STATUS_MAP[normalizedStatus] ?? STATUS_MAP.PENDING;
  const isExpress =
    delivery.isExpress === true ||
    ["EXPRESS", "URGENT"].includes(
      String(delivery.priorityLevel ?? "").toUpperCase(),
    );
  const deliveryCode = isExpress
    ? formatExpressDeliveryId(delivery.id)
    : `TG${String(delivery.id ?? "")
        .slice(-4)
        .toUpperCase()}`;
  const isDelivered = normalizedStatus === "DELIVERED";
  const isCancelled = normalizedStatus === "CANCELLED";

  const showPayNow =
    delivery.paymentStatus === "UNPAID" &&
    delivery.trackingUpdates?.some(
      (u) =>
        u.message?.includes("Order Approved") ||
        u.message?.startsWith("[ADMIN_APPROVED_FOR_PAYMENT]"),
    );

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
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroDeco1} />
          <View style={s.heroDeco2} />

          <View style={s.topBar}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={s.brandRow}>
              <View style={s.brandDot} />
              <Text style={s.brandName}>
                TeranGO <Text style={s.brandTag}>Express</Text>
              </Text>
            </View>
            <View style={{ width: 38 }} />
          </View>

          <View style={s.heroContent}>
            <View
              style={[
                s.statusBadge,
                {
                  backgroundColor: isCancelled ? T.redSoft : T.brandSoft,
                  borderColor: isCancelled
                    ? "rgba(220,53,69,0.25)"
                    : "rgba(255,107,0,0.25)",
                },
              ]}
            >
              <View
                style={[s.statusBadgeDot, { backgroundColor: statusCfg.dot }]}
              />
              <Text style={[s.statusBadgeText, { color: statusCfg.color }]}>
                {statusCfg.label.toUpperCase()}
              </Text>
            </View>

            <View style={s.statusHeroRow}>
              <View
                style={[
                  s.statusIconCircle,
                  isCancelled && s.statusIconCircleRed,
                ]}
              >
                <Ionicons
                  name={statusCfg.icon as any}
                  size={26}
                  color={isCancelled ? T.red : T.brand}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroH1}>{statusCfg.heroMsg}</Text>
                <Text style={s.heroCode}># {deliveryCode}</Text>
              </View>
            </View>

            {!isCancelled && (
              <View style={s.heroStrip}>
                <View style={s.heroStripItem}>
                  <Ionicons name="navigate-outline" size={13} color={T.brand} />
                  <Text style={s.heroStripVal}>
                    {fmtDistance(delivery.estimatedDistanceKm)}
                  </Text>
                </View>
                <View style={s.heroStripDivider} />
                <View style={s.heroStripItem}>
                  <Ionicons name="cash-outline" size={13} color={T.brand} />
                  <Text style={s.heroStripVal}>
                    {fmtCurrency(delivery.estimatedFee)}
                  </Text>
                </View>
                <View style={s.heroStripDivider} />
                <View style={s.heroStripItem}>
                  <Ionicons name="calendar-outline" size={13} color={T.brand} />
                  <Text style={s.heroStripVal}>
                    {fmtDate(delivery.createdAt)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={s.body}>
          {/* Delivered card */}
          {isDelivered && delivery.estimatedFee != null && (
            <View style={s.featurePriceCard}>
              <View>
                <Text style={s.featurePriceLabel}>TOTAL PAID</Text>
                <Text style={s.featurePriceAmt}>
                  {fmtCurrency(delivery.estimatedFee)}
                </Text>
              </View>
              <View style={s.featurePriceBadge}>
                <Ionicons name="checkmark-circle" size={20} color={T.success} />
                <Text style={s.featurePriceBadgeText}>Completed</Text>
              </View>
            </View>
          )}

          {/* Payment Success Badge */}
          {delivery.paymentStatus === "PAID" && !isDelivered && !isCancelled && (
            <View style={s.paymentSuccessBanner}>
              <Ionicons name="checkmark-circle" size={20} color={T.success} />
              <Text style={s.paymentSuccessText}>
                ✓ Payment Confirmed
              </Text>
              <Text style={s.paymentSuccessSubtext}>
                Awaiting driver assignment
              </Text>
            </View>
          )}

          {/* Pay Now → opens bottom sheet */}
          {showPayNow && (
            <TouchableOpacity
              style={s.payNowBtn}
              onPress={() => setShowPaymentSheet(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[T.brand, T.brandDark]}
                style={s.payNowGradient}
              >
                <View style={s.payNowLeft}>
                  <View style={s.payNowIconWrap}>
                    <Ionicons name="card-outline" size={18} color={T.brand} />
                  </View>
                  <View>
                    <Text style={s.payNowEyebrow}>PAYMENT APPROVED</Text>
                    <Text style={s.payNowText}>Pay Now</Text>
                  </View>
                </View>
                <View style={s.payNowRight}>
                  <Text style={s.payNowAmt}>
                    {fmtCurrency(delivery.estimatedFee)}
                  </Text>
                  <Ionicons
                    name="chevron-up"
                    size={13}
                    color="rgba(255,255,255,0.6)"
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Route */}
          <SectionCard title="Delivery Route" icon="navigate-circle-outline">
            <View style={s.routeWrap}>
              <View style={s.routeCol}>
                <View style={[s.routeDot, { backgroundColor: T.brand }]} />
                <View style={s.routeBar} />
                <View style={[s.routeDot, { backgroundColor: T.success }]} />
              </View>
              <View style={s.routeDetails}>
                <View style={s.routeBlock}>
                  <Text style={s.routeTag}>FROM</Text>
                  <Text style={s.routeAddr}>{delivery.pickupAddress}</Text>
                </View>
                <View style={s.routeBlock}>
                  <Text style={s.routeTag}>TO</Text>
                  <Text style={s.routeAddr}>{delivery.dropoffAddress}</Text>
                </View>
              </View>
            </View>
            {delivery.estimatedDistanceKm != null && (
              <View style={s.distancePill}>
                <Ionicons name="resize-outline" size={12} color={T.brand} />
                <Text style={s.distancePillText}>
                  {fmtDistance(delivery.estimatedDistanceKm)} total distance
                </Text>
              </View>
            )}
          </SectionCard>

          {/* Driver */}
          {delivery.driver && (
            <SectionCard title="Your Driver" icon="person-circle-outline">
              <View style={s.driverRow}>
                <View style={s.driverAvatar}>
                  <Ionicons name="person" size={28} color={T.brand} />
                </View>
                <View style={s.driverInfo}>
                  <Text style={s.driverName}>
                    {delivery.driver.user.fullName}
                  </Text>
                  <Text style={s.driverPhone}>
                    {delivery.driver.user.phone}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.callDriverBtn}
                  onPress={() =>
                    Linking.openURL(`tel:${delivery.driver!.user.phone}`)
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </SectionCard>
          )}

          {/* Package */}
          <SectionCard title="Package Details" icon="cube-outline">
            <InfoRow
              icon="scale-outline"
              label="Weight Class"
              value={delivery.weightClass}
            />
            <InfoRow
              icon="car-outline"
              label="Vehicle Type"
              value={
                delivery.vehicleType === "KEKE_CARGO"
                  ? "Keke Cargo"
                  : String(delivery.vehicleType).replace("_", " ")
              }
            />
            {delivery.receiverName && (
              <InfoRow
                icon="person-outline"
                label="Receiver"
                value={delivery.receiverName}
                accent
              />
            )}
            {delivery.receiverPhone && (
              <InfoRow
                icon="call-outline"
                label="Receiver Phone"
                value={delivery.receiverPhone}
                accent
                onPress={() => Linking.openURL(`tel:${delivery.receiverPhone}`)}
              />
            )}
            {delivery.packageDescription && (
              <InfoRow
                icon="cube-outline"
                label="Description"
                value={delivery.packageDescription}
              />
            )}
            {delivery.customerNote && (
              <InfoRow
                icon="chatbubble-ellipses-outline"
                label="Driver Notes"
                value={delivery.customerNote}
              />
            )}
            <View style={{ height: 1 }} />
          </SectionCard>

          {/* Pricing */}
          {delivery.estimatedFee != null && (
            <SectionCard title="Pricing" icon="receipt-outline">
              {/* Show detailed breakdown if service fee info is available */}
              {delivery.serviceFee != null && delivery.subtotalFee != null ? (
                <>
                  <View style={s.pricingRow}>
                    <Text style={s.pricingLabel}>Delivery fee</Text>
                    <Text style={s.pricingVal}>
                      {fmtCurrency(delivery.subtotalFee)}
                    </Text>
                  </View>
                  <View style={s.pricingRow}>
                    <Text style={s.pricingLabel}>
                      Service fee ({delivery.serviceFeePercent || 5}%)
                    </Text>
                    <Text style={s.pricingVal}>
                      {fmtCurrency(delivery.serviceFee)}
                    </Text>
                  </View>
                  <View style={s.pricingDivider} />
                  <View style={s.pricingRow}>
                    <Text style={s.pricingTotalLabel}>Total</Text>
                    <Text style={s.pricingTotalVal}>
                      {fmtCurrency(delivery.estimatedFee)}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  {/* Fallback: Simple breakdown */}
                  <View style={s.pricingRow}>
                    <Text style={s.pricingLabel}>Delivery fee</Text>
                    <Text style={s.pricingVal}>
                      {fmtCurrency(delivery.estimatedFee)}
                    </Text>
                  </View>
                  <View style={s.pricingDivider} />
                  <View style={s.pricingRow}>
                    <Text style={s.pricingTotalLabel}>Total</Text>
                    <Text style={s.pricingTotalVal}>
                      {fmtCurrency(delivery.estimatedFee)}
                    </Text>
                  </View>
                </>
              )}
              
              {/* Payment method badge */}
              <View style={s.paymentBadge}>
                <Ionicons name="cash-outline" size={12} color={T.success} />
                <Text style={s.paymentBadgeText}>Pay on delivery</Text>
              </View>
            </SectionCard>
          )}

          {/* Timeline */}
          {delivery.trackingUpdates && delivery.trackingUpdates.length > 0 && (
            <View style={s.timelineWrap}>
              <View style={s.timelineHeader}>
                <View style={s.timelineIconPill}>
                  <Ionicons name="map-outline" size={14} color={T.brand} />
                </View>
                <Text style={s.timelineTitle}>Tracking History</Text>
              </View>
              <TrackingTimeline
                updates={delivery.trackingUpdates}
                currentStatus={normalizedStatus}
              />
            </View>
          )}

          <View style={s.helpRow}>
            <Ionicons
              name="help-circle-outline"
              size={14}
              color={T.textTertiary}
            />
            <Text style={s.helpText}>
              Issues with this delivery? Contact support
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment Bottom Sheet */}
      {showPaymentSheet && (
        <PaymentSheet
          visible={showPaymentSheet}
          onClose={() => setShowPaymentSheet(false)}
          delivery={delivery}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.heroBase },
  scroll: { flex: 1, backgroundColor: T.heroBase },
  scrollContent: { paddingBottom: 48 },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.heroBase,
    gap: 12,
  },
  loadingSpinner: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: T.heroCard,
    borderWidth: 1,
    borderColor: T.heroBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  loadingText: { fontSize: 13, color: T.heroTextDim, fontWeight: "500" },

  notFoundWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.heroBase,
    padding: 32,
    gap: 12,
  },
  notFoundIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: T.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  notFoundTitle: { fontSize: 20, fontWeight: "900", color: "#fff" },
  notFoundText: {
    fontSize: 14,
    color: T.heroTextDim,
    textAlign: "center",
    lineHeight: 20,
  },
  goBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.brand,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 8,
  },
  goBackText: { fontSize: 15, fontWeight: "800", color: "#fff" },

  hero: {
    backgroundColor: T.heroBase,
    paddingBottom: 24,
    overflow: "hidden",
    position: "relative",
  },
  heroDeco1: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: T.brandSoft,
    top: -90,
    right: -50,
  },
  heroDeco2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,107,0,0.05)",
    bottom: 0,
    left: -30,
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
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.brand },
  brandName: {
    fontSize: 17,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  brandTag: { color: T.brand, fontWeight: "500", fontSize: 14 },

  heroContent: { paddingHorizontal: 22, paddingTop: 24 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 18,
  },
  statusBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  statusHeroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 20,
  },
  statusIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: T.heroCard,
    borderWidth: 1,
    borderColor: T.heroBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconCircleRed: { borderColor: "rgba(220,53,69,0.25)" },
  heroH1: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 24,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroCode: {
    fontSize: 12,
    color: T.heroTextDim,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  heroStrip: {
    flexDirection: "row",
    backgroundColor: T.heroCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.heroBorder,
    paddingVertical: 14,
    marginBottom: 4,
  },
  heroStripItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  heroStripDivider: { width: 1, backgroundColor: T.heroBorder },
  heroStripVal: { fontSize: 12, fontWeight: "700", color: "#fff" },

  body: {
    backgroundColor: T.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingTop: 20,
    minHeight: 400,
  },

  featurePriceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: T.success,
    ...Platform.select({
      ios: {
        shadowColor: T.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  featurePriceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: T.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  featurePriceAmt: {
    fontSize: 36,
    fontWeight: "900",
    color: T.textPrimary,
    letterSpacing: -1,
  },
  featurePriceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.successSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  featurePriceBadgeText: { fontSize: 12, fontWeight: "700", color: T.success },

  // Payment Success Banner
  paymentSuccessBanner: {
    marginBottom: 18,
    backgroundColor: T.successSoft,
    borderRadius: 16,
    padding: 18,
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: T.success + "20",
  },
  paymentSuccessText: {
    fontSize: 16,
    fontWeight: "700",
    color: T.success,
  },
  paymentSuccessSubtext: {
    fontSize: 13,
    fontWeight: "500",
    color: T.textSecondary,
  },

  payNowBtn: {
    marginBottom: 18,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: T.brand,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
    }),
  },
  payNowGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  payNowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  payNowIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  payNowEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
    marginBottom: 2,
  },
  payNowText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.3,
  },
  payNowRight: { alignItems: "flex-end", gap: 3 },
  payNowAmt: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },

  routeWrap: { flexDirection: "row", gap: 14, marginBottom: 12 },
  routeCol: { alignItems: "center", paddingTop: 4 },
  routeDot: { width: 12, height: 12, borderRadius: 6 },
  routeBar: {
    flex: 1,
    width: 2,
    backgroundColor: T.border,
    marginVertical: 4,
    minHeight: 32,
  },
  routeDetails: { flex: 1, gap: 20 },
  routeBlock: {},
  routeTag: {
    fontSize: 10,
    fontWeight: "800",
    color: T.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  routeAddr: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textPrimary,
    lineHeight: 20,
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: T.brandFaint,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  distancePillText: { fontSize: 11, fontWeight: "700", color: T.brand },

  driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  driverAvatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: T.brandFaint,
    borderWidth: 1.5,
    borderColor: T.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: "800", color: T.textPrimary },
  driverPhone: {
    fontSize: 12,
    color: T.textTertiary,
    fontWeight: "500",
    marginTop: 3,
  },
  callDriverBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: T.success,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: T.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },

  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  pricingLabel: { fontSize: 14, color: T.textSecondary, fontWeight: "500" },
  pricingVal: { fontSize: 14, fontWeight: "700", color: T.textPrimary },
  pricingDivider: { height: 1, backgroundColor: T.bg, marginVertical: 4 },
  pricingTotalLabel: { fontSize: 15, fontWeight: "800", color: T.textPrimary },
  pricingTotalVal: { fontSize: 20, fontWeight: "900", color: T.brand },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: T.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
  },
  paymentBadgeText: { fontSize: 11, fontWeight: "700", color: T.success },

  timelineWrap: { marginBottom: 14 },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  timelineIconPill: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: T.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.2,
  },

  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
  },
  helpText: { fontSize: 12, color: T.textTertiary, fontWeight: "500" },
});
