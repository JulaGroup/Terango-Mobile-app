import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import ShopList from "@/components/common/ShopList";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ViewAllStores() {
  const router = useRouter();
  const { cartItems } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");

  const cities = ["All", "New York", "Los Angeles", "Chicago", "Houston"];
  const shopTypes = ["All", "Grocery", "Electronics", "Clothing", "Pharmacy"];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Stores</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push("/cart")}
        >
          <Ionicons name="cart" size={22} color="#333" />
          {cartItems.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

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
          placeholder="Search stores..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        {/* City Filter */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>City:</Text>
          <View style={styles.filterChipsContainer}>
            {cities.slice(0, 4).map((city) => (
              <TouchableOpacity
                key={city}
                style={[
                  styles.filterChip,
                  selectedCity === city && styles.activeFilterChip,
                ]}
                onPress={() => setSelectedCity(city === "All" ? "" : city)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedCity === city && styles.activeFilterText,
                  ]}
                >
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Shop Type Filter */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Type:</Text>
          <View style={styles.filterChipsContainer}>
            {shopTypes.slice(0, 4).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  selectedShopType === type && styles.activeFilterChip,
                ]}
                onPress={() => setSelectedShopType(type === "All" ? "" : type)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedShopType === type && styles.activeFilterText,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Shop List with Infinite Scroll */}
      <View style={styles.listContainer}>
        <ShopList
          searchQuery={searchQuery}
          city={selectedCity}
          shopType={selectedShopType}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  cartButton: {
    position: "relative",
    padding: 5,
  },
  cartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: PrimaryColor,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    margin: 20,
    paddingHorizontal: 15,
    borderRadius: 12,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  filtersSection: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  filterRow: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  filterChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    marginRight: 8,
    marginBottom: 6,
  },
  activeFilterChip: {
    backgroundColor: PrimaryColor,
  },
  filterText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  activeFilterText: {
    color: "#fff",
  },
  listContainer: {
    flex: 1,
  },
});
