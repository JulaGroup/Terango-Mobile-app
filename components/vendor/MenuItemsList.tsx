import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "react-native";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
}

interface MenuItemsListProps {
  items: MenuItem[];
  vendorType: "restaurants" | "shops" | "pharmacies";
  vendorId: string;
  onRefresh: () => void;
  onDelete: (itemId: string) => void;
  isLoading: boolean;
}

export default function MenuItemsList({
  items,
  vendorType,
  vendorId,
  onRefresh,
  onDelete,
  isLoading,
}: MenuItemsListProps) {
  const router = useRouter();

  const renderItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.menuItem}>
      <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImage}>
            <Ionicons name="image-outline" size={24} color="#A1A1AA" />
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
        <Text style={styles.itemPrice}>D{item.price.toFixed(2)}</Text>
        {item.description ? (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>

      {/* View-only mode for vendors in MVP */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() =>
            router.push({
              pathname: "/vendor-management/view-menu-item",
              params: {
                vendorType,
                vendorId,
                itemId: item.id,
              },
            })
          }
        >
          <Ionicons name="eye-outline" size={18} color="#3B82F6" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshing={isLoading}
      onRefresh={onRefresh}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No menu items found</Text>
          <Text style={styles.emptySubtext}>
            Menu items will appear here once they are added by an admin
          </Text>
        </View>
      }
      ListFooterComponent={
        <View style={styles.mvpNotice}>
          <Ionicons
            name="information-circle-outline"
            size={24}
            color="#6B7280"
          />
          <Text style={styles.mvpNoticeText}>
            In this MVP version, only admins can add and edit menu items
          </Text>
        </View>
      }
      ListFooterComponentStyle={styles.footer}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  menuItem: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  noImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#059669",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionsContainer: {
    justifyContent: "center",
    marginLeft: 8,
  },
  viewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
  footer: {
    marginTop: 20,
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#059669",
    borderRadius: 8,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  mvpNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 16,
    marginVertical: 20,
  },
  mvpNoticeText: {
    color: "#6B7280",
    fontSize: 14,
    marginLeft: 8,
    textAlign: "center",
  },
});
