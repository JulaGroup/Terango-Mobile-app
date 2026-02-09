import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  RefreshControl,
  Alert,
  Image,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// Alert is imported above
import { useRouter, useLocalSearchParams } from "expo-router";
import { SecureStorage } from "@/utils/secureStorage";
import { orderApi, Order } from "../lib/api";
import { PrimaryColor } from "@/constants/Colors";
import { on as socketOn, off as socketOff } from "@/services/SocketService";
import {
  storeSuccessfulOrder,
  NotificationService,
} from "@/services/NotificationService";
import { SafeAreaView } from "react-native-safe-area-context";

const statusColors = {
  PENDING: "#F39C12",
  ACCEPTED: "#3498DB",
  PREPARING: "#3498DB",
  PROCESSING: "#3498DB",
  READY: "#10B981",
  DISPATCHED: "#9B59B6",
  DELIVERED: "#27AE60",
  CANCELLED: "#E74C3C",
};

const statusIcons = {
  PENDING: "time-outline",
  ACCEPTED: "checkmark-outline",
  PREPARING: "restaurant-outline",
  PROCESSING: "restaurant-outline",
  READY: "checkmark-circle-outline",
  DISPATCHED: "car-outline",
  DELIVERED: "checkmark-circle-outline",
  CANCELLED: "close-circle-outline",
};

export default function OrderDetailsPage() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { from } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Web Modal State (for confirmations and alerts on web platform)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"confirm" | "alert">("alert");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalAction, setModalAction] = useState<
    (() => void) | (() => Promise<void>) | null
  >(null);

  // Popup reference used to avoid popup blockers (open in click handler)
  const popupRef = useRef<Window | null>(null);
  // Guard to prevent multiple concurrent payment attempts
  const isProcessingPayment = useRef(false);

  // Skeleton animation
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const skeletonAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );

    if (loading) {
      skeletonAnimation.start();
    } else {
      skeletonAnimation.stop();
    }

    return () => skeletonAnimation.stop();
  }, [loading, skeletonOpacity]);

  const fetchOrderDetails = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);
        setError(null);

        const data = await orderApi.getOrderById(orderId as string);
        setOrder(data);
      } catch (err: any) {
        console.error("Error fetching order details:", err);
        setError(err.message || "Failed to load order details");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, fetchOrderDetails]);

  // Socket listeners for order status updates
  useEffect(() => {
    const onOrderStatusUpdate = (data: any) => {
      console.log("[Socket] orderStatusUpdate in order-details", data);
      if (data?.orderId === orderId) {
        // Refresh order details when status updates
        fetchOrderDetails(true);

        // If order is successfully placed (not pending), navigate to orders
        if (data?.status && !["PENDING"].includes(data.status)) {
          Alert.alert(
            "Order Update",
            `Your order status has been updated to ${data.status}`,
            [
              {
                text: "View Orders",
                onPress: () => router.replace("/(tabs)/orders"),
              },
              {
                text: "Stay Here",
                style: "cancel",
              },
            ],
          );
        }
      }
    };

    const onPaymentSuccess = async (data: any) => {
      console.log("[Socket] paymentSuccess in order-details", data);
      if (data?.orderId === orderId) {
        fetchOrderDetails(true);

        // Store successful order data for modal on app reopen
        const storedNew = await storeSuccessfulOrder({
          orderId: data.orderId,
          timestamp: Date.now(),
          data: data,
        });

        // Only schedule notification if the store actually wrote new data
        if (storedNew) {
          await NotificationService.scheduleOrderNotification({
            orderId: data.orderId,
            title: "Order Successful! 🎉",
            body: "Your order has been placed successfully. Tap to view details.",
            data: { orderId: data.orderId, type: "payment_success" },
          });
        } else {
          console.log(
            "order-details: successful order already stored, skipping notification",
          );
        }

        // Navigate away from order details when payment succeeds
        setTimeout(() => {
          router.replace("/(tabs)/orders");
        }, 2000); // Give user time to see the success
      }
    };

    socketOn("orderStatusUpdate", onOrderStatusUpdate);
    socketOn("paymentSuccess", onPaymentSuccess);

    return () => {
      socketOff("orderStatusUpdate", onOrderStatusUpdate);
      socketOff("paymentSuccess", onPaymentSuccess);
    };
  }, [orderId, fetchOrderDetails, router]);

  // Listen for postMessage events from payment popup windows
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handlePaymentMessage = (event: MessageEvent) => {
      console.log("[Payment] Received message:", event.data);

      if (event.data?.type === "PAYMENT_SUCCESS") {
        console.log("[Payment] ✅ Payment success confirmed!");
        setModalType("alert");
        setModalTitle("Payment Successful! 🎉");
        setModalMessage(
          "Your payment has been processed. Your order is being prepared.",
        );
        setModalAction(() => fetchOrderDetails(true));
        setModalVisible(true);

        // Also refresh order after a moment to ensure backend is updated
        setTimeout(() => {
          fetchOrderDetails(true);
        }, 1000);
      } else if (event.data?.type === "PAYMENT_CANCELLED") {
        console.log("[Payment] ❌ Payment was cancelled");
        setModalType("alert");
        setModalTitle("Payment Cancelled");
        setModalMessage(
          "Payment was not completed. You can try again or use a different payment method.",
        );
        setModalAction(null);
        setModalVisible(true);
      }
    };

    // Add listener for postMessage events
    if (typeof window !== "undefined") {
      window.addEventListener("message", handlePaymentMessage);
      console.log("[Payment] Message listener added");

      return () => {
        window.removeEventListener("message", handlePaymentMessage);
        console.log("[Payment] Message listener removed");
      };
    }
  }, [fetchOrderDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrderDetails(true);
  };

  const handleTrackOrder = () => {
    // Navigate to order tracking screen
    router.push({
      pathname: "/order-tracking",
      params: { orderId: order?.id },
    });
  };

  const handleCallDriver = () => {
    if (order?.driverPhone) {
      Linking.openURL(`tel:${order.driverPhone}`).catch((err) => {
        Alert.alert("Error", "Could not open phone dialer");
      });
    }
  };

  const handlePayNow = async () => {
    if (!order) return;

    // On web, use modal for better UX
    if (Platform.OS === "web") {
      setModalType("confirm");
      setModalTitle("Confirm Payment");
      setModalMessage(
        `Proceed with payment of ${formatAmount(order.totalAmount)}?`,
      );
      setModalAction(processPayment);
      setModalVisible(true);
    } else {
      Alert.alert(
        "Confirm Payment",
        `Proceed with payment of ${formatAmount(order.totalAmount)}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Pay Now",
            onPress: processPayment,
          },
        ],
      );
    }
  };

  const processPayment = async () => {
    if (!order) return;

    try {
      setLoading(true);

      // Load user's preferred payment method (default to wave)
      let network = "wave";
      try {
        const stored = await SecureStorage.getItem("paymentMethods");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.default) network = parsed.default;
        }
      } catch (e) {
        console.warn("Failed to read payment methods, defaulting to wave", e);
      }

      // Reuse popup opened by modal click handler to avoid popup blockers
      let popup: Window | null = popupRef.current || null;
      if (Platform.OS === "web") {
        if (!popup) {
          try {
            popupRef.current = window.open("", "_blank");
          } catch (e) {
            popupRef.current = null;
          }
          popup = popupRef.current;
        }

        if (!popup) {
          setModalType("alert");
          setModalTitle("Popup Blocked");
          setModalMessage(
            "Your browser blocked the payment popup. Please allow popups for this site and try again. You can also try on a desktop browser.",
          );
          setModalAction(null);
          setModalVisible(true);
          return;
        }
      }

      // Prevent concurrent payment runs
      if (isProcessingPayment.current) return;
      isProcessingPayment.current = true;
      const result: any = await orderApi.payForOrder(order.id, network);

      // If server returned a Wave session (launch url), open it
      const launchUrl =
        result?.wave_launch_url || result?.session?.wave_launch_url;
      if (launchUrl) {
        // Attempt to open Wave URL
        try {
          const paymentId = result?.paymentId;

          if (Platform.OS === "web") {
            // Navigate the previously opened popup to the Wave launch URL
            try {
              (popupRef.current || popup)!.location.href = launchUrl;
            } catch (e) {
              // As a fallback, write a link into the popup for the user to click
              try {
                (popupRef.current || popup)!.document.body.innerHTML =
                  `<p>Click <a href="${launchUrl}" target="_blank">here</a> to open Wave payment.</p>`;
              } catch (err) {
                // swallow
              }
            }

            setModalType("alert");
            setModalTitle("Complete Payment");
            setModalMessage(
              "A payment window was opened. Waiting for confirmation...",
            );
            setModalAction(null);
            setModalVisible(true);

            // Start polling payment status if we received a paymentId
            if (paymentId) {
              let stopped = false;
              let pollInterval: any = null;

              const stopPolling = () => {
                stopped = true;
                if (pollInterval) clearInterval(pollInterval);
              };

              const checkStatus = async () => {
                try {
                  const res = await fetch(`/api/payment-status/${paymentId}`);
                  const json = await res.json();

                  if (json.status === "completed") {
                    stopPolling();
                    try {
                      (popupRef.current || popup)?.close();
                      popupRef.current = null;
                    } catch (e) {}

                    // Clear processing flag
                    isProcessingPayment.current = false;

                    setModalType("alert");
                    setModalTitle("Payment Successful! 🎉");
                    setModalMessage(
                      "Your payment has been processed. The vendor will now prepare your order.",
                    );
                    setModalAction(() => fetchOrderDetails(true));
                    setModalVisible(true);
                    return;
                  }

                  if (json.status && json.status !== "pending") {
                    // Anything other than pending or completed treat as cancelled/failed
                    stopPolling();
                    try {
                      (popupRef.current || popup)?.close();
                      popupRef.current = null;
                    } catch (e) {}

                    // Clear processing flag
                    isProcessingPayment.current = false;

                    setModalType("alert");
                    setModalTitle("Payment Not Completed");
                    setModalMessage(
                      "Payment was not completed. Please try again.",
                    );
                    setModalAction(null);
                    setModalVisible(true);
                    return;
                  }
                } catch (e) {
                  console.warn("Payment poll error:", e);
                }
              };

              // Poll immediately and then every 3s for up to 5 minutes
              checkStatus();
              pollInterval = setInterval(() => {
                if (!stopped) checkStatus();
              }, 3000);

              // stop after timeout
              setTimeout(() => stopPolling(), 5 * 60 * 1000);

              // Ensure processing flag is cleared when polling finishes or timeout occurs
              const cleanupProcessingFlag = () => {
                isProcessingPayment.current = false;
              };
              setTimeout(cleanupProcessingFlag, 5 * 60 * 1000);
            }
          } else {
            await Linking.openURL(launchUrl);
            Alert.alert(
              "Complete Payment",
              "You'll be redirected to Wave to complete the payment. Once payment is completed, you'll be redirected back to the app automatically.",
              [{ text: "OK", onPress: () => fetchOrderDetails(true) }],
            );
          }

          // don't overwrite local order state yet; we'll refresh when webhook arrives
          return;
        } catch (linkError: any) {
          // If direct open fails, show helpful error
          if (Platform.OS === "web") {
            setModalType("alert");
            setModalTitle("Payment Failed");
            setModalMessage("Cannot open Wave payment link. Please try again.");
            setModalAction(null);
            setModalVisible(true);
          } else {
            Alert.alert(
              "Payment Failed",
              "Cannot open Wave payment link. Please ensure Wave app is installed from Play Store or try again.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Install Wave",
                  onPress: () => {
                    Linking.openURL(
                      "https://play.google.com/store/apps/details?id=com.wave.personal",
                    );
                  },
                },
              ],
            );
          }
          return;
        }
      }

      // Otherwise treat the response as an updated order
      setOrder(result);

      if (Platform.OS === "web") {
        setModalType("alert");
        setModalTitle("Payment Successful! 🎉");
        setModalMessage(
          "Your payment has been processed. The vendor will now prepare your order.",
        );
        setModalAction(() => fetchOrderDetails(true));
        setModalVisible(true);
      } else {
        Alert.alert(
          "Payment Successful! 🎉",
          "Your payment has been processed. The vendor will now prepare your order.",
          [
            {
              text: "OK",
              onPress: () => fetchOrderDetails(true),
            },
          ],
        );
      }
      fetchOrderDetails(true);
    } catch (error: any) {
      console.error("Payment error:", error);

      // More detailed error messages
      let errorMessage = "Failed to process payment. Please try again.";

      if (error.message?.includes("Network")) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (error.message?.includes("Wave")) {
        errorMessage = error.message;
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid payment request. Please contact support.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please try again in a moment.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (Platform.OS === "web") {
        setModalType("alert");
        setModalTitle("Payment Failed");
        setModalMessage(errorMessage);
        setModalAction(handlePayNow);
        setModalVisible(true);
      } else {
        Alert.alert("Payment Failed", errorMessage, [
          { text: "Cancel", style: "cancel" },
          { text: "Retry", onPress: () => handlePayNow() },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    // On web, use modal for confirmation
    if (Platform.OS === "web") {
      setModalType("confirm");
      setModalTitle("Cancel Order");
      setModalMessage("Are you sure you want to cancel this order?");
      setModalAction(async () => {
        try {
          await orderApi.cancelOrder(orderId, "Cancelled by customer");
          fetchOrderDetails(true);
          setModalType("alert");
          setModalMessage("Order has been cancelled");
          setModalTitle("Success");
          setModalAction(null);
          setModalVisible(true);
        } catch (e) {
          console.error("Cancel error:", e);
          setModalType("alert");
          setModalTitle("Error");
          setModalMessage("Failed to cancel order");
          setModalAction(null);
          setModalVisible(true);
        }
      });
      setModalVisible(true);
      return;
    }

    // Native platform handling
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await orderApi.cancelOrder(orderId, "Cancelled by customer");
            fetchOrderDetails(true);
            Alert.alert("Success", "Order has been cancelled");
          } catch (e) {
            console.error("Cancel error:", e);
            Alert.alert("Error", "Failed to cancel order");
          }
        },
      },
    ]);
  };

  const SkeletonBox = ({
    width,
    height,
    style,
  }: {
    width: number | string;
    height: number;
    style?: any;
  }) => (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: "#E5E7EB",
          borderRadius: 8,
          opacity: skeletonOpacity,
        },
        style,
      ]}
    />
  );

  const renderSkeletonLoader = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header Skeleton */}
      <View style={styles.header}>
        <SkeletonBox width={40} height={40} style={{ borderRadius: 12 }} />
        <SkeletonBox width={150} height={24} style={{ borderRadius: 12 }} />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: 20 }}
      >
        {/* Status Card Skeleton */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <SkeletonBox width={120} height={20} />
            <SkeletonBox width={80} height={32} style={{ borderRadius: 16 }} />
          </View>
          <SkeletonBox width="100%" height={16} style={{ marginTop: 12 }} />
        </View>

        {/* Order Info Skeleton */}
        <View style={styles.infoCard}>
          <SkeletonBox width={100} height={20} style={{ marginBottom: 16 }} />
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.infoRow}>
              <SkeletonBox width={80} height={14} />
              <SkeletonBox width={120} height={16} />
            </View>
          ))}
        </View>

        {/* Items Skeleton */}
        <View style={styles.itemsCard}>
          <SkeletonBox width={80} height={20} style={{ marginBottom: 16 }} />
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.itemSkeleton}>
              <SkeletonBox width={60} height={60} style={{ borderRadius: 8 }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <SkeletonBox
                  width="70%"
                  height={16}
                  style={{ marginBottom: 4 }}
                />
                <SkeletonBox
                  width="50%"
                  height={14}
                  style={{ marginBottom: 8 }}
                />
                <SkeletonBox width="40%" height={14} />
              </View>
            </View>
          ))}
        </View>

        {/* Total Skeleton */}
        <View style={styles.totalCard}>
          <SkeletonBox width={120} height={24} />
        </View>

        {/* Track Button Skeleton */}
        <SkeletonBox
          width="100%"
          height={56}
          style={{ borderRadius: 16, marginTop: 20 }}
        />
      </ScrollView>
    </SafeAreaView>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number) => {
    return `D ${amount.toFixed(2)}`;
  };

  if (loading) {
    return renderSkeletonLoader();
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // If we were reached from the checkout modal, go to Orders tab
              if (from === "checkout") return router.replace("/(tabs)/orders");
              return router.back();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <Text style={styles.errorText}>
            {error || "The order you're looking for could not be found."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchOrderDetails()}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Get vendor info
  const vendor = order.restaurant || order.shop || order.pharmacy;
  const vendorType = order.restaurant
    ? "Restaurant"
    : order.shop
      ? "Shop"
      : order.pharmacy
        ? "Pharmacy"
        : "Store";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (from === "checkout") return router.replace("/(tabs)/orders");
            return router.back();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PrimaryColor]}
            tintColor={PrimaryColor}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.orderNumber}>
                Order #{order.id.slice(-8).toUpperCase()}
              </Text>
              <Text style={styles.orderDate}>
                {formatDate(order.createdAt)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusColors[order.status],
                    marginBottom: 4,
                  },
                ]}
              >
                <Ionicons
                  name={statusIcons[order.status] as any}
                  size={16}
                  color="#fff"
                />
                <Text style={styles.statusText}>{order.status}</Text>
              </View>

              {/* Order type badge (stacked below status) */}
              <View
                style={{
                  backgroundColor:
                    order.orderType === "PICKUP" ? "#2563EB" : "#059669",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}
                >
                  {order.orderType === "PICKUP" ? "PICKUP" : "DELIVERY"}
                </Text>
              </View>
            </View>
          </View>

          {order.estimatedDeliveryTime && (
            <View style={styles.estimatedTime}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.estimatedTimeText}>
                Estimated delivery: {formatDate(order.estimatedDeliveryTime)}
              </Text>
            </View>
          )}
        </View>

        {/* QR Code Card - Prominent at top for delivery verification (or pickup verification) */}
        {/* Show QR code once order is ACCEPTED by vendor (and all subsequent statuses) */}
        {[
          "ACCEPTED",
          "PREPARING",
          "PROCESSING",
          "READY",
          "DISPATCHED",
          "DELIVERED",
        ].includes(order.status) &&
          (order.qrCodeUrl || order.qrCode) && (
            <View style={[styles.qrCodeCard, styles.qrCardElevated]}>
              <View style={styles.qrCodeHeaderRow}>
                <View style={styles.qrCodeLeft}>
                  <Ionicons
                    name="qr-code-outline"
                    size={24}
                    color={PrimaryColor}
                  />
                  <Text style={styles.qrCodeTitle}>
                    {order.orderType === "PICKUP"
                      ? "Pickup QR Code"
                      : "Delivery QR Code"}
                  </Text>
                </View>
                <View style={styles.qrActions}>
                  {/* <TouchableOpacity
                    onPress={() => {
                      try {
                        const parsed = order.qrCode
                          ? JSON.parse(order.qrCode)
                          : null;
                        const code =
                          parsed?.verificationCode ||
                          parsed?.verification ||
                          null;
                        if (code) {
                          if (
                            typeof navigator !== "undefined" &&
                            navigator.clipboard
                          ) {
                            navigator.clipboard.writeText(code as string);
                            Alert.alert(
                              "Copied",
                              "Verification code copied to clipboard"
                            );
                          } else {
                            Alert.alert("Verification Code", String(code));
                          }
                        }
                      } catch (e) {
                        void e;
                      }
                    }}
                    style={styles.copyButton}
                  >
                    <Text style={styles.copyButtonText}>Copy code</Text>
                  </TouchableOpacity> */}
                </View>
              </View>

              <Text style={styles.qrCodeSubtitle}>
                Show this QR code to your driver or support for quick
                verification
              </Text>

              <View style={styles.qrCodeContainerProminent}>
                <View style={styles.qrCodeImageContainerProminent}>
                  {order.qrCodeUrl ? (
                    <Image
                      source={{ uri: order.qrCodeUrl }}
                      style={styles.qrCodeImageProminent}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Ionicons
                        name="image-outline"
                        size={48}
                        color="#CBD5E1"
                      />
                      <Text style={{ marginTop: 8, color: "#9CA3AF" }}>
                        QR not available
                      </Text>
                    </View>
                  )}
                </View>
                {/* <View style={styles.qrCodeInfoProminent}>
                  <Text style={styles.qrCodeOrderId}>
                    Order #{order.id.slice(-8).toUpperCase()}
                  </Text>
                  <Text style={styles.qrCodeAmount}>
                    {formatAmount(order.totalAmount)}
                  </Text>
                </View> */}
              </View>
            </View>
          )}

        {/* Vendor Info */}
        {vendor && (
          <View style={styles.vendorCard}>
            <View style={styles.vendorHeader}>
              <View style={styles.vendorIconContainer}>
                <Ionicons
                  name={
                    order.restaurant
                      ? "restaurant-outline"
                      : order.shop
                        ? "storefront-outline"
                        : "medical-outline"
                  }
                  size={24}
                  color={PrimaryColor}
                />
              </View>
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>{vendor.name}</Text>
                <Text style={styles.vendorType}>{vendorType}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Driver Information - Shows when order is DISPATCHED */}
        {(order.status === "DISPATCHED" || order.status === "DELIVERED") &&
          order.driverName && (
            <View style={styles.driverCard}>
              <Text style={styles.sectionTitle}>Your Driver</Text>

              <View style={styles.driverInfo}>
                {/* Driver Avatar */}
                <View style={styles.driverImageContainer}>
                  {order.driverImage ? (
                    <Image
                      source={{ uri: order.driverImage }}
                      style={styles.driverImage}
                    />
                  ) : (
                    <View style={styles.driverImagePlaceholder}>
                      <Ionicons
                        name="person-circle-outline"
                        size={50}
                        color={PrimaryColor}
                      />
                    </View>
                  )}
                </View>

                {/* Driver Details */}
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{order.driverName}</Text>
                  <Text style={styles.driverPhone}>{order.driverPhone}</Text>
                  <Text style={styles.driverStatus}>
                    {order.status === "DELIVERED"
                      ? "Delivery Completed"
                      : "On the Way"}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.driverActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleCallDriver}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call" size={18} color={PrimaryColor} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      if (order?.driverPhone) {
                        Linking.openURL(
                          `sms:${order.driverPhone}?body=Hi%20Driver`,
                        ).catch((err) => {
                          Alert.alert("Error", "Could not open messaging app");
                        });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="chatbubbles"
                      size={18}
                      color={PrimaryColor}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

        {/* Delivery / Pickup Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>
            {order.orderType === "PICKUP"
              ? "Pickup Information"
              : "Delivery Information"}
          </Text>

          {/* 🎁 Gift Order Badge */}
          {order.isGiftOrder && (
            <View style={styles.giftBadgeContainer}>
              <Ionicons name="gift" size={16} color={PrimaryColor} />
              <Text style={styles.giftBadgeText}>Gift Order</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="person-outline" size={16} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {order.isGiftOrder ? "Ordered By" : "Customer"}
              </Text>
              <Text style={styles.infoValue}>{order.customerName}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={16} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {order.isGiftOrder ? "Buyer's Phone" : "Phone"}
              </Text>
              <Text style={styles.infoValue}>{order.customerPhone}</Text>
            </View>
          </View>

          {/* 🎁 Recipient Information - Only show for gift orders */}
          {order.isGiftOrder && order.recipientName && (
            <>
              <View style={styles.recipientDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="person" size={16} color={PrimaryColor} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Recipient Name</Text>
                  <Text style={styles.infoValue}>{order.recipientName}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="call" size={16} color={PrimaryColor} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Recipient Phone</Text>
                  <Text style={styles.infoValue}>{order.recipientPhone}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="location" size={16} color={PrimaryColor} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Recipient Address</Text>
                  <Text style={styles.infoValue}>{order.recipientAddress}</Text>
                </View>
              </View>
            </>
          )}

          {/* Regular delivery address - only show if not a gift order */}
          {!order.isGiftOrder && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>
                  {order.orderType === "PICKUP"
                    ? "Pickup Location / Instructions"
                    : "Delivery Address"}
                </Text>
                <Text style={styles.infoValue}>
                  {order.orderType === "PICKUP"
                    ? order.pickupInstructions ||
                      order.address ||
                      order.deliveryAddress ||
                      "Pickup details not provided"
                    : order.deliveryAddress ||
                      order.address ||
                      "Delivery address not set"}
                </Text>
              </View>
            </View>
          )}

          {order.notes && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#6B7280"
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Order Notes</Text>
                <Text style={styles.infoValue}>{order.notes}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>
            Order Items ({order.items.length})
          </Text>

          {order.items.map((item, index) => {
            const itemData = item.menuItem || item.product || item.medicine;
            return (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.itemImageContainer}>
                  {itemData?.imageUrl ? (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons
                        name={
                          item.menuItem
                            ? "restaurant"
                            : item.product
                              ? "cube"
                              : "medical"
                        }
                        size={24}
                        color="#9CA3AF"
                      />
                    </View>
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons
                        name={
                          item.menuItem
                            ? "restaurant"
                            : item.product
                              ? "cube"
                              : "medical"
                        }
                        size={24}
                        color="#9CA3AF"
                      />
                    </View>
                  )}
                </View>

                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>
                    {itemData?.name || "Item"}
                  </Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemQuantity}>
                      Qty: {item.quantity}
                    </Text>
                    <Text style={styles.itemPrice}>
                      {formatAmount(item.price)}
                    </Text>
                  </View>
                  <View style={styles.itemTotal}>
                    <Text style={styles.itemTotalText}>
                      Subtotal: {formatAmount(item.price * item.quantity)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items Total</Text>
            <Text style={styles.summaryValue}>
              {formatAmount(
                order.items.reduce(
                  (sum, item) => sum + item.price * item.quantity,
                  0,
                ),
              )}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>
              {formatAmount(order.deliveryFee || 0)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee</Text>
            <Text style={styles.summaryValue}>
              {formatAmount(order.serviceFee || 0)}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total Amount</Text>
            <Text style={styles.summaryTotalValue}>
              {formatAmount(order.totalAmount)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Action Buttons: Full-width industry-style buttons */}
      <View style={styles.trackButtonContainer}>
        {/* Pay Button - Full width when available */}
        {order.status === "ACCEPTED" && order.paymentStatus !== "PAID" && (
          <TouchableOpacity
            style={[
              styles.payNowButton,
              Platform.OS === "web" && { cursor: "pointer" },
            ]}
            onPress={handlePayNow}
            activeOpacity={0.8}
          >
            <Ionicons name="card-outline" size={20} color="#fff" />
            <Text style={styles.payNowButtonText}>Pay Now</Text>
          </TouchableOpacity>
        )}

        {/* Track Button - Full width when payment is done */}
        {(order.status !== "ACCEPTED" || order.paymentStatus === "PAID") && (
          <TouchableOpacity
            style={[
              styles.trackButton,
              Platform.OS === "web" && { cursor: "pointer" },
            ]}
            onPress={handleTrackOrder}
            activeOpacity={0.8}
          >
            <Ionicons name="locate-outline" size={20} color="#fff" />
            <Text style={styles.trackButtonText}>Track Order</Text>
          </TouchableOpacity>
        )}

        {/* Cancel Button - Full width below pay/track button */}
        {["PENDING", "ACCEPTED", "PREPARING"].includes(order.status) && (
          <TouchableOpacity
            style={[
              styles.cancelButton,
              Platform.OS === "web" && { cursor: "pointer" },
            ]}
            onPress={() => handleCancelOrder(order.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
            <Text style={styles.cancelButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Web Modal for Confirmations and Alerts */}
      {Platform.OS === "web" && modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setModalVisible(false);
                  // Reset processing state when modal is manually closed
                  isProcessingPayment.current = false;
                  setLoading(false);
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalMessage}>{modalMessage}</Text>

            <View style={styles.modalFooter}>
              {modalType === "confirm" ? (
                <>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={async () => {
                      if (isProcessingPayment.current) return; // ignore duplicate clicks

                      if (
                        Platform.OS === "web" &&
                        modalAction === processPayment
                      ) {
                        isProcessingPayment.current = true;
                        try {
                          popupRef.current = window.open("", "_blank");
                        } catch (e) {
                          popupRef.current = null;
                        }

                        if (!popupRef.current) {
                          isProcessingPayment.current = false;
                          setLoading(false); // Reset loading state
                          setModalType("alert");
                          setModalTitle("Popup Blocked");
                          setModalMessage(
                            "Your browser blocked the payment popup. Please allow popups for this site and try again.",
                          );
                          setModalAction(null);
                          setModalVisible(true);
                          return;
                        }
                      }

                      try {
                        if (modalAction) await modalAction();
                      } catch (e: any) {
                        console.error("Modal action error:", e);
                        setModalType("alert");
                        setModalTitle("Error");
                        setModalMessage(
                          e?.message || "An error occurred. Please try again.",
                        );
                        setModalAction(null);

                        // Fallback: if there is no modalAction, attempt to refresh order details
                        try {
                          fetchOrderDetails(true);
                        } catch (err) {
                          console.warn(
                            "fetchOrderDetails fallback failed",
                            err,
                          );
                        }
                      } finally {
                        isProcessingPayment.current = false;
                        setModalVisible(false);
                      }
                    }}
                  >
                    <Text style={styles.modalButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={async () => {
                    if (isProcessingPayment.current) return; // ignore duplicate clicks

                    if (
                      Platform.OS === "web" &&
                      modalAction === processPayment
                    ) {
                      isProcessingPayment.current = true;
                      try {
                        popupRef.current = window.open("", "_blank");
                      } catch (e) {
                        popupRef.current = null;
                      }

                      if (!popupRef.current) {
                        isProcessingPayment.current = false;
                        setModalType("alert");
                        setModalTitle("Popup Blocked");
                        setModalMessage(
                          "Your browser blocked the payment popup. Please allow popups for this site and try again.",
                        );
                        setModalAction(null);
                        setModalVisible(true);
                        return;
                      }
                    }

                    try {
                      if (modalAction) await modalAction();
                    } catch (e: any) {
                      console.error("Modal action error:", e);
                      setModalType("alert");
                      setModalTitle("Error");
                      setModalMessage(
                        e?.message || "An error occurred. Please try again.",
                      );
                      setModalAction(null);
                      // Keep modal visible to show error, but reset processing state
                      isProcessingPayment.current = false;
                      setLoading(false);
                      return; // Don't close modal
                    } finally {
                      isProcessingPayment.current = false;
                      setLoading(false);
                    }

                    // Close modal after successful action
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Platform.OS === "web" ? 12 : 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    backgroundColor: "#F1F5F9",
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  scrollView: {
    flex: 1,
    padding: Platform.OS === "web" ? 12 : 20,
  },

  // Status Card
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  estimatedTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  estimatedTimeText: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Vendor Card
  vendorCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  vendorHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  vendorIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  vendorType: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Driver Card
  driverCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: PrimaryColor,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  driverImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  driverImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  driverPhone: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  driverStatus: {
    fontSize: 12,
    color: PrimaryColor,
    fontWeight: "600",
    marginTop: 4,
  },
  driverActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // Info Card
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },

  // Items Card
  itemsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  orderItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemImageContainer: {
    marginRight: 12,
  },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: "#6B7280",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  itemTotal: {
    alignItems: "flex-end",
  },
  itemTotalText: {
    fontSize: 14,
    fontWeight: "600",
    color: PrimaryColor,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1F2937",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: PrimaryColor,
  },

  // Track Button Container
  trackButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  trackButton: {
    backgroundColor: PrimaryColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 12,
  },
  trackButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // 💳 Pay Now Button (prominent full-width button)
  payNowButton: {
    backgroundColor: PrimaryColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 12,
  },
  payNowButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ❌ Cancel Button (full-width secondary button)
  cancelButton: {
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#FEE2E2",
  },
  cancelButtonText: {
    color: "#EF4444",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Small card-like buttons (match orders card)
  smallCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  smallCancelButtonText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
  smallPayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: PrimaryColor,
    borderWidth: 1,
    borderColor: PrimaryColor,
  },
  smallPayButtonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
    marginRight: 4,
  },
  smallTrackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  smallTrackButtonText: {
    fontSize: 12,
    color: PrimaryColor,
    fontWeight: "600",
    marginRight: 4,
  },

  // Pending Message (when waiting for payment)
  pendingMessageContainer: {
    backgroundColor: "#FFF3E0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FF9800",
  },
  pendingMessageText: {
    color: "#FF9800",
    fontSize: 15,
    fontWeight: "600",
  },

  // Pickup Info Container (for PICKUP orders)
  pickupInfoContainer: {
    backgroundColor: "#F0F9FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: PrimaryColor,
  },
  pickupInfoText: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "600",
  },

  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PrimaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Skeleton Styles
  itemSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  totalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
    justifyContent: "center",
  },

  // QR Code Styles
  qrCodeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  qrCodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  qrCodeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  qrCodeSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  qrCodeContainer: {
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 20,
  },
  qrCodeImageContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrCodeImage: {
    width: 200,
    height: 200,
  },
  qrCardElevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  qrCodeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  qrCodeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  qrActions: {
    alignItems: "flex-end",
  },
  qrCodeContainerProminent: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
  },
  qrCodeImageContainerProminent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  qrCodeImageProminent: {
    width: 180,
    height: 180,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  qrCodeInfoProminent: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  qrCodeInfo: {
    alignItems: "center",
  },
  qrCodeOrderId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  qrCodeAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: PrimaryColor,
  },
  // Prominent QR styles
  qrProminentCard: {
    backgroundColor: PrimaryColor,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  qrProminentInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  qrProminentImage: {
    width: 120,
    height: 120,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    marginRight: 16,
  },
  qrProminentMeta: {
    flex: 1,
  },
  qrProminentTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  qrProminentSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    marginBottom: 12,
  },
  qrActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  copyButton: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  copyButtonText: {
    color: PrimaryColor,
    fontWeight: "700",
  },
  // 🎁 Gift Order Styles
  giftBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5EE",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFD4A3",
  },
  giftBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: PrimaryColor,
    marginLeft: 6,
  },
  recipientDivider: {
    height: 1,
    backgroundColor: "#FFD4A3",
    marginVertical: 12,
  },
  // 🌐 Web Modal Styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  } as any,
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: Platform.OS === "web" ? 20 : 24,
    minWidth: 320,
    maxWidth: Platform.OS === "web" ? "calc(100% - 32px)" : 480,
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
  } as any,
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  modalCloseBtn: {
    padding: 4,
    marginLeft: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  modalButtonPrimary: {
    backgroundColor: PrimaryColor,
  },
  modalButtonSecondary: {
    backgroundColor: "#E5E7EB",
  },
  modalButtonText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#fff",
  },
  modalButtonTextSecondary: {
    fontWeight: "700",
    fontSize: 14,
    color: "#374151",
  },
});
