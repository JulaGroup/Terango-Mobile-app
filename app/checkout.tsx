import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Linking,
  AppState,
  DeviceEventEmitter,
} from "react-native";
import { useRouter } from "expo-router";
import { useCart } from "@/context/CartContext";
import { orderApi, userApi } from "@/lib/api";
import { debugAuthState } from "@/utils/debugAuth";
import * as SecureStore from "expo-secure-store";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { UserCacheManager } from "@/utils/userCache";
import { API_URL } from "@/constants/config";
import * as WebBrowser from "expo-web-browser";
import { on as socketOn, off as socketOff } from "@/services/SocketService";
import {
  storeSuccessfulOrder,
  NotificationService,
} from "@/services/NotificationService";

export default function Checkout() {
  const router = useRouter();
  const {
    items,
    clearCart,
    getTotalAmount,
    getTotalQuantity,
    getCartByVendor,
  } = useCart();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerScale = useRef(new Animated.Value(0.95)).current;

  const [loading, setLoading] = useState(false);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "processing" | "completed" | "failed" | "cancelled" | null
  >(null);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [paymentCancelled, setPaymentCancelled] = useState(false);

  // Payment status polling function
  const pollPaymentStatus = useCallback(async (paymentId: string) => {
    try {
      console.log("[Payment Polling] Checking status for payment:", paymentId);

      const response = await fetch(
        `${API_URL}/api/payments/${paymentId}/status`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const statusData = await response.json();
        console.log("[Payment Polling] Status:", statusData);

        setPaymentStatus(statusData.status);

        if (
          statusData.status === "completed" ||
          statusData.status === "failed"
        ) {
          // Payment completed or failed, stop polling
          stopPaymentPolling();
          handlePaymentResult(statusData);
        }
      }
    } catch (error) {
      console.error("[Payment Polling] Error:", error);
    }
  }, []);

  // Start payment polling
  const startPaymentPolling = useCallback(
    (paymentId: string) => {
      console.log("[Payment Polling] Starting polling for payment:", paymentId);
      setPaymentStatus("pending");
      setIsPollingActive(true);

      // Poll every 3 seconds for up to 5 minutes
      const interval = setInterval(() => {
        pollPaymentStatus(paymentId);
      }, 3000);

      setPollingInterval(interval);

      // Auto-stop after 5 minutes
      setTimeout(() => {
        stopPaymentPolling();
      }, 5 * 60 * 1000);
    },
    [pollPaymentStatus]
  );

  // Stop payment polling
  const stopPaymentPolling = useCallback(() => {
    if (pollingInterval) {
      console.log("[Payment Polling] Stopping polling");
      clearInterval(pollingInterval);
      setPollingInterval(null);
      setPaymentStatus(null);
      setIsPollingActive(false);
    }
  }, [pollingInterval]);

  // Handle payment result
  const handlePaymentResult = useCallback(
    async (statusData: any) => {
      console.log("[Payment] handlePaymentResult called with:", statusData);

      if (statusData.status === "completed") {
        console.log(
          "[Payment] ✅ Payment completed detected (polling) - orderId:",
          statusData.orderId
        );
        // Store successful order data for modal on app reopen
        if (statusData.orderId) {
          await storeSuccessfulOrder({
            orderId: statusData.orderId,
            timestamp: Date.now(),
            data: statusData,
          });

          // Send instant push notification
          await NotificationService.scheduleOrderNotification({
            orderId: statusData.orderId,
            title: "Payment Successful! 🎉",
            body: "Your order has been placed successfully. Tap to view details.",
            data: { orderId: statusData.orderId, type: "payment_success" },
          });
        }

        console.log(
          "[Payment] Payment successful, preparing to navigate to order details"
        );

        // Clear cart since payment was successful
        console.log("[Cart] About to clear cart. Current items:", items.length);
        clearCart();

        // Use setTimeout to check if cart was actually cleared
        setTimeout(() => {
          console.log(
            "[Cart] Cart checked after clearCart (polling) - items.length:",
            items.length
          );
        }, 100);

        console.log("[Cart] Cart cleared after successful payment (polling)");

        // Show success message to user first
        Alert.alert(
          "Payment Successful! 🎉",
          "Your payment has been processed successfully. The browser will close automatically.",
          [
            {
              text: "View Order",
              onPress: () => {
                WebBrowser.dismissBrowser();
                router.replace({
                  pathname: "/order-details",
                  params: { orderId: statusData.orderId },
                });
              },
            },
          ]
        );

        // Wait for alert to be seen, then dismiss browser
        setTimeout(async () => {
          try {
            await WebBrowser.dismissBrowser();
            console.log(
              "[Browser] ✅ Browser dismissed successfully for payment completion (polling)"
            );

            // Navigate to specific order after browser is dismissed
            setTimeout(() => {
              router.replace({
                pathname: "/order-details",
                params: { orderId: statusData.orderId },
              });
            }, 500);
          } catch (error) {
            console.log(
              "[Browser] ❌ Failed to dismiss browser (polling):",
              error
            );
            // Even if browser dismiss fails, still navigate to order
            setTimeout(() => {
              router.replace({
                pathname: "/order-details",
                params: { orderId: statusData.orderId },
              });
            }, 500);
          }
        }, 1500); // 1.5 second delay to allow user to see success message

        // Set success state for UI updates
        setPaymentStatus("completed");
      } else if (statusData.status === "failed") {
        setPaymentStatus("failed");
        Alert.alert(
          "Payment Failed",
          "Your payment could not be processed. Please try again.",
          [
            { text: "Try Again", onPress: () => router.replace("/checkout") },
            { text: "Cancel", style: "cancel" },
          ]
        );
      }
    },
    [router, clearCart, items]
  );

  // Socket listeners: react to backend events in real-time
  useEffect(() => {
    console.log("[Socket] Setting up payment socket listeners");

    const onPaymentSuccess = async (data: any) => {
      console.log("[Socket] ✅ paymentSuccess received in checkout", data);
      console.log(
        "[Payment] ✅ Payment completed detected (socket) - orderId:",
        data?.orderId
      );
      setPaymentStatus("completed");
      stopPaymentPolling();

      // Store successful order data for modal on app reopen
      if (data && data.orderId) {
        await storeSuccessfulOrder({
          orderId: data.orderId,
          timestamp: Date.now(),
          data: data,
        });

        // Send instant push notification
        await NotificationService.scheduleOrderNotification({
          orderId: data.orderId,
          title: "Payment Successful! 🎉",
          body: "Your order has been placed successfully. Tap to view details.",
          data: { orderId: data.orderId, type: "payment_success" },
        });
      }

      console.log(
        "[Payment] Payment successful via socket, preparing to navigate"
      );

      // Clear cart since payment was successful
      console.log("[Cart] About to clear cart. Current items:", items.length);
      clearCart();

      // Use setTimeout to check if cart was actually cleared
      setTimeout(() => {
        console.log(
          "[Cart] Cart checked after clearCart (socket) - items.length:",
          items.length
        );
      }, 100);

      console.log("[Cart] Cart cleared after successful payment (socket)");

      // Show success message to user first
      Alert.alert(
        "Payment Successful! 🎉",
        "Your payment has been processed successfully. The browser will close automatically.",
        [
          {
            text: "View Order",
            onPress: () => {
              WebBrowser.dismissBrowser();
              router.replace({
                pathname: "/order-details",
                params: { orderId: data.orderId },
              });
            },
          },
        ]
      );

      // Wait for alert to be seen, then dismiss browser
      setTimeout(async () => {
        try {
          await WebBrowser.dismissBrowser();
          console.log(
            "[Browser] ✅ Browser dismissed successfully for socket payment"
          );

          // Navigate to specific order after browser is dismissed
          setTimeout(() => {
            router.replace({
              pathname: "/order-details",
              params: { orderId: data.orderId },
            });
          }, 500);
        } catch (error) {
          console.log(
            "[Browser] ❌ Failed to dismiss browser (socket):",
            error
          );
          // Even if browser dismiss fails, still navigate to order
          setTimeout(() => {
            router.replace({
              pathname: "/order-details",
              params: { orderId: data.orderId },
            });
          }, 500);
        }
      }, 1500); // 1.5 second delay to allow user to see success message
    };

    const onPaymentFailed = async (data: any) => {
      console.log("[Socket] paymentFailed received in checkout", data);
      setPaymentStatus("failed");
      stopPaymentPolling();

      console.log("[Payment] Payment failed, preparing to handle failure");

      // Dismiss browser immediately without delay
      try {
        await WebBrowser.dismissBrowser();
        console.log(
          "[Browser] Browser dismissed successfully for payment failure"
        );
      } catch (error) {
        console.log("[Browser] Failed to dismiss browser:", error);
      }

      Alert.alert("Payment Failed", "Your payment failed. Please try again.");
    };

    const onOrderStatusUpdate = (data: any) => {
      console.log("[Socket] orderStatusUpdate in checkout", data);
      if (data?.orderId) {
        // optionally refresh order details or navigate
      }
    };

    socketOn("paymentSuccess", onPaymentSuccess);
    socketOn("paymentFailed", onPaymentFailed);
    socketOn("orderStatusUpdate", onOrderStatusUpdate);

    return () => {
      socketOff("paymentSuccess", onPaymentSuccess);
      socketOff("paymentFailed", onPaymentFailed);
      socketOff("orderStatusUpdate", onOrderStatusUpdate);
    };
  }, [router, stopPaymentPolling, clearCart, items]);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    orderType: "DELIVERY", // Default to delivery
    pickupInstructions: "",
  });

  const [userProfile, setUserProfile] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    isVerified?: boolean;
  } | null>(null);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cash");
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<
    string | null
  >(null);
  const [paymentMethods, setPaymentMethods] = useState<any>(null);
  const [paymentMethodsLoaded, setPaymentMethodsLoaded] = useState(false);

  const restaurantCarts = getCartByVendor();
  const restaurantIds = Object.keys(restaurantCarts);
  const subtotal = getTotalAmount();
  const deliveryFee = form.orderType === "DELIVERY" ? 300 : 0;
  const serviceFee = 25;
  const total = subtotal + deliveryFee + serviceFee;

  // AppState listener: detect when app comes back from background (e.g., from external browser)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      console.log("[AppState] App state changed to:", nextAppState);

      // If app becomes active and we're waiting for payment, check for recent successful orders
      // But only if payment wasn't explicitly cancelled
      if (
        nextAppState === "active" &&
        isPollingActive &&
        paymentStatus !== "completed" &&
        !paymentCancelled
      ) {
        console.log(
          "[AppState] App became active during payment - checking for recent orders"
        );

        // Add a small delay to ensure any webhook processing is complete
        setTimeout(async () => {
          try {
            const orders = await orderApi.getCustomerOrders();
            const recentOrder = orders.find((order) => {
              const orderTime = new Date(order.createdAt).getTime();
              const twoMinutesAgo = Date.now() - 2 * 60 * 1000; // Reduced to 2 minutes for more precision
              return (
                orderTime > twoMinutesAgo &&
                order.totalAmount === total &&
                order.status !== "CANCELLED"
              );
            });

            if (recentOrder) {
              console.log(
                "[AppState] ✅ Found recent matching order:",
                recentOrder.id
              );
              setPaymentStatus("completed");
              stopPaymentPolling();

              // Clear cart since payment was successful
              console.log(
                "[Cart] About to clear cart. Current items:",
                items.length
              );
              clearCart();

              // Use setTimeout to check if cart was actually cleared
              setTimeout(() => {
                console.log(
                  "[Cart] Cart checked after clearCart (AppState) - items.length:",
                  items.length
                );
              }, 100);

              console.log(
                "[Cart] Cart cleared after successful payment (AppState)"
              );

              // Store successful order data
              await storeSuccessfulOrder({
                orderId: recentOrder.id,
                timestamp: Date.now(),
                data: { orderId: recentOrder.id, status: "completed" },
              });

              // Show success message and navigate
              Alert.alert(
                "Payment Successful! 🎉",
                "Your payment has been processed and your order has been placed successfully.",
                [
                  {
                    text: "View Order",
                    onPress: () =>
                      router.push({
                        pathname: "/order-details",
                        params: { orderId: recentOrder.id },
                      }),
                  },
                ]
              );

              // Clear cart and navigate to specific order
              setTimeout(() => {
                router.replace({
                  pathname: "/order-details",
                  params: { orderId: recentOrder.id },
                });
              }, 1000);
            } else {
              console.log("[AppState] No recent matching order found");
            }
          } catch (error) {
            console.log("[AppState] Error checking for recent orders:", error);
          }
        }, 1000); // 1 second delay to allow webhook processing
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription?.remove();
    };
  }, [
    isPollingActive,
    paymentStatus,
    total,
    router,
    clearCart,
    stopPaymentPolling,
    paymentCancelled,
    items,
  ]);

  const loadUserInfo = useCallback(async () => {
    try {
      let savedAddress = null;
      let savedOrderType = null;
      let savedPickupInstructions = null;
      try {
        savedAddress = await SecureStore.getItemAsync("userAddress");
        savedOrderType = await SecureStore.getItemAsync("userOrderType");
        savedPickupInstructions = await SecureStore.getItemAsync(
          "userPickupInstructions"
        );
      } catch (e) {
        console.log(
          "SecureStore get user preferences failed, falling back:",
          e
        );
        // fallback to AsyncStorage for compatibility if needed
        // @ts-ignore
        savedAddress = await (
          await import("@react-native-async-storage/async-storage")
        ).default.getItem("userAddress");
      }

      // Use smart loading: cache first, then fresh data
      const { cached, fresh } = await UserCacheManager.smartLoadUserData();

      // Apply cached data immediately if available
      if (cached) {
        setUserProfile({
          fullName: cached.fullName,
          email: cached.email,
          phone: cached.phone,
          isVerified: cached.isVerified,
        });

        setForm((prev) => ({
          ...prev,
          name: cached.fullName || "",
          phone: cached.phone || "",
          email: cached.email || "",
          address: savedAddress || "",
          orderType: savedOrderType || "DELIVERY",
          pickupInstructions: savedPickupInstructions || "",
        }));

        // Load payment methods when cached data is available
        try {
          const paymentMethodsData = await SecureStore.getItemAsync(
            "paymentMethods"
          );
          if (paymentMethodsData) {
            const data = JSON.parse(paymentMethodsData);
            console.log("Loaded payment methods (cached):", data);
            setDefaultPaymentMethod(data.default || null);
            setPaymentMethods(data);
            if (data.default) {
              console.log("Setting selected payment method to mobile (cached)");
              setSelectedPaymentMethod("mobile");
            } else {
              setSelectedPaymentMethod("cash");
            }
          } else {
            console.log("No payment methods data found (cached)");
            setSelectedPaymentMethod("cash");
          }
          setPaymentMethodsLoaded(true);
        } catch {
          console.log("Failed to load payment methods (cached)");
          setSelectedPaymentMethod("cash");
          setPaymentMethodsLoaded(true);
        }
      }

      // Wait for fresh data and update if different
      const freshData = await fresh;
      if (freshData) {
        setUserProfile({
          fullName: freshData.fullName,
          email: freshData.email,
          phone: freshData.phone,
          isVerified: freshData.isVerified,
        });

        setForm((prev) => ({
          ...prev,
          name: freshData.fullName || "",
          phone: freshData.phone || "",
          email: freshData.email || "",
          address: savedAddress || "",
          orderType: prev.orderType || savedOrderType || "DELIVERY",
          pickupInstructions:
            prev.pickupInstructions || savedPickupInstructions || "",
        }));
      }

      // Always load payment methods regardless of cache/fresh data availability
      try {
        const paymentMethodsData = await SecureStore.getItemAsync(
          "paymentMethods"
        );
        if (paymentMethodsData) {
          const data = JSON.parse(paymentMethodsData);
          console.log("Loaded payment methods:", data);
          setDefaultPaymentMethod(data.default || null);
          setPaymentMethods(data);
          if (data.default) {
            console.log("Setting selected payment method to mobile");
            setSelectedPaymentMethod("mobile");
          } else {
            setSelectedPaymentMethod("cash");
          }
        } else {
          console.log("No payment methods data found");
          setSelectedPaymentMethod("cash");
        }
        setPaymentMethodsLoaded(true);
      } catch {
        console.log("Failed to load payment methods");
        setSelectedPaymentMethod("cash");
        setPaymentMethodsLoaded(true);
      }

      // Only fall back to legacy AsyncStorage if both cache and API fail
      if (!cached && !freshData) {
        // Fallback to legacy AsyncStorage if both cache and API fail
        console.log("Falling back to legacy AsyncStorage");
        // Try SecureStore for legacy keys first
        const keys = ["userPhone", "userName", "userEmail", "userAddress"];
        const values: (string | null)[] = [];
        for (const k of keys) {
          try {
            const v = await SecureStore.getItemAsync(k);
            values.push(v);
          } catch {
            // fallback: dynamic import of AsyncStorage
            try {
              // @ts-ignore
              const AS = (
                await import("@react-native-async-storage/async-storage")
              ).default;
              const v = await AS.getItem(k);
              values.push(v);
            } catch {
              values.push(null);
            }
          }
        }
        const [userPhone, userName, userEmail, userAddress] = values;

        setForm((prev) => ({
          ...prev,
          phone: userPhone || "",
          name: userName || "",
          email: userEmail || "",
          address: userAddress || "",
          orderType: savedOrderType || "DELIVERY",
          pickupInstructions: savedPickupInstructions || "",
        }));
      }
    } catch (error) {
      console.error("Error in loadUserInfo:", error);
    }
  }, []);

  const checkAuthAndLoadUserInfo = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      const isLoggedIn = await SecureStore.getItemAsync("isLoggedIn");

      if (!token || !isLoggedIn) {
        Alert.alert("Login Required", "Please log in to place an order.", [
          { text: "Cancel", onPress: () => router.back() },
          {
            text: "Log In",
            onPress: () => router.push("/auth"),
          },
        ]);
        return;
      }

      await loadUserInfo();
    } catch (error) {
      console.error("Error checking authentication:", error);
      Alert.alert("Error", "Please try again or log in to continue.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  }, [router, loadUserInfo]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(headerScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    checkAuthAndLoadUserInfo();
  }, [fadeAnim, slideAnim, headerScale, checkAuthAndLoadUserInfo]);

  // Debug effect to monitor payment method state changes
  useEffect(() => {
    console.log("Payment method state changed:", {
      defaultPaymentMethod,
      selectedPaymentMethod,
      paymentMethodsLoaded,
      paymentMethods,
    });
  }, [
    defaultPaymentMethod,
    selectedPaymentMethod,
    paymentMethodsLoaded,
    paymentMethods,
  ]);

  // Debug effect to monitor cart items changes
  useEffect(() => {
    console.log("🛒 [Cart Debug] Items changed:", {
      itemsLength: items.length,
      itemsIds: items.map((item) => item.id),
      timestamp: new Date().toISOString(),
    });
  }, [items]);

  // Component mount/unmount tracker
  useEffect(() => {
    console.log("📱 [Checkout] Component mounted with", items.length, "items");
    return () => {
      console.log("📱 [Checkout] Component unmounting");
    };
  }, [items.length]);

  // Listen for payment success events from _layout.tsx
  useEffect(() => {
    const handlePaymentSuccessEvent = (data: any) => {
      console.log(
        "🎉 [Event] Payment success event received in checkout:",
        data
      );

      // Only process verified payment events
      if (data.verified) {
        console.log(
          "[Cart] About to clear cart via verified event. Current items:",
          items.length
        );
        clearCart();
        console.log("[Cart] Cart cleared via verified payment success event");

        // Set payment status to completed
        setPaymentStatus("completed");
        stopPaymentPolling();
      } else {
        console.log("⚠️ [Event] Ignoring unverified payment event");
      }
    };

    // Add event listener
    const subscription = DeviceEventEmitter.addListener(
      "paymentSuccess",
      handlePaymentSuccessEvent
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.remove();
    };
  }, [items.length, clearCart, stopPaymentPolling]);

  // Cleanup payment polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        console.log("[Payment Polling] Cleanup: stopping polling on unmount");
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Deep link listener for payment cancellation
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log("[Checkout] Deep link received:", url);

      if (url.includes("payment-cancel")) {
        console.log("[Checkout] Payment cancellation detected");
        setPaymentCancelled(true);
        setPaymentStatus("cancelled");
        stopPaymentPolling();

        // Send push notification for cancellation
        await NotificationService.scheduleOrderNotification({
          orderId: "cancelled",
          title: "Payment Cancelled",
          body: "Your payment was cancelled. You can try again anytime.",
          data: { type: "payment_cancel", status: "cancelled" },
        });

        // Show cancellation alert
        Alert.alert(
          "Payment Cancelled",
          "Your payment was cancelled. Your cart items are still saved.",
          [
            {
              text: "Try Again",
              onPress: () => {
                // Reset states for retry
                setPaymentCancelled(false);
                setPaymentStatus(null);
              },
            },
            {
              text: "Back to Home",
              onPress: () => router.replace("/"),
            },
          ]
        );

        console.log("[Checkout] Payment cancellation handled - cart preserved");
      }
    };

    // Handle initial URL when app is launched from deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription?.remove();
    };
  }, [stopPaymentPolling, router]);

  const handlePlaceOrder = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert(
        "Missing Information",
        "Please fill in your name and phone number."
      );
      return;
    }

    // For delivery orders, address is required
    if (form.orderType === "DELIVERY" && !form.address.trim()) {
      Alert.alert("Missing Information", "Please provide a delivery address.");
      return;
    }

    if (items.length === 0) {
      Alert.alert("Empty Cart", "Your cart is empty.");
      return;
    }

    setLoading(true);

    try {
      // Debug auth state before placing order
      await debugAuthState();

      // Test if user is authenticated by calling profile endpoint
      try {
        console.log("🧪 Testing auth with profile endpoint...");
        const profile = await userApi.getCurrentUser();
        console.log("✅ Profile fetch successful:", profile);
      } catch (authTestError: any) {
        console.error("❌ Auth test failed:", authTestError.message);
        Alert.alert(
          "Authentication Required",
          "Please log in again to place orders.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Log In", onPress: () => router.push("/auth") },
          ]
        );
        setLoading(false);
        return;
      }

      // Handle mobile payment (always required now)
      if (!paymentMethods || !defaultPaymentMethod) {
        Alert.alert("Payment Error", "No payment method configured.");
        setLoading(false);
        return;
      }

      const accountNumber = paymentMethods.methods[defaultPaymentMethod];
      if (!accountNumber) {
        Alert.alert("Payment Error", "Invalid payment method configuration.");
        setLoading(false);
        return;
      }

      try {
        const token = await SecureStore.getItemAsync("token");

        const paymentBody = {
          orderData: {
            customerName: form.name,
            customerPhone: form.phone,
            address: form.address,
            totalAmount: total,
            currency: "GMD",
            orderType: form.orderType,
            pickupInstructions:
              form.orderType === "PICKUP" ? form.pickupInstructions : null,
            notes: form.notes,
          },
          payment: {
            network: defaultPaymentMethod,
            account_number: accountNumber,
          },
          webhookUrl: `${API_URL}/api/webhooks/modempay/payments`,
          idempotencyKey: `order_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
        };

        console.log("Processing mobile payment:", paymentBody);

        const paymentResponse = await fetch(
          `${API_URL}/api/checkout/direct-charge`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(paymentBody),
          }
        );

        if (paymentResponse.status === 202) {
          const paymentData = await paymentResponse.json();
          console.log("Payment initiated:", paymentData);

          // Extract payment ID for status polling
          const extractedPaymentId = paymentData.paymentId || paymentData.id;
          if (extractedPaymentId) {
            console.log(
              "[Payment Polling] Starting status polling for:",
              extractedPaymentId
            );
            // Reset cancellation flag when starting new payment
            setPaymentCancelled(false);
            startPaymentPolling(extractedPaymentId);
          }

          // Open payment link in external browser with deep link return
          // External browser provides better payment experience and proper deep link handling
          if (paymentData.paymentLink) {
            console.log(
              "Opening payment link in external browser:",
              paymentData.paymentLink
            );
            setBrowserLoading(true);

            try {
              // Use Linking.openURL to force external browser (phone's default browser)
              await Linking.openURL(paymentData.paymentLink);

              setBrowserLoading(false);
              console.log("Payment link opened in external browser");

              // With external browser, we continue payment polling regardless
              // Deep links will handle bringing user back to app after payment
              console.log(
                "External browser opened, continuing payment polling"
              );

              // Show user-friendly message about external browser and deep link
              Alert.alert(
                "Complete Payment",
                "Please complete your payment in the browser. You'll be automatically brought back to the app when finished.",
                [
                  {
                    text: "Check Orders Later",
                    onPress: () => router.push("/(tabs)/orders"),
                  },
                  { text: "OK", style: "cancel" },
                ]
              );
            } catch (browserError) {
              console.error("Failed to open external browser:", browserError);
              setBrowserLoading(false);

              Alert.alert(
                "Payment Error",
                "Unable to open payment link. Please try again."
              );
            }
          } else {
            console.log("No payment link found in response");
            Alert.alert(
              "Payment Error",
              "No payment link received. Please try again."
            );
          }
        } else {
          const errorData = await paymentResponse.json();
          throw new Error(errorData.message || "Payment failed");
        }
      } catch (paymentError: any) {
        console.error("Payment error:", paymentError);
        Alert.alert(
          "Payment Failed",
          paymentError.message || "Unable to process payment. Please try again."
        );
        setLoading(false);
        return;
      }

      // Since we're using mobile payment, save user data and let webhook handle order creation
      // Save address for future use and update user data cache
      try {
        await SecureStore.setItemAsync("userAddress", form.address);
        await SecureStore.setItemAsync("userOrderType", form.orderType);
        if (form.pickupInstructions) {
          await SecureStore.setItemAsync(
            "userPickupInstructions",
            form.pickupInstructions
          );
        }
        if (form.email) {
          await SecureStore.setItemAsync("userEmail", form.email);
        }
      } catch (e) {
        console.log("SecureStore set fallback to AsyncStorage:", e);
        // @ts-ignore
        const AS = (await import("@react-native-async-storage/async-storage"))
          .default;
        await AS.setItem("userAddress", form.address);
        await AS.setItem("userOrderType", form.orderType);
        if (form.pickupInstructions)
          await AS.setItem("userPickupInstructions", form.pickupInstructions);
        if (form.email) await AS.setItem("userEmail", form.email);
      }

      // Update cached user data with current form data
      if (userProfile) {
        await UserCacheManager.cacheUserData({
          fullName: form.name,
          phone: form.phone,
          email: form.email,
          isVerified: userProfile.isVerified,
        });
      }

      // Payment initiated successfully - webhook will handle order creation
      console.log(
        "Payment initiated successfully. Webhook will create order when payment succeeds."
      );
    } catch (error: any) {
      console.error("Error in checkout:", error);

      // Don't show "Order Failed" for network errors during payment setup
      if (error.message?.includes("Network request failed")) {
        Alert.alert(
          "Connection Issue",
          "Please check your internet connection and try again. If payment was already processed, you'll receive a confirmation shortly.",
          [
            {
              text: "Check Orders",
              onPress: () => router.push("/(tabs)/orders"),
            },
            { text: "Try Again", onPress: () => router.replace("/checkout") },
            { text: "OK", style: "cancel" },
          ]
        );
      } else {
        Alert.alert(
          "Checkout Error",
          error.message ||
            "There was an error processing your request. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const PaymentMethodCard = ({
    method,
    icon,
    title,
    subtitle,
    selected,
    onPress,
  }: {
    method: string;
    icon: string;
    title: string;
    subtitle: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.paymentMethod,
        selected ? styles.paymentMethodSelected : null,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.paymentMethodIcon}>
        <Ionicons
          name={icon as any}
          size={24}
          color={selected ? PrimaryColor : "#6B7280"}
        />
      </View>
      <View style={styles.paymentMethodInfo}>
        <Text
          style={[
            styles.paymentMethodTitle,
            selected && styles.paymentMethodTitleSelected,
          ]}
        >
          {title}
        </Text>
        <Text style={styles.paymentMethodSubtitle}>{subtitle}</Text>
      </View>
      <View
        style={[
          styles.radioButton,
          selected ? styles.radioButtonSelected : null,
        ]}
      >
        {selected ? <View style={styles.radioButtonInner} /> : null}
      </View>
    </TouchableOpacity>
  );

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyDescription}>
            Add some items to your cart to proceed with checkout.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/")}
          >
            <LinearGradient
              colors={[PrimaryColor, "#FF8F65"]}
              style={styles.backButtonGradient}
            >
              <Text style={styles.backButtonText}>Continue Shopping</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show success screen when payment is completed
  if (paymentStatus === "completed") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.successContainer}>
          <View style={styles.successContent}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            <Text style={styles.successTitle}>Payment Successful! 🎉</Text>
            <Text style={styles.successMessage}>
              Your payment has been processed successfully.{"\n"}
              Your order is being prepared.
            </Text>
            <View style={styles.successLoader}>
              <Text style={styles.successSubMessage}>
                Redirecting to orders...
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show processing screen when payment browser is loading
  if (browserLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.successContainer}>
          <View style={styles.successContent}>
            <Ionicons name="card" size={80} color={PrimaryColor} />
            <Text style={styles.successTitle}>Processing Payment...</Text>
            <Text style={styles.successMessage}>
              Please complete your payment in the browser.{"\n"}
              Do not close this screen.
            </Text>
            <View style={styles.successLoader}>
              <Text style={styles.successSubMessage}>
                Waiting for payment confirmation...
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            transform: [{ scale: headerScale }],
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.headerSubtitle}>
            {getTotalQuantity()} item{getTotalQuantity() > 1 ? "s" : ""}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </Animated.View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Order Summary */}
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Order Summary</Text>

            {restaurantIds.map((restaurantId, index) => {
              const restaurantItems = restaurantCarts[restaurantId];
              const restaurantName =
                restaurantItems[0]?.vendorName || "Restaurant";
              const restaurantTotal = restaurantItems.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              );

              return (
                <View key={restaurantId} style={styles.restaurantOrder}>
                  <View style={styles.restaurantHeader}>
                    <View style={styles.restaurantIcon}>
                      <Ionicons
                        name="restaurant"
                        size={16}
                        color={PrimaryColor}
                      />
                    </View>
                    <Text style={styles.restaurantName}>{restaurantName}</Text>
                  </View>

                  {restaurantItems.map((item) => (
                    <View key={item.id} style={styles.orderItem}>
                      <Text style={styles.orderItemQuantity}>
                        {item.quantity}x
                      </Text>
                      <Text style={styles.orderItemName}>{item.name}</Text>
                      <Text style={styles.orderItemPrice}>
                        D{(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.restaurantTotal}>
                    <Text style={styles.restaurantTotalText}>
                      Restaurant Total: D{restaurantTotal.toFixed(2)}
                    </Text>
                  </View>

                  {index < restaurantIds.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              );
            })}

            <View style={styles.orderTotals}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>D{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Service Fee</Text>
                <Text style={styles.totalValue}>D{serviceFee.toFixed(2)}</Text>
              </View>
              {form.orderType === "DELIVERY" && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Delivery Fee</Text>
                  <Text style={styles.totalValue}>
                    D{deliveryFee.toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>D{total.toFixed(2)}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Customer Information */}
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Order Type</Text>

            {/* Order Type Selection */}
            <View style={styles.orderTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.orderTypeButton,
                  form.orderType === "DELIVERY" &&
                    styles.orderTypeButtonSelected,
                ]}
                onPress={() => setForm({ ...form, orderType: "DELIVERY" })}
                activeOpacity={0.7}
              >
                <View style={styles.orderTypeIcon}>
                  <Ionicons
                    name="bicycle"
                    size={20}
                    color={
                      form.orderType === "DELIVERY" ? "#fff" : PrimaryColor
                    }
                  />
                </View>
                <View style={styles.orderTypeInfo}>
                  <Text
                    style={[
                      styles.orderTypeTitle,
                      form.orderType === "DELIVERY" &&
                        styles.orderTypeTitleSelected,
                    ]}
                  >
                    Delivery
                  </Text>
                  <Text
                    style={[
                      styles.orderTypeSubtitle,
                      form.orderType === "DELIVERY" &&
                        styles.orderTypeSubtitleSelected,
                    ]}
                  >
                    Get your order delivered to your address
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    form.orderType === "DELIVERY" && styles.radioButtonSelected,
                  ]}
                >
                  {form.orderType === "DELIVERY" && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.orderTypeButton,
                  form.orderType === "PICKUP" && styles.orderTypeButtonSelected,
                ]}
                onPress={() => setForm({ ...form, orderType: "PICKUP" })}
                activeOpacity={0.7}
              >
                <View style={styles.orderTypeIcon}>
                  <Ionicons
                    name="storefront"
                    size={20}
                    color={form.orderType === "PICKUP" ? "#fff" : PrimaryColor}
                  />
                </View>
                <View style={styles.orderTypeInfo}>
                  <Text
                    style={[
                      styles.orderTypeTitle,
                      form.orderType === "PICKUP" &&
                        styles.orderTypeTitleSelected,
                    ]}
                  >
                    Pickup
                  </Text>
                  <Text
                    style={[
                      styles.orderTypeSubtitle,
                      form.orderType === "PICKUP" &&
                        styles.orderTypeSubtitleSelected,
                    ]}
                  >
                    Pick up your order from the restaurant
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    form.orderType === "PICKUP" && styles.radioButtonSelected,
                  ]}
                >
                  {form.orderType === "PICKUP" && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Pickup Instructions - Only show when Pickup is selected */}
            {form.orderType === "PICKUP" && (
              <Animated.View
                style={[
                  styles.inputGroup,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <Text style={styles.inputLabel}>Pickup Instructions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Any special instructions for pickup (e.g., parking spot, entrance to use)..."
                  value={form.pickupInstructions}
                  onChangeText={(text) =>
                    setForm({ ...form, pickupInstructions: text })
                  }
                  multiline
                  numberOfLines={2}
                  editable={!loading}
                />
              </Animated.View>
            )}

            <Text style={styles.sectionTitle}>
              {form.orderType === "DELIVERY"
                ? "Delivery Information"
                : "Contact Information"}
            </Text>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                {userProfile?.isVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#10B981"
                    />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.input, styles.readOnlyInput]}>
                <Text style={styles.readOnlyText}>
                  {form.name || "Name not provided"}
                </Text>
                <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
              </View>
              <Text style={styles.readOnlyNote}>
                This information comes from your profile and cannot be edited
                here.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                {userProfile?.isVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#10B981"
                    />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.input, styles.readOnlyInput]}>
                <Text style={styles.readOnlyText}>
                  {form.phone || "Phone not provided"}
                </Text>
                <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
              </View>
              <Text style={styles.readOnlyNote}>
                This information comes from your profile and cannot be edited
                here.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.input, styles.readOnlyInput]}>
                <Text style={styles.readOnlyText}>
                  {form.email || "Email not provided"}
                </Text>
                <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
              </View>
              <Text style={styles.readOnlyNote}>
                This information comes from your profile and cannot be edited
                here.
              </Text>
            </View>

            {/* Delivery Address - Only show when Delivery is selected */}
            {form.orderType === "DELIVERY" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Delivery Address *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter your complete delivery address"
                  value={form.address}
                  onChangeText={(text) => setForm({ ...form, address: text })}
                  multiline
                  numberOfLines={3}
                  editable={!loading}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Order Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any special instructions for your order..."
                value={form.notes}
                onChangeText={(text) => setForm({ ...form, notes: text })}
                multiline
                numberOfLines={2}
                editable={!loading}
              />
            </View>
          </Animated.View>

          {/* Payment Method */}
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              {isPollingActive && (
                <View style={styles.pollingIndicator}>
                  <Ionicons name="radio-button-on" size={12} color="#10B981" />
                  <Text style={styles.pollingText}>Checking payment...</Text>
                </View>
              )}
            </View>

            {/* <PaymentMethodCard
              method="cash"
              icon="cash"
              title="Cash on Delivery"
              subtitle="Pay when your order arrives"
              selected={selectedPaymentMethod === "cash"}
              onPress={() => setSelectedPaymentMethod("cash")}
            /> */}

            {/* <PaymentMethodCard
              method="card"
              icon="card"
              title="Credit/Debit Card"
              subtitle="Pay securely with your card"
              selected={selectedPaymentMethod === "card"}
              onPress={() => setSelectedPaymentMethod("card")}
            /> */}

            <PaymentMethodCard
              method="mobile"
              icon="wallet"
              title={
                defaultPaymentMethod && paymentMethodsLoaded
                  ? defaultPaymentMethod.toUpperCase()
                  : "Mobile Money"
              }
              subtitle={
                defaultPaymentMethod && paymentMethodsLoaded
                  ? `Account ending in ***${
                      paymentMethods?.methods[defaultPaymentMethod]?.slice(
                        -4
                      ) || "****"
                    }`
                  : "Select mobile payment method"
              }
              selected={selectedPaymentMethod === "mobile"}
              onPress={() => {
                console.log(
                  "Payment method pressed. Default:",
                  defaultPaymentMethod,
                  "Selected:",
                  selectedPaymentMethod,
                  "Loaded:",
                  paymentMethodsLoaded,
                  "Methods:",
                  paymentMethods
                );
                if (!defaultPaymentMethod) {
                  Alert.alert(
                    "No Payment Method",
                    "Please add a mobile payment account in your profile settings.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Go to Profile",
                        onPress: () => router.push("/profile"),
                      },
                    ]
                  );
                  return;
                }
                setSelectedPaymentMethod("mobile");
              }}
            />
          </Animated.View>

          {restaurantIds.length > 1 ? (
            <View style={styles.multiRestaurantNotice}>
              <Ionicons name="information-circle" size={16} color="#F59E0B" />
              <Text style={styles.noticeText}>
                Your order contains items from {restaurantIds.length}{" "}
                restaurants. Separate orders will be created for each
                restaurant.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Place Order Button */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.placeOrderButton,
              (loading || browserLoading) && styles.placeOrderButtonDisabled,
            ]}
            onPress={handlePlaceOrder}
            disabled={loading || browserLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                loading || browserLoading
                  ? ["#9CA3AF", "#6B7280"]
                  : [PrimaryColor, "#FF8F65"]
              }
              style={styles.placeOrderGradient}
            >
              <View style={styles.placeOrderContent}>
                {loading || browserLoading ? (
                  <Animated.View style={{ marginRight: 10 }}>
                    <Ionicons name="hourglass" size={20} color="#fff" />
                  </Animated.View>
                ) : (
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                )}
                <Text style={styles.placeOrderText}>
                  {browserLoading
                    ? "Opening Payment..."
                    : loading
                    ? "Placing Order..."
                    : "Place Order"}
                </Text>
                <View style={styles.orderTotal}>
                  <Text style={styles.orderTotalText}>D{total.toFixed(2)}</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  restaurantOrder: {
    marginBottom: 16,
  },
  restaurantHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  restaurantIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff3f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  orderItemQuantity: {
    fontSize: 14,
    fontWeight: "600",
    color: PrimaryColor,
    width: 30,
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  restaurantTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  restaurantTotalText: {
    fontSize: 14,
    fontWeight: "600",
    color: PrimaryColor,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 16,
  },
  orderTotals: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: "#e5e7eb",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: PrimaryColor,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
    backgroundColor: "#f9fafb",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#f9fafb",
  },
  paymentMethodSelected: {
    borderColor: PrimaryColor,
    backgroundColor: "#fff3f0",
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  paymentMethodTitleSelected: {
    color: PrimaryColor,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    borderColor: PrimaryColor,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PrimaryColor,
  },
  multiRestaurantNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fef3c7",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: "#92400e",
    lineHeight: 20,
  },
  footer: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  placeOrderButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  placeOrderButtonDisabled: {
    shadowColor: "#9CA3AF",
    shadowOpacity: 0.2,
  },
  placeOrderGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  placeOrderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  placeOrderText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginLeft: 10,
  },
  orderTotal: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  orderTotalText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  backButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  backButtonGradient: {
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  readOnlyInput: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  readOnlyNote: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    color: "#10B981",
    marginLeft: 2,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pollingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pollingText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  successContainer: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successContent: {
    alignItems: "center",
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  successLoader: {
    alignItems: "center",
  },
  successSubMessage: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  // Order Type Selection Styles
  orderTypeContainer: {
    marginBottom: 24,
  },
  orderTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderTypeButtonSelected: {
    borderColor: PrimaryColor,
    backgroundColor: PrimaryColor,
    shadowColor: PrimaryColor,
    shadowOpacity: 0.15,
    elevation: 4,
  },
  orderTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  orderTypeInfo: {
    flex: 1,
  },
  orderTypeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  orderTypeTitleSelected: {
    color: "#fff",
  },
  orderTypeSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 18,
  },
  orderTypeSubtitleSelected: {
    color: "rgba(255,255,255,0.8)",
  },
});
