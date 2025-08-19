import React, { createContext, ReactNode, useContext, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  vendorId: string;
  vendorName: string;
  description?: string;
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
      const token = await AsyncStorage.getItem("token");
      const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");

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
      return;
    }

    // Check if we already have items from a different vendor
    if (items.length > 0 && items[0].vendorId !== newItem.vendorId) {
      Alert.alert(
        "Start New Cart?",
        "You have items in your cart from a different restaurant. Would you like to start a new cart?",
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
      return;
    }

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === newItem.id);

      if (existingItem) {
        // Update quantity of existing item
        return currentItems.map((item) =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + (newItem.quantity || 1) }
            : item
        );
      }

      // Add new item
      return [...currentItems, { ...newItem, quantity: newItem.quantity || 1 }];
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
    setItems([]);
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
