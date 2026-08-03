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
  StatusBar,
  Animated,
  Modal,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useCart } from "@/context/CartContext";
import { userApi, orderApi, paymentApi } from "@/lib/api";
import * as WebBrowser from "expo-web-browser";
import { debugAuthState } from "@/utils/debugAuth";
import { SecureStorage } from "@/utils/secureStorage";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { UserCacheManager } from "@/utils/userCache";
// API_URL no longer required in checkout since payments are skipped
// WebBrowser was used by legacy hosted-payment flow; instant checkout removed it
import { on as socketOn, off as socketOff } from "@/services/SocketService";
import { useAddress } from "@/context/AddressContext";
import { useMaintenance } from "@/context/MaintenanceContext";
import LocationModal from "@/components/common/LocationModal";
import {
  storeSuccessfulOrder,
  clearSuccessfulOrder,
  NotificationService,
} from "@/services/NotificationService";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddressService } from "@/services/AddressService";
import { API_URL } from "@/constants/config";
import TownPickerModal from "@/components/modals/TownPickerModal";
import {
  fetchDeliveryTowns,
  getTownById as getDynamicTownById,
  DeliveryTown,
} from "@/services/deliveryTowns.service";
import {
  getZoneInfoForTown,
  GambianTown, // Keep for backward compatibility with components
  TOWNS_BY_AREA, // Fallback when API is unavailable
} from "@/constants/gambianTowns";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";
/*
 Try to use expo-linear-gradient if it's available in the project; otherwise
 fall back to a lightweight stub that uses a plain View so TypeScript and the
 bundler don't fail when the package isn't installed.
*/
let LinearGradient: any = ({ children, colors, style }: any) => (
  <View
    style={[style, { backgroundColor: (colors && colors[0]) || PrimaryColor }]}
  >
    {children}
  </View>
);

const formatWindowHour = (hour: number): string => {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
};

// Helper functions for vehicle display
const getVehicleEmoji = (vehicleType: string): string => {
  const emojis = {
    BIKE: "🏍️",
    KEKE_CARGO: "🛺",
    CAR: "🚗",
    VAN: "🚐",
    LORRY: "🚚",
  };
  return emojis[vehicleType as keyof typeof emojis] || "🚛";
};

const getVehicleName = (vehicleType: string): string => {
  const names = {
    BIKE: "Motorbike",
    KEKE_CARGO: "Keke Cargo",
    CAR: "Car",
    VAN: "Van",
    LORRY: "Mini Truck",
  };
  return names[vehicleType as keyof typeof names] || "Vehicle";
};

export default function Checkout() {
  const router = useRouter();
  const {
    items,
    clearCart,
    getTotalAmount,
    getTotalQuantity,
    getCartByVendor,
  } = useCart();

  // Fetch dynamic delivery settings from admin panel
  const { getZoneFee } = useDeliverySettings();

  // 🗺️ Client-side delivery zone check — instant feedback before API call (hook moved below state declarations)

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerScale = useRef(new Animated.Value(0.95)).current;

  // Distance loader animation
  const distanceDot1 = useRef(new Animated.Value(0.3)).current;
  const distanceDot2 = useRef(new Animated.Value(0.6)).current;
  const distanceDot3 = useRef(new Animated.Value(1)).current;

  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "processing" | "completed" | "failed" | "cancelled" | null
  >(null);
  const [deliveryFeeError, setDeliveryFeeError] = useState(false);
  const [orderCreated, setOrderCreated] = useState<{
    visible: boolean;
    orderId?: string | null;
  }>({ visible: false, orderId: null });

  // Order created handler: show modal and clear cart
  const handleOrderCreated = useCallback(
    async (orderId: string) => {
      try {
        const storedNew = await storeSuccessfulOrder({
          orderId,
          timestamp: Date.now(),
          data: { orderId, status: "completed" },
        });

        // Only schedule an in-app notification if this is newly stored
        if (storedNew) {
          await NotificationService.scheduleOrderNotification({
            orderId,
            title: "Order Placed! 🎉",
            body: "Your order has been placed successfully. Tap to view details.",
            data: { orderId, type: "payment_success" },
          });
        } else {
          console.log(
            "handleOrderCreated: successful order already stored, skipping notification",
          );
        }
      } catch (e) {
        console.log("handleOrderCreated: auxiliary steps failed", e);
      }

      // Clear cart and show modal
      clearCart();
      setOrderCreated({ visible: true, orderId });
      setPaymentStatus("completed");
    },
    [clearCart],
  );

  // Legacy polling/deeplink listeners removed for instant checkout

  // Socket listeners: react to backend events in real-time
  useEffect(() => {
    console.log("[Socket] Setting up payment socket listeners (simplified)");

    const onPaymentSuccess = async (data: any) => {
      console.log("[Socket] paymentSuccess received in checkout", data);
      if (data && data.orderId) {
        // If we receive a socket success, ensure user sees the created order modal
        handleOrderCreated(data.orderId);
      }
    };

    const onPaymentFailed = async (data: any) => {
      console.log("[Socket] paymentFailed received in checkout", data);
      setPaymentStatus("failed");
      Alert.alert(
        "Payment Failed",
        "Your Wave payment was not completed. Please open Wave and try again, or choose a different payment method.",
        [
          { text: "Dismiss", style: "cancel" },
          {
            text: "Retry",
            onPress: () => {
              setPaymentStatus(null);
              setLoading(false);
            },
          },
        ],
      );
    };

    socketOn("paymentSuccess", onPaymentSuccess);
    socketOn("paymentFailed", onPaymentFailed);

    return () => {
      socketOff("paymentSuccess", onPaymentSuccess);
      socketOff("paymentFailed", onPaymentFailed);
    };
  }, [handleOrderCreated]);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    orderType: "DELIVERY", // Default to delivery
    pickupInstructions: "",
    // 🎁 Recipient fields for ordering for someone else
    isGiftOrder: false,
    recipientName: "",
    recipientPhone: "",
    recipientTown: "", // Town ID for delivery zone calculation
    recipientTownName: "", // Town name for display
    recipientAddress: "", // Address description/landmarks
    recipientDeliveryFee: 0, // Calculated based on town
  });

  // 🎁 Town picker modal for gift orders
  const [townPickerVisible, setTownPickerVisible] = useState(false);

  // Address context for selecting delivery address
  const { addresses, selectedAddress, setSelectedAddress, fetchAddresses } =
    useAddress();
  const { flags: maintenanceFlags } = useMaintenance();
  const [showLocationModal, setShowLocationModal] = useState(false);
  // Pickup confirmation: shown once before creating a PICKUP order so the
  // customer understands they must collect it from the store themselves.
  const [showPickupModal, setShowPickupModal] = useState(false);
  const pickupConfirmedRef = useRef(false);
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [paymentMethodPickerVisible, setPaymentMethodPickerVisible] =
    useState(false);

  // Use the explicitly selected address when present; otherwise fall back to the default/saved one
  const currentAddress =
    selectedAddress ||
    (addresses && addresses.length > 0
      ? addresses.find((a: any) => a.isDefault) || addresses[0]
      : null);

  const [userProfile, setUserProfile] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    isVerified?: boolean;
  } | null>(null);

  // Track auth state for UX
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean | null>(null);

  // Whether we've finished checking for a saved order type preference (e.g. a
  // returning user's last PICKUP/DELIVERY choice). Delivery-fee estimation
  // must wait for this so it doesn't fire against the initial "DELIVERY"
  // default before a saved PICKUP preference has been restored.
  const [orderTypeReady, setOrderTypeReady] = useState(false);

  // 💳 DIGITAL PAYMENT METHOD STATE
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("mobile");
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<
    string | null
  >(null);
  const [paymentMethods, setPaymentMethods] = useState<any>(null);
  const [paymentMethodsLoaded, setPaymentMethodsLoaded] = useState(false);

  // 🎉 PROMO CODE STATE
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState("");
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [isCheckingFirstOrder, setIsCheckingFirstOrder] = useState(true);

  // 🚀 DISTANCE-BASED DELIVERY FEE STATE
  const [deliveryEstimate, setDeliveryEstimate] = useState<any>(null);
  const [loadingDeliveryFee, setLoadingDeliveryFee] = useState(false);
  const [customerCoordinates, setCustomerCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // 🏙️ DYNAMIC DELIVERY TOWNS STATE
  const [deliveryTowns, setDeliveryTowns] = useState<DeliveryTown[]>([]);
  const [loadingTowns, setLoadingTowns] = useState(true);
  const [townsFromAPI, setTownsFromAPI] = useState(false); // Track if using API or fallback

  const restaurantCarts = getCartByVendor();
  const restaurantIds = Object.keys(restaurantCarts);
  const subtotal = getTotalAmount();

  // Minimum order amount from vendor (only available for delivery orders with an estimate)
  const minimumOrderAmount: number | null =
    form.orderType === "DELIVERY"
      ? (deliveryEstimate?.vendor?.minimumOrderAmount ?? null)
      : null;
  const isBelowMinimumOrder =
    minimumOrderAmount !== null && subtotal < minimumOrderAmount;

  // Cash payments removed – digital payment is always required

  // 🎉 DYNAMIC DELIVERY FEE CALCULATION WITH DISTANCE
  const DEFAULT_DELIVERY_FEE = 0; // GMD - fallback if distance calculation fails

  // For gift orders, use town-based fee; otherwise use distance-based calculation
  let deliveryFee =
    form.orderType === "DELIVERY"
      ? form.isGiftOrder
        ? form.recipientDeliveryFee // Town-based fee for gift orders
        : (deliveryEstimate?.deliveryFee ?? DEFAULT_DELIVERY_FEE)
      : 0;

  // First-order delivery discount removed — all customers pay the standard
  // delivery fee. (isFirstOrder is still fetched but no longer alters the fee.)

  // Free delivery from promo code
  if (appliedPromo?.freeDelivery && form.orderType === "DELIVERY") {
    deliveryFee = 0;
  }

  // ❌ A delivery order must always have a non-zero delivery fee unless a
  // free-delivery promo is applied. A fee of 0 once loading has finished means
  // the estimate failed (bad coordinates, API error, or a 0 estimate) — block
  // checkout in every such case, not only when deliveryFeeError happened to be
  // set. (Previously a failed geocode left deliveryFeeError false, letting a
  // 0-fee delivery order slip through.)
  const hasInvalidDeliveryFee =
    form.orderType === "DELIVERY" &&
    !appliedPromo?.freeDelivery &&
    !loadingDeliveryFee &&
    deliveryFee <= 0 &&
    (form.isGiftOrder ? !!form.recipientTown : !!form.address.trim());

  // ❌ No drivers available overnight (admin-configurable window). Pickup
  // orders don't need a driver, so they're unaffected.
  const isNoDriversWindow =
    form.orderType === "DELIVERY" && !!maintenanceFlags.noDriversWindow?.active;

  const discountAmount = appliedPromo?.discountAmount || 0;
  // 💰 SERVICE FEE: 5% of subtotal, rounded to nearest whole number, minimum GMD 1 (Wave only accepts whole numbers)
  const serviceFee = Math.max(1, Math.round(subtotal * 0.05));
  const total = subtotal - discountAmount + deliveryFee + serviceFee;

  // Disable placing order if:
  // 1. User is not logged in
  // 2. Loading state is active
  // 3. For regular delivery: no address is entered
  // 4. For gift orders: recipient info is missing
  // 5. Delivery fee is still being calculated (loadingDeliveryFee)
  const isPlaceOrderDisabled =
    isUserLoggedIn === false ||
    loading ||
    (form.orderType === "DELIVERY" &&
      !form.isGiftOrder &&
      !form.address.trim()) ||
    (form.orderType === "DELIVERY" &&
      form.isGiftOrder &&
      (!form.recipientName.trim() ||
        !form.recipientPhone.trim() ||
        form.recipientPhone.replace(/\D/g, "").length < 7 ||
        form.recipientAddress.trim().length < 5 ||
        !form.recipientTown)) ||
    (form.orderType === "DELIVERY" && loadingDeliveryFee) ||
    // ❌ Block order if below vendor's minimum order amount
    isBelowMinimumOrder ||
    // ❌ Block order if delivery fee is zero without a free-delivery promo
    hasInvalidDeliveryFee ||
    // ❌ Block delivery orders during the no-drivers overnight window
    isNoDriversWindow;

  // Auto-open location modal (logged-in users only) when user selects DELIVERY and they have no saved addresses
  useEffect(() => {
    if (
      isUserLoggedIn === true &&
      form.orderType === "DELIVERY" &&
      addressesLoaded &&
      (!addresses || addresses.length === 0)
    ) {
      setShowLocationModal(true);
    }
  }, [isUserLoggedIn, form.orderType, addresses, addressesLoaded]);

  // Animate distance loader dots
  useEffect(() => {
    if (loadingDeliveryFee) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(distanceDot1, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(distanceDot2, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(distanceDot3, {
              toValue: 0.6,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(distanceDot1, {
              toValue: 0.6,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(distanceDot2, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(distanceDot3, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(distanceDot1, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(distanceDot2, {
              toValue: 0.6,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(distanceDot3, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }
  }, [loadingDeliveryFee, distanceDot1, distanceDot2, distanceDot3]);

  // Ensure addresses are loaded once when checkout mounts to avoid false-empty state
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchAddresses();
      } catch (e) {
        console.warn("fetchAddresses failed on checkout mount:", e);
      } finally {
        if (mounted) setAddressesLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchAddresses]);

  // 🏙️ Fetch delivery towns from backend API on mount with fallback to hardcoded towns
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log("[Delivery Towns] Fetching from API...");
        const response = await fetchDeliveryTowns();
        if (mounted && response.success && response.data.length > 0) {
          console.log(
            `[Delivery Towns] ✅ Loaded ${response.data.length} towns from API`,
          );
          setDeliveryTowns(response.data);
          setTownsFromAPI(true);
        } else {
          throw new Error("No towns returned from API");
        }
      } catch (error) {
        console.warn(
          "[Delivery Towns] ⚠️ API failed, using fallback towns:",
          error,
        );
        // Fallback: Use hardcoded towns for offline reliability
        const fallbackTowns = Object.values(TOWNS_BY_AREA).flat();
        if (mounted) {
          setDeliveryTowns(fallbackTowns);
          setTownsFromAPI(false);
          console.log(
            `[Delivery Towns] 📦 Using ${fallbackTowns.length} fallback towns`,
          );
        }
      } finally {
        if (mounted) setLoadingTowns(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // If there is a default address available, prefill the form.address
  useEffect(() => {
    // Keep form.address synced with selectedAddress if available; otherwise prefill from default
    if (selectedAddress && selectedAddress.addressLine) {
      if (form.address !== selectedAddress.addressLine) {
        setForm((prev) => ({ ...prev, address: selectedAddress.addressLine }));
      }
      return;
    }

    if (addresses && addresses.length > 0 && !form.address.trim()) {
      const def = addresses.find((a: any) => a.isDefault) || addresses[0];
      if (def) setForm((prev) => ({ ...prev, address: def.addressLine || "" }));
    }
  }, [addresses, form.address, selectedAddress]);

  // AppState handling removed for instant checkout. Legacy hosted flow no longer used.

  // Load payment methods from SecureStore
  const loadPaymentMethods = useCallback(async () => {
    try {
      const paymentMethodsData = await SecureStorage.getItem("paymentMethods");
      if (paymentMethodsData) {
        const data = JSON.parse(paymentMethodsData);
        console.log("Loaded payment methods:", data);
        setDefaultPaymentMethod(data.default || null);
        setPaymentMethods(data);
        if (data.default) {
          console.log("Setting selected payment method to mobile");
          setSelectedPaymentMethod("mobile");
        } else {
          setSelectedPaymentMethod("mobile");
        }
      } else {
        console.log("No payment methods data found");
        setSelectedPaymentMethod("mobile");
      }
      setPaymentMethodsLoaded(true);
    } catch {
      console.log("Failed to load payment methods");
      setSelectedPaymentMethod("mobile");
      setPaymentMethodsLoaded(true);
    }
  }, []);

  const loadUserInfo = useCallback(async () => {
    try {
      let savedAddress = null;
      let savedOrderType = null;
      let savedPickupInstructions = null;
      try {
        savedAddress = await SecureStorage.getItem("userAddress");
        savedOrderType = await SecureStorage.getItem("userOrderType");
        savedPickupInstructions = await SecureStorage.getItem(
          "userPickupInstructions",
        );
      } catch (e) {
        console.log(
          "SecureStore get user preferences failed, falling back:",
          e,
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
          const paymentMethodsData =
            await SecureStorage.getItem("paymentMethods");
          if (paymentMethodsData) {
            const data = JSON.parse(paymentMethodsData);
            console.log("Loaded payment methods (cached):", data);
            setDefaultPaymentMethod(data.default || null);
            setPaymentMethods(data);
            if (data.default) {
              console.log("Setting selected payment method to mobile (cached)");
              setSelectedPaymentMethod("mobile");
            } else {
              setSelectedPaymentMethod("mobile");
            }
          } else {
            console.log("No payment methods data found (cached)");
            setSelectedPaymentMethod("mobile");
          }
          setPaymentMethodsLoaded(true);
        } catch {
          console.log("Failed to load payment methods (cached)");
          setSelectedPaymentMethod("mobile");
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
      await loadPaymentMethods();

      // Only fall back to legacy AsyncStorage if both cache and API fail
      if (!cached && !freshData) {
        // Fallback to legacy AsyncStorage if both cache and API fail
        console.log("Falling back to legacy AsyncStorage");
        // Try SecureStore for legacy keys first
        const keys = ["userPhone", "userName", "userEmail", "userAddress"];
        const values: (string | null)[] = [];
        for (const k of keys) {
          try {
            const v = await SecureStorage.getItem(k);
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
      const token = await SecureStorage.getItem("token");
      const isLoggedIn = await SecureStorage.getItem("isLoggedIn");

      console.log("🔐 Checkout auth check:", {
        hasToken: !!token,
        isLoggedIn: !!isLoggedIn,
      });

      if (!token || !isLoggedIn) {
        setIsUserLoggedIn(false);
        // Guests have no saved order-type preference to restore — the
        // initial "DELIVERY" default is already final for them.
        setOrderTypeReady(true);
        return;
      }

      setIsUserLoggedIn(true);
      await loadUserInfo();
      // loadUserInfo() has now applied any saved order-type preference (or
      // confirmed there isn't one) — safe to let delivery-fee estimation run.
      setOrderTypeReady(true);
    } catch (error) {
      console.error("Error checking authentication:", error);
      setIsUserLoggedIn(false);
      setOrderTypeReady(true);
    }
  }, [router, loadUserInfo]);

  // 🎉 CHECK IF FIRST ORDER FOR FREE DELIVERY
  const checkFirstOrder = useCallback(async () => {
    try {
      const token = await SecureStorage.getItem("token");
      if (!token) {
        setIsCheckingFirstOrder(false);
        return;
      }

      const { API_URL } = await import("@/constants/config");
      const response = await fetch(`${API_URL}/api/orders/count`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsFirstOrder(data.isFirstOrder || false);
        console.log("🎉 First order status:", data);
      }
    } catch (error) {
      console.error("Error checking first order:", error);
    } finally {
      setIsCheckingFirstOrder(false);
    }
  }, []);

  // 🎉 VALIDATE PROMO CODE
  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError("Please enter a promo code");
      return;
    }

    setIsValidatingPromo(true);
    setPromoError("");

    try {
      const token = await SecureStorage.getItem("token");
      const userId = await SecureStorage.getItem("userId");
      const { API_URL } = await import("@/constants/config");

      if (!userId) {
        console.error("❌ No userId found in SecureStore");
        setPromoError("Please login to use promo codes");
        setIsValidatingPromo(false);
        return;
      }

      console.log("🎉 Validating promo code:", {
        code: promoCode.toUpperCase(),
        userId,
        orderAmount: subtotal,
        orderType: form.orderType,
      });

      const response = await fetch(`${API_URL}/api/promocodes/validate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: promoCode.toUpperCase(),
          userId: userId,
          orderAmount: subtotal,
          orderType: form.orderType,
        }),
      });

      const result = await response.json();
      console.log("🎉 Promo validation result:", result);

      if (result.isValid) {
        setAppliedPromo(result);
        setPromoError("");
        Alert.alert(
          "Success! 🎉",
          result.message || "Promo code applied successfully",
        );
      } else {
        setPromoError(result.message || "Invalid promo code");
        setAppliedPromo(null);
      }
    } catch (error) {
      console.error("❌ Error validating promo code:", error);
      setPromoError("Failed to validate promo code. Please try again.");
      setAppliedPromo(null);
    } finally {
      setIsValidatingPromo(false);
    }
  };

  // 🎉 REMOVE PROMO CODE
  const removePromoCode = () => {
    setPromoCode("");
    setAppliedPromo(null);
    setPromoError("");
  };

  // 🚀 ESTIMATE DELIVERY FEE BASED ON DISTANCE
  const estimateDeliveryFee = useCallback(
    async (address: string) => {
      if (!address || form.orderType !== "DELIVERY") {
        setDeliveryEstimate(null);
        setCustomerCoordinates(null);
        setDeliveryFeeError(false);
        return;
      }

      setLoadingDeliveryFee(true);
      setDeliveryFeeError(false);
      try {
        // Step 1: Use saved address coordinates if available, otherwise geocode
        let coords: { latitude: number; longitude: number } | null = null;

        // 🔴 CRITICAL FIX: If user selected a saved address, USE ITS COORDINATES directly
        // Don't geocode them again — saved addresses already have the correct lat/lng
        if (
          currentAddress &&
          currentAddress.latitude &&
          currentAddress.longitude
        ) {
          console.log("✅ Using saved address coordinates:", {
            latitude: currentAddress.latitude,
            longitude: currentAddress.longitude,
            label: currentAddress.label,
          });
          coords = {
            latitude: currentAddress.latitude,
            longitude: currentAddress.longitude,
          };
        } else {
          // Only geocode if there's no saved address (fallback for manual entry)
          console.log("📍 Geocoding manual address entry:", address);
          coords = await AddressService.getCoordinatesFromAddress(address);
        }

        if (!coords) {
          console.warn(
            "⚠️ Could not get coordinates for address — cannot estimate a delivery fee",
          );
          setDeliveryEstimate(null);
          setCustomerCoordinates(null);
          setDeliveryFeeError(true);
          setLoadingDeliveryFee(false);
          return;
        }

        console.log("✅ Got coordinates:", coords);
        setCustomerCoordinates(coords);

        // Step 2: Get vendor info from cart
        const firstItem = items[0];
        if (!firstItem) {
          setLoadingDeliveryFee(false);
          return;
        }

        const vendorId = firstItem.vendorId || restaurantIds[0];
        const vendorType = firstItem.entityType || "restaurant";

        // Step 3: Call delivery fee estimation API with items for weight calculation
        console.log("💰 Estimating delivery fee for vendor:", vendorId);
        console.log("📦 Vendor type:", vendorType);
        console.log(
          "🛒 Cart items for weight calculation:",
          items.length,
          "items",
        );

        // Transform cart items for weight calculation
        const orderItems = items.map((item) => ({
          menuItemId: item.entityType === "restaurant" ? item.id : undefined,
          productId: item.entityType === "shop" ? item.id : undefined,
          medicineId: item.entityType === "pharmacy" ? item.id : undefined,
          quantity: item.quantity,
        }));

        const response = await fetch(`${API_URL}/api/delivery-fee/estimate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorId,
            vendorType,
            customerLatitude: coords.latitude,
            customerLongitude: coords.longitude,
            orderAmount: subtotal,
            hasFreeDeliveryPromo: appliedPromo?.freeDelivery || false,
            items: orderItems, // Add items for weight-based pricing
          }),
        });

        const data = await response.json();

        if (data.success) {
          console.log("✅ Delivery fee estimate:", data);
          setDeliveryEstimate(data);
          setDeliveryFeeError(false);
        } else {
          console.warn("⚠️ Delivery fee estimation failed:", data.message);
          setDeliveryEstimate(null);
          setDeliveryFeeError(true);
        }
      } catch (error) {
        console.error("❌ Failed to estimate delivery fee:", error);
        setDeliveryEstimate(null);
        setDeliveryFeeError(true);
      } finally {
        setLoadingDeliveryFee(false);
      }
    },
    [form.orderType, items, restaurantIds, subtotal, appliedPromo],
  );

  // ── Gift order: estimate fee using the selected town's known coordinates ──
  // This gives the same vehicle-based price as regular orders (no geocoding needed).
  const estimateGiftDeliveryFee = useCallback(
    async (town: DeliveryTown) => {
      const fallbackFee = getZoneFee(town.deliveryZone);

      const firstItem = items[0];
      if (!firstItem) {
        // No cart items — just use zone flat fee
        setForm((prev) => ({ ...prev, recipientDeliveryFee: fallbackFee }));
        return;
      }

      setLoadingDeliveryFee(true);
      try {
        const vendorId = firstItem.vendorId || restaurantIds[0];
        const vendorType = firstItem.entityType || "restaurant";
        const orderItems = items.map((item) => ({
          menuItemId: item.entityType === "restaurant" ? item.id : undefined,
          productId: item.entityType === "shop" ? item.id : undefined,
          medicineId: item.entityType === "pharmacy" ? item.id : undefined,
          quantity: item.quantity,
        }));

        const response = await fetch(`${API_URL}/api/delivery-fee/estimate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorId,
            vendorType,
            customerLatitude: town.latitude,
            customerLongitude: town.longitude,
            orderAmount: subtotal,
            hasFreeDeliveryPromo: appliedPromo?.freeDelivery || false,
            items: orderItems,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setDeliveryEstimate(data);
          setForm((prev) => ({
            ...prev,
            recipientDeliveryFee: data.deliveryFee ?? fallbackFee,
          }));
        } else {
          setDeliveryEstimate(null);
          setForm((prev) => ({ ...prev, recipientDeliveryFee: fallbackFee }));
        }
      } catch {
        setDeliveryEstimate(null);
        setForm((prev) => ({ ...prev, recipientDeliveryFee: fallbackFee }));
      } finally {
        setLoadingDeliveryFee(false);
      }
    },
    [getZoneFee, items, restaurantIds, subtotal, appliedPromo],
  );

  // Call estimation when address changes
  // 🔴 CRITICAL: Added currentAddress to dependencies to re-estimate when saved address is selected
  useEffect(() => {
    // Wait until we know the user's real order type (saved PICKUP/DELIVERY
    // preference restored, or confirmed there is none) — otherwise this can
    // fire against the initial "DELIVERY" default and estimate a fee for a
    // returning PICKUP customer before their preference loads.
    if (!orderTypeReady) return;

    // Mark as loading immediately so the UI doesn't briefly treat the fee as
    // "unavailable" (deliveryFee=0) during the debounce window below.
    if (form.address && form.orderType === "DELIVERY") {
      setLoadingDeliveryFee(true);
    }
    // Debounce address changes to avoid infinite loop
    const debounceTimeout = setTimeout(() => {
      if (form.address && form.orderType === "DELIVERY") {
        estimateDeliveryFee(form.address);
      } else {
        setDeliveryEstimate(null);
        setCustomerCoordinates(null);
      }
    }, 400); // 400ms debounce
    return () => clearTimeout(debounceTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.address, form.orderType, form.isGiftOrder, currentAddress, orderTypeReady]);

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
    checkFirstOrder(); // ✅ Check if first order on component mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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

  // Auto-prompt payment method setup for logged-in users who don't have methods
  useEffect(() => {
    if (
      isUserLoggedIn === true &&
      paymentMethodsLoaded &&
      (!paymentMethods ||
        !paymentMethods.methods ||
        Object.keys(paymentMethods.methods).length === 0)
    ) {
      // No payment methods configured - auto-show the picker/prompt
      console.log(
        "⚠️ No payment methods found, opening payment method picker automatically",
      );
      // Delay slightly to ensure UI is ready
      const timer = setTimeout(() => {
        setPaymentMethodPickerVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isUserLoggedIn, paymentMethodsLoaded, paymentMethods]);

  // Reload payment methods when screen comes into focus (e.g., after adding a payment method)
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 Screen focused, reloading payment methods");
      loadPaymentMethods();
    }, [loadPaymentMethods]),
  );

  // Legacy polling / deep-link handlers removed: instant checkout handles order creation synchronously.

  const handlePlaceOrder = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert(
        "Missing Information",
        "Please fill in your name and phone number.",
      );
      return;
    }

    // Check minimum order amount
    if (isBelowMinimumOrder && minimumOrderAmount !== null) {
      Alert.alert(
        "Minimum Order Not Met",
        `This vendor requires a minimum order of D${Math.ceil(minimumOrderAmount)}. Your current subtotal is D${Math.ceil(subtotal)}.`,
      );
      return;
    }

    // Delivery orders must have a valid (non-zero) delivery fee unless a
    // free-delivery promo is applied
    if (hasInvalidDeliveryFee) {
      Alert.alert(
        "Delivery Fee Unavailable",
        "We couldn't calculate a delivery fee for your address. Please re-select your delivery location and try again.",
      );
      return;
    }

    // No drivers available overnight (admin-configurable window)
    if (isNoDriversWindow) {
      Alert.alert(
        "No Drivers Available",
        `No drivers are available right now (${formatWindowHour(
          maintenanceFlags.noDriversWindow.startHour,
        )} - ${formatWindowHour(
          maintenanceFlags.noDriversWindow.endHour,
        )}). Please try again later, or switch to pickup.`,
      );
      return;
    }

    // For delivery orders, check address or recipient info based on gift order status
    if (form.orderType === "DELIVERY") {
      if (form.isGiftOrder) {
        // Validate recipient information for gift orders
        if (!form.recipientName.trim()) {
          Alert.alert(
            "Missing Information",
            "Please provide the recipient's name.",
          );
          return;
        }
        if (!form.recipientPhone.trim()) {
          Alert.alert(
            "Missing Information",
            "Please provide the recipient's phone number.",
          );
          return;
        }
        // Validate phone number is 7 digits
        const phoneDigits = form.recipientPhone.replace(/\D/g, "");
        if (phoneDigits.length < 7) {
          Alert.alert(
            "Invalid Phone Number",
            "Please enter a valid 7-digit Gambian phone number.",
          );
          return;
        }
        if (!form.recipientTown) {
          Alert.alert(
            "Missing Information",
            "Please select the recipient's town/area for delivery.",
          );
          return;
        }
        if (!form.recipientAddress.trim()) {
          Alert.alert(
            "Missing Information",
            "Please provide delivery directions or landmarks for the driver.",
          );
          return;
        }
      } else {
        // Validate regular delivery address
        if (!form.address.trim()) {
          Alert.alert(
            "Missing Information",
            "Please provide a delivery address.",
          );
          return;
        }
      }
    }

    if (items.length === 0) {
      Alert.alert("Empty Cart", "Your cart is empty.");
      return;
    }

    // For pickup orders, confirm the customer understands they must collect the
    // order themselves before we create it. The ref lets the modal's "Confirm"
    // re-invoke this handler and pass straight through.
    if (form.orderType === "PICKUP" && !pickupConfirmedRef.current) {
      setShowPickupModal(true);
      return;
    }
    pickupConfirmedRef.current = false;

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
          ],
        );
        setLoading(false);
        return;
      }

      // Skip ModemPay/payment flow: create orders directly on the server
      try {
        const createdOrderIds: string[] = [];
        let createdOrderIdsShown = false;

        // For each vendor (restaurant/shop/pharmacy), create a separate order
        // Pre-validate vendor groups to ensure we can send correct entity ids
        for (const vendorId of restaurantIds) {
          const vendorItems = restaurantCarts[vendorId] || [];
          if (!vendorItems.length) continue;

          // Prefer explicit entityType on items, otherwise try to infer
          let entityType: string | undefined = vendorItems[0].entityType;
          if (!entityType) {
            // Try to infer from any item
            const found = vendorItems.find((it: any) => it.entityType);
            entityType = found ? found.entityType : undefined;
          }

          if (!entityType) {
            console.warn(
              "Unable to determine entityType for vendor",
              vendorId,
              "- defaulting to 'restaurant'",
            );
            entityType = "restaurant";
          }

          // Prefer vendor-specific id on the item if present
          // Note: For shops, vendorId field actually contains shopId
          const itemVendorId = vendorItems[0].vendorId || vendorId;

          // Validation: ensure we resolved a vendor id and entityType is set
          if (!itemVendorId) {
            console.error(
              "Checkout validation failed: missing vendor id for group",
              vendorId,
              vendorItems,
            );
            Alert.alert(
              "Checkout Error",
              `Missing vendor id for items in cart for vendor group ${vendorId}. Cannot create order.`,
            );
            setLoading(false);
            return;
          }
          if (!entityType) {
            console.error(
              "Checkout validation failed: missing entityType for vendor group",
              vendorId,
              vendorItems,
            );
            Alert.alert(
              "Checkout Error",
              `Unable to determine entity type (restaurant/shop/pharmacy) for vendor group ${vendorId}. Cannot create order.`,
            );
            setLoading(false);
            return;
          }

          const itemsPayload = vendorItems.map((it: any) => {
            // ✅ FIX: Include the actual price (discounted if applicable) in the payload
            const itemPrice = it.discountedPrice || it.price;

            const baseItem = { quantity: it.quantity, price: itemPrice };

            if (entityType === "restaurant")
              return { ...baseItem, menuItemId: it.id };
            if (entityType === "shop") return { ...baseItem, productId: it.id };
            if (entityType === "pharmacy")
              return { ...baseItem, medicineId: it.id };
            return { ...baseItem, productId: it.id };
          });

          const orderPayload: any = {
            customerName: form.name,
            customerPhone: form.phone,
            deliveryAddress:
              form.orderType === "DELIVERY"
                ? form.isGiftOrder
                  ? // Prefix with town name so the driver always sees the area
                    form.recipientTownName
                    ? `${form.recipientTownName} - ${form.recipientAddress}`
                    : form.recipientAddress
                  : form.address
                : null,
            orderType: form.orderType,
            pickupInstructions:
              form.orderType === "PICKUP" ? form.pickupInstructions : null,
            // 🎁 ADD RECIPIENT INFORMATION FOR GIFT ORDERS
            isGiftOrder: form.isGiftOrder || false,
            recipientName: form.isGiftOrder ? form.recipientName : null,
            recipientPhone: form.isGiftOrder
              ? `+220${form.recipientPhone.replace(/^\+220/, "")}`
              : null,
            recipientAddress: form.isGiftOrder ? form.recipientAddress : null,
            // 🎁 For gift orders, include the recipient town ID for zone lookup
            recipientTown: form.isGiftOrder ? form.recipientTown : null,
            items: itemsPayload,
            notes: form.notes,
            promoCode: appliedPromo ? promoCode.toUpperCase() : undefined, // ✅ ADD PROMO CODE
            paymentMethod: "ONLINE", // 💳 Digital payments only
            // 🚀 ADD CUSTOMER COORDINATES FOR DISTANCE-BASED DELIVERY FEE
            // For gift orders, use recipient town coordinates for tracking
            customerLatitude: form.isGiftOrder
              ? getDynamicTownById(deliveryTowns, form.recipientTown)?.latitude
              : customerCoordinates?.latitude,
            customerLongitude: form.isGiftOrder
              ? getDynamicTownById(deliveryTowns, form.recipientTown)?.longitude
              : customerCoordinates?.longitude,
            // 🚀 ADD CALCULATED DELIVERY FEE
            deliveryFee: deliveryFee, // Send the calculated delivery fee
            serviceFee: serviceFee, // Send service fee (currently 0)
            // 🚛 ADD VEHICLE ANALYSIS DATA FROM DELIVERY ESTIMATE
            vehicleType: deliveryEstimate?.weightAnalysis?.vehicleTypeUsed,
            totalWeightKg: deliveryEstimate?.weightAnalysis?.totalWeightKg,
            baseVehicleFee: deliveryEstimate?.weightAnalysis?.baseVehicleFee,
            distanceFee: deliveryEstimate?.weightAnalysis?.distanceFee,
            perKmFee: deliveryEstimate?.weightAnalysis?.perKmFee,
            pricingMethod: deliveryEstimate?.weightAnalysis?.pricingMethod,
          };

          // 🔍 DEBUG: Log coordinates being sent
          console.log("🔍 Sending coordinates:", {
            isGiftOrder: form.isGiftOrder,
            recipientTown: form.recipientTown,
            customerLatitude: form.isGiftOrder
              ? getDynamicTownById(deliveryTowns, form.recipientTown)?.latitude
              : customerCoordinates?.latitude,
            customerLongitude: form.isGiftOrder
              ? getDynamicTownById(deliveryTowns, form.recipientTown)?.longitude
              : customerCoordinates?.longitude,
            deliveryFee,
            serviceFee,
            address: form.address,
          });

          if (entityType === "restaurant")
            orderPayload.restaurantId = itemVendorId;
          if (entityType === "shop") orderPayload.shopId = itemVendorId;
          if (entityType === "pharmacy") orderPayload.pharmacyId = itemVendorId;

          console.log(
            "Creating order for vendor",
            vendorId,
            "(itemVendorId:",
            itemVendorId,
            ")",
            orderPayload,
          );

          const created = await orderApi.createOrder(orderPayload);
          if (created && created.id) {
            createdOrderIds.push(created.id);
            // Show the order-created modal immediately for the first created order
            // so the user can view it or continue shopping without waiting for
            // the rest of the vendor orders to finish.
            try {
              // For bank, don't show success yet — payment happens on the
              // hosted page after all orders are created.
              if (
                createdOrderIds.length === 1 &&
                selectedPaymentMethod !== "bank"
              ) {
                await handleOrderCreated(created.id);
                createdOrderIdsShown = true;
                // Route user to home immediately so the global OrderSuccessModal
                // (root-level) can display the stored successful order.
                try {
                  router.replace("/");
                } catch (e) {
                  console.warn(
                    "Failed to navigate home after order create:",
                    e,
                  );
                }
              }
            } catch (e) {
              console.warn("handleOrderCreated immediate show failed:", e);
            }
          }
        }

        if (createdOrderIds.length > 0) {
          if (selectedPaymentMethod === "bank") {
            // Take a single bank payment for the whole cart via Modem Pay's
            // hosted page. The webhook marks the order(s) paid and the
            // paymentSuccess socket then shows the success modal.
            try {
              setPaymentStatus("pending");
              const res = await paymentApi.createBankPayment({
                orderId: createdOrderIds[0],
                orderIds: createdOrderIds,
                amount: total,
                customerName: form.name,
                customerPhone: form.phone,
                customerEmail: form.email || undefined,
              });
              const link = res?.paymentLink;
              if (link) {
                await WebBrowser.openBrowserAsync(link);
                Alert.alert(
                  "Complete your bank payment",
                  "Finish the payment to confirm your order. You'll be notified as soon as it's received.",
                  [{ text: "OK", onPress: () => router.replace("/(tabs)/orders") }],
                );
              } else {
                Alert.alert(
                  "Order created",
                  "Your order was placed, but we couldn't open bank payment. You can pay it from your Orders.",
                  [{ text: "OK", onPress: () => router.replace("/(tabs)/orders") }],
                );
              }
            } catch (bankErr: any) {
              console.warn("Bank payment start failed:", bankErr?.message || bankErr);
              Alert.alert(
                "Order created",
                "Your order was placed, but bank payment couldn't start. You can pay it from your Orders.",
                [{ text: "OK", onPress: () => router.replace("/(tabs)/orders") }],
              );
            } finally {
              setPaymentStatus(null);
            }
          } else if (!createdOrderIdsShown) {
            // If we already showed the modal when the first order was created,
            // skip calling handleOrderCreated again. Otherwise show it now.
            await handleOrderCreated(createdOrderIds[0]);
          }
        } else {
          Alert.alert(
            "Order Error",
            "No orders were created. Please try again.",
          );
        }
      } catch (orderErr: any) {
        console.error("Order creation error:", orderErr);
        Alert.alert(
          "Order Failed",
          orderErr.message || "Unable to create order. Please try again.",
        );
        setLoading(false);
        return;
      }

      // Since we're using mobile payment, save user data and let webhook handle order creation
      // Save address for future use and update user data cache
      try {
        await SecureStorage.setItem("userAddress", form.address);
        await SecureStorage.setItem("userOrderType", form.orderType);
        if (form.pickupInstructions) {
          await SecureStorage.setItem(
            "userPickupInstructions",
            form.pickupInstructions,
          );
        }
        if (form.email) {
          await SecureStorage.setItem("userEmail", form.email);
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
        "Payment initiated successfully. Webhook will create order when payment succeeds.",
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
          ],
        );
      } else {
        Alert.alert(
          "Checkout Error",
          error.message ||
            "There was an error processing your request. Please try again.",
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
    showArrow = false,
  }: {
    method: string;
    icon: string;
    title: string;
    subtitle: string;
    selected: boolean;
    onPress: () => void;
    showArrow?: boolean;
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
      {showArrow && (
        <Ionicons
          name="chevron-down"
          size={20}
          color="#9CA3AF"
          style={{ marginRight: 8 }}
        />
      )}
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
        <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />
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
        <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />
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

  // Order-created modal will appear when instant checkout succeeds

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

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
          <Ionicons name="arrow-back" size={24} color="#fff" />
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
          {/* LOGIN REQUIRED BANNER */}
          {isUserLoggedIn === false && (
            <View style={styles.loginBanner}>
              <View style={styles.loginBannerContent}>
                <View style={styles.loginBannerIcon}>
                  <Ionicons name="lock-open" size={20} color={PrimaryColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.loginBannerTitle}>Login Required</Text>
                  <Text style={styles.loginBannerMessage}>
                    Sign in to complete your order and proceed to payment
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.loginBannerButton}
                onPress={() => router.push("/auth")}
              >
                <Text style={styles.loginBannerButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

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
                  onChangeText={(text: string) =>
                    setForm({ ...form, pickupInstructions: text })
                  }
                  multiline
                  numberOfLines={2}
                  editable={!loading}
                />
              </Animated.View>
            )}

            {/* 💳 PAYMENT TYPE (DIGITAL-ONLY) */}
            {/* <Text style={styles.sectionTitle}>Payment Type</Text> */}

            {/* <View style={styles.orderTypeContainer}>
              <View
                style={[styles.orderTypeButton, styles.orderTypeButtonSelected]}
              >
                <View style={styles.orderTypeIcon}>
                  <Ionicons name="card" size={20} color="#fff" />
                </View>
                <View style={styles.orderTypeInfo}>
                  <Text
                    style={[
                      styles.orderTypeTitle,
                      styles.orderTypeTitleSelected,
                    ]}
                  >
                    Digital Payment (Required)
                  </Text>
                  <Text
                    style={[
                      styles.orderTypeSubtitle,
                      styles.orderTypeSubtitleSelected,
                    ]}
                  >
                    Pay securely with mobile wallets or bank cards
                  </Text>
                </View>
                <View style={[styles.radioButton, styles.radioButtonSelected]}>
                  <View style={styles.radioButtonInner} />
                </View>
              </View>
            </View> */}
            {/* Payment Method - Digital wallets */}
            <Animated.View
              style={[
                // styles.section,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Payment Method</Text>
                {paymentStatus === "pending" && (
                  <View style={styles.pollingIndicator}>
                    <Ionicons
                      name="radio-button-on"
                      size={12}
                      color="#10B981"
                    />
                    <Text style={styles.pollingText}>
                      Processing payment...
                    </Text>
                  </View>
                )}
              </View>

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
                          -4,
                        ) || "****"
                      }`
                    : "Select mobile payment method"
                }
                selected={selectedPaymentMethod === "mobile"}
                showArrow={true}
                onPress={() => {
                  console.log(
                    "Payment method pressed. Default:",
                    defaultPaymentMethod,
                    "Selected:",
                    selectedPaymentMethod,
                    "Loaded:",
                    paymentMethodsLoaded,
                    "Methods:",
                    paymentMethods,
                  );
                  setSelectedPaymentMethod("mobile");
                  // Open payment method picker modal
                  setPaymentMethodPickerVisible(true);
                }}
              />

              {/* Bank payment temporarily hidden — not fully ready yet. The
                  option and its handling logic remain in place; re-enable this
                  card when bank is live on the Modem Pay account. */}
              {/* <PaymentMethodCard
                method="bank"
                icon="business"
                title="Bank"
                subtitle="Pay from your bank on the next screen"
                selected={selectedPaymentMethod === "bank"}
                showArrow={false}
                onPress={() => setSelectedPaymentMethod("bank")}
              /> */}
            </Animated.View>

            <View style={styles.paymentNotice}>
              <Ionicons
                name="information-circle"
                size={16}
                color="#F97316"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text style={styles.paymentNoticeText}>
                Cash on delivery or pickup is not available yet. Complete your
                payment digitally to place an order.
              </Text>
            </View>

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

            {/* EMAIL ADDRESS FIELD - COMMENTED OUT
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
            */}

            {/* 🎁 ORDER FOR SOMEONE ELSE TOGGLE - Only show for delivery orders */}
            {form.orderType === "DELIVERY" && (
              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={[
                    styles.giftOrderToggle,
                    form.isGiftOrder && styles.giftOrderToggleActive,
                  ]}
                  onPress={() => {
                    const turningOff = form.isGiftOrder;
                    setForm({
                      ...form,
                      isGiftOrder: !form.isGiftOrder,
                      // Reset gift fields when toggling off
                      ...(turningOff
                        ? {
                            recipientTown: "",
                            recipientTownName: "",
                            recipientDeliveryFee: 0,
                          }
                        : {}),
                    });
                    // Clear estimate when leaving gift mode so it doesn't bleed into regular flow
                    if (turningOff) setDeliveryEstimate(null);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.giftOrderToggleLeft}>
                    <Ionicons
                      name="gift"
                      size={24}
                      color={form.isGiftOrder ? PrimaryColor : "#6B7280"}
                    />
                    <View style={styles.giftOrderToggleInfo}>
                      <Text
                        style={[
                          styles.giftOrderToggleTitle,
                          form.isGiftOrder && styles.giftOrderToggleTitleActive,
                        ]}
                      >
                        Order for someone else
                      </Text>
                      <Text style={styles.giftOrderToggleSubtitle}>
                        Send to family or friends in The Gambia
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.toggleSwitch,
                      form.isGiftOrder && styles.toggleSwitchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        form.isGiftOrder && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* 🎁 RECIPIENT INFORMATION - Only show when gift order is enabled */}
            {form.isGiftOrder && form.orderType === "DELIVERY" && (
              <Animated.View
                style={[
                  styles.recipientSection,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <View style={styles.recipientHeader}>
                  <Ionicons name="person" size={20} color={PrimaryColor} />
                  <Text style={styles.recipientTitle}>
                    Recipient Information
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Recipient Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter recipient's full name"
                    value={form.recipientName}
                    onChangeText={(text: string) =>
                      setForm({ ...form, recipientName: text })
                    }
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Recipient Phone Number *
                  </Text>
                  <View style={styles.phoneInputContainer}>
                    <Text style={styles.phonePrefix}>+220</Text>
                    <TextInput
                      style={[styles.input, styles.phoneInput]}
                      placeholder="XXX XXXX"
                      value={form.recipientPhone.replace(/^\+220/, "")}
                      onChangeText={(text: string) => {
                        // Remove any non-digit characters and limit to 7 digits
                        const digits = text.replace(/\D/g, "").slice(0, 7);
                        setForm({ ...form, recipientPhone: digits });
                      }}
                      keyboardType="phone-pad"
                      editable={!loading}
                      maxLength={7}
                    />
                  </View>
                  <Text style={styles.inputNote}>
                    The driver will call this number for delivery
                  </Text>
                </View>

                {/* 🏘️ TOWN SELECTOR FOR GIFT ORDERS */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Delivery Town/Area *</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.townSelector]}
                    onPress={() => setTownPickerVisible(true)}
                    disabled={loading || loadingTowns}
                    activeOpacity={0.7}
                  >
                    <View style={styles.townSelectorContent}>
                      <Ionicons
                        name="location"
                        size={20}
                        color={form.recipientTown ? PrimaryColor : "#9CA3AF"}
                      />
                      <Text
                        style={[
                          styles.townSelectorText,
                          !form.recipientTown && styles.townSelectorPlaceholder,
                        ]}
                      >
                        {loadingTowns
                          ? "Loading towns..."
                          : form.recipientTownName ||
                            (deliveryTowns.length > 0
                              ? "Select town or area"
                              : "No towns available")}
                      </Text>
                    </View>
                    <View style={styles.townSelectorRight}>
                      {form.recipientTown && (
                        <View style={styles.deliveryFeeBadge}>
                          <Text style={styles.deliveryFeeBadgeText}>
                            D{Math.ceil(form.recipientDeliveryFee)}
                          </Text>
                        </View>
                      )}
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#9CA3AF"
                      />
                    </View>
                  </TouchableOpacity>
                  {form.recipientTown && (
                    <Text style={styles.inputNoteSuccess}>
                      ✓ Delivery fee: D{Math.ceil(form.recipientDeliveryFee)} (
                      {getZoneInfoForTown(form.recipientTown)?.name} zone)
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Delivery Directions/Landmarks *
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="e.g., Near the big mango tree, opposite the mosque, 3rd house on the left..."
                    value={form.recipientAddress}
                    onChangeText={(text: string) =>
                      setForm({ ...form, recipientAddress: text })
                    }
                    multiline
                    numberOfLines={3}
                    editable={!loading}
                  />
                  <Text style={styles.inputNote}>
                    Describe landmarks or give clear directions for the driver
                    to find the location
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Delivery Address - Only show when Delivery is selected AND not a gift order */}
            {form.orderType === "DELIVERY" && !form.isGiftOrder && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Delivery Address *</Text>
                {/* If user has saved addresses show them; otherwise open LocationModal to add/select */}
                <View style={{ marginBottom: 8 }}>
                  {addresses && addresses.length > 0 ? (
                    <View>
                      {/* Compact selector that opens a modal dropdown */}
                      <TouchableOpacity
                        style={[
                          styles.input,
                          {
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          },
                        ]}
                        onPress={() => setAddressPickerVisible(true)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "700" }}>
                            {currentAddress?.label || "Choose delivery address"}
                          </Text>
                          <Text style={{ color: "#666" }}>
                            {currentAddress?.addressLine ||
                              "No address selected"}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color="#6b7280"
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addNewAddressButton}
                      onPress={() => setShowLocationModal(true)}
                    >
                      <Ionicons name="location" size={18} color="#ff6b00" />
                      <Text style={styles.addNewAddressText}>
                        Add delivery address
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={{ marginBottom: 12 }}
                  onPress={async () => {
                    try {
                      await fetchAddresses();
                    } catch (e) {
                      console.error("Failed to refresh addresses:", e);
                    }
                  }}
                >
                  <Text style={{ color: "#ff6b00", fontWeight: "600" }}>
                    Refresh addresses
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Order Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any special instructions for your order..."
                value={form.notes}
                onChangeText={(text: string) =>
                  setForm({ ...form, notes: text })
                }
                multiline
                numberOfLines={2}
                editable={!loading}
              />
            </View>
          </Animated.View>

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
              // ✅ FIX: Use discounted price if available, otherwise use regular price
              const restaurantTotal = restaurantItems.reduce((sum, item) => {
                const itemPrice = item.discountedPrice || item.price;
                return sum + itemPrice * item.quantity;
              }, 0);

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

                  {restaurantItems.map((item) => {
                    // ✅ FIX: Display discounted price if available
                    const itemPrice = item.discountedPrice || item.price;
                    const itemTotal = itemPrice * item.quantity;
                    const hasDiscount =
                      item.discountedPrice && item.discountedPrice < item.price;

                    return (
                      <View key={item.id} style={styles.orderItem}>
                        <Text style={styles.orderItemQuantity}>
                          {item.quantity}x
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.orderItemName}>{item.name}</Text>
                          {hasDiscount && (
                            <Text
                              style={{
                                fontSize: 11,
                                color: "#9CA3AF",
                                marginTop: 2,
                              }}
                            >
                              <Text
                                style={{ textDecorationLine: "line-through" }}
                              >
                                D{Math.ceil(item.price)}
                              </Text>
                              {" → "}
                              <Text
                                style={{ color: "#EF4444", fontWeight: "600" }}
                              >
                                D{Math.ceil(item.discountedPrice!)}
                              </Text>
                            </Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.orderItemPrice,
                            hasDiscount ? { color: "#EF4444" } : null,
                          ]}
                        >
                          D{Math.ceil(itemTotal)}
                        </Text>
                      </View>
                    );
                  })}

                  <View style={styles.restaurantTotal}>
                    <Text style={styles.restaurantTotalText}>
                      Total: D{Math.ceil(restaurantTotal)}
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
                <Text style={styles.totalValue}>D{Math.ceil(subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Service Fee</Text>
                <Text style={styles.totalValue}>D{serviceFee}</Text>
              </View>
              {form.orderType === "DELIVERY" && (
                <>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Delivery Fee</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {loadingDeliveryFee ? (
                        <View style={styles.distanceLoaderContainer}>
                          <Ionicons
                            name="location"
                            size={14}
                            color="#F97316"
                            style={{ marginRight: 4 }}
                          />
                          <View style={styles.distanceLoaderDots}>
                            <Animated.View
                              style={[
                                styles.distanceLoaderDot,
                                { opacity: distanceDot1 },
                              ]}
                            />
                            <Animated.View
                              style={[
                                styles.distanceLoaderDot,
                                { opacity: distanceDot2 },
                              ]}
                            />
                            <Animated.View
                              style={[
                                styles.distanceLoaderDot,
                                { opacity: distanceDot3 },
                              ]}
                            />
                          </View>
                          <Text style={styles.distanceLoaderText}>
                            Calculating…
                          </Text>
                        </View>
                      ) : appliedPromo?.freeDelivery ||
                        deliveryEstimate?.isFreeDelivery ? (
                        <>
                          <Text
                            style={[
                              styles.totalValue,
                              {
                                textDecorationLine: "line-through",
                                color: "#9CA3AF",
                              },
                            ]}
                          >
                            D
                            {deliveryFee > 0
                              ? Math.ceil(deliveryFee)
                              : Math.ceil(DEFAULT_DELIVERY_FEE)}
                          </Text>
                          <Text
                            style={{
                              color: "#10B981",
                              fontWeight: "700",
                              fontSize: 14,
                            }}
                          >
                            FREE
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.totalValue}>
                          D
                          {deliveryFee > 0
                            ? Math.ceil(deliveryFee)
                            : Math.ceil(DEFAULT_DELIVERY_FEE)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Delivery fee error — shown when estimation fails */}
                  {deliveryFeeError &&
                    !loadingDeliveryFee &&
                    !deliveryEstimate && (
                      <TouchableOpacity
                        onPress={() => estimateDeliveryFee(form.address)}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 4,
                          paddingHorizontal: 2,
                        }}
                      >
                        <Ionicons
                          name="warning-outline"
                          size={13}
                          color="#F97316"
                        />
                        <Text
                          style={{ fontSize: 12, color: "#F97316", flex: 1 }}
                        >
                          Could not calculate delivery fee. Check your
                          connection and tap here to retry.
                        </Text>
                        <Ionicons name="refresh" size={14} color="#F97316" />
                      </TouchableOpacity>
                    )}

                  {/* Delivery breakdown card — full width below the fee row */}
                  {deliveryEstimate && !loadingDeliveryFee && (
                    <View style={styles.deliveryBreakdownCard}>
                      {/* Distance · ETA · Vehicle */}
                      <View style={styles.deliveryBreakdownMetaRow}>
                        <View style={styles.deliveryBreakdownMetaItem}>
                          <Ionicons
                            name="location-outline"
                            size={12}
                            color="#6B7280"
                          />
                          <Text style={styles.deliveryBreakdownMetaText}>
                            {deliveryEstimate.distanceKm.toFixed(1)} km
                          </Text>
                        </View>
                        <View style={styles.deliveryBreakdownMetaDivider} />
                        <View style={styles.deliveryBreakdownMetaItem}>
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color="#6B7280"
                          />
                          <Text style={styles.deliveryBreakdownMetaText}>
                            ~{deliveryEstimate.estimatedDeliveryTimeMinutes}{" "}
                            mins
                          </Text>
                        </View>
                        {deliveryEstimate.weightAnalysis?.vehicleTypeUsed && (
                          <>
                            <View style={styles.deliveryBreakdownMetaDivider} />
                            <View style={styles.deliveryBreakdownMetaItem}>
                              <Text style={styles.deliveryBreakdownMetaText}>
                                {getVehicleEmoji(
                                  deliveryEstimate.weightAnalysis
                                    .vehicleTypeUsed,
                                )}{" "}
                                {getVehicleName(
                                  deliveryEstimate.weightAnalysis
                                    .vehicleTypeUsed,
                                )}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>

                      {/* Cost breakdown (base + distance fee) intentionally
                          omitted — we show only what justifies the fee
                          (distance, ETA, delivery type) above, not the internal
                          cost decomposition. The total delivery fee remains
                          visible in the "Delivery Fee" row. */}
                    </View>
                  )}

                </>
              )}

              {/* 🎉 PROMO CODE DISCOUNT */}
              {appliedPromo && discountAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: "#10B981" }]}>
                    Promo Discount
                  </Text>
                  <Text style={[styles.totalValue, { color: "#10B981" }]}>
                    -D{Math.ceil(discountAmount)}
                  </Text>
                </View>
              )}

              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>D{Math.ceil(total)}</Text>
              </View>
            </View>

            {/* 🎉 PROMO CODE INPUT */}
            {!appliedPromo ? (
              <View style={styles.promoCodeSection}>
                <Text style={styles.promoCodeLabel}>Have a promo code?</Text>
                <View style={styles.promoCodeInputContainer}>
                  <TextInput
                    style={styles.promoCodeInput}
                    placeholder="Enter code (e.g. LAUNCH2025)"
                    value={promoCode}
                    onChangeText={setPromoCode}
                    autoCapitalize="characters"
                    editable={!isValidatingPromo && !loading}
                  />
                  <TouchableOpacity
                    style={[
                      styles.promoCodeButton,
                      (isValidatingPromo || loading || !promoCode.trim()) &&
                        styles.promoCodeButtonDisabled,
                    ]}
                    onPress={validatePromoCode}
                    disabled={isValidatingPromo || loading || !promoCode.trim()}
                  >
                    <Text style={styles.promoCodeButtonText}>
                      {isValidatingPromo ? "Validating..." : "Apply"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {promoError ? (
                  <Text style={styles.promoErrorText}>{promoError}</Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.appliedPromoContainer}>
                <View style={styles.appliedPromoContent}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.appliedPromoCode}>
                      {promoCode.toUpperCase()}
                    </Text>
                    <Text style={styles.appliedPromoDescription}>
                      {appliedPromo.message ||
                        appliedPromo.description ||
                        "Promo applied successfully!"}
                      {appliedPromo.freeDelivery && (
                        <Text> Free delivery applied.</Text>
                      )}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={removePromoCode}
                    disabled={loading}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
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

        {/* Pickup Confirmation Modal */}
        <Modal
          visible={showPickupModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowPickupModal(false)}
        >
          <View style={styles.modalCentered}>
            <View style={styles.modalContainer}>
              <View style={styles.pickupModalIcon}>
                <Ionicons name="storefront" size={34} color={PrimaryColor} />
              </View>
              <Text style={styles.modalTitle}>This is a pickup order</Text>
              <Text style={styles.modalMessage}>
                {(() => {
                  const storeNames = Array.from(
                    new Set(
                      items
                        .map((it: any) => it.vendorName)
                        .filter((n: string) => !!n),
                    ),
                  ) as string[];
                  const where =
                    storeNames.length === 1
                      ? storeNames[0]
                      : storeNames.length > 1
                        ? "each store"
                        : "the store";
                  return `No driver will deliver this order. You'll need to go to ${where} yourself to collect it once it's ready.`;
                })()}
              </Text>
              <View style={styles.pickupModalButtons}>
                <TouchableOpacity
                  style={styles.pickupModalCancel}
                  onPress={() => setShowPickupModal(false)}
                >
                  <Text style={styles.pickupModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickupModalConfirm}
                  onPress={() => {
                    pickupConfirmedRef.current = true;
                    setShowPickupModal(false);
                    handlePlaceOrder();
                  }}
                >
                  <Text style={styles.pickupModalConfirmText}>
                    Got it, place order
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Order Created Modal */}
        <Modal visible={orderCreated.visible} animationType="slide" transparent>
          <SafeAreaView style={styles.modalCentered}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Order placed 🎉</Text>
              <Text style={styles.modalMessage}>
                Your order is in! No payment yet — you&apos;ll pay once the
                vendor accepts it. We&apos;ll alert you, then just tap
                &quot;Pay Now&quot; to confirm.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    clearSuccessfulOrder();
                    setOrderCreated({ visible: false, orderId: null });
                    router.replace("/");
                  }}
                >
                  <Text style={styles.modalButtonText}>Go Home</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalPrimary]}
                  onPress={() => {
                    const id = orderCreated.orderId;
                    clearSuccessfulOrder();
                    setOrderCreated({ visible: false, orderId: null });
                    if (id)
                      router.replace({
                        pathname: "/order-details",
                        params: { orderId: id, from: "checkout" },
                      });
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                    View Order
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Location Modal (for adding/selecting address when none saved) */}
        <LocationModal
          visible={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onSelectAddress={(addr: any) => {
            // Fill form and set selected address
            setForm((prev) => ({
              ...prev,
              address: addr.addressLine || addr.street || "",
            }));
            setSelectedAddress(addr);
            setShowLocationModal(false);
          }}
          currentAddress={form.address}
        />

        {/* 🏘️ Town Picker Modal for Gift Orders */}
        <TownPickerModal
          visible={townPickerVisible}
          onClose={() => setTownPickerVisible(false)}
          towns={deliveryTowns}
          usingFallback={!townsFromAPI}
          onSelectTown={(town: GambianTown) => {
            // Set town info immediately with zone fallback, then replace fee
            // with vehicle-based calculation using town coordinates.
            setForm((prev) => ({
              ...prev,
              recipientTown: town.id,
              recipientTownName: town.name,
              recipientDeliveryFee: getZoneFee(town.deliveryZone),
            }));
            estimateGiftDeliveryFee(town);
          }}
          selectedTownId={form.recipientTown}
          vehicleType={deliveryEstimate?.weightAnalysis?.vehicleTypeUsed}
          vehicleBaseFee={deliveryEstimate?.weightAnalysis?.baseVehicleFee}
          vehiclePerKmFee={deliveryEstimate?.weightAnalysis?.perKmFee}
          vendorLatitude={deliveryEstimate?.vendor?.coordinates?.latitude}
          vendorLongitude={deliveryEstimate?.vendor?.coordinates?.longitude}
        />

        {/* Address Picker Modal (dropdown-like) */}
        <Modal visible={addressPickerVisible} animationType="slide" transparent>
          <SafeAreaView style={styles.modalCentered}>
            <View
              style={[styles.modalContainer, { maxHeight: 420, width: "95%" }]}
            >
              <Text style={styles.modalTitle}>Choose delivery address</Text>
              <Text style={styles.modalMessage}>
                Select one of your saved addresses
              </Text>
              <ScrollView style={{ width: "100%" }}>
                {addresses.map((addr: any) => {
                  const isSelected =
                    (selectedAddress &&
                      selectedAddress.id &&
                      addr.id === selectedAddress.id) ||
                    (!selectedAddress && addr.isDefault);

                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSelected ? "#ff6b00" : "#EEE",
                        backgroundColor: isSelected ? "#FFF8F0" : "#FFF",
                        marginBottom: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                      onPress={() => {
                        setForm((prev) => ({
                          ...prev,
                          address: addr.addressLine,
                        }));
                        setSelectedAddress(addr);
                        setAddressPickerVisible(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontWeight: isSelected ? "700" : "500" }}
                        >
                          {addr.label} {addr.isDefault ? "(Default)" : ""}
                        </Text>
                        <Text style={{ color: "#666" }}>
                          {addr.addressLine}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#ff6b00"
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View
                style={{ flexDirection: "row", width: "100%", marginTop: 8 }}
              >
                <TouchableOpacity
                  style={[styles.modalButton, { flex: 1 }]}
                  onPress={() => setAddressPickerVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Payment Method Picker Modal */}
        <Modal
          visible={paymentMethodPickerVisible}
          animationType="slide"
          transparent
        >
          <SafeAreaView style={styles.modalCentered}>
            <View
              style={[styles.modalContainer, { maxHeight: 500, width: "95%" }]}
            >
              <Text style={styles.modalTitle}>Choose Payment Method</Text>
              <Text style={styles.modalMessage}>
                Select a mobile money account
              </Text>
              <ScrollView style={{ width: "100%" }}>
                {/* Check if payment methods exist */}
                {paymentMethods &&
                Object.keys(paymentMethods.methods || {}).length > 0 ? (
                  <>
                    {/* Wave */}
                    {paymentMethods.methods.wave && (
                      <TouchableOpacity
                        style={{
                          paddingVertical: 14,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor:
                            defaultPaymentMethod === "wave"
                              ? PrimaryColor
                              : "#E5E7EB",
                          backgroundColor:
                            defaultPaymentMethod === "wave"
                              ? "#FFF8F0"
                              : "#FFF",
                          marginBottom: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onPress={() => {
                          setDefaultPaymentMethod("wave");
                          setSelectedPaymentMethod("mobile");
                          setPaymentMethodPickerVisible(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontWeight: "700",
                              fontSize: 16,
                              color: "#1F2937",
                              marginBottom: 4,
                            }}
                          >
                            🐧 Wave
                          </Text>
                          <Text style={{ color: "#6B7280", fontSize: 14 }}>
                            Account: ***{paymentMethods.methods.wave.slice(-4)}
                          </Text>
                        </View>
                        {defaultPaymentMethod === "wave" && (
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color={PrimaryColor}
                          />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Afrimoney */}
                    {paymentMethods.methods.afrimoney && (
                      <TouchableOpacity
                        style={{
                          paddingVertical: 14,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor:
                            defaultPaymentMethod === "afrimoney"
                              ? PrimaryColor
                              : "#E5E7EB",
                          backgroundColor:
                            defaultPaymentMethod === "afrimoney"
                              ? "#FFF8F0"
                              : "#FFF",
                          marginBottom: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onPress={() => {
                          setDefaultPaymentMethod("afrimoney");
                          setSelectedPaymentMethod("mobile");
                          setPaymentMethodPickerVisible(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontWeight: "700",
                              fontSize: 16,
                              color: "#1F2937",
                              marginBottom: 4,
                            }}
                          >
                            📱 Afrimoney
                          </Text>
                          <Text style={{ color: "#6B7280", fontSize: 14 }}>
                            Account: ***
                            {paymentMethods.methods.afrimoney.slice(-4)}
                          </Text>
                        </View>
                        {defaultPaymentMethod === "afrimoney" && (
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color={PrimaryColor}
                          />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* QMoney */}
                    {paymentMethods.methods.qmoney && (
                      <TouchableOpacity
                        style={{
                          paddingVertical: 14,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor:
                            defaultPaymentMethod === "qmoney"
                              ? PrimaryColor
                              : "#E5E7EB",
                          backgroundColor:
                            defaultPaymentMethod === "qmoney"
                              ? "#FFF8F0"
                              : "#FFF",
                          marginBottom: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onPress={() => {
                          setDefaultPaymentMethod("qmoney");
                          setSelectedPaymentMethod("mobile");
                          setPaymentMethodPickerVisible(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontWeight: "700",
                              fontSize: 16,
                              color: "#1F2937",
                              marginBottom: 4,
                            }}
                          >
                            💰 QMoney
                          </Text>
                          <Text style={{ color: "#6B7280", fontSize: 14 }}>
                            Account: ***
                            {paymentMethods.methods.qmoney.slice(-4)}
                          </Text>
                        </View>
                        {defaultPaymentMethod === "qmoney" && (
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color={PrimaryColor}
                          />
                        )}
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={{ paddingVertical: 24, alignItems: "center" }}>
                    <Ionicons name="wallet-outline" size={48} color="#9CA3AF" />
                    <Text
                      style={{
                        color: "#6B7280",
                        fontSize: 16,
                        marginTop: 12,
                        textAlign: "center",
                      }}
                    >
                      No payment methods found
                    </Text>
                    <Text
                      style={{
                        color: "#9CA3AF",
                        fontSize: 14,
                        marginTop: 4,
                        textAlign: "center",
                      }}
                    >
                      Add a mobile money account in your profile
                    </Text>
                  </View>
                )}
              </ScrollView>
              <View
                style={{
                  flexDirection: "row",
                  width: "100%",
                  marginTop: 12,
                  gap: 8,
                }}
              >
                <TouchableOpacity
                  style={[styles.modalButton, { flex: 1 }]}
                  onPress={() => setPaymentMethodPickerVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalPrimary, { flex: 1 }]}
                  onPress={() => {
                    setPaymentMethodPickerVisible(false);
                    router.push("/payment-methods");
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                    Add New
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Minimum Order Warning */}
        {isBelowMinimumOrder && minimumOrderAmount !== null && (
          <View
            style={{
              backgroundColor: "#FEF2F2",
              borderWidth: 1,
              borderColor: "#FCA5A5",
              borderRadius: 10,
              padding: 12,
              marginHorizontal: 16,
              marginBottom: 8,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text
              style={{ color: "#B91C1C", fontSize: 13, marginLeft: 8, flex: 1 }}
            >
              Minimum order is D{Math.ceil(minimumOrderAmount)}. Add D
              {Math.ceil(minimumOrderAmount - subtotal)} more to place this
              order.
            </Text>
          </View>
        )}

        {/* Delivery Fee Missing Warning */}
        {hasInvalidDeliveryFee && (
          <View
            style={{
              backgroundColor: "#FEF2F2",
              borderWidth: 1,
              borderColor: "#FCA5A5",
              borderRadius: 10,
              padding: 12,
              marginHorizontal: 16,
              marginBottom: 8,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text
              style={{ color: "#B91C1C", fontSize: 13, marginLeft: 8, flex: 1 }}
            >
              We couldn't calculate a delivery fee for your address. Please
              re-select your delivery location to continue.
            </Text>
          </View>
        )}

        {/* No Drivers Available Warning */}
        {isNoDriversWindow && (
          <View
            style={{
              backgroundColor: "#FEF2F2",
              borderWidth: 1,
              borderColor: "#FCA5A5",
              borderRadius: 10,
              padding: 12,
              marginHorizontal: 16,
              marginBottom: 8,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="moon" size={18} color="#EF4444" />
            <Text
              style={{ color: "#B91C1C", fontSize: 13, marginLeft: 8, flex: 1 }}
            >
              No drivers are available right now (
              {formatWindowHour(maintenanceFlags.noDriversWindow.startHour)} -{" "}
              {formatWindowHour(maintenanceFlags.noDriversWindow.endHour)}).
              Switch to pickup or try again later.
            </Text>
          </View>
        )}

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
              isPlaceOrderDisabled && styles.placeOrderButtonDisabled,
            ]}
            onPress={handlePlaceOrder}
            disabled={isPlaceOrderDisabled}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                isPlaceOrderDisabled
                  ? ["#9CA3AF", "#6B7280"]
                  : [PrimaryColor, "#FF8F65"]
              }
              style={styles.placeOrderGradient}
            >
              <View style={styles.placeOrderContent}>
                {loading ? (
                  <Animated.View style={{ marginRight: 10 }}>
                    <Ionicons name="hourglass" size={20} color="#fff" />
                  </Animated.View>
                ) : loadingDeliveryFee ? (
                  <Animated.View style={{ marginRight: 10 }}>
                    <Ionicons name="location" size={20} color="#fff" />
                  </Animated.View>
                ) : (
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                )}
                <Text style={styles.placeOrderText}>
                  {loading
                    ? "Placing Order..."
                    : loadingDeliveryFee
                      ? "Calculating Delivery Fee..."
                      : isBelowMinimumOrder
                        ? "Minimum Order Not Met"
                        : hasInvalidDeliveryFee
                          ? "Delivery Fee Unavailable"
                          : isNoDriversWindow
                            ? "No Drivers Available"
                            : "Place Order"}
                </Text>
                <View style={styles.orderTotal}>
                  <Text style={styles.orderTotalText}>
                    {loadingDeliveryFee ? "..." : `D${total.toFixed(2)}`}
                  </Text>
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
  // Login banner styles
  loginBanner: {
    backgroundColor: "#FEF3E2",
    borderLeftWidth: 4,
    borderLeftColor: PrimaryColor,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loginBannerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loginBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${PrimaryColor}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  loginBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
  loginBannerMessage: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  loginBannerButton: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loginBannerButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: PrimaryColor,
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
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
    color: "#fff",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
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
  quickSummaryCard: {
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 16,
    marginTop: -4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  quickSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0F2FE",
  },
  quickSummaryTotal: {
    borderBottomWidth: 0,
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: "#BFDBFE",
  },
  quickSummaryLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickSummaryLabelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  quickSummaryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  quickSummaryTotalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: PrimaryColor,
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
  addNewAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: "#ff6b00",
    borderStyle: "dashed",
    borderRadius: 16,
    marginTop: 16,
    backgroundColor: "#FFF5EE",
  },
  addNewAddressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff6b00",
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
  distanceLoaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#FEF3E7",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  distanceLoaderDots: {
    flexDirection: "row",
    gap: 4,
  },
  distanceLoaderDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: PrimaryColor,
  },
  distanceLoaderText: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "500",
    marginLeft: 4,
  },
  // Delivery fee breakdown card
  deliveryBreakdownCard: {
    marginTop: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  deliveryBreakdownMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  deliveryBreakdownMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  deliveryBreakdownMetaDivider: {
    width: 1,
    height: 10,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 2,
  },
  deliveryBreakdownMetaText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  deliveryBreakdownRows: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  deliveryBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  deliveryBreakdownRowLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  deliveryBreakdownRowValue: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "600",
  },
  deliveryBreakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 4,
    paddingTop: 6,
  },
  deliveryBreakdownTotalLabel: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "600",
  },
  deliveryBreakdownTotalValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
  },
  firstOrderDiscountBadge: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  firstOrderDiscountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
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
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    overflow: "hidden",
  },
  phonePrefix: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    backgroundColor: "#e5e7eb",
  },
  phoneInput: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
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
    marginBottom: 4,
  },
  orderTypeTitleSelected: {
    color: "#fff",
  },
  orderTypeSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  orderTypeSubtitleSelected: {
    color: "rgba(255,255,255,0.9)",
  },
  // 🎉 PROMO CODE STYLES
  promoCodeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  promoCodeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  promoCodeInputContainer: {
    flexDirection: "row",
    gap: 8,
  },
  promoCodeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#F9FAFB",
  },
  promoCodeButton: {
    backgroundColor: PrimaryColor,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  promoCodeButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.6,
  },
  promoCodeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  promoErrorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  appliedPromoContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  appliedPromoContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  appliedPromoCode: {
    fontSize: 14,
    fontWeight: "700",
    color: "#047857",
    letterSpacing: 1,
  },
  appliedPromoDescription: {
    fontSize: 12,
    color: "#059669",
    marginTop: 2,
  },
  modalCentered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  pickupModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${PrimaryColor}1A`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  pickupModalButtons: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  pickupModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  pickupModalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  pickupModalConfirm: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PrimaryColor,
    alignItems: "center",
  },
  pickupModalConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 6,
    alignItems: "center",
  },
  modalPrimary: {
    backgroundColor: PrimaryColor,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
  paymentMethodDisabled: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    opacity: 0.7,
    marginTop: 12,
  },
  paymentMethodDisabledInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodDisabledTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  paymentMethodDisabledSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 16,
  },
  paymentNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  paymentNoticeText: {
    flex: 1,
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 18,
  },
  // 🎁 Gift Order Toggle Styles
  giftOrderToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  giftOrderToggleActive: {
    backgroundColor: "#FFF5EE",
    borderColor: PrimaryColor,
  },
  giftOrderToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  giftOrderToggleInfo: {
    marginLeft: 12,
    flex: 1,
  },
  giftOrderToggleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  giftOrderToggleTitleActive: {
    color: PrimaryColor,
  },
  giftOrderToggleSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D1D5DB",
    justifyContent: "center",
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: PrimaryColor,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  // 🎁 Recipient Section Styles
  recipientSection: {
    backgroundColor: "#FFF8F0",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFD4A3",
    marginTop: 12,
  },
  recipientHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FFD4A3",
  },
  recipientTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: PrimaryColor,
    marginLeft: 8,
  },
  inputNote: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
    fontStyle: "italic",
  },
  inputNoteSuccess: {
    fontSize: 12,
    color: "#10B981",
    marginTop: 6,
    fontWeight: "500",
  },
  townSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  townSelectorContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  townSelectorText: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
  },
  townSelectorPlaceholder: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  townSelectorRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deliveryFeeBadge: {
    backgroundColor: "#DEF7EC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryFeeBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#047857",
  },
});
