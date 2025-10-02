import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { PrimaryColor } from "@/constants/Colors";
import ProductList from "@/components/common/ProductList";
import { useCart } from "@/context/CartContext";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function StoreCategoryProducts() {
  const router = useRouter();
  const { cartItems } = useCart();
  const { shopId, categoryName, subCategoryId } = useLocalSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "price" | "rating" | "createdAt"
  >("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [minPrice, setMinPrice] = useState<number>();
  const [maxPrice, setMaxPrice] = useState<number>();

  const sortOptions = [
    { label: "Name A-Z", value: "name", order: "asc" as const },
    { label: "Name Z-A", value: "name", order: "desc" as const },
    { label: "Price Low-High", value: "price", order: "asc" as const },
    { label: "Price High-Low", value: "price", order: "desc" as const },
  ];

  const handleSortChange = (
    value: "name" | "price" | "rating" | "createdAt",
    order: "asc" | "desc"
  ) => {
    setSortBy(value);
    setSortOrder(order);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

      {/* Header */}
      <LinearGradient
        colors={[PrimaryColor, "#4a90e2"]}
        style={styles.headerGradient}
      >
        <SafeAreaView>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{categoryName || "Products"}</Text>
            <TouchableOpacity
              style={styles.cartButton}
              onPress={() => router.push("/cart")}
            >
              <Ionicons name="cart" size={22} color="#fff" />
              {cartItems.length > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <View style={styles.sortOptions}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={`${option.value}-${option.order}`}
                style={[
                  styles.sortChip,
                  sortBy === option.value &&
                    sortOrder === option.order &&
                    styles.activeSortChip,
                ]}
                onPress={() =>
                  handleSortChange(
                    option.value as "name" | "price" | "rating" | "createdAt",
                    option.order
                  )
                }
              >
                <Text
                  style={[
                    styles.sortText,
                    sortBy === option.value &&
                      sortOrder === option.order &&
                      styles.activeSortText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price Range */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Price Range:</Text>
          <View style={styles.priceInputs}>
            <TextInput
              style={styles.priceInput}
              placeholder="Min"
              value={minPrice?.toString() || ""}
              onChangeText={(text) =>
                setMinPrice(text ? parseFloat(text) : undefined)
              }
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            <Text style={styles.priceSeparator}>-</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Max"
              value={maxPrice?.toString() || ""}
              onChangeText={(text) =>
                setMaxPrice(text ? parseFloat(text) : undefined)
              }
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>
        </View>
      </View>

      {/* Product List with Infinite Scroll */}
      <View style={styles.listContainer}>
        <ProductList
          searchQuery={searchQuery}
          shopId={shopId as string}
          subCategoryId={subCategoryId as string}
          sortBy={sortBy}
          sortOrder={sortOrder}
          minPrice={minPrice}
          maxPrice={maxPrice}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerGradient: {
    paddingTop: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  cartButton: {
    position: "relative",
    padding: 5,
  },
  cartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: {
    color: PrimaryColor,
    fontSize: 12,
    fontWeight: "600",
  },
  filtersContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 15,
    borderRadius: 12,
    height: 45,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  sortContainer: {
    marginBottom: 15,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  sortOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    marginRight: 8,
    marginBottom: 6,
  },
  activeSortChip: {
    backgroundColor: PrimaryColor,
  },
  sortText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  activeSortText: {
    color: "#fff",
  },
  priceContainer: {
    marginBottom: 5,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  priceInputs: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
    color: "#333",
  },
  priceSeparator: {
    marginHorizontal: 10,
    fontSize: 16,
    color: "#666",
  },
  listContainer: {
    flex: 1,
  },
});
