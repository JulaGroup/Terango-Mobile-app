import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart } from "@/context/CartContext";
import { API_URL } from "@/constants/config";
import VendorAwareProductCard from "@/components/common/VendorAwareProductCard";
import CategoryCircleRow from "@/components/ui/shared/CategoryCircleRow";
import { Colors } from "@/constants/DesignTokens";

// The Food top-level category whose subcategories (Burgers, Pizza, Local
// Dishes, …) drive one slider each. Same id the Food landing uses.
const FOOD_CATEGORY_ID = "095eb4ff-362f-455b-90eb-a1df9f86e442";
// How many subcategory sliders to render on Home (each is a full section; the
// "Explore" circle row above shows ALL categories regardless).
const MAX_SLIDERS = 12;
const CARD_W = 160;

interface SubCategory {
  id: string;
  name: string;
  imageUrl?: string;
}

interface Meal {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  isAvailable?: boolean;
  menu?: { restaurant?: { id?: string; name?: string } };
}

/**
 * A single subcategory slider. Fetches its own meals and renders nothing at
 * all when it has none — so Home never shows an empty "Burgers" row.
 */
const SubcategoryMealRow = ({ sub }: { sub: SubCategory }) => {
  const router = useRouter();
  const { addToCart, getQuantity, removeFromCart } = useCart();
  const [meals, setMeals] = useState<Meal[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/menuItem/subcategory/${sub.id}`,
        );
        const data = await res.json();
        const list: Meal[] = Array.isArray(data) ? data : data?.data ?? [];
        if (!cancelled) setMeals(list.filter((m) => m && m.id));
      } catch {
        if (!cancelled) setMeals([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sub.id]);

  // Still loading → render a lightweight skeleton row so layout doesn't jump.
  if (meals === null) {
    return (
      <View style={styles.block}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{sub.name}</Text>
        </View>
        <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      </View>
    );
  }

  // Empty → hide the whole slider.
  if (meals.length === 0) return null;

  return (
    <View style={styles.block}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{sub.name}</Text>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/SubCategoryView",
              params: { subCategoryId: sub.id, subCategoryName: sub.name },
            } as any)
          }
          activeOpacity={0.7}
          style={styles.seeAll}
        >
          <Text style={styles.seeAllText}>See all</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={meals.slice(0, 10)}
        keyExtractor={(m) => m.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        renderItem={({ item }) => (
          <VendorAwareProductCard
            product={{
              id: item.id,
              name: item.name,
              price: item.price,
              discountedPrice: item.discountedPrice,
              image: item.imageUrl,
              inStock: item.isAvailable ?? true,
            }}
            cartQuantity={getQuantity(item.id)}
            onAddToCart={() =>
              addToCart({
                id: item.id,
                name: item.name,
                price: item.discountedPrice || item.price,
                imageUrl: item.imageUrl || "",
                vendorId: item.menu?.restaurant?.id || "",
                vendorName: item.menu?.restaurant?.name || "Restaurant",
                entityType: "restaurant",
              })
            }
            onRemoveFromCart={() => removeFromCart(item.id)}
            onPress={() =>
              router.push({
                pathname: "/menuitem/[id]",
                params: { id: item.id },
              } as any)
            }
            cardWidth={CARD_W}
            vendor={{
              vendorId: item.menu?.restaurant?.id,
              vendorType: "restaurant",
              vendorName: item.menu?.restaurant?.name,
            }}
          />
        )}
      />
    </View>
  );
};

/**
 * Home "cuisine sliders": one horizontal slider per Food subcategory
 * (Burgers, Pizza, Local Dishes …), driven entirely by the vendor's real
 * subcategories — no hardcoded list, no new backend.
 */
const FoodCategorySliders = ({ refreshKey }: { refreshKey?: number }) => {
  const [subs, setSubs] = useState<SubCategory[]>([]);

  const fetchSubs = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/subcategories/category/${FOOD_CATEGORY_ID}`,
      );
      const data = await res.json();
      const list: SubCategory[] = Array.isArray(data) ? data : data?.data ?? [];
      setSubs(list.filter((s) => s && s.id));
    } catch {
      setSubs([]);
    }
  }, []);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs, refreshKey]);

  const router = useRouter();

  if (subs.length === 0) return null;

  return (
    <View>
      {/* Explore by cuisine — circular category tiles */}
      <View style={styles.exploreHeader}>
        <Text style={styles.title}>Explore</Text>
      </View>
      <CategoryCircleRow
        data={subs}
        onPress={(item) =>
          router.push({
            pathname: "/SubCategoryView",
            params: { subCategoryId: item.id, subCategoryName: item.name },
          } as any)
        }
      />

      {/* One slider per cuisine (empty ones hide themselves) */}
      {subs.slice(0, MAX_SLIDERS).map((sub) => (
        <SubcategoryMealRow key={sub.id} sub={sub} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  exploreHeader: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  block: {
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1C1C1E",
    letterSpacing: -0.4,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  skeletonCard: {
    width: CARD_W,
    height: 200,
    borderRadius: 16,
    backgroundColor: "#ECECEF",
  },
});

export default FoodCategorySliders;
