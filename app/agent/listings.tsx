import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { agentApi, Property } from "@/lib/api";
import {
  KerSpace,
  listingTypeLabel,
  listingTypeColor,
  money,
} from "@/constants/kerspace";

const K = KerSpace;

const REVIEW_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_REVIEW: { label: "Pending review", color: K.warn, bg: K.warnBg },
  APPROVED: { label: "Live", color: K.success, bg: "#ECFDF5" },
  REJECTED: { label: "Rejected", color: K.danger, bg: "#FEF2F2" },
};

export default function AgentListings() {
  const router = useRouter();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await agentApi.listProperties();
      setItems(res?.data ?? []);
    } catch {
      /* keep */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const changeStatus = (p: Property) => {
    const opts: { label: string; value: string }[] = [
      { label: "Available", value: "AVAILABLE" },
      { label: "Under offer", value: "UNDER_OFFER" },
      { label: "Mark as Sold", value: "SOLD" },
      { label: "Mark as Rented", value: "RENTED" },
    ];
    Alert.alert("Update status", p.title, [
      ...opts.map((o) => ({
        text: o.label,
        onPress: async () => {
          try {
            await agentApi.updateStatus(p.id, o.value);
            load();
          } catch (e: any) {
            Alert.alert("Failed", e?.message || "Try again");
          }
        },
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const remove = (p: Property) => {
    Alert.alert("Delete listing?", `"${p.title}" will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await agentApi.deleteProperty(p.id);
            load();
          } catch (e: any) {
            Alert.alert("Failed", e?.message || "Try again");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My listings</Text>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.push("/agent/property-form" as any)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={K.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={K.primary}
            />
          }
        >
          {items.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="business-outline" size={40} color={K.inkLight} />
              <Text style={s.emptyTitle}>No listings yet</Text>
              <Text style={s.emptySub}>
                Add your first property to start receiving leads.
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => router.push("/agent/property-form" as any)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={s.emptyBtnText}>Add property</Text>
              </TouchableOpacity>
            </View>
          ) : (
            items.map((p) => {
              const rev = REVIEW_META[p.reviewStatus || "PENDING_REVIEW"];
              const img = p.images?.find((i) => i.isPrimary) || p.images?.[0];
              const closed = p.status === "SOLD" || p.status === "RENTED";
              return (
                <View key={p.id} style={s.card}>
                  <View style={s.cardTop}>
                    {img ? (
                      <Image source={{ uri: img.url }} style={s.thumb} />
                    ) : (
                      <View style={[s.thumb, s.thumbEmpty]}>
                        <Ionicons name="image" size={22} color={K.inkLight} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={s.rowBetween}>
                        <View
                          style={[
                            s.pill,
                            { backgroundColor: listingTypeColor(p.listingType) },
                          ]}
                        >
                          <Text style={s.pillText}>
                            {listingTypeLabel(p.listingType)}
                          </Text>
                        </View>
                        <View style={[s.reviewPill, { backgroundColor: rev.bg }]}>
                          <Text style={[s.reviewText, { color: rev.color }]}>
                            {rev.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={s.title} numberOfLines={1}>
                        {p.title}
                      </Text>
                      <Text style={s.price}>
                        {money(p.price, p.currency)}
                        {p.listingType === "FOR_RENT" ? " /mo" : ""}
                      </Text>
                      <Text style={s.meta} numberOfLines={1}>
                        {p.city}
                        {closed ? ` · ${p.status}` : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={s.actions}>
                    <Action
                      icon="create-outline"
                      label="Edit"
                      onPress={() =>
                        router.push({
                          pathname: "/agent/property-form" as any,
                          params: { id: p.id },
                        })
                      }
                    />
                    <Action
                      icon="swap-horizontal"
                      label="Status"
                      onPress={() => changeStatus(p)}
                    />
                    <Action
                      icon="trash-outline"
                      label="Delete"
                      tint={K.danger}
                      onPress={() => remove(p)}
                    />
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Action({
  icon,
  label,
  onPress,
  tint = K.inkMid,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <TouchableOpacity style={s.action} onPress={onPress}>
      <Ionicons name={icon as any} size={17} color={tint} />
      <Text style={[s.actionText, { color: tint }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: K.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    backgroundColor: K.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: K.border,
  },
  cardTop: { flexDirection: "row", gap: 12 },
  thumb: { width: 92, height: 92, borderRadius: 12, backgroundColor: "#EEE" },
  thumbEmpty: { justifyContent: "center", alignItems: "center" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  reviewPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  reviewText: { fontSize: 10, fontWeight: "800" },
  title: { fontSize: 15, fontWeight: "700", color: K.ink, marginTop: 6 },
  price: { fontSize: 15, fontWeight: "800", color: K.primary, marginTop: 2 },
  meta: { fontSize: 12, color: K.inkLight, marginTop: 2 },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: K.border,
    marginTop: 10,
    paddingTop: 8,
  },
  action: {
    flex: 1,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  actionText: { fontSize: 13, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: K.ink, marginTop: 8 },
  emptySub: {
    fontSize: 13,
    color: K.inkMid,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  emptyBtn: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: K.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 12,
  },
  emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
