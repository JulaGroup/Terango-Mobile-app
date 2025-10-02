import React from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import {
  useInfiniteScroll,
  createScrollHandler,
} from "../../hooks/useInfiniteScroll";
import { shopAPI, Shop } from "../../services/api";

interface ShopListProps {
  city?: string;
  searchQuery?: string;
  shopType?: string;
}

const ShopList: React.FC<ShopListProps> = ({ city, searchQuery, shopType }) => {
  // Create fetch function for shops
  const fetchShops = async (page: number, limit = 20) => {
    return shopAPI.getShops(page, limit, {
      city,
      search: searchQuery,
      shopType,
      sortBy: "rating",
      sortOrder: "desc",
    });
  };

  const {
    data: shops,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useInfiniteScroll<Shop>({
    fetchFunction: fetchShops,
    limit: 20,
    initialLoad: true,
  });

  const renderShop = ({ item }: { item: Shop }) => (
    <View style={styles.shopCard}>
      <Text style={styles.shopName}>{item.name}</Text>
      <Text style={styles.shopDescription}>{item.description || "Shop"}</Text>

      {item.service && (
        <Text style={styles.serviceInfo}>
          {item.service.name}
          {item.service.category && ` - ${item.service.category.name}`}
        </Text>
      )}

      <View style={styles.detailsContainer}>
        {item.rating && <Text style={styles.rating}>⭐ {item.rating}</Text>}

        {item.city && <Text style={styles.location}>📍 {item.city}</Text>}
      </View>

      {item.minimumOrderAmount && (
        <Text style={styles.minOrder}>
          Min order: ${item.minimumOrderAmount}
        </Text>
      )}

      <View style={styles.statusContainer}>
        <Text
          style={[
            styles.status,
            {
              color:
                item.isActive && item.acceptsOrders ? "#27AE60" : "#E74C3C",
            },
          ]}
        >
          {item.isActive && item.acceptsOrders ? "Open" : "Closed"}
        </Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading more shops...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {searchQuery
            ? `No shops found for "${searchQuery}"`
            : "No shops available"}
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
      data={shops}
      renderItem={renderShop}
      keyExtractor={(item) => item.id}
      onScroll={createScrollHandler(loadMore)}
      scrollEventThrottle={400}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading && shops.length === 0}
          onRefresh={refresh}
        />
      }
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={styles.container}
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  shopCard: {
    backgroundColor: "#fff",
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  shopDescription: {
    color: "#666",
    marginBottom: 8,
    fontSize: 14,
  },
  serviceInfo: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rating: {
    color: "#666",
    fontSize: 14,
  },
  location: {
    color: "#666",
    fontSize: 12,
  },
  minOrder: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  status: {
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
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

export default ShopList;
