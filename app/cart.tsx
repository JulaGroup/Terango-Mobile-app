import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Animated,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart } from "@/context/CartContext";
import { PrimaryColor } from "@/constants/Colors";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVendorOrderingStatus } from "@/hooks/useVendorOrderingStatus";
import { VendorType } from "@/utils/vendorOrdering";

export default function Cart() {
  const router = useRouter();
  const {
    items: cartItems,
    getTotalAmount,
    getTotalQuantity,
    updateQuantity,
    removeFromCart,
    getCartByVendor,
    clearCart,
  } = useCart();

  // Enhanced animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const checkoutButtonAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.95)).current;

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
      Animated.timing(checkoutButtonAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, checkoutButtonAnim, headerScale]);

  const restaurantCarts = getCartByVendor();
  const restaurantIds = Object.keys(restaurantCarts);

  const handleClearCart = () => {
    Alert.alert(
      "Clear Cart",
      "Are you sure you want to remove all items from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: clearCart,
        },
      ],
    );
  };

  // Calculate subtotal (delivery fee determined at checkout based on address)
  const subtotal = getTotalAmount();
  const MIN_ORDER_AMOUNT = 1;
  const meetsMinimum = subtotal >= MIN_ORDER_AMOUNT;
  const remaining = MIN_ORDER_AMOUNT - subtotal;
  const CartItemCard = ({
    item,
    index,
  }: {
    item: (typeof cartItems)[0];
    index: number;
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const itemSlideAnim = useRef(new Animated.Value(50)).current;
    const itemFadeAnim = useRef(new Animated.Value(0)).current;

    // Determine vendor type from entity type
    const vendorType: VendorType =
      item.entityType === "menuItem" ? "restaurant" : "shop";

    // Check vendor ordering status
    const { orderingDisabled, disabledReason } = useVendorOrderingStatus({
      vendorId: item.vendorId,
      vendorType,
    });

    useEffect(() => {
      Animated.parallel([
        Animated.timing(itemFadeAnim, {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(itemSlideAnim, {
          toValue: 0,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        }),
      ]).start();
    }, [itemFadeAnim, itemSlideAnim, index]);

    const handleQuantityChange = (newQuantity: number) => {
      // Prevent adding more items if vendor is not accepting orders
      if (newQuantity > item.quantity && orderingDisabled) {
        const vendorLabel = vendorType === "restaurant" ? "restaurant" : "shop";
        Alert.alert(
          "Cannot Add More Items",
          disabledReason ||
            `This ${vendorLabel} is not accepting orders right now. You can keep existing items in your cart, but cannot add more.`,
        );
        return;
      }

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      if (newQuantity === 0) {
        removeFromCart(item.id);
      } else {
        updateQuantity(item.id, newQuantity);
      }
    };

    return (
      <Animated.View
        style={[
          styles.cartItem,
          {
            opacity: itemFadeAnim,
            transform: [{ translateY: itemSlideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity style={styles.itemImageContainer} activeOpacity={0.8}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.image}
              resizeMode="cover"
              onError={(error) => {
                console.log(
                  "Failed to load cart item image for:",
                  item.name,
                  "URL:",
                  item.imageUrl,
                );
              }}
              onLoad={() => {
                console.log(
                  "Successfully loaded cart item image for:",
                  item.name,
                );
              }}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="fast-food" size={28} color="#9CA3AF" />
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)"]}
            style={styles.imageGradient}
          />
          {orderingDisabled && (
            <View style={styles.disabledBadge}>
              <Ionicons name="warning" size={12} color="#fff" />
              <Text style={styles.disabledBadgeText}>Unavailable</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.itemDetails}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeFromCart(item.id)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {orderingDisabled && disabledReason && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning-outline" size={14} color="#F59E0B" />
              <Text style={styles.warningText} numberOfLines={2}>
                {disabledReason}
              </Text>
            </View>
          )}

          {item.description && !orderingDisabled ? (
            <Text style={styles.itemDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.itemPriceContainer}>
            {item.discountedPrice && item.discountedPrice < item.price ? (
              <>
                <Text style={styles.itemPriceStrikethrough}>
                  D{item.price.toFixed(2)}
                </Text>
                <Text style={styles.itemTotal}>
                  D{(item.discountedPrice * item.quantity).toFixed(2)}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.itemPrice}>D{item.price.toFixed(2)}</Text>
                <Text style={styles.itemTotal}>
                  D{(item.price * item.quantity).toFixed(2)}
                </Text>
              </>
            )}
          </View>

          <View style={styles.itemFooter}>
            <Text style={styles.itemRestaurant} numberOfLines={1}>
              <Ionicons name="restaurant" size={12} color="#9CA3AF" />{" "}
              {item.vendorName}
            </Text>

            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(item.quantity - 1)}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={16} color="#fff" />
              </TouchableOpacity>

              <View style={styles.quantityDisplay}>
                <Text style={styles.quantity}>{item.quantity}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  orderingDisabled && styles.quantityButtonDisabled,
                ]}
                onPress={() => handleQuantityChange(item.quantity + 1)}
                activeOpacity={orderingDisabled ? 1 : 0.7}
                disabled={orderingDisabled}
              >
                <Ionicons
                  name="add"
                  size={16}
                  color={orderingDisabled ? "#9CA3AF" : "#fff"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const VendorSection = ({
    vendorId,
    items,
  }: {
    vendorId: string;
    items: typeof cartItems;
  }) => {
    const vendorName = items[0]?.vendorName || "Vendor";
    const vendorTotal = items.reduce((total, item) => {
      const itemPrice = item.discountedPrice || item.price;
      return total + itemPrice * item.quantity;
    }, 0);

    return (
      <View style={styles.restaurantSection}>
        <View style={styles.restaurantHeader}>
          <View style={styles.restaurantIcon}>
            <Ionicons name="restaurant" size={18} color="#FF6B35" />
          </View>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{vendorName}</Text>
            <Text style={styles.restaurantItemCount}>
              {items.length} item{items.length > 1 ? "s" : ""} • D
              {vendorTotal.toFixed(2)}
            </Text>
          </View>
        </View>

        {items.map((item, index) => (
          <CartItemCard key={item.id} item={item} index={index} />
        ))}
      </View>
    );
  };

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#ff6b00" />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.cartIconContainer}>
              <Ionicons name="cart" size={24} color={PrimaryColor} />
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Your Cart</Text>
            </View>
          </View>

          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyState}>
          <View style={styles.emptyCartIconContainer}>
            <Ionicons name="cart-outline" size={64} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyDescription}>
            Looks like you haven&apos;t added anything to your cart yet.
            Discover amazing restaurants and delicious food!
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.replace("/")}
          >
            <LinearGradient
              colors={["#FF6B35", "#FF8F65"]}
              style={styles.shopButtonGradient}
            >
              <Ionicons name="storefront" size={20} color="#fff" />
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ff6b00" />

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
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {/* <View style={styles.cartIconContainer}>
            <Ionicons name="cart" size={24} color={PrimaryColor} />
          </View> */}
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>My Cart</Text>
            <Text style={styles.headerSubtitle}>
              {getTotalQuantity()} item{getTotalQuantity() > 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.clearButton} onPress={handleClearCart}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {restaurantIds.length > 1 ? (
          <View style={styles.multiRestaurantNotice}>
            <Ionicons name="information-circle" size={16} color="#F59E0B" />
            <Text style={styles.noticeText}>
              Your cart contains items from {restaurantIds.length} restaurants.
              Separate orders will be created for each.
            </Text>
          </View>
        ) : null}

        {restaurantIds.map((restaurantId) => (
          <VendorSection
            key={restaurantId}
            vendorId={restaurantId}
            items={restaurantCarts[restaurantId]}
          />
        ))}

        {/* Order Summary */}
        <View style={styles.orderSummaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>D{subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee (5%)</Text>
            <Text style={styles.summaryValue}>
              D{(subtotal * 0.05).toFixed(1)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: "#6b7280", fontStyle: "italic" },
              ]}
            >
              Calculated at checkout
            </Text>
          </View>

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalValue}>
              D{(subtotal + subtotal * 0.05).toFixed(2)}+
            </Text>
          </View>

          {!meetsMinimum && (
            <View
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                backgroundColor: "#FEF3C7",
                borderLeftWidth: 3,
                borderLeftColor: "#F59E0B",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="warning-outline" size={18} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: "#92400E" }}
                >
                  Minimum order is D{MIN_ORDER_AMOUNT.toFixed(2)}
                </Text>
                <Text style={{ fontSize: 12, color: "#B45309", marginTop: 2 }}>
                  Add D{remaining.toFixed(2)} more to proceed
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.deliveryNote}>
            💡 Delivery fee will be added based on your address
          </Text>
        </View>

        <View style={styles.spacing} />
      </ScrollView>

      {/* Footer with checkout button */}
      <Animated.View
        style={[
          styles.footer,
          {
            opacity: checkoutButtonAnim,
            transform: [
              {
                translateY: checkoutButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.checkoutButton, !meetsMinimum && { opacity: 0.5 }]}
          onPress={() => {
            if (!meetsMinimum) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/checkout");
          }}
          activeOpacity={meetsMinimum ? 0.8 : 1}
        >
          <LinearGradient
            colors={
              meetsMinimum ? ["#FF6B35", "#FF8F65"] : ["#9CA3AF", "#6B7280"]
            }
            style={styles.checkoutButtonGradient}
          >
            <Text style={styles.checkoutText}>
              {meetsMinimum
                ? "Proceed to Checkout"
                : `Add D${remaining.toFixed(2)} more`}
            </Text>
            <View style={styles.checkoutPriceContainer}>
              <Text style={styles.checkoutPrice}>D{subtotal.toFixed(2)}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
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
    backgroundColor: "#ff6b00",
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  cartIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF5EEFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
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
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  multiRestaurantNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#92400E",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
  restaurantSection: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  restaurantHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  restaurantIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff3f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  restaurantItemCount: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  itemDetails: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6,
    lineHeight: 16,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: PrimaryColor,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  itemPriceStrikethrough: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
    textDecorationLine: "line-through",
  },
  itemPriceDiscounted: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EF4444",
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemRestaurant: {
    fontSize: 11,
    color: "#9ca3af",
    maxWidth: "50%",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: PrimaryColor,
    borderRadius: 14,
  },
  quantity: {
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    minWidth: 35,
    textAlign: "center",
  },
  removeButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 14,
    marginLeft: 5,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  orderSummaryCard: {
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
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: PrimaryColor,
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
  checkoutButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  checkoutButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  checkoutPriceContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  checkoutPrice: {
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
  emptyCartIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
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
  shopButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  shopButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
  },
  shopButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  spacing: {
    height: 100,
  },
  // New enhanced styles
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  itemPriceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  quantityDisplay: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 8,
    minWidth: 40,
    alignItems: "center",
  },
  deliveryNote: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    lineHeight: 18,
    fontStyle: "italic",
  },
  disabledBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  disabledBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    marginBottom: 6,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: "#92400E",
    lineHeight: 14,
  },
  quantityButtonDisabled: {
    backgroundColor: "#E5E7EB",
    opacity: 0.5,
  },
});
