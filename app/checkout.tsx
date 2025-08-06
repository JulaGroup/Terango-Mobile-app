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
} from "react-native";
import { useRouter } from "expo-router";
import { useCart } from "@/context/CartContext";
import { orderApi, type CreateOrderData } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { UserCacheManager } from "@/utils/userCache";

export default function Checkout() {
  const router = useRouter();
  const {
    items,
    clearCart,
    getTotalAmount,
    getTotalQuantity,
    getCartByRestaurant,
  } = useCart();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerScale = useRef(new Animated.Value(0.95)).current;

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const [userProfile, setUserProfile] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    isVerified?: boolean;
  } | null>(null);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cash");

  const restaurantCarts = getCartByRestaurant();
  const restaurantIds = Object.keys(restaurantCarts);
  const subtotal = getTotalAmount();
  const deliveryFee = 300;
  const serviceFee = 25;
  const total = subtotal + deliveryFee + serviceFee;

  const loadUserInfo = useCallback(async () => {
    try {
      const savedAddress = await AsyncStorage.getItem("userAddress");

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
        }));
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
        }));
      } else if (!cached) {
        // Fallback to legacy AsyncStorage if both cache and API fail
        console.log("Falling back to legacy AsyncStorage");
        const [userPhone, userName, userEmail, userAddress] = await Promise.all(
          [
            AsyncStorage.getItem("userPhone"),
            AsyncStorage.getItem("userName"),
            AsyncStorage.getItem("userEmail"),
            AsyncStorage.getItem("userAddress"),
          ]
        );

        setForm((prev) => ({
          ...prev,
          phone: userPhone || "",
          name: userName || "",
          email: userEmail || "",
          address: userAddress || "",
        }));
      }
    } catch (error) {
      console.error("Error in loadUserInfo:", error);
    }
  }, []);

  const checkAuthAndLoadUserInfo = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");

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

  const handlePlaceOrder = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    if (items.length === 0) {
      Alert.alert("Empty Cart", "Your cart is empty.");
      return;
    }

    setLoading(true);

    try {
      // Create orders for each restaurant
      const orderPromises = restaurantIds.map(async (restaurantId) => {
        const restaurantItems = restaurantCarts[restaurantId];

        const orderData: CreateOrderData = {
          restaurantId,
          customerName: form.name,
          customerPhone: form.phone,
          deliveryAddress: form.address,
          items: restaurantItems.map((item) => ({
            menuItemId: item.id,
            quantity: item.quantity,
          })),
          notes: form.notes,
        };

        return orderApi.createOrder(orderData);
      });

      await Promise.all(orderPromises);

      // Save address for future use and update user data cache
      await AsyncStorage.setItem("userAddress", form.address);
      if (form.email) {
        await AsyncStorage.setItem("userEmail", form.email);
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

      Alert.alert(
        "Order Placed Successfully!",
        `Your order${
          restaurantIds.length > 1 ? "s have" : " has"
        } been placed successfully. You will receive a confirmation shortly.`,
        [
          {
            text: "OK",
            onPress: () => {
              clearCart();
              router.replace("/");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error placing order:", error);
      Alert.alert(
        "Order Failed",
        "There was an error placing your order. Please try again."
      );
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
      style={[styles.paymentMethod, selected && styles.paymentMethodSelected]}
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
        style={[styles.radioButton, selected && styles.radioButtonSelected]}
      >
        {selected && <View style={styles.radioButtonInner} />}
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
                restaurantItems[0]?.restaurantName || "Restaurant";
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
                <Text style={styles.totalLabel}>Delivery Fee</Text>
                <Text style={styles.totalValue}>D{deliveryFee.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Service Fee</Text>
                <Text style={styles.totalValue}>D{serviceFee.toFixed(2)}</Text>
              </View>
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
            <Text style={styles.sectionTitle}>Delivery Information</Text>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                {userProfile?.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#10B981"
                    />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
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
                {userProfile?.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#10B981"
                    />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
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
            <Text style={styles.sectionTitle}>Payment Method</Text>

            <PaymentMethodCard
              method="cash"
              icon="cash"
              title="Cash on Delivery"
              subtitle="Pay when your order arrives"
              selected={selectedPaymentMethod === "cash"}
              onPress={() => setSelectedPaymentMethod("cash")}
            />

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
              icon="phone-portrait"
              title="Mobile Money"
              subtitle="Pay with mobile money services"
              selected={selectedPaymentMethod === "mobile"}
              onPress={() => setSelectedPaymentMethod("mobile")}
            />
          </Animated.View>

          {restaurantIds.length > 1 && (
            <View style={styles.multiRestaurantNotice}>
              <Ionicons name="information-circle" size={16} color="#F59E0B" />
              <Text style={styles.noticeText}>
                Your order contains items from {restaurantIds.length}{" "}
                restaurants. Separate orders will be created for each
                restaurant.
              </Text>
            </View>
          )}
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
              loading && styles.placeOrderButtonDisabled,
            ]}
            onPress={handlePlaceOrder}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                loading ? ["#9CA3AF", "#6B7280"] : [PrimaryColor, "#FF8F65"]
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
});
