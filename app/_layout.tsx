import "react-native-get-random-values";
import { CartProvider } from "@/context/CartContext";
import { PermissionProvider } from "@/context/PermissionContext";
import { AddressProvider } from "@/context/AddressContext";
import { VendorProvider } from "@/context/VendorContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import {
  useRegisterPushToken,
  getSuccessfulOrder,
  clearSuccessfulOrder,
  storeSuccessfulOrder,
  useBrowserNotifications,
} from "@/services/NotificationService";
import { useEffect, useState } from "react";
import { safeGetItem } from "@/actions/auth.ts/action";
import * as Linking from "expo-linking";
import { API_URL } from "@/constants/config";
import { initSocket } from "@/services/SocketService";
import OrderSuccessModal from "@/components/OrderSuccessModal";
import * as WebBrowser from "expo-web-browser";
import { Alert, DeviceEventEmitter } from "react-native";
import WebContainer from "@/components/WebContainer";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import OfflineNotice from "@/components/common/OfflineNotice";
import CookieConsent from "@/components/CookieConsent";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Get userId from AsyncStorage and register push token
  const [userId, setUserId] = useState<string | null>(null);

  // Order success modal state
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);
  const [successfulOrderData, setSuccessfulOrderData] = useState<{
    orderId: string;
    data?: any;
  } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchUserId = async () => {
      const id = await safeGetItem("userId");
      setUserId(id);
    };
    fetchUserId();
  }, [pathname]);

  // Check for successful order on app launch
  useEffect(() => {
    const checkSuccessfulOrder = async () => {
      const orderData = await getSuccessfulOrder();
      // Only show the root-level order success modal when the user
      // is on the app home route ("/") — avoid popping it on other pages
      // such as the Orders page.
      console.log("[RootLayout] current pathname:", pathname);
      if (orderData && pathname === "/") {
        setSuccessfulOrderData(orderData);
        setShowOrderSuccessModal(true);
      } else if (orderData) {
        console.log(
          "[RootLayout] Found successful order but not on home path, skipping modal",
        );
      }
    };
    checkSuccessfulOrder();
  }, [pathname]);

  // Handle deep links for payment results
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log("[DeepLink] Received URL:", url);

      // Debug: Check what type of URL this is
      if (url.includes("payment-success")) {
        console.log("[DeepLink] ✅ This is a payment-success URL");
      } else if (
        url.includes("payment-cancel") ||
        url.includes("payment-failed")
      ) {
        console.log("[DeepLink] ❌ This is a payment-cancel/failed URL");
      } else {
        console.log(
          "[DeepLink] 🔍 This is a generic deep link, ignoring for payment purposes",
        );
        return; // Exit early for non-payment URLs
      }

      // Only process URLs that specifically contain payment-success path
      if (url.includes("payment-success")) {
        console.log("[DeepLink] Payment success URL detected");

        // Check if this is a verified payment (from our payment-success page)
        const isVerified = url.includes("verified=true");
        console.log("[DeepLink] Payment verification status:", isVerified);

        if (isVerified) {
          // Only emit event for verified payments
          DeviceEventEmitter.emit("paymentSuccess", {
            url,
            timestamp: Date.now(),
            verified: true,
          });
          console.log(
            "[DeepLink] ✅ Verified payment success - emitting cart clear event",
          );
        } else {
          console.log(
            "[DeepLink] ⚠️ Unverified payment success - skipping cart clear",
          );
        }

        // Clear cart since payment was successful
        try {
          // We'll need to get cart context differently since this is at provider level
          // For now, we'll dispatch a custom event that the checkout component can listen to
          console.log(
            "[DeepLink] Payment successful - cart should be cleared by checkout component",
          );
        } catch {
          console.log(
            "[DeepLink] Note: Cart clearing will be handled by checkout component",
          );
        }

        // Dismiss any open browser
        WebBrowser.dismissBrowser().catch(() => {
          console.log("[DeepLink] No browser to dismiss");
        });

        // Extract paymentId and orderId from URL if present
        const urlParams = new URLSearchParams(url.split("?")[1]);
        const paymentId = urlParams.get("paymentId");
        const urlOrderId = urlParams.get("orderId");
        console.log("[DeepLink] PaymentId from URL:", paymentId);
        console.log("[DeepLink] OrderId from URL:", urlOrderId);

        // Check for recent successful order to get orderId
        const orderData = await getSuccessfulOrder();
        let orderId = urlOrderId || orderData?.orderId; // Prefer URL param

        // If no stored order data, try to find order by checking recent orders
        if (!orderId && paymentId) {
          try {
            // Import orderApi to fetch recent orders
            const { orderApi } = await import("@/lib/api");
            const result = await orderApi.getCustomerOrders();
            // Find the most recent order (likely the one just created)
            const recentOrder = result.orders[0];
            if (
              recentOrder &&
              new Date(recentOrder.createdAt).getTime() >
                Date.now() - 5 * 60 * 1000
            ) {
              orderId = recentOrder.id;
              console.log("[DeepLink] Found recent order:", orderId);
            }
          } catch (error) {
            console.log("[DeepLink] Error fetching orders:", error);
          }
        }

        if (orderId) {
          // Store successful order for any other components that might need it
          await storeSuccessfulOrder({
            orderId,
            timestamp: Date.now(),
            data: { orderId, status: "completed" },
          });

          // Show success alert with option to view specific order
          Alert.alert(
            "Payment Successful! 🎉",
            "Your payment has been processed successfully.",
            [
              {
                text: "View Order",
                onPress: () =>
                  router.push({
                    pathname: "/order-details",
                    params: { orderId },
                  }),
              },
              {
                text: "View All Orders",
                onPress: () => router.replace("/(tabs)/orders"),
              },
            ],
          );
        } else {
          // Fallback to orders page
          Alert.alert(
            "Payment Successful! 🎉",
            "Your payment has been processed successfully.",
            [
              {
                text: "View Orders",
                onPress: () => router.replace("/(tabs)/orders"),
              },
            ],
          );
        }
      } else if (
        url.includes("payment-cancel") ||
        url.includes("payment-failed")
      ) {
        console.log(
          "[DeepLink] Payment cancelled/failed detected - dismissing browser and returning to app",
        );

        // Dismiss any open browser
        WebBrowser.dismissBrowser().catch(() => {
          console.log("[DeepLink] No browser to dismiss");
        });

        // Extract orderId and reason from URL
        const urlParams = new URLSearchParams(url.split("?")[1]);
        const orderId = urlParams.get("orderId");
        const reason = urlParams.get("reason");

        console.log(
          "[DeepLink] Payment failed for order:",
          orderId,
          "Reason:",
          reason,
        );

        // User is already back in the app - the checkout page will handle showing the error
        // No need for additional alerts here
      }
    };

    // Handle initial URL when app is launched from deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("[DeepLink] Initial URL:", url);
        handleDeepLink(url);
      }
    });

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("[DeepLink] URL event:", event.url);
      handleDeepLink(event.url);
    });

    return () => subscription?.remove();
  }, []);

  const handleCloseOrderSuccessModal = () => {
    setShowOrderSuccessModal(false);
    setSuccessfulOrderData(null);
    clearSuccessfulOrder();
  };

  // Initialize socket and register device for real-time events when userId is available
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const socketBase = API_URL
          ? String(API_URL).replace(/\/api\/?(.*)?$/, "")
          : null;
        console.log("[Socket] Initializing socket with base:", socketBase);
        if (!socketBase) return;
        const s = await initSocket(socketBase);
        if (!s) {
          console.log("[Socket] Failed to initialize socket");
          return;
        }
        console.log("[Socket] Socket initialized successfully");

        // Add debugging for socket events
        s.on("connect", () => {
          console.log("[Socket] Connected to server successfully");
          try {
            s.emit("registerDevice", { userId });
            console.log("[Socket] registerDevice emitted for user", userId);
          } catch (error) {
            console.log("[Socket] Failed to emit registerDevice:", error);
          }
        });

        s.on("disconnect", () => {
          console.log("[Socket] Disconnected from server");
        });

        s.on("connect_error", (error: any) => {
          console.log("[Socket] Connection error:", error);
        });

        // Test socket by listening for any events
        s.onAny((eventName: string, ...args: any[]) => {
          console.log(`[Socket] Received event: ${eventName}`, args);
        });
      } catch (err) {
        console.warn("[Socket] failed to init socket", err);
      }
    })();
  }, [userId]);

  // Handle deep links for payment return
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      console.log("[Deep Link] Received URL:", url);

      // Handle payment success return
      if (
        url.includes("payment-success") ||
        url.includes("teranggo://payment/success")
      ) {
        console.log(
          "[Deep Link] Payment success detected, navigating to orders",
        );
        // Navigate to orders page
        router.replace("/(tabs)/orders");
      }
      // Handle other deep links as needed
      else if (url.includes("teranggo://order/")) {
        const orderId = url.split("/order/")[1];
        if (orderId) {
          console.log("[Deep Link] Navigating to order details:", orderId);
          router.replace(`/order-details?orderId=${orderId}`);
        }
      }
    };

    // Get initial URL if app was opened from a link
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log("[Deep Link] Initial URL:", initialUrl);
        handleDeepLink({ url: initialUrl });
      }
    };

    getInitialURL();

    // Listen for incoming links
    const subscription = Linking.addEventListener("url", handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  useRegisterPushToken(userId ?? "");

  // Initialize browser notifications for web
  useBrowserNotifications();

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <PermissionProvider>
          <AddressProvider>
            <CartProvider>
              <VendorProvider>
                <WebContainer>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    {/* Offline Notice Banner */}
                    <OfflineNotice />

                    <Stack>
                      <Stack.Screen
                        name="landing"
                        options={{
                          headerShown: false,
                          animation: "fade_from_bottom",
                        }}
                      />
                      <Stack.Screen
                        name="onboarding"
                        options={{
                          headerShown: false,
                          animation: "fade_from_bottom",
                        }}
                      />
                      <Stack.Screen
                        name="index"
                        options={{
                          headerShown: false,
                          animation: "fade_from_bottom",
                        }}
                      />
                      <Stack.Screen
                        name="auth/index"
                        options={{
                          headerShown: false,
                          animation: "fade_from_bottom",
                        }}
                      />
                      <Stack.Screen
                        name="auth/otp"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="auth/complete-profile"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="auth/add-home-address"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="CategoryDetailsPage"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="AllCategoriesPage"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="SubCategoryView"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="cart"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="restaurant-details"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="shop-details"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="ShopCategoryPage"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />

                      <Stack.Screen
                        name="checkout"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="product/[productId]"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="menuitem/[menuitem]"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="ViewAllRestaurants"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="order-details"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="order-tracking"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="ViewAllStores"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="storeCategoryProducts"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="payment-methods"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="vendor-application"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="vendor/dashboard"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="vendor/products"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="vendor/orders"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="vendor/profile"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="vendor/menu"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />

                      <Stack.Screen
                        name="custom-delivery/index"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="custom-delivery/[deliveryId]"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="browse/[section]"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="terango-picks"
                        options={{
                          animation: "slide_from_right",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="+not-found"
                        options={{ headerShown: false }}
                      />
                    </Stack>
                    <StatusBar style="auto" />
                  </GestureHandlerRootView>
                </WebContainer>
              </VendorProvider>
            </CartProvider>
          </AddressProvider>
        </PermissionProvider>
        <OrderSuccessModal
          visible={showOrderSuccessModal}
          onClose={handleCloseOrderSuccessModal}
          orderId={successfulOrderData?.orderId || ""}
          orderData={successfulOrderData?.data}
        />
        <CookieConsent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
