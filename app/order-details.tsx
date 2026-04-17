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
  ActivityIndicator,
  AppState,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// Alert is imported above
import { useRouter, useLocalSearchParams } from "expo-router";
import { SecureStorage } from "@/utils/secureStorage";
import { orderApi, Order } from "../lib/api";
import { useVendor } from "@/context/VendorContext";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import {
  on as socketOn,
  off as socketOff,
  emit as socketEmit,
  isSocketConnected,
} from "@/services/SocketService";
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

const getVehicleInfo = (vehicleType?: string) => {
  switch ((vehicleType || "").toUpperCase()) {
    case "BIKE":
      return { emoji: "🏍️", label: "Motorbike" };
    case "KEKE_CARGO":
      return { emoji: "🛺", label: "Keke Cargo" };
    case "CAR":
      return { emoji: "🚗", label: "Car" };
    case "VAN":
      return { emoji: "🚐", label: "Van" };
    case "LORRY":
      return { emoji: "🚛", label: "Mini Lorry" };
    default:
      return { emoji: "🚗", label: vehicleType ?? "Vehicle" };
  }
};

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { replaceCart } = useCart();
  const { orderId } = params;
  const { from } = params;
  const { fromPayment } = params;
  const status = params.status as string;
  const paymentId = params.paymentId as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ⭐ Driver Rating Modal State
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingReview, setRatingReview] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showDriverProfile, setShowDriverProfile] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  // Persisted set of order IDs the user has already rated
  const [ratedOrderIds, setRatedOrderIds] = useState<Set<string>>(new Set());

  const { isVendor: isVendorUser } = useVendor();

  // Load persisted rated order IDs on mount
  useEffect(() => {
    SecureStorage.getItem("ratedOrderIds")
      .then((raw) => {
        if (raw) {
          const arr: string[] = JSON.parse(raw);
          setRatedOrderIds(new Set(arr));
        }
      })
      .catch(() => {});
  }, []);

  const MAX_RATED_IDS = 50;

  const markOrderRated = async (id: string) => {
    setRatedOrderIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      // Keep only the 50 most recent entries so storage stays tiny
      const trimmed = [...next].slice(-MAX_RATED_IDS);
      SecureStorage.setItem("ratedOrderIds", JSON.stringify(trimmed)).catch(
        () => {},
      );
      return new Set(trimmed);
    });
  };

  // Web Modal State (for confirmations and alerts on web platform)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"confirm" | "alert">("alert");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalAction, setModalAction] = useState<
    (() => void) | (() => Promise<void>) | null
  >(null);

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

  // Fetch order details on mount
  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, fetchOrderDetails]);

  // If opened from payment deep-link and order is not yet updated, poll + show waiting UI.
  useEffect(() => {
    if (fromPayment !== "true") return;
    let cancelled = false;
    let attempts = 0;

    const pollForUpdate = async () => {
      if (!orderId) return;
      try {
        const latest = await orderApi.getOrderById(orderId as string);
        setOrder(latest);
        if (
          latest.paymentStatus === "PAID" ||
          (latest as any).paymentStatus === "SUCCEEDED" ||
          latest.status !== "PENDING"
        ) {
          return; // updated
        }
      } catch (e) {
        // ignore and retry
      }

      attempts += 1;
      if (!cancelled && attempts < 10) {
        setTimeout(pollForUpdate, 2000);
      }
    };

    // Only start polling if order exists and is not yet paid
    if (
      !order ||
      (order &&
        order.paymentStatus !== "PAID" &&
        (order as any).paymentStatus !== "SUCCEEDED")
    ) {
      pollForUpdate();
    }

    return () => {
      cancelled = true;
    };
  }, [fromPayment, orderId]);

  // Handle URL parameters for payment status (when redirected back from payment)
  useEffect(() => {
    if (Platform.OS === "web" && order && status) {
      console.log(
        "[Payment] Handling URL status parameter:",
        status,
        "paymentId:",
        paymentId,
      );

      if (status === "cancelled") {
        setModalType("alert");
        setModalTitle("Payment Cancelled");
        setModalMessage(
          "Payment was not completed. You can try again or use a different payment method.",
        );
        setModalAction(null);
        setModalVisible(true);
      } else if (status === "success" || status === "successful") {
        setModalType("alert");
        setModalTitle("Payment Successful! 🎉");
        setModalMessage(
          "Your payment has been processed. Your order is being prepared.",
        );
        setModalAction(() => fetchOrderDetails(true));
        setModalVisible(true);
      }

      // Clear the status from URL to prevent re-showing on refresh
      if (typeof window !== "undefined" && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete("status");
        url.searchParams.delete("paymentId");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [order, status, paymentId, fetchOrderDetails]);

  // Socket listeners for order status updates
  useEffect(() => {
    // Immediately patch the order status in state (no API round-trip)
    const applyStatusPatch = (data: any) => {
      // Normalise to string so number IDs from the server still match URL-param strings
      if (!data?.orderId || String(data.orderId) !== String(orderId)) return;
      const newStatus = data.status || data.newStatus;
      if (newStatus) {
        setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
      }
      // Also do a background refetch to get the full updated order
      fetchOrderDetails(true);
    };

    const onOrderStatusUpdate = (data: any) => {
      console.log("[Socket] orderStatusUpdate in order-details", data);
      applyStatusPatch(data);
    };

    // Some status updates use this alternate event name (room-based)
    const onOrderStatusUpdated = (data: any) => {
      console.log("[Socket] order:statusUpdated in order-details", data);
      applyStatusPatch(data);
    };

    const onPaymentSuccess = (data: any) => {
      console.log("[Socket] paymentSuccess in order-details", data);
      if (data?.orderId === orderId) {
        fetchOrderDetails(true);
        setTimeout(() => {
          router.replace("/(tabs)/orders");
        }, 2000);
      }
    };

    // Re-join order room (important after reconnects)
    const joinOrderRoom = () => {
      if (orderId) {
        socketEmit("customer:trackOrder", orderId);
      }
    };

    socketOn("orderStatusUpdate", onOrderStatusUpdate);
    socketOn("order:statusUpdated", onOrderStatusUpdated);
    socketOn("paymentSuccess", onPaymentSuccess);
    socketOn("connect", joinOrderRoom); // re-join room on reconnect

    joinOrderRoom();

    return () => {
      socketOff("orderStatusUpdate", onOrderStatusUpdate);
      socketOff("order:statusUpdated", onOrderStatusUpdated);
      socketOff("paymentSuccess", onPaymentSuccess);
      socketOff("connect", joinOrderRoom);
      if (orderId) {
        socketEmit("customer:stopTracking", orderId);
      }
    };
  }, [orderId, fetchOrderDetails, router]);

  // Refresh when app comes back to foreground (e.g. user tapped a push notification)
  useEffect(() => {
    const appState = { current: AppState.currentState };
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        fetchOrderDetails(true);
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [fetchOrderDetails]);

  // Polling fallback: refresh order every 30 s while the screen is open and
  // the order is in an active (non-terminal) state, so status is always current
  // even if a socket event is missed.
  useEffect(() => {
    if (!orderId) return;
    if (order?.status === "DELIVERED" || order?.status === "CANCELLED") return;

    const interval = setInterval(() => {
      fetchOrderDetails(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [orderId, order?.status, fetchOrderDetails]);

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

  /**
   * FIXED handlePayNow — no in-app browser, no WebBrowser.
   *
   * Wave's wave_launch_url is a web URL but the server sets the redirect
   * back to our backend (/api/redirect/payment-success) which immediately
   * 302-redirects (0 ms meta-refresh + JS) to teranggo:// — so the browser
   * window is invisible in practice.
   *
   * Using Linking.openURL means:
   *   • iOS: opens Wave app directly if installed (via Universal Link on wave_launch_url)
   *   • Android: same — Wave registers the scheme, opens natively
   *   • Both: after payment, Wave opens our HTTPS redirect URL in Safari/Chrome,
   *     which fires teranggo:// immediately → app comes back to foreground
   */
  const handlePayNow = async () => {
    if (!order) return;

    Alert.alert(
      "Confirm Payment",
      `Proceed with payment of ${formatAmount(order.totalAmount)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay Now",
          onPress: async () => {
            try {
              setLoading(true);

              // Get preferred payment network
              let network = "wave";
              try {
                const stored = await SecureStorage.getItem("paymentMethods");
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (parsed?.default) network = parsed.default;
                }
              } catch (e) {
                console.warn("Using default payment method: wave");
              }

              console.log("💳 Initiating payment...");
              const result: any = await orderApi.payForOrder(
                order.id,
                network,
                `https://monkfish-app-korrv.ondigitalocean.app/api/redirect/payment-success?orderId=${order.id}`,
                `https://monkfish-app-korrv.ondigitalocean.app/api/redirect/payment-cancel?orderId=${order.id}`,
              );

              const launchUrl =
                result?.wave_launch_url || result?.session?.wave_launch_url;

              if (!launchUrl) {
                throw new Error("No Wave launch URL received from server");
              }

              console.log("💳 Opening Wave URL via Linking:", launchUrl);

              // ✅ Direct open — no in-app browser on any platform.
              // On iOS/Android Wave intercepts this URL and opens the native app.
              // After payment Wave browser loads our /api/redirect/payment-success
              // which does an instant teranggo:// redirect back here.
              const canOpen = await Linking.canOpenURL(launchUrl);
              if (!canOpen) {
                throw new Error(
                  "Cannot open Wave URL. Ensure Wave app is installed.",
                );
              }
              await Linking.openURL(launchUrl);
            } catch (error: any) {
              console.error("❌ Payment error:", error);
              Alert.alert(
                "Payment Failed",
                error?.message ||
                  "Failed to open Wave payment. Please ensure Wave app is installed or try again.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Retry", onPress: handlePayNow },
                ],
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  // ⭐ Submit driver rating
  const handleRateDriver = async () => {
    if (!order || selectedRating === 0) {
      Alert.alert("Select a Star", "Please select at least 1 star to rate.");
      return;
    }
    setRatingSubmitting(true);
    try {
      await orderApi.rateDriver(
        order.id,
        selectedRating,
        ratingReview.trim() || undefined,
      );
      setRatingSubmitted(true);
      markOrderRated(order.id);
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              driverRating: {
                id: "submitted",
                rating: selectedRating,
                review: ratingReview.trim() || undefined,
              },
            }
          : prev,
      );
      setTimeout(() => {
        setRatingModalVisible(false);
        setRatingSubmitted(false);
        setSelectedRating(0);
        setRatingReview("");
      }, 1500);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.message || "Could not submit rating. Please try again.",
      );
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleReorder = () => {
    if (!order || !order.items || order.items.length === 0) return;
    const vendorId =
      order.restaurant?.id || order.shop?.id || order.pharmacy?.id || "";
    const vendorName =
      order.restaurant?.name ||
      order.shop?.name ||
      order.pharmacy?.name ||
      "Store";
    const entityType = order.restaurant
      ? "restaurant"
      : order.shop
        ? "shop"
        : "pharmacy";

    const cartItems = order.items
      .map((item: any) => {
        const itemData = item.menuItem || item.product || item.medicine;
        if (!itemData) return null;
        return {
          id: itemData.id,
          name: itemData.name,
          price: item.price,
          imageUrl: itemData.imageUrl,
          vendorId,
          vendorName,
          entityType,
          quantity: item.quantity || 1,
        };
      })
      .filter(Boolean) as any[];

    if (cartItems.length === 0) {
      Alert.alert(
        "Re-order",
        "No items could be added to cart from this order.",
      );
      return;
    }

    replaceCart(cartItems);
    router.push("/cart");
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
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

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
        <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

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
            <Ionicons name="arrow-back" size={22} color="#fff" />
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
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

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
          <Ionicons name="arrow-back" size={22} color="#fff" />
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
                Order TG{order.id.slice(-4).toUpperCase()}
              </Text>
              <Text style={styles.orderDate}>
                {formatDate(order.createdAt)}
              </Text>

              {/* If user arrived from payment and order is not yet confirmed, show waiting banner */}
              {fromPayment === "true" &&
                order &&
                order.paymentStatus !== "PAID" &&
                (order as any).paymentStatus !== "SUCCEEDED" && (
                  <View style={styles.waitingBanner}>
                    <ActivityIndicator size="small" color={PrimaryColor} />
                    <Text style={styles.waitingText}>
                      Waiting for payment confirmation...
                    </Text>
                    <TouchableOpacity
                      onPress={() => fetchOrderDetails(true)}
                      style={styles.waitingRefresh}
                    >
                      <Text style={styles.waitingRefreshText}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
        {/* Gift orders: no QR card — driver manually notifies admin, no scan needed */}
        {!order.isGiftOrder &&
          [
            "ACCEPTED",
            "PREPARING",
            "PROCESSING",
            "READY",
            "DISPATCHED",
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
                  {isVendorUser &&
                    order.orderType === "PICKUP" &&
                    order.status === "READY" && (
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            const res = await orderApi.vendorScanPickup(
                              order.id,
                            );
                            setOrder(res);
                            Alert.alert(
                              "Success",
                              "Order marked as picked up (DELIVERED)",
                            );
                          } catch (e: any) {
                            console.warn("Vendor scan failed:", e);
                            Alert.alert(
                              "Scan failed",
                              e?.message || "Failed to verify pickup",
                            );
                          }
                        }}
                        style={styles.copyButton}
                      >
                        <Text style={styles.copyButtonText}>
                          Mark Picked (Scan)
                        </Text>
                      </TouchableOpacity>
                    )}
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
                Show this QR code to your{" "}
                {order.orderType === "PICKUP" ? "vendor" : "delivery driver"} or
                support for quick verification
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
                    Order TG{order.id.slice(-4).toUpperCase()}
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
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                  onPress={() => setShowDriverProfile(true)}
                  activeOpacity={0.7}
                >
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
                    <Text style={styles.viewProfileHint}>
                      Tap to view profile →
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Action Buttons — hide when order is already delivered */}
                {order.status !== "DELIVERED" && (
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
                            Alert.alert(
                              "Error",
                              "Could not open messaging app",
                            );
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
                )}
              </View>

              {/* ⭐ Rate Your Driver — shown after delivery, once per order */}
              {order.status === "DELIVERED" &&
                !order.driverRating &&
                !ratedOrderIds.has(order.id) && (
                  <TouchableOpacity
                    style={styles.rateDriverButton}
                    onPress={() => {
                      setSelectedRating(0);
                      setRatingReview("");
                      setRatingSubmitted(false);
                      setRatingModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.rateDriverButtonText}>
                      Rate Your Driver
                    </Text>
                  </TouchableOpacity>
                )}
              {order.status === "DELIVERED" && order.driverRating && (
                <View style={styles.ratedBadge}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratedBadgeText}>
                    Rated {order.driverRating.rating}/5{" "}
                    {"★".repeat(order.driverRating.rating)}
                    {"☆".repeat(5 - order.driverRating.rating)}
                  </Text>
                </View>
              )}
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
            <>
              {/* Pickup Location - show vendor address */}
              {order.orderType === "PICKUP" && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons
                      name="storefront-outline"
                      size={16}
                      color="#6B7280"
                    />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Pickup Location</Text>
                    <Text style={styles.infoValue}>
                      {vendor?.name || "Vendor"}
                      {vendor?.address && typeof vendor.address === "string"
                        ? `\n${vendor.address}`
                        : vendor?.address &&
                            typeof vendor.address === "object" &&
                            vendor.address.street
                          ? `\n${vendor.address.street}, ${vendor.address.city || ""}`
                          : ""}
                    </Text>
                  </View>
                </View>
              )}

              {/* Pickup Instructions - show only if provided */}
              {order.orderType === "PICKUP" && order.pickupInstructions && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color="#6B7280"
                    />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Pickup Instructions</Text>
                    <Text style={styles.infoValue}>
                      {order.pickupInstructions}
                    </Text>
                  </View>
                </View>
              )}

              {/* Delivery Address - for delivery orders */}
              {order.orderType === "DELIVERY" && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#6B7280"
                    />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Delivery Address</Text>
                    <Text style={styles.infoValue}>
                      {order.deliveryAddress ||
                        order.address ||
                        "Delivery address not set"}
                    </Text>
                  </View>
                </View>
              )}
            </>
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

        {/* Track Button - Full width when payment is done, hidden once delivered */}
        {order.status !== "DELIVERED" &&
          (order.status !== "ACCEPTED" || order.paymentStatus === "PAID") && (
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

        {/* Re-order Button - shown for completed or cancelled orders */}
        {(order.status === "DELIVERED" || order.status === "CANCELLED") && (
          <TouchableOpacity
            style={[
              styles.trackButton,
              { backgroundColor: PrimaryColor },
              Platform.OS === "web" && { cursor: "pointer" },
            ]}
            onPress={handleReorder}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.trackButtonText}>Order Again</Text>
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
                      } finally {
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
                    } finally {
                      setModalVisible(false);
                    }
                  }}
                >
                  <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Driver Profile Modal */}
      <Modal
        visible={showDriverProfile}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDriverProfile(false)}
      >
        <View style={styles.driverModalOverlay}>
          <TouchableOpacity
            style={styles.driverModalBackdrop}
            onPress={() => setShowDriverProfile(false)}
            activeOpacity={1}
          />
          <View style={styles.driverModalSheet}>
            <View style={styles.driverModalHandle} />

            <TouchableOpacity
              style={styles.driverModalClose}
              onPress={() => setShowDriverProfile(false)}
            >
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.driverModalAvatarContainer}>
              {order?.driverImage ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setShowDriverProfile(false);
                    setShowFullscreenImage(true);
                  }}
                >
                  <Image
                    source={{ uri: order.driverImage }}
                    style={styles.driverModalAvatar}
                  />
                  <View style={styles.driverModalAvatarZoomHint}>
                    <Ionicons name="expand" size={14} color="#FFF" />
                  </View>
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.driverModalAvatar,
                    styles.driverModalAvatarPlaceholder,
                  ]}
                >
                  <Ionicons name="person" size={44} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.driverModalOnlineDot} />
            </View>

            <Text style={styles.driverModalName}>{order?.driverName}</Text>
            <Text style={styles.driverModalSubtitle}>Delivery Driver</Text>

            <View style={styles.driverModalInfoList}>
              {order?.driverPhone && (
                <View style={styles.driverModalInfoRow}>
                  <View style={styles.driverModalInfoIcon}>
                    <Ionicons name="call" size={18} color={PrimaryColor} />
                  </View>
                  <View>
                    <Text style={styles.driverModalInfoLabel}>Phone</Text>
                    <Text style={styles.driverModalInfoValue}>
                      {order.driverPhone}
                    </Text>
                  </View>
                </View>
              )}

              {order?.driverVehicleType &&
                (() => {
                  const vehicleInfo = getVehicleInfo(order.driverVehicleType);
                  return (
                    <View style={styles.driverModalInfoRow}>
                      <View style={styles.driverModalInfoIcon}>
                        <Text style={{ fontSize: 18 }}>
                          {vehicleInfo.emoji}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.driverModalInfoLabel}>
                          Vehicle Type
                        </Text>
                        <Text style={styles.driverModalInfoValue}>
                          {vehicleInfo.label}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

              {order?.driverVehicleNumber && (
                <View style={styles.driverModalInfoRow}>
                  <View style={styles.driverModalInfoIcon}>
                    <Ionicons name="card" size={18} color={PrimaryColor} />
                  </View>
                  <View>
                    <Text style={styles.driverModalInfoLabel}>
                      Plate Number
                    </Text>
                    <Text style={styles.driverModalInfoValue}>
                      {order.driverVehicleNumber}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.driverModalCallButton}
              onPress={handleCallDriver}
            >
              <Ionicons name="call" size={20} color="#FFF" />
              <Text style={styles.driverModalCallText}>Call Driver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Driver Photo */}
      <Modal
        visible={showFullscreenImage}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowFullscreenImage(false)}
      >
        <View style={styles.driverFullscreenOverlay}>
          <TouchableOpacity
            style={styles.driverFullscreenClose}
            onPress={() => setShowFullscreenImage(false)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {order?.driverImage && (
            <Image
              source={{ uri: order.driverImage }}
              style={styles.driverFullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* ⭐ Driver Rating Modal */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.ratingOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.ratingSheet}>
            {/* Header */}
            <View style={styles.ratingHeader}>
              <Text style={styles.ratingTitle}>Rate Your Driver</Text>
              <TouchableOpacity
                onPress={() => setRatingModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {ratingSubmitted ? (
              <View style={styles.ratingThankYou}>
                <Text style={styles.ratingThankYouEmoji}>🎉</Text>
                <Text style={styles.ratingThankYouText}>
                  Thank you for your rating!
                </Text>
              </View>
            ) : (
              <>
                {/* Stars */}
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setSelectedRating(star)}
                      activeOpacity={0.7}
                      style={styles.starButton}
                    >
                      <Ionicons
                        name={star <= selectedRating ? "star" : "star-outline"}
                        size={40}
                        color={star <= selectedRating ? "#F59E0B" : "#D1D5DB"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.ratingLabelText}>
                  {selectedRating === 0
                    ? "Tap a star to rate"
                    : selectedRating === 1
                      ? "Poor"
                      : selectedRating === 2
                        ? "Fair"
                        : selectedRating === 3
                          ? "Good"
                          : selectedRating === 4
                            ? "Very Good"
                            : "Excellent!"}
                </Text>

                {/* Review Input */}
                <TextInput
                  style={styles.ratingReviewInput}
                  placeholder="Leave a review (optional)..."
                  placeholderTextColor="#9CA3AF"
                  value={ratingReview}
                  onChangeText={setRatingReview}
                  multiline
                  numberOfLines={3}
                  maxLength={300}
                />

                {/* Submit */}
                <TouchableOpacity
                  style={[
                    styles.ratingSubmitButton,
                    selectedRating === 0 && styles.ratingSubmitDisabled,
                  ]}
                  onPress={handleRateDriver}
                  disabled={selectedRating === 0 || ratingSubmitting}
                  activeOpacity={0.8}
                >
                  {ratingSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.ratingSubmitText}>Submit Rating</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: PrimaryColor,
    borderBottomWidth: 0,
  },
  backButton: {
    backgroundColor: "rgba(255,255,255,0.22)",
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
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
  waitingBanner: {
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  waitingText: { color: "#92400E", fontWeight: "600" },
  waitingRefresh: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 6 },
  waitingRefreshText: { color: PrimaryColor, fontWeight: "700" },
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
  viewProfileHint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 3,
    fontWeight: "500",
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

  // Driver Profile Modal
  driverModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  driverModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  driverModalSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: "center",
  },
  driverModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
  },
  driverModalClose: {
    position: "absolute",
    top: 16,
    right: 20,
    padding: 6,
  },
  driverModalAvatarContainer: {
    position: "relative",
    marginTop: 8,
    marginBottom: 16,
  },
  driverModalAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: PrimaryColor + "30",
  },
  driverModalAvatarPlaceholder: {
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  driverModalOnlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  driverModalName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
  },
  driverModalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 24,
  },
  driverModalInfoList: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
  },
  driverModalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 14,
  },
  driverModalInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PrimaryColor + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  driverModalInfoLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  driverModalInfoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  driverModalCallButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: PrimaryColor,
    borderRadius: 16,
    paddingVertical: 16,
    width: "100%",
  },
  driverModalCallText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  driverModalAvatarZoomHint: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    padding: 4,
  },
  driverFullscreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  driverFullscreenClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 6,
  },
  driverFullscreenImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.75,
  },

  // ⭐ Driver Rating styles
  rateDriverButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  rateDriverButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#D97706",
  },
  ratedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#FFFBEB",
    alignSelf: "center",
  },
  ratedBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B45309",
  },
  ratingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  ratingSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  ratingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingLabelText: {
    textAlign: "center",
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    fontWeight: "500",
  },
  ratingReviewInput: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#111827",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  ratingSubmitButton: {
    backgroundColor: PrimaryColor,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  ratingSubmitDisabled: {
    backgroundColor: "#9CA3AF",
  },
  ratingSubmitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  ratingThankYou: {
    alignItems: "center",
    paddingVertical: 32,
  },
  ratingThankYouEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  ratingThankYouText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#059669",
  },
});
