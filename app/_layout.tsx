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
import {
  GestureHandlerRootView,
  // StatusBar,
} from "react-native-gesture-handler";
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
import { Alert, DeviceEventEmitter, StatusBar } from "react-native";
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

      // Only process payment URLs
      if (!url.includes("payment-success") && !url.includes("payment-cancel")) {
        console.log("[DeepLink] Not a payment URL, ignoring");
        return;
      }

      // Extract parameters
      const urlParams = new URLSearchParams(url.split("?")[1]);
      const orderId = urlParams.get("orderId");
      const paymentId = urlParams.get("paymentId");
      const verified = urlParams.get("verified");
      const status = urlParams.get("status");

      console.log("[DeepLink] Payment params:", {
        orderId,
        paymentId,
        verified,
        status,
      });

      // Dismiss any open browser/webview
      try {
        await WebBrowser.dismissBrowser();
      } catch (e) {
        console.log("[DeepLink] No browser to dismiss");
      }

      // Handle payment success
      if (url.includes("payment-success") && verified === "true") {
        console.log("[DeepLink] ✅ Verified payment success!");

        if (!orderId || !paymentId) {
          Alert.alert("Error", "Missing order or payment information");
          return;
        }

        try {
          // Confirm payment with server
          console.log("[DeepLink] Confirming payment with server...");
          const { orderApi } = await import("@/lib/api");
          await orderApi.confirmPaymentSuccess(orderId, paymentId);
          console.log("[DeepLink] ✅ Payment confirmed with server");

          // Store successful order
          await storeSuccessfulOrder({
            orderId,
            timestamp: Date.now(),
            data: { orderId, status: "completed", paymentId },
          });

          // Show success alert
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
        } catch (error) {
          console.error("[DeepLink] Payment confirmation failed:", error);
          Alert.alert(
            "Payment Confirmed",
            "Your payment was successful! You can view your order in the Orders tab.",
            [
              {
                text: "View Orders",
                onPress: () => router.replace("/(tabs)/orders"),
              },
            ],
          );
        }
      }
      // Handle payment cancellation
      else if (url.includes("payment-cancel") || status === "cancelled") {
        console.log("[DeepLink] ❌ Payment cancelled");
        // Just log it - the order page will handle the UI
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
                    <StatusBar barStyle="default" />
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
