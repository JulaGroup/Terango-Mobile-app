import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  KerSpace as K,
  listingTypeLabel,
  listingTypeColor,
  money,
} from "@/constants/kerspace";
import { getSaved, toggleSaved, SavedProperty } from "@/utils/kerspaceSaved";

export default function SavedProperties() {
  const router = useRouter();
  const [items, setItems] = useState<SavedProperty[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSaved().then(setItems);
    }, []),
  );

  const unsave = async (p: SavedProperty) => {
    await toggleSaved(p);
    setItems((prev) => prev.filter((x) => x.id !== p.id));
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Saved</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="heart-outline" size={44} color={K.inkLight} />
            <Text style={s.emptyTitle}>No saved properties</Text>
            <Text style={s.emptySub}>
              Tap the heart on any listing to save it here.
            </Text>
          </View>
        }
        renderItem={({ item: p }) => {
          const img = p.images?.[0];
          return (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.9}
              onPress={() =>
                router.push({ pathname: "/kerspace/[id]", params: { id: p.id } })
              }
            >
              <Image source={{ uri: img?.url }} style={s.thumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <View
                  style={[
                    s.pill,
                    { backgroundColor: listingTypeColor(p.listingType), alignSelf: "flex-start" },
                  ]}
                >
                  <Text style={s.pillText}>{listingTypeLabel(p.listingType)}</Text>
                </View>
                <Text style={s.title} numberOfLines={1}>
                  {p.title}
                </Text>
                <Text style={s.price}>
                  {money(p.price, p.currency)}
                  {p.listingType === "FOR_RENT" ? "/mo" : ""}
                </Text>
                <Text style={s.loc} numberOfLines={1}>
                  {p.city}
                  {p.region ? `, ${p.region}` : ""}
                </Text>
              </View>
              <TouchableOpacity style={s.heart} onPress={() => unsave(p)}>
                <Ionicons name="heart" size={20} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: K.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: K.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: K.border,
    alignItems: "center",
  },
  thumb: { width: 96, height: 96, borderRadius: 12, backgroundColor: "#EEE" },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  pillText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  title: { fontSize: 15, fontWeight: "700", color: K.ink, marginTop: 6 },
  price: { fontSize: 15, fontWeight: "800", color: K.primary, marginTop: 2 },
  loc: { fontSize: 12, color: K.inkLight, marginTop: 2 },
  heart: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  empty: { alignItems: "center", paddingVertical: 80, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: K.ink, marginTop: 10 },
  emptySub: {
    fontSize: 13,
    color: K.inkMid,
    textAlign: "center",
    paddingHorizontal: 30,
  },
});
