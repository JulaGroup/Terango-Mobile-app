import React from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from "react-native";
import {
  useInfiniteScroll,
  createScrollHandler,
} from "../../hooks/useInfiniteScroll";
import { productAPI, Product } from "../../services/api";
import { ProductCardSkeleton } from "./Skeleton";
import ProductCard, { UniversalProduct } from "./ProductCard";
import { useCart } from "@/context/CartContext";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

interface ProductListProps {
  searchQuery?: string;
  shopId?: string;
  subCategoryId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "price" | "name" | "rating" | "createdAt";
  sortOrder?: "asc" | "desc";
}

const ProductList: React.FC<ProductListProps> = ({
  searchQuery,
  shopId,
  subCategoryId,
  brand,
  minPrice,
  maxPrice,
  sortBy = "name",
  sortOrder = "asc",
}) => {
  const router = useRouter();
  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();

  // Create fetch function for products
  const fetchProducts = async (page: number, limit = 20) => {
    return productAPI.getProducts(page, limit, {
      search: searchQuery,
      shopId,
      subCategoryId,
      brand,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
      isAvailable: true,
    });
  };

  const {
    data: products,
    loading,
    error,
    loadMore,
    refresh,
  } = useInfiniteScroll<Product>({
    fetchFunction: fetchProducts,
    limit: 20,
    initialLoad: true,
  });

  // Cart helpers
  const handleAddToCart = (product: Product) => {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description || "",
      vendorId: product.shop?.id || "",
      vendorName: product.shop?.name || "",
      imageUrl: product.imageUrl || "",
      entityType: "product",
    } as any;
    addToCart(cartItem);
  };

  const handleRemoveFromCart = (productId: string) => {
    const ci = cartItems.find((c) => c.id === productId);
    if (ci && ci.quantity > 1) {
      updateQuantity(productId, ci.quantity - 1);
    } else {
      removeFromCart(productId);
    }
  };

  const getCartQuantity = (productId: string) => {
    const item = cartItems.find((c) => c.id === productId);
    return item ? item.quantity : 0;
  };

  const renderProduct = ({ item }: { item: Product }) => {
    // Convert Product to UniversalProduct format
    const universalProduct: UniversalProduct = {
      id: Number(item.id),
      name: item.name,
      price: item.price,
      image: item.imageUrl,
      description: item.description,
      inStock: item.isAvailable,
    };

    return (
      <View style={styles.productCardWrapper}>
        <ProductCard
          product={universalProduct}
          cartQuantity={getCartQuantity(item.id)}
          onAddToCart={() => handleAddToCart(item)}
          onRemoveFromCart={() => handleRemoveFromCart(item.id)}
          onPress={() => router.push(`/product/${item.id}`)}
          cardWidth={(width - 48) / 3} // 3 columns with proper spacing
        />
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading more products...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading && products.length === 0) {
      return (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 9 }, (_, index) => (
            <View key={index} style={{ width: (width - 48) / 3 }}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {searchQuery
            ? `No products found for "${searchQuery}"`
            : "No products available"}
        </Text>
      </View>
    );
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      renderItem={renderProduct}
      keyExtractor={(item) => item.id}
      onScroll={createScrollHandler(loadMore)}
      scrollEventThrottle={400}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading && products.length === 0}
          onRefresh={refresh}
        />
      }
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={styles.container}
      numColumns={3} // 3 columns for better grid layout
      columnWrapperStyle={styles.columnWrapper}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingBottom: 20,
  },
  skeletonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingHorizontal: 8,
    paddingTop: 20,
    gap: 8,
  },
  columnWrapper: {
    justifyContent: "flex-start",
    paddingHorizontal: 8,
    marginBottom: 8,
    gap: 8,
  },
  productCardWrapper: {
    flex: 1,
    maxWidth: "33.33%",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    width: "100%",
  },
  loadingText: {
    marginLeft: 8,
    color: "#666",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
    width: "100%",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#E74C3C",
    textAlign: "center",
  },
});

export default ProductList;
