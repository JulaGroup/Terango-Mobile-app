import React, { createContext, ReactNode, useContext, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

interface CartItem {
  id: string;
  name: string;
  price: number;
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

  const addToCart = async (
    newItem: Omit<CartItem, "quantity"> & { quantity?: number }
  ) => {
    // Check if user is logged in before adding to cart
    try {
      const token = await SecureStore.getItemAsync("token");
      const isLoggedIn = await SecureStore.getItemAsync("isLoggedIn");

      console.debug(
        "CartContext.addToCart: auth check -> token present:",
        !!token,
        "isLoggedIn:",
        !!isLoggedIn
      );

      if (!token || !isLoggedIn) {
        Alert.alert(
          "Login Required",
          "Please log in to add items to your cart.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Log In",
              onPress: () => router.push("/auth"),
            },
          ]
        );
        console.debug("CartContext.addToCart: aborting - user not logged in");
        return;
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      Alert.alert(
        "Login Required",
        "Please log in to add items to your cart.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Log In",
            onPress: () => router.push("/auth"),
          },
        ]
      );
      console.debug("CartContext.addToCart: aborting - SecureStore error");
      return;
    }

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
        ]
      );
      console.debug(
        "CartContext.addToCart: aborting - vendor mismatch",
        "existing:",
        items[0]?.vendorId,
        "new:",
        newItem.vendorId
      );
      return;
    }
    console.debug(
      "CartContext.addToCart: proceeding to add/update item",
      newItem.id,
      newItem.vendorId
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
          "— defaulting to empty string; consider passing vendorId/vendorName/entityType"
        );
      }
      const existingItem = currentItems.find((item) => item.id === newItem.id);

      if (existingItem) {
        // Update quantity of existing item
        console.debug(
          "CartContext.addToCart: updating existing item",
          existingItem.id
        );
        return currentItems.map((item) =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + (newItem.quantity || 1) }
            : item
        );
      }

      // Add new item
      console.debug(
        "CartContext.addToCart: adding new item",
        safeNewItem.id,
        "vendor:",
        safeNewItem.vendorId
      );
      return [
        ...currentItems,
        { ...safeNewItem, quantity: newItem.quantity || 1 },
      ];
    });
  };

  const removeFromCart = (itemId: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId)
    );
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(itemId);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    console.log(
      "CartContext: clearCart called, current items length:",
      items.length
    );
    setItems([]);
    console.log("CartContext: setItems([]) executed");

    // Store payment success flag to prevent cart from being restored
    try {
      SecureStore.setItemAsync("paymentSuccessCleared", "true");
      console.log("CartContext: Payment success flag stored");
    } catch (error) {
      console.log("CartContext: Error storing payment success flag:", error);
    }
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
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
