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
import { menuItemAPI, MenuItem } from "../../services/api";

interface MenuItemListProps {
  searchQuery?: string;
  restaurantId?: string;
  menuId?: string;
  subCategoryId?: string;
  mealTime?: string;
  minPrice?: number;
  maxPrice?: number;
}

const MenuItemList: React.FC<MenuItemListProps> = ({
  searchQuery,
  restaurantId,
  menuId,
  subCategoryId,
  mealTime,
  minPrice,
  maxPrice,
}) => {
  // Create fetch function for menu items
  const fetchMenuItems = async (page: number, limit = 20) => {
    return menuItemAPI.getMenuItems(page, limit, {
      search: searchQuery,
      restaurantId,
      menuId,
      subCategoryId,
      mealTime,
      minPrice,
      maxPrice,
      sortBy: "name",
      sortOrder: "asc",
      isAvailable: true,
    });
  };

  const {
    data: menuItems,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useInfiniteScroll<MenuItem>({
    fetchFunction: fetchMenuItems,
    limit: 20,
    initialLoad: true,
  });

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.menuItemCard}>
      {item.imageUrl && (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.menuItemImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.menuItemInfo}>
        <Text style={styles.menuItemName}>{item.name}</Text>

        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.detailsContainer}>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>

          {item.preparationTime && (
            <Text style={styles.prepTime}>⏱️ {item.preparationTime} min</Text>
          )}
        </View>

        {item.mealTime && (
          <Text style={styles.mealTime}>🍽️ {item.mealTime}</Text>
        )}

        {item.menu?.restaurant && (
          <Text style={styles.restaurantInfo}>
            🏪 {item.menu.restaurant.name}
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
            {item.isAvailable ? "Available" : "Unavailable"}
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
        <Text style={styles.loadingText}>Loading more menu items...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {searchQuery
            ? `No menu items found for "${searchQuery}"`
            : "No menu items available"}
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
      data={menuItems}
      renderItem={renderMenuItem}
      keyExtractor={(item) => item.id}
      onScroll={createScrollHandler(loadMore)}
      scrollEventThrottle={400}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading && menuItems.length === 0}
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
  menuItemCard: {
    backgroundColor: "#fff",
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  description: {
    color: "#666",
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 18,
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#27AE60",
  },
  prepTime: {
    fontSize: 12,
    color: "#666",
  },
  mealTime: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
    marginBottom: 4,
  },
  restaurantInfo: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  categoryInfo: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
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

export default MenuItemList;
