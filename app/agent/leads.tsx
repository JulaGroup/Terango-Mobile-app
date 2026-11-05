import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { agentApi } from "@/lib/api";
import { KerSpace } from "@/constants/kerspace";

const K = KerSpace;

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "New", color: K.warn, bg: K.warnBg },
  CONTACTED: { label: "Contacted", color: K.primary, bg: K.primaryLight },
  CLOSED: { label: "Closed", color: K.inkMid, bg: "#F3F4F6" },
};

export default function AgentLeads() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("ALL");

  const load = useCallback(async () => {
    try {
      const res = await agentApi.listInquiries();
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

  const setStatus = async (lead: any, status: string) => {
    try {
      await agentApi.updateInquiryStatus(lead.id, status);
      setItems((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status } : l)),
      );
    } catch {
      /* ignore */
    }
  };

  const shown =
    filter === "ALL" ? items : items.filter((l) => l.status === filter);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Leads</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.filters}>
        {["ALL", "PENDING", "CONTACTED", "CLOSED"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterOn]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextOn]}>
              {f === "ALL" ? "All" : STATUS[f].label}
            </Text>
          </TouchableOpacity>
        ))}
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
          {shown.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={K.inkLight} />
              <Text style={s.emptyTitle}>No leads here</Text>
              <Text style={s.emptySub}>
                Inquiries from buyers and renters will appear here.
              </Text>
            </View>
          ) : (
            shown.map((l) => {
              const st = STATUS[l.status] || STATUS.PENDING;
              return (
                <View key={l.id} style={s.card}>
                  <View style={s.rowBetween}>
                    <Text style={s.name}>{l.fullName}</Text>
                    <View style={[s.pill, { backgroundColor: st.bg }]}>
                      <Text style={[s.pillText, { color: st.color }]}>
                        {st.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.propTitle} numberOfLines={1}>
                    {l.property?.title || "Property"}
                    {l.inquiryType ? ` · ${l.inquiryType.toLowerCase()}` : ""}
                  </Text>
                  {!!l.message && <Text style={s.msg}>{l.message}</Text>}
                  <View style={s.actions}>
                    <TouchableOpacity
                      style={s.callBtn}
                      onPress={() => Linking.openURL(`tel:${l.phone}`)}
                    >
                      <Ionicons name="call" size={16} color="#fff" />
                      <Text style={s.callText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.waBtn}
                      onPress={() =>
                        Linking.openURL(
                          `https://wa.me/${l.phone.replace(/[^\d]/g, "")}`,
                        )
                      }
                    >
                      <Ionicons name="logo-whatsapp" size={16} color={K.success} />
                    </TouchableOpacity>
                    {l.status !== "CONTACTED" && l.status !== "CLOSED" && (
                      <TouchableOpacity
                        style={s.ghostBtn}
                        onPress={() => setStatus(l, "CONTACTED")}
                      >
                        <Text style={s.ghostText}>Mark contacted</Text>
                      </TouchableOpacity>
                    )}
                    {l.status !== "CLOSED" && (
                      <TouchableOpacity
                        style={s.ghostBtn}
                        onPress={() => setStatus(l, "CLOSED")}
                      >
                        <Text style={s.ghostText}>Close</Text>
                      </TouchableOpacity>
                    )}
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
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
  },
  filterOn: { backgroundColor: K.primary, borderColor: K.primary },
  filterText: { fontSize: 13, fontWeight: "700", color: K.inkMid },
  filterTextOn: { color: "#fff" },
  card: {
    backgroundColor: K.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: K.border,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 16, fontWeight: "800", color: K.ink },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 11, fontWeight: "800" },
  propTitle: { fontSize: 13, color: K.inkMid, marginTop: 4, fontWeight: "600" },
  msg: {
    fontSize: 14,
    color: K.ink,
    marginTop: 8,
    lineHeight: 19,
    backgroundColor: K.bg,
    padding: 10,
    borderRadius: 10,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: K.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  callText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  waBtn: {
    width: 36,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  ghostBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: K.border,
  },
  ghostText: { fontSize: 13, fontWeight: "700", color: K.inkMid },
  empty: { alignItems: "center", paddingVertical: 60, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: K.ink, marginTop: 8 },
  emptySub: {
    fontSize: 13,
    color: K.inkMid,
    textAlign: "center",
    paddingHorizontal: 30,
  },
});
