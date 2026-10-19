import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { orderApi } from "@/lib/api";
import { SecureStorage } from "@/utils/secureStorage";
import { cldUrl } from "@/utils/cloudinaryImage";
import { Colors } from "@/constants/DesignTokens";

interface RecentVendor {
  id: string;
  name: string;
  image?: string;
  type: "restaurant" | "shop";
}

const vendorImage = (v: any): string | undefined =>
  v?.imageUrl || v?.image || v?.logo || v?.coverImage || v?.bannerImage;

/**
 * Uber-Eats-style "Order again" row: the vendors from the customer's recent
 * orders, tappable to reopen and reorder. Hidden entirely when the user is
 * signed out or has no past orders.
 */
const OrderAgain = ({ refreshKey }: { refreshKey?: number }) => {
  const router = useRouter();
  const [vendors, setVendors] = useState<RecentVendor[]>([]);

  const load = useCallback(async () => {
    try {
      const loggedIn = await SecureStorage.getItem("isLoggedIn");
      if (loggedIn !== "true") {
        setVendors([]);
        return;
      }
      const res = await orderApi.getCustomerOrders(1, 15, "past");
      const seen = new Set<string>();
      const list: RecentVendor[] = [];
      for (const o of res?.orders ?? []) {
        let v: RecentVendor | null = null;
        if (o.restaurant?.id) {
          v = {
            id: o.restaurant.id,
            name: o.restaurant.name,
            image: vendorImage(o.restaurant),
            type: "restaurant",
          };
        } else if (o.shop?.id) {
          v = {
            id: o.shop.id,
            name: o.shop.name,
            image: vendorImage(o.shop),
            type: "shop",
          };
        }
        if (v && !seen.has(v.id)) {
          seen.add(v.id);
          list.push(v);
        }
      }
      setVendors(list.slice(0, 10));
    } catch {
      setVendors([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (vendors.length === 0) return null;

  const openVendor = (v: RecentVendor) => {
    if (v.type === "restaurant") {
      router.push(`/restaurant-details?restaurantId=${v.id}` as any);
    } else {
      router.push(`/shop-details?shopId=${v.id}` as any);
    }
  };

  return (
    <View style={styles.block}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Order again</Text>
      </View>
      <FlatList
        data={vendors}
        keyExtractor={(v) => v.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => openVendor(item)}
          >
            <View style={styles.imageWrap}>
              {item.image ? (
                <Image
                  source={cldUrl(item.image, 256)}
                  style={styles.image}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons
                    name={
                      item.type === "restaurant"
                        ? "restaurant"
                        : "storefront"
                    }
                    size={22}
                    color="#B8B8BE"
                  />
                </View>
              )}
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.reorderRow}>
              <Ionicons name="refresh" size={11} color={Colors.primary} />
              <Text style={styles.reorderText}>Order again</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1C1C1E",
    letterSpacing: -0.4,
  },
  card: {
    width: 120,
  },
  imageWrap: {
    width: 120,
    height: 90,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F1F1F4",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1C1C1E",
    marginTop: 7,
  },
  reorderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  reorderText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
  },
});

export default OrderAgain;
