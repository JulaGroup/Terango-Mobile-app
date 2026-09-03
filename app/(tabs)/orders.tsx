import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Alert,
  StatusBar,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// AsyncStorage removed - not used in this file
import { useFocusEffect } from "@react-navigation/native";
import { PrimaryColor } from "@/constants/Colors";
import {
  customDeliveryApi,
  orderApi,
  experienceApi,
  type Order,
  type Booking,
} from "@/lib/api";
import {
  setOrdersRefreshCallback,
  setNavigateToOrderCallback,
  addOrdersRefreshListener,
  removeOrdersRefreshListener,
} from "@/services/NotificationService";
import { useRouter } from "expo-router";
import { SecureStorage } from "@/utils/secureStorage";
import { API_URL } from "@/constants/config";
import { formatExpressDeliveryId } from "@/utils/formatExpressDeliveryId";
import { SafeAreaView } from "react-native-safe-area-context";

const statusColors = {
  PENDING: "#F39C12",
  ACCEPTED: "#3498DB",
  PREPARING: "#3498DB",
  PROCESSING: "#3498DB",
  DRIVER_ASSIGNED: "#3B82F6",
  PICKED_UP: "#8B5CF6",
  IN_TRANSIT: "#6366F1",
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
  DRIVER_ASSIGNED: "person-outline",
  PICKED_UP: "cube-outline",
  IN_TRANSIT: "car-outline",
  READY: "checkmark-circle-outline",
  DISPATCHED: "car-outline",
  DELIVERED: "checkmark-circle-outline",
  CANCELLED: "close-circle-outline",
};

interface DeliveryActivity {
  id: string;
  status: string;
  createdAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFee?: number | null;
  estimatedDistanceKm?: number | null;
  isExpress?: boolean;
  priorityLevel?: string;
  paymentStatus?: "UNPAID" | "PAID" | "FAILED" | "REFUNDED";
  adminApprovedForPayment?: boolean;
}

type ActivityItem =
  | { kind: "order"; id: string; createdAt: string; order: Order }
  | {
      kind: "delivery";
      id: string;
      createdAt: string;
      delivery: DeliveryActivity;
    }
  | { kind: "booking"; id: string; createdAt: string; booking: Booking };

const LIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED"];
const PAST_BOOKING_STATUSES = ["CHECKED_IN", "COMPLETED", "CANCELLED"];

const LIVE_ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "PROCESSING",
  "READY",
  "DISPATCHED",
];

const LIVE_DELIVERY_STATUSES = [
  "PENDING",
  "DRIVER_ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
];

const PAST_STATUSES = ["DELIVERED", "CANCELLED"];

const parseDeliveryList = (response: any): DeliveryActivity[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

const isExpressDelivery = (delivery: DeliveryActivity): boolean => {
  if (delivery.isExpress === true) return true;
  const priority = String(delivery.priorityLevel ?? "").toUpperCase();
  return priority === "EXPRESS" || priority === "URGENT";
};

// Order-level express check (mirrors isExpressDelivery, but reads from Order).
// Uses `as any` so this compiles safely even if isExpress/priorityLevel
// aren't declared on the Order type yet. If regular orders can never be
// "express" in your data model, this will simply always return false.
const isExpressOrder = (order: Order): boolean => {
  const anyOrder = order as any;
  if (anyOrder.isExpress === true) return true;
  const priority = String(anyOrder.priorityLevel ?? "").toUpperCase();
  return priority === "EXPRESS" || priority === "URGENT";
};

const isDeliveryVisibleInActivities = (delivery: DeliveryActivity) => {
  return true;
};

// Deliveries and bookings come back as full history with joins attached, so
// they are the slowest part of this screen. Activities only ever shows recent
// items, so there is no reason to pull years of them.
const HISTORY_LIMIT = 20;

/**
 * Last-loaded activities, kept in module scope so switching tabs and coming
 * back renders instantly instead of blanking to a skeleton and paying for a
 * fresh round trip. Deliberately not persisted: it should survive a tab switch,
 * which is what makes the screen feel slow, and reset on app restart so nothing
 * goes stale across sessions.
 */
type Scope = "live" | "past";

// How long a cached load counts as fresh. Within this window, re-focusing the
// tab renders from cache without refetching — real changes still arrive via the
// notification/socket refresh callbacks, so this only suppresses idle churn.
const FRESH_MS = 60 * 1000;

let activitiesCache: {
  userId: string;
  ordersByScope: Record<Scope, Order[]>;
  totalByScope: Record<Scope, number | null>;
  loadedScopes: Record<Scope, boolean>;
  deliveries: DeliveryActivity[];
  bookings: Booking[];
  fetchedAt: number;
} | null = null;

export default function Orders() {
  const router = useRouter();
  // Orders are paged per tab, because the server now filters by scope. Sharing
  // one list across both tabs is what made a Live tab look empty while live
  // orders sat on a later page of a status-blind list.
  const [ordersByScope, setOrdersByScope] = useState<Record<Scope, Order[]>>(
    () => ({
      live: activitiesCache?.ordersByScope.live ?? [],
      past: activitiesCache?.ordersByScope.past ?? [],
    }),
  );
  // Server-reported total per tab (null = not loaded), so the tab counters show
  // the real number rather than however many rows happen to be paged in.
  const [totalByScope, setTotalByScope] = useState<
    Record<Scope, number | null>
  >(() => activitiesCache?.totalByScope ?? { live: null, past: null });
  const [deliveries, setDeliveries] = useState<DeliveryActivity[]>(
    () => activitiesCache?.deliveries ?? [],
  );
  const [bookings, setBookings] = useState<Booking[]>(
    () => activitiesCache?.bookings ?? [],
  );
  // Only skeleton when there is genuinely nothing to show.
  const [loading, setLoading] = useState(activitiesCache === null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Scope>("live");
  // fetchOrders is registered as a notification callback, so it must not close
  // over activeTab as a dependency — read the current tab through a ref.
  const activeTabRef = useRef<Scope>("live");
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Server-backed total of live *orders* for the header (null = not loaded).
  // The delivery half of the count is derived from state below rather than
  // fetched: fetchOrders is already loading that exact list, and refetching it
  // here was doubling the slowest request on the screen.
  const [liveOrderTotal, setLiveOrderTotal] = useState<number | null>(null);

  const refreshLiveCount = useCallback(async () => {
    try {
      const logged = await SecureStorage.getItem("isLoggedIn");
      if (logged !== "true") {
        setLiveOrderTotal(0);
        return;
      }

      const res = await orderApi.getOrderStatusCounts();
      const statuses = res?.byStatus || {};
      setLiveOrderTotal(
        LIVE_ORDER_STATUSES.reduce((sum, s) => sum + (statuses[s] || 0), 0),
      );
    } catch (err) {
      console.warn("Failed to load live orders count:", err);
    }
  }, []);

  const liveDeliveryCount = useMemo(
    () =>
      deliveries.filter(
        (delivery) =>
          isDeliveryVisibleInActivities(delivery) &&
          LIVE_DELIVERY_STATUSES.includes(delivery.status),
      ).length,
    [deliveries],
  );

  // Stays null until the server total lands, so the header can tell "no live
  // orders" apart from "not loaded yet" exactly as before.
  const liveCount = useMemo(
    () => (liveOrderTotal === null ? null : liveOrderTotal + liveDeliveryCount),
    [liveOrderTotal, liveDeliveryCount],
  );

  // Keep the header count in sync with real-time events. The initial load is
  // driven by checkAuthentication on focus, so no fetch is kicked off here.
  useEffect(() => {
    const l = () => refreshLiveCount();
    addOrdersRefreshListener(l);
    return () => removeOrdersRefreshListener(l);
  }, [refreshLiveCount]);

  // Pagination state, tracked per tab
  const PAGE_SIZE = 10; // orders per page (lazy loaded on scroll)
  const [pageByScope, setPageByScope] = useState<Record<Scope, number>>({
    live: 1,
    past: 1,
  });
  const [hasMoreByScope, setHasMoreByScope] = useState<Record<Scope, boolean>>({
    live: true,
    past: true,
  });
  const [loadedScopes, setLoadedScopes] = useState<Record<Scope, boolean>>(
    () => activitiesCache?.loadedScopes ?? { live: false, past: false },
  );

  // Guards against two code paths requesting the same tab at once — the focus
  // handler and the tab-switch effect can otherwise both fire page 1.
  const inFlightScopes = useRef<Record<Scope, boolean>>({
    live: false,
    past: false,
  });

  const orders = ordersByScope[activeTab];
  const hasMore = hasMoreByScope[activeTab];

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

  /**
   * Deliveries and bookings. Loaded once per refresh and filtered into both
   * tabs client-side — unlike orders these are capped to a recent window
   * rather than paged, so History shows the most recent HISTORY_LIMIT of each.
   */
  const fetchSecondary = useCallback(async () => {
    await Promise.allSettled([
      customDeliveryApi
        .listDeliveries({ limit: HISTORY_LIMIT })
        .then((response) => setDeliveries(parseDeliveryList(response)))
        .catch(() => {
          /* secondary — never block or fail the screen */
        }),
      experienceApi
        .getMyBookings(HISTORY_LIMIT)
        .then((response) => {
          if (Array.isArray(response)) setBookings(response);
        })
        .catch(() => {
          /* secondary — never block or fail the screen */
        }),
    ]);
  }, []);

  /**
   * One page of orders for one tab. The server applies the status filter, so
   * a page of Live is PAGE_SIZE actual live orders and hasMore/totalCount
   * describe that tab alone.
   */
  const fetchOrders = useCallback(
    async (
      page: number = 1,
      append: boolean = false,
      scope: Scope = activeTabRef.current,
    ) => {
      if (inFlightScopes.current[scope]) return;
      inFlightScopes.current[scope] = true;

      setError(null);
      if (append) {
        setLoadingMore(true);
      } else if (!activitiesCache) {
        // Nothing cached to show, so the skeleton is the honest thing to
        // render. With a cache we refresh silently behind the visible list.
        setLoading(true);
      }

      try {
        const result = await orderApi.getCustomerOrders(page, PAGE_SIZE, scope);
        setOrdersByScope((prev) => ({
          ...prev,
          [scope]: append ? [...prev[scope], ...result.orders] : result.orders,
        }));
        setTotalByScope((prev) => ({ ...prev, [scope]: result.totalCount }));
        setHasMoreByScope((prev) => ({ ...prev, [scope]: result.hasMore }));
        setPageByScope((prev) => ({ ...prev, [scope]: page }));
      } catch (err: any) {
        console.error("Failed to fetch orders:", err);
        setError(err?.message || "Failed to load orders");
      } finally {
        inFlightScopes.current[scope] = false;
        setLoadedScopes((prev) => ({ ...prev, [scope]: true }));
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  const checkAuthentication = useCallback(async () => {
    try {
      const storedUserId = await SecureStorage.getItem("userId");
      const loggedInStatus = await SecureStorage.getItem("isLoggedIn");

      if (storedUserId && loggedInStatus === "true") {
        // A different account signing in during the same JS session must never
        // see the previous user's activities while the refresh is in flight.
        if (activitiesCache && activitiesCache.userId !== storedUserId) {
          activitiesCache = null;
          setOrdersByScope({ live: [], past: [] });
          setTotalByScope({ live: null, past: null });
          setLoadedScopes({ live: false, past: false });
          inFlightScopes.current = { live: false, past: false };
          setDeliveries([]);
          setBookings([]);
          setLiveOrderTotal(null);
          setLoading(true);
        }
        setUserId(storedUserId);
        setIsLoggedIn(true);

        // Re-focusing a tab loaded seconds ago shouldn't re-hit the network.
        // The badge is cheap, so it always refreshes.
        const fresh =
          activitiesCache !== null &&
          activitiesCache.userId === storedUserId &&
          Date.now() - activitiesCache.fetchedAt < FRESH_MS;

        if (!fresh) {
          fetchOrders(1, false, activeTabRef.current);
          fetchSecondary();
        }
        refreshLiveCount();
      } else {
        activitiesCache = null;
        setIsLoggedIn(false);
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to check authentication:", error);
      activitiesCache = null;
      setIsLoggedIn(false);
      setLoading(false);
    }
  }, [fetchOrders, fetchSecondary, refreshLiveCount]);

  const handleNavigateToOrder = useCallback(
    (orderId: string) => {
      console.log("[Orders] Navigating to order:", orderId);
      if (orderId && orderId.trim()) {
        router.push(`/order-details?orderId=${orderId}`);
      } else {
        fetchOrders();
      }
    },
    [router, fetchOrders],
  );

  /**
   * Refresh driven from outside (push notification, payment callback). A status
   * change can move an order between tabs, so the tab that isn't visible is
   * marked unloaded and refetches when opened rather than showing a stale row.
   */
  const handleExternalRefresh = useCallback(() => {
    const scope = activeTabRef.current;
    const other: Scope = scope === "live" ? "past" : "live";
    setLoadedScopes((prev) => ({ ...prev, [other]: false }));
    fetchOrders(1, false, scope);
    fetchSecondary();
  }, [fetchOrders, fetchSecondary]);

  useEffect(() => {
    setOrdersRefreshCallback(handleExternalRefresh);
    setNavigateToOrderCallback(handleNavigateToOrder);
    return () => {
      setOrdersRefreshCallback(() => {});
      setNavigateToOrderCallback(() => {});
    };
  }, [handleExternalRefresh, handleNavigateToOrder]);

  // Single entry point for loading. useFocusEffect already fires on mount when
  // the tab is focused, so calling checkAuthentication from a mount effect too
  // was running the whole fetch chain twice on first open.
  useFocusEffect(
    useCallback(() => {
      checkAuthentication();
    }, [checkAuthentication]),
  );

  // Keep the cache in step with what is actually on screen, so the next visit
  // to this tab can render immediately.
  useEffect(() => {
    if (loading || !userId) return;
    activitiesCache = {
      userId,
      ordersByScope,
      totalByScope,
      loadedScopes,
      deliveries,
      bookings,
      fetchedAt: Date.now(),
    };
  }, [
    loading,
    userId,
    ordersByScope,
    totalByScope,
    loadedScopes,
    deliveries,
    bookings,
  ]);

  // Switching to a tab that has never been fetched loads its first page. The
  // two tabs are separate server queries now, so Past isn't populated as a
  // side effect of paging Live.
  useEffect(() => {
    if (!isLoggedIn || loadedScopes[activeTab]) return;
    fetchOrders(1, false, activeTab);
  }, [activeTab, isLoggedIn, loadedScopes, fetchOrders]);

  const onRefresh = () => {
    if (!userId) return;
    setRefreshing(true);
    // Only the visible tab is re-paged; the other is marked unloaded so it
    // refetches when opened rather than showing rows from before the refresh.
    const scope = activeTabRef.current;
    const other: Scope = scope === "live" ? "past" : "live";
    setLoadedScopes((prev) => ({ ...prev, [other]: false }));
    setHasMoreByScope((prev) => ({ ...prev, [scope]: true }));
    Promise.allSettled([
      fetchOrders(1, false, scope),
      fetchSecondary(),
      refreshLiveCount(),
    ]).finally(() => setRefreshing(false));
  };

  const loadMoreOrders = () => {
    const scope = activeTabRef.current;
    if (loadingMore || loading || !hasMoreByScope[scope]) return;
    fetchOrders(pageByScope[scope] + 1, true, scope);
  };

  const handleCancelOrder = async (orderId: string) => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await orderApi.cancelOrder(orderId, "Cancelled by customer");
            fetchOrders();
            Alert.alert("Success", "Order has been cancelled");
          } catch {
            Alert.alert("Error", "Failed to cancel order");
          }
        },
      },
    ]);
  };

  // Pay from orders list (confirmation + native handling similar to order-details)
  // NOTE: previously this passed teranggo:// URLs directly to Wave, bypassing
  // the backend.  Wave will *never* hit those, so orders stayed in PENDING
  // and Slack notifications never fired.  We now build HTTPS redirect URLs
  // pointing at our server and let the backend deep-link to the app.
  const handlePayFromList = async (orderId: string, amount: number) => {
    Alert.alert(
      "Confirm Payment",
      `Proceed with payment of ${formatAmount(amount)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay Now",
          onPress: async () => {
            try {
              setLoading(true);

              // Get preferred payment method
              let network = "wave";
              try {
                const stored = await SecureStorage.getItem("paymentMethods");
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (parsed?.default) network = parsed.default;
                }
              } catch {
                console.warn("Using default payment method: wave");
              }

              console.log("💳 Initiating payment for order:", orderId);

              // derive backend base url from API_URL constant
              const BACKEND_BASE = API_URL
                ? String(API_URL).replace(/\/api\/?(.*)?$/, "")
                : "https://monkfish-app-korrv.ondigitalocean.app";

              const backendSuccessUrl = `${BACKEND_BASE}/api/redirect/payment-success?orderId=${orderId}`;
              const backendCancelUrl = `${BACKEND_BASE}/api/redirect/payment-cancel?orderId=${orderId}`;

              const result: any = await orderApi.payForOrder(
                orderId,
                network,
                backendSuccessUrl,
                backendCancelUrl,
              );

              // Get Wave launch URL
              const launchUrl =
                result?.wave_launch_url || result?.session?.wave_launch_url;

              if (!launchUrl) {
                throw new Error("No Wave launch URL received");
              }

              console.log("💳 Opening Wave URL:", launchUrl);

              // Open Wave directly. The canOpenURL pre-check that used to
              // gate this returned false on some phones (Samsung One UI in
              // particular) even with Wave installed and the manifest
              // queries declared — a known false negative for verified App
              // Links. openURL uses startActivity, which opens whenever any
              // handler exists and throws only when none does, so the catch
              // keeps a useful message for the genuinely-broken case.
              try {
                await Linking.openURL(launchUrl);
              } catch {
                throw new Error(
                  "Couldn't open Wave. Make sure the Wave app is installed and up to date.",
                );
              }

              console.log(
                "[Orders] Wave opened — awaiting deep-link callback via backend redirect",
              );
            } catch (error: any) {
              console.error("❌ Payment error:", error);

              let errorMessage =
                "Failed to open Wave payment. Please ensure Wave app is installed or try again.";

              if (error.message?.includes("Network")) {
                errorMessage =
                  "Network error. Please check your connection and try again.";
              } else if (error.message) {
                errorMessage = error.message;
              }

              Alert.alert("Payment Failed", errorMessage, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Retry",
                  onPress: () => handlePayFromList(orderId, amount),
                },
              ]);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
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
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4, 5].map((item) => (
        <View
          key={item}
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <SkeletonBox width={120} height={16} />
            <SkeletonBox width={80} height={20} style={{ borderRadius: 10 }} />
          </View>
          <SkeletonBox width="100%" height={12} style={{ marginBottom: 8 }} />
          <SkeletonBox width="60%" height={12} style={{ marginBottom: 12 }} />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <SkeletonBox width={80} height={12} />
            <SkeletonBox width={60} height={12} />
          </View>
        </View>
      ))}
    </View>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
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

  // Rebuilt and re-sorted on every render before; now only when the inputs
  // it actually reads change.
  const filteredActivities = useMemo(() => {
    // No status filter on orders any more: the server returned exactly this
    // tab's orders. Filtering again here would re-hide any status missing from
    // the local LIVE_ORDER_STATUSES list.
    const filteredOrders = orders;

    const filteredDeliveries = deliveries.filter(
      (delivery) =>
        isDeliveryVisibleInActivities(delivery) &&
        (activeTab === "live"
          ? LIVE_DELIVERY_STATUSES.includes(delivery.status)
          : PAST_STATUSES.includes(delivery.status)),
    );

    const filteredBookings = bookings.filter((b) =>
      activeTab === "live"
        ? LIVE_BOOKING_STATUSES.includes(b.status)
        : PAST_BOOKING_STATUSES.includes(b.status),
    );

    const merged: ActivityItem[] = [
      ...filteredOrders.map((order) => ({
        kind: "order" as const,
        id: `order-${order.id}`,
        createdAt: order.createdAt,
        order,
      })),
      ...filteredDeliveries.map((delivery) => ({
        kind: "delivery" as const,
        id: `delivery-${delivery.id}`,
        createdAt: delivery.createdAt,
        delivery,
      })),
      ...filteredBookings.map((booking) => ({
        kind: "booking" as const,
        id: `booking-${booking.id}`,
        createdAt: (booking as any).createdAt || booking.startTime,
        booking,
      })),
    ];

    return merged.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [orders, deliveries, bookings, activeTab]);

  const getTabCount = useCallback((tab: Scope) => {
    // Server total for the tab when we have it, so the counter reflects every
    // order in that tab rather than just the pages scrolled in so far.
    const orderCount = totalByScope[tab] ?? ordersByScope[tab].length;

    const deliveryCount = deliveries.filter(
      (delivery) =>
        isDeliveryVisibleInActivities(delivery) &&
        (tab === "live"
          ? LIVE_DELIVERY_STATUSES.includes(delivery.status)
          : PAST_STATUSES.includes(delivery.status)),
    ).length;

    const bookingCount = bookings.filter((b) =>
      tab === "live"
        ? LIVE_BOOKING_STATUSES.includes(b.status)
        : PAST_BOOKING_STATUSES.includes(b.status),
    ).length;

    return orderCount + deliveryCount + bookingCount;
  }, [totalByScope, ordersByScope, deliveries, bookings]);

  const bookingStatusStyle = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return { bg: "#ECFDF5", fg: "#059669", label: "Confirmed" };
      case "CHECKED_IN":
        return { bg: "#EFF6FF", fg: "#2563EB", label: "Checked in" };
      case "COMPLETED":
        return { bg: "#F1F5F9", fg: "#475569", label: "Completed" };
      case "CANCELLED":
        return { bg: "#FEF2F2", fg: "#DC2626", label: "Cancelled" };
      default:
        return { bg: "#FFF7ED", fg: "#C2410C", label: "Awaiting payment" };
    }
  };

  const renderBookingCard = (booking: Booking) => {
    const s = bookingStatusStyle(booking.status);
    const d = new Date(booking.startTime);
    let h = d.getUTCHours();
    const min = d.getUTCMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const when = `${d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })} · ${h}:${min.toString().padStart(2, "0")} ${ampm}`;

    return (
      <TouchableOpacity
        key={booking.id}
        activeOpacity={0.9}
        onPress={() =>
          router.push({
            pathname: "/booking/[bookingId]" as any,
            params: { bookingId: booking.id },
          })
        }
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: 14,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: "#FFF5EE",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name="star" size={22} color={PrimaryColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}
            numberOfLines={1}
          >
            {booking.experience?.name || "Experience"}
          </Text>
          <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
            {booking.option?.label} · {when}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
              gap: 8,
            }}
          >
            <View
              style={{
                backgroundColor: s.bg,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: s.fg }}>
                {s.label}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: "#64748B" }}>
              {booking.quantity} × D{booking.unitPrice}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: PrimaryColor }}>
            D{booking.totalAmount}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderCard = (order: Order) => {
    const expressOrder = isExpressOrder(order);

    return (
      <TouchableOpacity
        key={order.id}
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
          borderLeftWidth: 4,
          borderLeftColor: statusColors[order.status],
        }}
        activeOpacity={0.6}
        onPress={() =>
          router.push({
            pathname: "/order-details",
            params: { orderId: order.id },
          })
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          {/* Left: title + gift/express tags stacked so they never collide with the status pill */}
          <View style={{ flex: 1, marginRight: 8 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "bold", color: "#333" }}
                numberOfLines={1}
              >
                Order TG{order.id.slice(-4).toUpperCase()}
              </Text>
              {/* 🎁 Gift Order Badge */}
              {order.isGiftOrder && (
                <View
                  style={{
                    backgroundColor: "#FFF5EE",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#FFD4A3",
                  }}
                >
                  <Ionicons name="gift" size={12} color="#ff6b00" />
                </View>
              )}
            </View>

            {/* Express tag — black/orange, own row under the title */}
            {expressOrder && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#000",
                  alignSelf: "flex-start",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  marginTop: 6,
                }}
              >
                <Ionicons name="flash" size={10} color="#FF7A00" />
                <Text
                  style={{
                    color: "#FF7A00",
                    fontSize: 10,
                    fontWeight: "800",
                    letterSpacing: 0.5,
                  }}
                >
                  EXPRESS
                </Text>
              </View>
            )}
          </View>

          {/* Right: status pill, own space, never touches the express tag */}
          <View
            style={{
              backgroundColor: statusColors[order.status],
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Ionicons
              name={statusIcons[order.status] as any}
              size={12}
              color="#fff"
            />
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              {order.status}
            </Text>
          </View>
        </View>

        {/* Restaurant */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Ionicons
            name={
              order.restaurant
                ? "restaurant-outline"
                : order["shop"]
                  ? "cart-outline"
                  : order["pharmacy"]
                    ? "medkit-outline"
                    : "storefront-outline"
            }
            size={16}
            color="#666"
          />
          <Text
            style={{
              marginLeft: 8,
              color: "#666",
              flex: 1,
              fontWeight: "500",
            }}
            numberOfLines={1}
          >
            {order.restaurant?.name ||
              order["shop"]?.name ||
              order["pharmacy"]?.name ||
              "Vendor"}
          </Text>
        </View>

        {/* Address / Pickup info */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text
            style={{ marginLeft: 8, color: "#666", flex: 1 }}
            numberOfLines={2}
          >
            {order.orderType === "PICKUP"
              ? order.pickupInstructions ||
                order.address ||
                order.deliveryAddress ||
                "Pickup"
              : order.deliveryAddress ||
                order.address ||
                "Delivery address not set"}
          </Text>
        </View>

        {/* Items Preview */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Ionicons name="fast-food-outline" size={16} color="#666" />
          <Text
            style={{ marginLeft: 8, color: "#666", flex: 1 }}
            numberOfLines={1}
          >
            {order.items.length} item{order.items.length > 1 ? "s" : ""} •{" "}
            {order.items
              .slice(0, 2)
              .map(
                (item) =>
                  item.menuItem?.name ||
                  item.product?.name ||
                  item.medicine?.name ||
                  "Item",
              )
              .join(", ")}
            {order.items.length > 2 ? ` +${order.items.length - 2} more` : null}
          </Text>
        </View>

        {/* Amount */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons name="wallet-outline" size={16} color="#666" />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 18,
              fontWeight: "bold",
              color: PrimaryColor,
            }}
          >
            {formatAmount(order.totalAmount)}
          </Text>
        </View>

        {/* Footer */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
          }}
        >
          {/* Date + chevron: signals the whole card is tappable */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 12, color: "#999" }}>
              {formatDate(order.createdAt)}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#C4C4C4" />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {/* Cancel — only while unpaid; after payment the vendor starts
                preparing, so cancellations/refunds go through support. */}
            {["PENDING", "ACCEPTED", "PREPARING"].includes(order.status) &&
              order.paymentStatus !== "PAID" && (
              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: "#FEF2F2",
                  borderWidth: 1,
                  borderColor: "#FEE2E2",
                }}
                onPress={() => handleCancelOrder(order.id)}
              >
                <Text
                  style={{ fontSize: 12, color: "#EF4444", fontWeight: "600" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            )}
            {/* Pay button for accepted + unpaid orders */}
            {order.status === "ACCEPTED" && order.paymentStatus !== "PAID" ? (
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: PrimaryColor,
                  borderWidth: 1,
                  borderColor: PrimaryColor,
                }}
                onPress={() => handlePayFromList(order.id, order.totalAmount)}
              >
                <Text
                  style={{ fontSize: 12, color: "#fff", fontWeight: "700" }}
                >
                  Pay
                </Text>
                <Ionicons name="card-outline" size={12} color="#fff" />
              </TouchableOpacity>
            ) : !["DELIVERED", "CANCELLED"].includes(order.status) ? (
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: "#F0F9FF",
                  borderWidth: 1,
                  borderColor: "#E0F2FE",
                }}
                onPress={() =>
                  router.push({
                    pathname: "/order-tracking",
                    params: { orderId: order?.id },
                  })
                }
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: PrimaryColor,
                    fontWeight: "600",
                  }}
                >
                  Track
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={PrimaryColor}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDeliveryCard = (delivery: DeliveryActivity) => {
    const expressDelivery = isExpressDelivery(delivery);
    const statusColor =
      statusColors[delivery.status as keyof typeof statusColors] || "#64748B";
    const statusIcon =
      statusIcons[delivery.status as keyof typeof statusIcons] ||
      "time-outline";
    const canTrack = !PAST_STATUSES.includes(delivery.status);
    const canPay =
      expressDelivery &&
      !PAST_STATUSES.includes(delivery.status) &&
      delivery.paymentStatus !== "PAID" &&
      delivery.adminApprovedForPayment === true;

    return (
      <TouchableOpacity
        key={delivery.id}
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
          borderLeftWidth: 4,
          borderLeftColor: statusColor,
        }}
        activeOpacity={0.6}
        onPress={() =>
          router.push({
            pathname: "/custom-delivery/[deliveryId]",
            params: { deliveryId: delivery.id },
          })
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          {/* Left: title + express tag stacked so they never collide with the status pill */}
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: "#333" }}
              numberOfLines={1}
            >
              {expressDelivery
                ? `TeranGO Express ${formatExpressDeliveryId(delivery.id)}`
                : `Delivery TG${delivery.id.slice(-4).toUpperCase()}`}
            </Text>

            {expressDelivery && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#000",
                  alignSelf: "flex-start",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  marginTop: 6,
                }}
              >
                <Ionicons name="flash" size={10} color="#FF7A00" />
                <Text
                  style={{
                    color: "#FF7A00",
                    fontSize: 10,
                    fontWeight: "800",
                    letterSpacing: 0.5,
                  }}
                >
                  EXPRESS
                </Text>
              </View>
            )}
          </View>

          {/* Right: status pill, own space, never touches the express tag */}
          <View
            style={{
              backgroundColor: statusColor,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Ionicons name={statusIcon as any} size={12} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              {delivery.status}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Ionicons name="arrow-up-circle-outline" size={16} color="#666" />
          <Text
            style={{ marginLeft: 8, color: "#666", flex: 1 }}
            numberOfLines={1}
          >
            {delivery.pickupAddress}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Ionicons name="arrow-down-circle-outline" size={16} color="#666" />
          <Text
            style={{ marginLeft: 8, color: "#666", flex: 1 }}
            numberOfLines={1}
          >
            {delivery.dropoffAddress}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons name="wallet-outline" size={16} color="#666" />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 18,
              fontWeight: "bold",
              color: PrimaryColor,
            }}
          >
            {formatAmount(delivery.estimatedFee ?? 0)}
          </Text>
          {expressDelivery && (
            <Text style={{ marginLeft: 8, color: "#666", fontSize: 12 }}>
              {delivery.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
            </Text>
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
          }}
        >
          {/* Date + chevron: signals the whole card is tappable */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 12, color: "#999" }}>
              {formatDate(delivery.createdAt)}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#C4C4C4" />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {canPay ? (
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: PrimaryColor,
                }}
                onPress={() =>
                  router.push({
                    pathname: "/express-payment",
                    params: {
                      deliveryId: delivery.id,
                      amount: String(delivery.estimatedFee || 0),
                      pickupAddress: delivery.pickupAddress,
                      dropoffAddress: delivery.dropoffAddress,
                    },
                  })
                }
              >
                <Text
                  style={{ fontSize: 12, color: "#fff", fontWeight: "700" }}
                >
                  Pay
                </Text>
                <Ionicons name="card-outline" size={12} color="#fff" />
              </TouchableOpacity>
            ) : canTrack ? (
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: "#F0F9FF",
                  borderWidth: 1,
                  borderColor: "#E0F2FE",
                }}
                onPress={() =>
                  router.push({
                    pathname: "/custom-delivery/[deliveryId]",
                    params: { deliveryId: delivery.id },
                  })
                }
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: PrimaryColor,
                    fontWeight: "600",
                  }}
                >
                  Track
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={PrimaryColor}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // If user is not logged in, show login prompt
  if (isLoggedIn === false) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Login Prompt Card */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 30,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 8,
            }}
          >
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: "#FFF0E6",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Ionicons name="receipt-outline" size={50} color={PrimaryColor} />
            </View>

            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#333",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Your Activities
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: "#666",
                textAlign: "center",
                lineHeight: 24,
                marginBottom: 30,
              }}
            >
              Sign in to track deliveries, view your order history, and manage
              purchases.
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: PrimaryColor,
                paddingVertical: 16,
                paddingHorizontal: 32,
                borderRadius: 12,
                width: "100%",
                alignItems: "center",
                marginBottom: 16,
              }}
              onPress={() => router.push("/auth")}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
              }}
              onPress={() => router.push("/auth")}
            >
              <Text
                style={{
                  color: PrimaryColor,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                Don&apos;t have an account? Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Features Preview */}
          <View
            style={{
              marginTop: 40,
              padding: 20,
              backgroundColor: "#fff",
              borderRadius: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#333",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              What you can track:
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons name="time-outline" size={20} color={PrimaryColor} />
              <Text style={{ marginLeft: 12, fontSize: 14, color: "#666" }}>
                Track orders in real-time
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons name="receipt-outline" size={20} color={PrimaryColor} />
              <Text style={{ marginLeft: 12, fontSize: 14, color: "#666" }}>
                View order history and receipts
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="repeat-outline" size={20} color={PrimaryColor} />
              <Text style={{ marginLeft: 12, fontSize: 14, color: "#666" }}>
                Reorder your favorites easily
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
        {/* Header */}
        <View style={{ padding: 16, backgroundColor: "#fff" }}>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#333" }}>
            Activities
          </Text>
        </View>
        {renderSkeletonLoader()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
          backgroundColor: "#fff",
        }}
      >
        {/* Title row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1a1a1a" }}>
            Activities
          </Text>
          {liveCount !== null && liveCount > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: "#FFF5EE",
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderWidth: 1,
                borderColor: "rgba(255,107,0,0.2)",
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: PrimaryColor,
                }}
              />
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: PrimaryColor }}
              >
                {liveCount} live
              </Text>
            </View>
          )}
        </View>

        {/* Tab Selector */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#F1F5F9",
            borderRadius: 25,
            padding: 4,
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 20,
              backgroundColor:
                activeTab === "live" ? PrimaryColor : "transparent",
              alignItems: "center",
            }}
            onPress={() => setActiveTab("live")}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: activeTab === "live" ? "#fff" : "#666",
              }}
            >
              Live ({liveCount !== null ? liveCount : getTabCount("live")})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 20,
              backgroundColor:
                activeTab === "past" ? PrimaryColor : "transparent",
              alignItems: "center",
            }}
            onPress={() => setActiveTab("past")}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: activeTab === "past" ? "#fff" : "#666",
              }}
            >
              History ({getTabCount("past")})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={filteredActivities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          item.kind === "order"
            ? renderOrderCard(item.order)
            : item.kind === "delivery"
              ? renderDeliveryCard(item.delivery)
              : renderBookingCard(item.booking)
        }
        contentContainerStyle={{ padding: 16 }}
        onEndReached={loadMoreOrders}
        onEndReachedThreshold={0.5}
        initialNumToRender={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PrimaryColor]}
            tintColor={PrimaryColor}
          />
        }
        ListFooterComponent={() =>
          loadingMore ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <ActivityIndicator color={PrimaryColor} />
            </View>
          ) : !hasMore ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: "#999" }}>No more activities</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={() =>
          loading ? null : error ? (
            <View
              style={{
                alignItems: "center",
                backgroundColor: "#FFF5EE",
                padding: 20,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: PrimaryColor,
              }}
            >
              <Ionicons name="warning-outline" size={32} color={PrimaryColor} />
              <Text
                style={{
                  fontSize: 14,
                  color: PrimaryColor,
                  marginTop: 8,
                  textAlign: "center",
                  fontWeight: "500",
                }}
              >
                {error}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: PrimaryColor,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  marginTop: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
                onPress={() => fetchOrders()}
              >
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text
                  style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                >
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 56,
                paddingHorizontal: 32,
              }}
            >
              {/* Icon bubble */}
              <View
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  backgroundColor: "#FFF0E6",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: "#FFD9C0",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name={
                      activeTab === "live"
                        ? "bag-handle-outline"
                        : "receipt-outline"
                    }
                    size={40}
                    color={PrimaryColor}
                  />
                </View>
              </View>

              <Text
                style={{
                  marginTop: 20,
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#1a1a1a",
                  textAlign: "center",
                }}
              >
                No activities yet
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  color: "#6B7280",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {activeTab === "live"
                  ? "Browse and place your first order,\nride, or delivery request."
                  : "Your completed activities will\nshow up here for easy reference."}
              </Text>

              {activeTab === "live" && (
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)")}
                  style={{
                    marginTop: 28,
                    backgroundColor: PrimaryColor,
                    paddingHorizontal: 32,
                    paddingVertical: 14,
                    borderRadius: 30,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    shadowColor: PrimaryColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <Ionicons name="storefront-outline" size={18} color="#fff" />
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    Start Ordering
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
