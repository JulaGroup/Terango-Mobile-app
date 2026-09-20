import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { API_URL } from "@/constants/config";

/**
 * Horizontal row of meal types under the service cards.
 *
 * Content is server-driven: these are the SubCategory rows under the Food
 * category, managed from the admin panel (Subcategories), so names and icons
 * can be changed without shipping an app update. Tapping one runs a search
 * for that name.
 */

// Same Food category the food page already reads its tiles from.
const FOOD_CATEGORY_ID = "095eb4ff-362f-455b-90eb-a1df9f86e442";

const CIRCLE = 68;
const ITEM_W = 76;

type MealType = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

export default function MealTypesRow() {
  const [items, setItems] = useState<MealType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMealTypes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/api/subcategories/category/${FOOD_CATEGORY_ID}`,
      );
      const data = await res.json();
      // The endpoint has returned both a bare array and { data: [...] }
      // depending on version — food.tsx handles both, so do the same.
      const list: MealType[] = Array.isArray(data) ? data : data?.data || [];
      setItems(list.filter((i) => i?.name));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMealTypes();
  }, [fetchMealTypes]);

  const openSearch = (name: string) => {
    router.push(`/search?q=${encodeURIComponent(name)}` as any);
  };

  // Nothing to show and nothing loading — render no section at all rather
  // than an empty header.
  if (!loading && items.length === 0) return null;

  return (
    <View style={{ paddingTop: 4, paddingBottom: 8 }}>
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#1a1a1a" }}>
          What are you craving?
        </Text>
        <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          Tap a category to search
        </Text>
      </View>

      {loading ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          keyExtractor={(n) => `mt-sk-${n}`}
          renderItem={() => (
            <View style={{ width: ITEM_W, marginRight: 14 }}>
              <View
                style={{
                  width: CIRCLE,
                  height: CIRCLE,
                  borderRadius: CIRCLE / 2,
                  backgroundColor: "#f0f0f0",
                  alignSelf: "center",
                }}
              />
              <View
                style={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "#f0f0f0",
                  marginTop: 8,
                }}
              />
            </View>
          )}
        />
      ) : (
        <FlatList
          data={items}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{ width: ITEM_W, marginRight: 14 }}
              activeOpacity={0.75}
              onPress={() => openSearch(item.name)}
              accessibilityRole="button"
              accessibilityLabel={`Search ${item.name}`}
            >
              <View
                style={{
                  width: CIRCLE,
                  height: CIRCLE,
                  borderRadius: CIRCLE / 2,
                  backgroundColor: "#FFF5EE",
                  borderWidth: 1,
                  borderColor: "rgba(255,107,0,0.12)",
                  overflow: "hidden",
                  alignSelf: "center",
                }}
              >
                <Image
                  source={{ uri: item.imageUrl || undefined }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={300}
                />
              </View>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: "#1a1a1a",
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
