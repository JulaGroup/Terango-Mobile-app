import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UniversalProduct } from "@/components/common/ProductCard";
import VendorAwareProductCard from "@/components/common/VendorAwareProductCard";
import { PrimaryColor } from "@/constants/Colors";
import { API_URL } from "@/constants/config";
import { useRouter } from "expo-router";
import { useCart } from "@/context/CartContext";

const CARD_WIDTH = 160;

interface TeranGOProduct {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  description?: string;
  brand?: string;
  stock?: number;
  isAvailable: boolean;
  isFeatured: boolean;
  priority: number;
  shop?: {
    id: string;
    name: string;
    imageUrl?: string;
    vendorId: string;
  };
}

interface TeranGOPicksProps {
  refreshKey?: number;
}

// Skeleton card for loading state
const SkeletonCard = () => (
  <View
    style={{
      width: CARD_WIDTH,
      marginRight: 16,
      backgroundColor: "#fff",
      borderRadius: 12,
      overflow: "hidden",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    }}
  >
    <View style={{ width: "100%", height: 140, backgroundColor: "#E8E8E8" }} />
    <View style={{ padding: 10 }}>
      <View
        style={{
          width: "80%",
          height: 14,
          backgroundColor: "#E8E8E8",
          borderRadius: 4,
        }}
      />
      <View
        style={{
          width: "50%",
          height: 12,
          backgroundColor: "#E8E8E8",
          borderRadius: 4,
          marginTop: 6,
        }}
      />
      <View
        style={{
          width: "40%",
          height: 16,
          backgroundColor: "#E8E8E8",
          borderRadius: 4,
          marginTop: 8,
        }}
      />
    </View>
  </View>
);

export default function TeranGOPicks({ refreshKey }: TeranGOPicksProps) {
  const [products, setProducts] = useState<TeranGOProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { addToCart, getQuantity, removeFromCart } = useCart();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/api/public/products/terango-featured?limit=10`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("Error fetching TeranGO products:", err);
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, refreshKey]);

  const handleAddToCart = useCallback(
    (product: UniversalProduct, rawProduct: TeranGOProduct) => {
      addToCart({
        id: String(product.id),
        name: product.name,
        price: product.discountedPrice || product.price,
        imageUrl: product.image || "",
        vendorId: rawProduct.shop?.vendorId || "terango-official",
        vendorName: rawProduct.shop?.name || "TeranGO Official Store",
        entityType: "SHOP",
      });
    },
    [addToCart],
  );

  const handleProductPress = (productId: string) => {
    router.push({
      pathname: "/product/[productId]",
      params: { productId },
    });
  };

  const listData = useMemo(
    () =>
      products.map((item) => {
        const product: UniversalProduct = {
          id: item.id,
          name: item.name,
          price: item.price,
          discountedPrice: item.discountedPrice,
          image: item.imageUrl,
          description: item.description,
          inStock: item.isAvailable && (item.stock ?? 0) > 0,
        };
        return { raw: item, product };
      }),
    [products],
  );

  const renderProductCard = ({ item }: { item: (typeof listData)[0] }) => (
    <View style={{ marginRight: 16 }}>
      <VendorAwareProductCard
        product={item.product}
        cartQuantity={getQuantity(String(item.product.id))}
        onAddToCart={() => handleAddToCart(item.product, item.raw)}
        onRemoveFromCart={() => removeFromCart(String(item.product.id))}
        onPress={() => handleProductPress(String(item.product.id))}
        cardWidth={CARD_WIDTH}
        vendor={{
          vendorId: "terango-official",
          vendorType: "shop",
          vendorName: "TeranGO Official Store",
          isActive: true,
          acceptsOrders: true,
        }}
      />
    </View>
  );

  // Don't render if no products and not loading
  if (!loading && products.length === 0 && !error) {
    return null;
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
              backgroundColor: "#1a1a1a",
              borderRadius: 10,
              padding: 10,
              marginRight: 12,
            }}
          >
            <Ionicons name="diamond" size={20} color="#FF6B00" />
          </View>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{ fontSize: 18, fontWeight: "bold", color: "#1a1a1a" }}
              >
                Teran
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "bold", color: "#FF6B00" }}
              >
                GO
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "bold", color: "#1a1a1a" }}
              >
                {" "}
                Picks
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: "#666",
                marginTop: 2,
              }}
            >
              Quality products, best prices
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/terango-picks")}
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: PrimaryColor,
              marginRight: 4,
            }}
          >
            See All
          </Text>
          <Ionicons name="chevron-forward" size={16} color={PrimaryColor} />
        </TouchableOpacity>
      </View>

      {/* Products Horizontal Slider */}
      {loading ? (
        <FlatList
          data={[1, 2, 3, 4]}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          keyExtractor={(item) => `skeleton-${item}`}
          renderItem={() => <SkeletonCard />}
        />
      ) : error ? (
        <View
          style={{
            paddingHorizontal: 16,
            alignItems: "center",
            paddingVertical: 20,
          }}
        >
          <Ionicons name="alert-circle-outline" size={32} color="#999" />
          <Text style={{ color: "#666", marginTop: 8 }}>{error}</Text>
          <TouchableOpacity
            onPress={fetchProducts}
            style={{
              marginTop: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: PrimaryColor,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderProductCard}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          keyExtractor={(item) => String(item.product.id)}
        />
      )}
    </View>
  );
}
