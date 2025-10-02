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
import { restaurantAPI, Restaurant } from "../../services/api";
import { RestaurantCardSkeleton } from "./Skeleton";

interface RestaurantListProps {
  city?: string;
  searchQuery?: string;
}

const RestaurantList: React.FC<RestaurantListProps> = ({
  city,
  searchQuery,
}) => {
  // Create fetch function for restaurants
  const fetchRestaurants = async (page: number, limit = 20) => {
    return restaurantAPI.getRestaurants(page, limit, {
      city,
      search: searchQuery,
      sortBy: "rating",
      sortOrder: "desc",
    });
  };

  const {
    data: restaurants,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useInfiniteScroll<Restaurant>({
    fetchFunction: fetchRestaurants,
    limit: 20,
    initialLoad: true,
  });

  const renderRestaurant = ({ item }: { item: Restaurant }) => (
    <View style={styles.restaurantCard}>
      <Text style={styles.restaurantName}>{item.name}</Text>
      <Text style={styles.restaurantDescription}>
        {item.description || "Restaurant"}
      </Text>
      <View style={styles.ratingContainer}>
        <Text style={styles.rating}>
          ⭐ {item.rating || 0} ({item.totalReviews || 0} reviews)
        </Text>
      </View>
      {item.minimumOrderAmount && (
        <Text style={styles.minOrder}>
          Min order: ${item.minimumOrderAmount}
        </Text>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading more restaurants...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading && restaurants.length === 0) {
      return (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 4 }, (_, index) => (
            <RestaurantCardSkeleton key={index} />
          ))}
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {searchQuery
            ? `No restaurants found for "${searchQuery}"`
            : "No restaurants available"}
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
      data={restaurants}
      renderItem={renderRestaurant}
      keyExtractor={(item) => item.id}
      onScroll={createScrollHandler(loadMore)}
      scrollEventThrottle={400}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading && restaurants.length === 0}
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
  skeletonContainer: {
    paddingTop: 20,
  },
  restaurantCard: {
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
  restaurantName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  restaurantDescription: {
    color: "#666",
    marginBottom: 8,
    fontSize: 14,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  rating: {
    color: "#666",
    fontSize: 14,
  },
  minOrder: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "500",
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

export default RestaurantList;
