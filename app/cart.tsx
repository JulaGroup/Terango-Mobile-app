import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Animated,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart } from "@/context/CartContext";
import { PrimaryColor } from "@/constants/Colors";
import { LinearGradient } from "expo-linear-gradient";

export default function Cart() {
  const router = useRouter();
  const {
    items: cartItems,
    getTotalAmount,
    getTotalQuantity,
    updateQuantity,
    removeFromCart,
    getCartByRestaurant,
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

  const restaurantCarts = getCartByRestaurant();
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
      ]
    );
  };

  // Calculate subtotal, delivery fee and total
  const subtotal = getTotalAmount();
  const deliveryFee = 50; // Example delivery fee
  const total = subtotal + deliveryFee;

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
                  item.imageUrl
                );
              }}
              onLoad={() => {
                console.log(
                  "Successfully loaded cart item image for:",
                  item.name
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

          {item.description && (
            <Text style={styles.itemDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.itemPriceContainer}>
            <Text style={styles.itemPrice}>D{item.price.toFixed(2)}</Text>
            <Text style={styles.itemTotal}>
              D{(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>

          <View style={styles.itemFooter}>
            <Text style={styles.itemRestaurant} numberOfLines={1}>
              <Ionicons name="restaurant" size={12} color="#9CA3AF" />{" "}
              {item.restaurantName}
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
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(item.quantity + 1)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const RestaurantSection = ({
    restaurantId,
    items,
  }: {
    restaurantId: string;
    items: typeof cartItems;
  }) => {
    const restaurantName = items[0]?.restaurantName || "Restaurant";
    const restaurantTotal = items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    return (
      <View style={styles.restaurantSection}>
        <View style={styles.restaurantHeader}>
          <View style={styles.restaurantIcon}>
            <Ionicons name="restaurant" size={18} color="#FF6B35" />
          </View>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{restaurantName}</Text>
            <Text style={styles.restaurantItemCount}>
              {items.length} item{items.length > 1 ? "s" : ""} • D
              {restaurantTotal.toFixed(2)}
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
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

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
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
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
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {restaurantIds.length > 1 && (
          <View style={styles.multiRestaurantNotice}>
            <Ionicons name="information-circle" size={16} color="#F59E0B" />
            <Text style={styles.noticeText}>
              Your cart contains items from {restaurantIds.length} restaurants.
              Separate orders will be created for each.
            </Text>
          </View>
        )}

        {restaurantIds.map((restaurantId) => (
          <RestaurantSection
            key={restaurantId}
            restaurantId={restaurantId}
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
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>D{deliveryFee.toFixed(2)}</Text>
          </View>

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>D{total.toFixed(2)}</Text>
          </View>
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
          style={styles.checkoutButton}
          onPress={() => router.push("/checkout")}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#FF6B35", "#FF8F65"]}
            style={styles.checkoutButtonGradient}
          >
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            <View style={styles.checkoutPriceContainer}>
              <Text style={styles.checkoutPrice}>D{total.toFixed(2)}</Text>
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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
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
    color: "#1f2937",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
    textAlign: "center",
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fef2f2",
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
    minWidth: 30,
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
});
