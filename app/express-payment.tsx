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
import { apiCall } from "@/lib/apiClient";
import { expressDeliveryApi } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";
import { API_URL } from "@/constants/config";

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
  name: "Wave";
  type: "WAVE";
  icon: "penguin";
  description: string;
  enabled: boolean;
}

interface DeliveryDetails {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFee: number;
  isExpress: boolean;
  adminApprovedForPayment?: boolean;
  paymentStatus?: "UNPAID" | "PAID" | "FAILED" | "REFUNDED";
  priorityLevel: string;
  guaranteedDeliveryTime?: string;
  expressMultiplier: number;
  expressFeesApplied: number;
  bookingFee?: number;
  serviceFee?: number;
  subtotalFee?: number;
  serviceFeePercent?: number;
  qrCode?: string;
  qrCodeUrl?: string;
}

export default function ExpressPaymentScreen() {
  const { deliveryId, amount, pickupAddress, dropoffAddress } =
    useLocalSearchParams<{
      deliveryId: string;
      amount: string;
      pickupAddress: string;
      dropoffAddress: string;
    }>();

  const router = useRouter();
  const [delivery, setDelivery] = useState<DeliveryDetails | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const paymentMethods: PaymentMethod[] = [
    {
      id: "wave",
      name: "Wave",
      type: "WAVE",
      icon: "penguin",
      description: "Pay with Wave app",
      enabled: true,
    },
  ];

  useEffect(() => {
    loadDeliveryDetails();
  }, [deliveryId]);

  const loadDeliveryDetails = async () => {
    try {
      const response = await expressDeliveryApi.getExpressDeliveryById(
        String(deliveryId),
      );
      const payload = response?.data ?? response;
      setDelivery({
        ...payload,
        ...(payload?.pricing || {}),
      });
    } catch (error) {
      console.error("Load delivery error:", error);
      Alert.alert("Error", "Failed to load delivery details");
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

    if (!delivery) {
      Alert.alert("Error", "Delivery details not loaded.");
      return;
    }

    if (!delivery.adminApprovedForPayment) {
      Alert.alert(
        "Awaiting Admin Approval",
        "Payment is enabled only after admin confirms delivery timing and driver availability.",
      );
      return;
    }

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

      if (!launchUrl) {
        throw new Error(response?.message || "No Wave launch URL returned");
      }

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
                pathname: "/custom-delivery/[deliveryId]",
                params: { deliveryId: String(delivery.id) },
              }),
          },
        ],
      );
    } catch (error) {
      console.error("Payment error:", error);
      Alert.alert(
        "Error",
        (error as any)?.message ||
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
        <Text style={styles.headerTitle}>Express Payment</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Express Banner */}
        <LinearGradient
          colors={["#FF8A3D", "#FF6B00"]}
          style={styles.expressBanner}
        >
          <View style={styles.expressBannerContent}>
            <Ionicons name="flash" size={24} color="#FFFFFF" />
            <Text style={styles.expressBannerTitle}>Express Delivery</Text>
          </View>
          <Text style={styles.expressBannerSubtitle}>
            Guaranteed delivery within 1 hour
          </Text>
          {delivery?.guaranteedDeliveryTime && (
            <Text style={styles.guaranteedTime}>
              Guaranteed by:{" "}
              {new Date(delivery.guaranteedDeliveryTime).toLocaleString()}
            </Text>
          )}
        </LinearGradient>

        {delivery && !delivery.adminApprovedForPayment && (
          <View style={styles.awaitingApprovalCard}>
            <Ionicons name="time-outline" size={18} color="#B45309" />
            <Text style={styles.awaitingApprovalText}>
              Admin approval is pending. You will be able to pay here once the
              request is approved.
            </Text>
          </View>
        )}

        {/* Delivery Summary */}
        <View style={styles.deliverySummary}>
          <Text style={styles.sectionTitle}>Delivery Summary</Text>

          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: "#059669" }]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={styles.routeAddress}>{pickupAddress}</Text>
              </View>
            </View>

            <View style={styles.routeConnector} />

            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: "#DC2626" }]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>Delivery</Text>
                <Text style={styles.routeAddress}>{dropoffAddress}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pricing Breakdown */}
        {delivery && (
          <View style={styles.pricingSection}>
            <Text style={styles.sectionTitle}>Pricing Details</Text>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Booking fee</Text>
              <Text style={styles.priceValue}>
                D{(delivery.bookingFee || 0).toLocaleString()}
              </Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Transport fee</Text>
              <Text style={styles.priceValue}>
                D
                {Math.max(
                  0,
                  (delivery.subtotalFee || delivery.estimatedFee || 0) -
                    (delivery.bookingFee || 0),
                ).toLocaleString()}
              </Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                Express surcharge ({delivery.priorityLevel})
              </Text>
              <Text style={[styles.priceValue, { color: "#D97706" }]}>
                +D{delivery.expressFeesApplied?.toLocaleString() || "0"}
              </Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                Service fee
                {delivery.serviceFeePercent
                  ? ` (${delivery.serviceFeePercent}%)`
                  : ""}
              </Text>
              <Text style={[styles.priceValue, { color: "#2563EB" }]}>
                +D{(delivery.serviceFee || 0).toLocaleString()}
              </Text>
            </View>

            <View style={styles.priceDivider} />

            <View style={styles.priceRow}>
              <Text style={styles.priceLabelTotal}>Total Amount</Text>
              <Text style={styles.priceValueTotal}>
                D{delivery.estimatedFee?.toLocaleString() || amount}
              </Text>
            </View>
          </View>
        )}

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
                    !method.enabled && styles.paymentMethodIconDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.penguinIcon,
                      selectedPaymentMethod === method.id &&
                        styles.penguinIconSelected,
                    ]}
                  >
                    🐧
                  </Text>
                </View>

                <View style={styles.paymentMethodInfo}>
                  <Text
                    style={[
                      styles.paymentMethodName,
                      !method.enabled && styles.paymentMethodNameDisabled,
                    ]}
                  >
                    {method.name}
                  </Text>
                  <Text
                    style={[
                      styles.paymentMethodDescription,
                      !method.enabled &&
                        styles.paymentMethodDescriptionDisabled,
                    ]}
                  >
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

        {/* QR Code Info */}
        {delivery?.qrCode && (
          <View style={styles.qrSection}>
            <View style={styles.qrInfo}>
              <Ionicons name="qr-code" size={20} color="#059669" />
              <Text style={styles.qrText}>
                QR code generated for driver verification
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedPaymentMethod ||
              paymentLoading ||
              !delivery?.adminApprovedForPayment) &&
              styles.payButtonDisabled,
          ]}
          onPress={handlePayNow}
          disabled={
            !selectedPaymentMethod ||
            paymentLoading ||
            !delivery?.adminApprovedForPayment
          }
        >
          {paymentLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.payButtonText}>
                {delivery?.adminApprovedForPayment
                  ? "Pay with Wave"
                  : "Await Admin Approval"}
              </Text>
              <Text style={styles.payButtonAmount}>
                D{delivery?.estimatedFee?.toLocaleString() || amount}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

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

  backButton: {
    padding: 8,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.ink,
  },

  placeholder: {
    width: 40,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  expressBanner: {
    marginVertical: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },

  expressBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  expressBannerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 8,
  },

  expressBannerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.92)",
    marginBottom: 8,
  },

  guaranteedTime: {
    fontSize: 12,
    color: "rgba(255,255,255,0.88)",
  },

  deliverySummary: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.divider,
    padding: 16,
    marginBottom: 16,
  },

  awaitingApprovalCard: {
    backgroundColor: C.primarySoft,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },

  awaitingApprovalText: {
    flex: 1,
    fontSize: 13,
    color: C.inkMid,
    lineHeight: 18,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: C.ink,
    marginBottom: 16,
  },

  routeContainer: {
    paddingVertical: 8,
  },

  routePoint: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },

  routeInfo: {
    flex: 1,
  },

  routeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.inkLight,
    marginBottom: 2,
  },

  routeAddress: {
    fontSize: 14,
    color: C.ink,
    lineHeight: 20,
  },

  routeConnector: {
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
  },

  priceLabel: {
    fontSize: 14,
    color: C.inkLight,
  },

  priceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: C.ink,
  },

  priceDivider: {
    height: 1,
    backgroundColor: C.divider,
    marginVertical: 8,
  },

  priceLabelTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: C.ink,
  },

  priceValueTotal: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.primary,
  },

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

  penguinIcon: {
    fontSize: 22,
  },

  penguinIconSelected: {
    transform: [{ scale: 1.05 }],
  },

  paymentMethodIconSelected: {
    backgroundColor: "#FFE6D4",
  },

  paymentMethodIconDisabled: {
    backgroundColor: C.bg,
  },

  paymentMethodInfo: {
    flex: 1,
  },

  paymentMethodName: {
    fontSize: 16,
    fontWeight: "600",
    color: C.ink,
    marginBottom: 2,
  },

  paymentMethodNameDisabled: {
    color: "#9CA3AF",
  },

  paymentMethodDescription: {
    fontSize: 12,
    color: C.inkLight,
    lineHeight: 16,
  },

  paymentMethodDescriptionDisabled: {
    color: "#D1D5DB",
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

  paymentMethodRadioSelected: {
    borderColor: C.primary,
  },

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

  qrInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  qrText: {
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

  payButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },

  payButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginRight: 8,
  },

  payButtonAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    fontSize: 16,
    color: C.inkLight,
    marginTop: 16,
  },
});
