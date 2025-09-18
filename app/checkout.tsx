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
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useCart } from "@/context/CartContext";
import { userApi, orderApi } from "@/lib/api";
import { debugAuthState } from "@/utils/debugAuth";
import * as SecureStore from "expo-secure-store";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { UserCacheManager } from "@/utils/userCache";
// API_URL no longer required in checkout since payments are skipped
// WebBrowser was used by legacy hosted-payment flow; instant checkout removed it
import { on as socketOn, off as socketOff } from "@/services/SocketService";
import { useAddress } from "@/context/AddressContext";
import LocationModal from "@/components/common/LocationModal";
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
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "processing" | "completed" | "failed" | "cancelled" | null
  >(null);
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
            title: "Payment Successful! 🎉",
            body: "Your order has been placed successfully. Tap to view details.",
            data: { orderId, type: "payment_success" },
          });
        } else {
          console.log(
            "handleOrderCreated: successful order already stored, skipping notification"
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
    [clearCart]
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
      Alert.alert("Payment Failed", "Your payment failed. Please try again.");
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
  });

  // Address context for selecting delivery address
  const { addresses, selectedAddress, setSelectedAddress, fetchAddresses } =
    useAddress();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const [addressesLoaded, setAddressesLoaded] = useState(false);

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

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cash");
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<
    string | null
  >(null);
  const [paymentMethods, setPaymentMethods] = useState<any>(null);
  const [paymentMethodsLoaded, setPaymentMethodsLoaded] = useState(false);

  const restaurantCarts = getCartByVendor();
  const restaurantIds = Object.keys(restaurantCarts);
  const subtotal = getTotalAmount();
  const deliveryFee = form.orderType === "DELIVERY" ? 100 : 0;
  const serviceFee = 100;
  const total = subtotal + deliveryFee + serviceFee;

  // Disable placing order for DELIVERY if no address is selected
  const isPlaceOrderDisabled =
    loading || (form.orderType === "DELIVERY" && !form.address.trim());

  // Auto-open location modal when user selects DELIVERY and they have no saved addresses
  useEffect(() => {
    if (
      form.orderType === "DELIVERY" &&
      addressesLoaded &&
      (!addresses || addresses.length === 0)
    ) {
      setShowLocationModal(true);
    }
  }, [form.orderType, addresses, addressesLoaded]);

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

  // Legacy polling / deep-link handlers removed: instant checkout handles order creation synchronously.

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
              "- defaulting to 'restaurant'"
            );
            entityType = "restaurant";
          }

          // Prefer vendor-specific id on the item if present
          const itemVendorId = vendorItems[0].vendorId || vendorId;

          // Validation: ensure we resolved a vendor id and entityType is set
          if (!itemVendorId) {
            console.error(
              "Checkout validation failed: missing vendor id for group",
              vendorId,
              vendorItems
            );
            Alert.alert(
              "Checkout Error",
              `Missing vendor id for items in cart for vendor group ${vendorId}. Cannot create order.`
            );
            setLoading(false);
            return;
          }
          if (!entityType) {
            console.error(
              "Checkout validation failed: missing entityType for vendor group",
              vendorId,
              vendorItems
            );
            Alert.alert(
              "Checkout Error",
              `Unable to determine entity type (restaurant/shop/pharmacy) for vendor group ${vendorId}. Cannot create order.`
            );
            setLoading(false);
            return;
          }

          const itemsPayload = vendorItems.map((it: any) => {
            if (entityType === "restaurant")
              return { menuItemId: it.id, quantity: it.quantity };
            if (entityType === "shop")
              return { productId: it.id, quantity: it.quantity };
            if (entityType === "pharmacy")
              return { medicineId: it.id, quantity: it.quantity };
            return { productId: it.id, quantity: it.quantity };
          });

          const orderPayload: any = {
            customerName: form.name,
            customerPhone: form.phone,
            deliveryAddress:
              form.orderType === "DELIVERY" ? form.address : null,
            orderType: form.orderType,
            pickupInstructions:
              form.orderType === "PICKUP" ? form.pickupInstructions : null,
            items: itemsPayload,
            notes: form.notes,
          };

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
            orderPayload
          );

          const created = await orderApi.createOrder(orderPayload);
          if (created && created.id) {
            createdOrderIds.push(created.id);
            // Show the order-created modal immediately for the first created order
            // so the user can view it or continue shopping without waiting for
            // the rest of the vendor orders to finish.
            try {
              if (createdOrderIds.length === 1) {
                await handleOrderCreated(created.id);
                createdOrderIdsShown = true;
                // Route user to home immediately so the global OrderSuccessModal
                // (root-level) can display the stored successful order.
                try {
                  router.replace("/");
                } catch (e) {
                  console.warn(
                    "Failed to navigate home after order create:",
                    e
                  );
                }
              }
            } catch (e) {
              console.warn("handleOrderCreated immediate show failed:", e);
            }
          }
        }

        if (createdOrderIds.length > 0) {
          // If we already showed the modal when the first order was created,
          // skip calling handleOrderCreated again. Otherwise show for the
          // first created order now.
          if (!createdOrderIdsShown) {
            await handleOrderCreated(createdOrderIds[0]);
          }
        } else {
          Alert.alert(
            "Order Error",
            "No orders were created. Please try again."
          );
        }
      } catch (orderErr: any) {
        console.error("Order creation error:", orderErr);
        Alert.alert(
          "Order Failed",
          orderErr.message || "Unable to create order. Please try again."
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

  // Order-created modal will appear when instant checkout succeeds

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
                      Total: D{restaurantTotal.toFixed(2)}
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
              {paymentStatus === "pending" && (
                <View style={styles.pollingIndicator}>
                  <Ionicons name="radio-button-on" size={12} color="#10B981" />
                  <Text style={styles.pollingText}>Processing payment...</Text>
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

        {/* Order Created Modal */}
        <Modal visible={orderCreated.visible} animationType="slide" transparent>
          <SafeAreaView style={styles.modalCentered}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Order placed 🎉</Text>
              <Text style={styles.modalMessage}>
                Your order has been placed successfully.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
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
                ) : (
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                )}
                <Text style={styles.placeOrderText}>
                  {loading ? "Placing Order..." : "Place Order"}
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
});
