import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Image, 
  Dimensions 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import LoginRequiredDialog from "@/components/common/LoginRequiredDialog";
import { API_URL } from "@/constants/config";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  storeId?: string;
  description?: string;
}

export default function LocalBeverages() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // "Local Beverages" subcategory ID from your provided list
  const subcategoryId = "cm5ieyg3q000713i5wcdcxd4k";

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
        console.log('Local Beverages products:', data);
        
        // Transform the API response to match our Product interface
        const transformedProducts = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          storeId: item.shopId || item.pharmacyId,
          description: item.description,
        }));
        
        setProducts(transformedProducts);
      }
    } catch (error) {
      console.error('Error fetching local beverage products:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={{
        width: CARD_WIDTH,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginRight: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
      }}
      onPress={() => setShowLoginDialog(true)}
    >
      {/* Product Image */}
      <View style={{ height: 120, backgroundColor: '#F3F4F6' }}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <Ionicons name="wine-outline" size={32} color="#9CA3AF" />
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={{ padding: 12 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#1F2937',
            marginBottom: 4,
          }}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        
        {item.description && (
          <Text
            style={{
              fontSize: 12,
              color: '#6B7280',
              marginBottom: 8,
            }}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: PrimaryColor,
            }}
          >
            ${item.price.toFixed(2)}
          </Text>
          
          <TouchableOpacity
            style={{
              backgroundColor: PrimaryColor,
              width: 32,
              height: 32,
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => setShowLoginDialog(true)}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={PrimaryColor} />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading local beverages...</Text>
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
            <Ionicons name="wine" size={16} color="#fff" />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#1F2937",
            }}
          >
            Local Beverages
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
