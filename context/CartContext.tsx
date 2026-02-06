import React, {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { Alert, Platform } from "react-native";
import { router } from "expo-router";
import { SecureStorage } from "@/utils/secureStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CartItem {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number; // Add discounted price support
  quantity: number;
  imageUrl?: string;
  vendorId: string;
  vendorName: string;
  description?: string;
  entityType: string;
}

interface CartContextType {
  items: CartItem[];
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getTotalAmount: () => number;
  getItemCount: () => number;
  getTotalQuantity: () => number;
  getQuantity: (itemId: string) => number;
  getVendorDetails: () => { id: string; name: string } | null;
  getCartByVendor: () => Record<string, CartItem[]>;
}

const CartContext = createContext<CartContextType>({
  items: [],
  cartItems: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getCartTotal: () => 0,
  getTotalAmount: () => 0,
  getItemCount: () => 0,
  getTotalQuantity: () => 0,
  getQuantity: () => 0,
  getVendorDetails: () => null,
  getCartByVendor: () => ({}),
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // FIX: Debounced persistence for cart items
  // Using useRef to track the debounce timeout
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoadRef = useRef(true);

  // Load cart from storage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const savedCart = await AsyncStorage.getItem("teranggo_cart");
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          setItems(Array.isArray(parsedCart) ? parsedCart : []);
          console.log(
            "[CartContext] ✅ Loaded cart from storage:",
            parsedCart.length,
            "items",
          );
        }
      } catch (error) {
        console.error("[CartContext] Failed to load cart from storage:", error);
      } finally {
        isFirstLoadRef.current = false;
      }
    };

    loadCart();
  }, []);

  // FIX: Debounced save whenever items change
  useEffect(() => {
    // Skip saving on initial load
    if (isFirstLoadRef.current) return;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout - save after 1 second of inactivity
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        if (items.length > 0) {
          await AsyncStorage.setItem("teranggo_cart", JSON.stringify(items));
          console.log(
            "[CartContext] ✅ Cart saved to storage:",
            items.length,
            "items",
          );
        } else {
          // Clear storage if cart is empty
          await AsyncStorage.removeItem("teranggo_cart");
          console.log("[CartContext] ✅ Cart cleared from storage");
        }
      } catch (error) {
        console.error("[CartContext] Failed to save cart to storage:", error);
      }
    }, 1000); // 1 second debounce delay

    // Cleanup on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [items]);

  const addToCart = async (
    newItem: Omit<CartItem, "quantity"> & { quantity?: number },
  ) => {
    // Allow adding to cart without login (login required at checkout)
    // Check if we already have items from a different vendor
    if (items.length > 0 && items[0].vendorId !== newItem.vendorId) {
      Alert.alert(
        "Start New Cart?",
        "You have items in your cart from a different vendor.. Would you like to start a new cart?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Yes, Start New",
            onPress: () => {
              setItems([{ ...newItem, quantity: newItem.quantity || 1 }]);
            },
          },
        ],
      );
      console.debug(
        "CartContext.addToCart: aborting - vendor mismatch",
        "existing:",
        items[0]?.vendorId,
        "new:",
        newItem.vendorId,
      );
      return;
    }
    console.debug(
      "CartContext.addToCart: proceeding to add/update item",
      newItem.id,
      newItem.vendorId,
    );

    setItems((currentItems) => {
      // Normalize incoming item: ensure vendorId, vendorName, entityType exist
      const safeNewItem: any = {
        ...newItem,
        entityType:
          newItem.entityType &&
          ["restaurant", "shop", "pharmacy"].includes(newItem.entityType)
            ? newItem.entityType
            : // map common non-standard values to 'shop'
              newItem.entityType === "product" ||
                newItem.entityType === "menuItem"
              ? "shop"
              : "shop",
        vendorId:
          (newItem as any).vendorId?.toString?.() ||
          (newItem as any).storeId?.toString?.() ||
          (newItem as any).vendorId ||
          "",
        vendorName:
          (newItem as any).vendorName || (newItem as any).storeName || "",
      };

      if (!safeNewItem.vendorId) {
        console.warn(
          "CartContext.addToCart: vendorId missing for item",
          newItem,
          "— defaulting to empty string; consider passing vendorId/vendorName/entityType",
        );
      }
      const existingItem = currentItems.find((item) => item.id === newItem.id);

      if (existingItem) {
        // Update quantity of existing item
        console.debug(
          "CartContext.addToCart: updating existing item",
          existingItem.id,
        );
        return currentItems.map((item) =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + (newItem.quantity || 1) }
            : item,
        );
      }

      // Add new item
      console.debug(
        "CartContext.addToCart: adding new item",
        safeNewItem.id,
        "vendor:",
        safeNewItem.vendorId,
      );
      return [
        ...currentItems,
        { ...safeNewItem, quantity: newItem.quantity || 1 },
      ];
    });
  };

  const removeFromCart = (itemId: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId),
    );
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(itemId);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, quantity } : item,
      ),
    );
  };

  const clearCart = () => {
    console.log("[CartContext] Clearing cart - current items:", items.length);
    setItems([]);

    // FIX: Also clear from storage immediately
    try {
      AsyncStorage.removeItem("teranggo_cart")
        .then(() => {
          console.log("[CartContext] ✅ Cart cleared from storage");
        })
        .catch((error) => {
          console.error(
            "[CartContext] Error clearing cart from storage:",
            error,
          );
        });

      // Store payment success flag to prevent cart from being restored
      SecureStorage.setItem("paymentSuccessCleared", "true").then(() => {
        console.log("[CartContext] ✅ Payment success flag stored");
      });
    } catch (error) {
      console.log("[CartContext] Error in clearCart:", error);
    }
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => {
      // Use discounted price if available, otherwise use regular price
      const itemPrice = item.discountedPrice || item.price;
      return total + itemPrice * item.quantity;
    }, 0);
  };

  const getItemCount = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalQuantity = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getVendorDetails = () => {
    if (items.length === 0) return null;
    return {
      id: items[0].vendorId,
      name: items[0].vendorName,
    };
  };

  // Add new methods
  const getTotalAmount = () => {
    return getCartTotal(); // Just an alias for getCartTotal
  };

  const getCartByVendor = () => {
    const vendorMap: Record<string, CartItem[]> = {};

    items.forEach((item) => {
      if (!vendorMap[item.vendorId]) {
        vendorMap[item.vendorId] = [];
      }
      vendorMap[item.vendorId].push(item);
    });

    return vendorMap;
  };

  const getQuantity = (itemId: string) => {
    const item = items.find((item) => item.id === itemId);
    return item ? item.quantity : 0;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        cartItems: items, // Add alias for items
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getTotalAmount,
        getItemCount,
        getTotalQuantity,
        getQuantity,
        getVendorDetails,
        getCartByVendor,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
