import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard from "./ProductCard";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import LoginRequiredDialog from "@/components/common/LoginRequiredDialog";
import { API_URL } from "@/constants/config";

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  storeId?: string;
  description?: string;
  rating?: number;
  discountedPrice?: number;
}

export default function GreatForBreakfast() {
  const { addToCart, removeFromCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // "Great for Breakfast" subcategory ID from your provided list
  const subcategoryId = "cm5ieyg3q000013i52qlxvbtw";

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/public/products-by-subcategory/${subcategoryId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Great for Breakfast products:', data);
        
        // Transform the API response to match our Product interface
        const transformedProducts = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          storeId: item.shopId || item.pharmacyId,
          description: item.description,
          rating: 4.5, // Default rating since not in API
        }));
        
        setProducts(transformedProducts);
      }
    } catch (error) {
      console.error('Error fetching breakfast products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (productId: string) => {
    // Show login dialog when user tries to add to cart
    setShowLoginDialog(true);
  };

  const handleRemoveFromCart = (productId: string) => {
    // Show login dialog when user tries to remove from cart
    setShowLoginDialog(true);
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <View style={{ marginRight: 16 }}>
      <ProductCard
        product={item}
        onAddToCart={() => handleAddToCart(item.id)}
        onRemoveFromCart={() => handleRemoveFromCart(item.id)}
        compact={true}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={PrimaryColor} />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading breakfast items...</Text>
      </View>
    );
  }

  if (products.length === 0) {
    return null; // Don't show the section if no products
  }

  return (
    <View style={{ paddingVertical: 20 }}>
      {/* Section Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          marginBottom: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: PrimaryColor,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="sunny" size={16} color="#fff" />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#1F2937",
            }}
          >
            Great for Breakfast
          </Text>
        </View>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 4,
            paddingHorizontal: 8,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: PrimaryColor,
              fontWeight: "500",
              marginRight: 4,
            }}
          >
            See all
          </Text>
          <Ionicons name="chevron-forward" size={16} color={PrimaryColor} />
        </TouchableOpacity>
      </View>

      {/* Products List */}
      <FlatList
        data={products}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
        }}
      />

      {/* Login Required Dialog */}
      <LoginRequiredDialog
        visible={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        title="Login Required"
        message="Please login to add items to your cart and complete your order."
      />
    </View>
  );
}
