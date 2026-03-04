import "react-native-get-random-values";
import { CartProvider } from "@/context/CartContext";
import { PermissionProvider } from "@/context/PermissionContext";
import { AddressProvider } from "@/context/AddressContext";
import { VendorProvider } from "@/context/VendorContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, router, usePathname } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  NotificationService,
  BrowserNotificationService,
  useRegisterPushToken,
  getSuccessfulOrder,
  clearSuccessfulOrder,
  useBrowserNotifications,
} from "@/services/NotificationService";
import OrderSuccessModal from "@/components/OrderSuccessModal";
import { useEffect, useRef, useState } from "react";
import { safeGetItem } from "@/actions/auth.ts/action";
import * as Linking from "expo-linking";
import { API_URL } from "@/constants/config";
import { orderApi } from "@/lib/api";
import { initSocket } from "@/services/SocketService";
import * as Notifications from "expo-notifications";
import { View, Text, StatusBar, Platform } from "react-native";
import WebContainer from "@/components/WebContainer";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import OfflineNotice from "@/components/common/OfflineNotice";
import CookieConsent from "@/components/CookieConsent";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const [userId, setUserId] = useState<string | null>(null);

  // OrderSuccessModal — shown when checkout creates a new order successfully
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);
  const [successfulOrderData, setSuccessfulOrderData] = useState<{
    orderId: string;
    data?: any;
  } | null>(null);
  const orderModalShown = useRef(false);

  // Transient payment toast — shows for 3.2s after Wave payment confirmed
  const [paymentToast, setPaymentToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  const showPaymentToast = (
    message: string,
    variant: "success" | "error" = "success",
  ) => {
    setPaymentToast({ message, variant });
    setTimeout(() => setPaymentToast(null), 3200);
  };

  const pathname = usePathname();

  useEffect(() => {
    safeGetItem("userId").then((id) => setUserId(id));
  }, [pathname]);

  // Reset modal guard when user leaves Home so it can show again after next order
  useEffect(() => {
    if (pathname !== "/") orderModalShown.current = false;
  }, [pathname]);

  // Show OrderSuccessModal when user lands on Home after a successful order creation
  // (written by checkout flow via storeSuccessfulOrder)
  useEffect(() => {
    const checkSuccessfulOrder = async () => {
      if (pathname !== "/") return;
      if (orderModalShown.current) return;
      const orderData = await getSuccessfulOrder();
      if (!orderData) return;
      orderModalShown.current = true;
      setSuccessfulOrderData(orderData);
      setShowOrderSuccessModal(true);
    };
    checkSuccessfulOrder();
  }, [pathname]);

  const handleCloseOrderSuccessModal = () => {
    setShowOrderSuccessModal(false);
    setSuccessfulOrderData(null);
    clearSuccessfulOrder();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Deep-link handler for Wave payment callbacks.
  //
  // Flow (new - no in-app browser):
  //   Wave app completes payment
  //     → Wave opens HTTPS success_url in system browser (Safari/Chrome)
  //     → /api/redirect/payment-success runs (DB update + socket emit)
  //     → Invisible HTML page fires teranggo://payment-success?orderId=X instantly
  //     → iOS/Android opens our app via the teranggo:// scheme
  //     → This handler fires
  //     → router.replace("/")   user sees Home
  //     → showPaymentToast()    green snack for 3.2s
  //
  // NOTE: No WebBrowser.dismissBrowser() needed — there is no in-app browser.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        console.log("[DeepLink] Received:", url);

        const isPaymentUrl =
          url.includes("payment-success") ||
          url.includes("payment/success") ||
          url.includes("payment-cancel") ||
          url.includes("payment/cancel") ||
          url.includes("payment-failed") ||
          url.includes("payment/failed");

        if (!isPaymentUrl) return;

        const qs = url.includes("?") ? url.split("?")[1] : "";
        const urlParams = new URLSearchParams(qs);
        const orderId = urlParams.get("orderId") ?? undefined;
        const paymentId = urlParams.get("paymentId") ?? undefined;
        const status = urlParams.get("status") ?? undefined;
        const reason = urlParams.get("reason") ?? undefined;

        console.log("[DeepLink] Params:", { orderId, paymentId, status });

        // ── SUCCESS ────────────────────────────────────────────────────────
        if (
          url.includes("payment-success") ||
          url.includes("payment/success")
        ) {
          // immediately route home so something renders while background work happens
          router.replace({ pathname: "/" });

          showPaymentToast(
            orderId
              ? `Payment received — Order TG${String(orderId).slice(-4).toUpperCase()}`
              : "Payment successful",
            "success",
          );

          // schedule notifications
          try {
            const notifTitle = "Your payment has been made successfully";
            const notifBody = orderId
              ? `Order TG${String(orderId).slice(-4).toUpperCase()} — Tap to view your order.`
              : "Payment successful — Tap to view your order.";

            NotificationService.scheduleOrderNotification({
              orderId: orderId ?? "",
              title: notifTitle,
              body: "Tap to view your order.",
              data: { orderId, type: "payment_success", paymentId },
            }).catch((e) =>
              console.warn(
                "[DeepLink] Failed to schedule local notification:",
                e,
              ),
            );

            if (Platform.OS === "web") {
              BrowserNotificationService.showNotification(notifTitle, {
                body: notifBody,
                tag: `payment-${orderId ?? "unknown"}`,
                data: { orderId, type: "payment_success" },
              }).catch((e) =>
                console.warn(
                  "[DeepLink] Failed to show browser notification:",
                  e,
                ),
              );
            }
          } catch (e) {
            console.warn("[DeepLink] Notification error:", e);
          }

          // Background confirm — strictly a fallback; redirect handler should already
          // have updated the DB. Log outcome for debugging and warn if orderId missing.
          if (orderId) {
            console.log(
              "[DeepLink] Sending background confirm for order:",
              orderId,
            );
            orderApi
              .confirmPaymentSuccess(orderId, paymentId)
              .then((res) => {
                console.log(
                  "[DeepLink] BG confirm OK — order status:",
                  (res as any)?.order?.status,
                );
              })
              .catch((e) =>
                console.warn(
                  "[DeepLink] BG confirm failed (non-fatal, backend redirect should have already updated DB):",
                  e,
                ),
              );
          } else {
            console.warn(
              "[DeepLink] payment-success deep-link received WITHOUT orderId — " +
                "DB update may not have happened. Check that Wave success_url includes ?orderId=...",
            );
          }

          return;
        }

        // ── CANCEL / FAILURE ───────────────────────────────────────────────
        const target =
          url.includes("payment-failed") ||
          url.includes("payment/failed") ||
          status === "failed"
            ? "/payment-failed"
            : "/payment-cancel";

        showPaymentToast(
          status === "failed" || url.includes("payment-failed")
            ? reason
              ? `Payment failed: ${reason}`
              : "Payment failed"
            : "Payment cancelled",
          "error",
        );

        router.replace({
          pathname: target,
          params: {
            orderId: orderId ?? "",
            paymentId: paymentId ?? "",
            reason: reason ?? "",
            status: status ?? "",
          },
        });
      } catch (err: any) {
        console.error("[DeepLink] Unhandled error:", err);
        router.replace({ pathname: "/" });
      }
    };

    // Cold launch
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("[DeepLink] Cold-launch URL:", url);
        handleDeepLink(url);
      }
    });

    // Warm / foreground
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("[DeepLink] Foreground URL:", event.url);
      handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, []);

  // Socket: init + register device + listen for payment events
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const socketBase = API_URL
          ? String(API_URL).replace(/\/api\/?(.*)?$/, "")
          : null;
        if (!socketBase) return;
        const s = await initSocket(socketBase);
        if (!s) return;

        s.on("connect", () => {
          try {
            s.emit("registerDevice", { userId });
            console.log("[Socket] registerDevice for", userId);
          } catch {
            /* ignore */
          }
        });

        s.on("disconnect", () =>
          console.log("[Socket] Disconnected from server"),
        );

        s.on("connect_error", (error: any) =>
          console.log("[Socket] Connection error:", error),
        );

        s.onAny((eventName: string, ...args: any[]) =>
          console.log(`[Socket] ${eventName}`, args),
        );

        // Real-time snack when paymentSuccess socket fires (foreground)
        s.on("paymentSuccess", (data: any) => {
          try {
            showPaymentToast(
              data?.orderId
                ? `Payment received — Order TG${String(data.orderId).slice(-4).toUpperCase()}`
                : "Payment successful",
              "success",
            );
          } catch {
            /* ignore */
          }
        });

        s.on("paymentFailed", (data: any) => {
          try {
            showPaymentToast(
              data?.orderId
                ? `Payment failed — Order TG${String(data.orderId).slice(-4).toUpperCase()}`
                : "Payment failed",
              "error",
            );
          } catch {
            /* ignore */
          }
        });
      } catch (err) {
        console.warn("[Socket] init failed:", err);
      }
    })();
  }, [userId]);

  useRegisterPushToken(userId ?? "");
  useBrowserNotifications();

  // Handle notification taps → navigate to order-details
  useEffect(() => {
    // App was already open (foreground/background)
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        if (data?.orderId) {
          router.push({
            pathname: "/order-details",
            params: { orderId: String(data.orderId) },
          });
        }
      },
    );

    // App was killed — check if launched via notification tap
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as any;
        if (data?.orderId) {
          router.push({
            pathname: "/order-details",
            params: { orderId: String(data.orderId) },
          });
        }
      }
    });

    return () => subscription.remove();
  }, []);

  if (!loaded) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <PermissionProvider>
          <AddressProvider>
            <CartProvider>
              <VendorProvider>
                <NotificationProvider>
                  <WebContainer>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <OfflineNotice />

                      {/* Payment result snack — appears above everything, auto-dismisses */}
                      {paymentToast && (
                        <View
                          style={{
                            position: "absolute",
                            left: 20,
                            right: 20,
                            bottom: 90,
                            backgroundColor:
                              paymentToast.variant === "error"
                                ? "rgba(239,68,68,0.95)"
                                : "rgba(16,185,129,0.95)",
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 12,
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 2000,
                            shadowColor: "#000",
                            shadowOpacity: 0.15,
                            shadowRadius: 10,
                            elevation: 10,
                          }}
                        >
                          <Text
                            style={{
                              color: "#fff",
                              fontWeight: "700",
                              fontSize: 14,
                              textAlign: "center",
                            }}
                          >
                            {paymentToast.message}
                          </Text>
                        </View>
                      )}

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
                          name="payment-success"
                          options={{
                            animation: "fade",
                            headerShown: false,
                            presentation: "card",
                          }}
                        />
                        <Stack.Screen
                          name="payment-cancel"
                          options={{
                            animation: "fade",
                            headerShown: false,
                            presentation: "card",
                          }}
                        />
                        <Stack.Screen
                          name="payment-failed"
                          options={{
                            animation: "fade",
                            headerShown: false,
                            presentation: "card",
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
                </NotificationProvider>
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
