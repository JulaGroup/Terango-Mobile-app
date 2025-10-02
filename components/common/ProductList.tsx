import React from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
} from "react-native";
import {
  useInfiniteScroll,
  createScrollHandler,
} from "../../hooks/useInfiniteScroll";
import { productAPI, Product } from "../../services/api";
import { ProductCardSkeleton } from "./Skeleton";

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
    hasMore,
    loadMore,
    refresh,
  } = useInfiniteScroll<Product>({
    fetchFunction: fetchProducts,
    limit: 20,
    initialLoad: true,
  });

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      {item.imageUrl && (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.productImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>

        {item.brand && <Text style={styles.brand}>{item.brand}</Text>}

        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.detailsContainer}>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>

          {item.stock !== undefined && (
            <Text style={styles.stock}>Stock: {item.stock}</Text>
          )}
        </View>

        {item.shop && (
          <Text style={styles.shopInfo}>
            🏪 {item.shop.name}
            {item.shop.city && ` • ${item.shop.city}`}
          </Text>
        )}

        {item.subCategory && (
          <Text style={styles.categoryInfo}>📂 {item.subCategory.name}</Text>
        )}

        <View style={styles.statusContainer}>
          <Text
            style={[
              styles.status,
              { color: item.isAvailable ? "#27AE60" : "#E74C3C" },
            ]}
          >
            {item.isAvailable ? "Available" : "Out of Stock"}
          </Text>
        </View>
      </View>
    </View>
  );

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
          {Array.from({ length: 6 }, (_, index) => (
            <ProductCardSkeleton key={index} />
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
      numColumns={2}
      columnWrapperStyle={styles.row}
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
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  skeletonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 20,
  },
  row: {
    justifyContent: "space-between",
  },
  productCard: {
    backgroundColor: "#fff",
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: "48%",
  },
  productImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  brand: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
    marginBottom: 4,
  },
  description: {
    color: "#666",
    marginBottom: 6,
    fontSize: 12,
    lineHeight: 16,
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#27AE60",
  },
  stock: {
    fontSize: 10,
    color: "#666",
  },
  shopInfo: {
    fontSize: 10,
    color: "#666",
    marginBottom: 4,
  },
  categoryInfo: {
    fontSize: 10,
    color: "#666",
    marginBottom: 6,
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  status: {
    fontSize: 10,
    fontWeight: "600",
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
