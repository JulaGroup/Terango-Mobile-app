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
  PENDING: { label: "Requested", color: K.warn, bg: K.warnBg },
  CONFIRMED: { label: "Confirmed", color: K.primary, bg: K.primaryLight },
  COMPLETED: { label: "Completed", color: K.success, bg: "#ECFDF5" },
  CANCELLED: { label: "Cancelled", color: K.danger, bg: "#FEF2F2" },
};

export default function AgentViewings() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await agentApi.listAppointments();
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

  const setStatus = async (appt: any, status: string) => {
    try {
      await agentApi.updateAppointmentStatus(appt.id, status);
      setItems((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, status } : a)),
      );
    } catch {
      /* ignore */
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Viewings</Text>
        <View style={{ width: 40 }} />
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
              <Ionicons name="calendar-outline" size={40} color={K.inkLight} />
              <Text style={s.emptyTitle}>No viewings yet</Text>
              <Text style={s.emptySub}>
                When someone books a viewing, it shows up here.
              </Text>
            </View>
          ) : (
            items.map((a) => {
              const st = STATUS[a.status] || STATUS.PENDING;
              const d = a.preferredDate
                ? new Date(a.preferredDate).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "";
              return (
                <View key={a.id} style={s.card}>
                  <View style={s.rowBetween}>
                    <Text style={s.name}>{a.fullName}</Text>
                    <View style={[s.pill, { backgroundColor: st.bg }]}>
                      <Text style={[s.pillText, { color: st.color }]}>
                        {st.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.propTitle} numberOfLines={1}>
                    {a.property?.title || "Property"}
                  </Text>
                  <View style={s.when}>
                    <Ionicons name="calendar" size={14} color={K.primary} />
                    <Text style={s.whenText}>
                      {d} · {a.preferredTime}
                    </Text>
                  </View>
                  {!!a.notes && <Text style={s.msg}>{a.notes}</Text>}
                  <View style={s.actions}>
                    <TouchableOpacity
                      style={s.callBtn}
                      onPress={() => Linking.openURL(`tel:${a.phone}`)}
                    >
                      <Ionicons name="call" size={16} color="#fff" />
                      <Text style={s.callText}>Call</Text>
                    </TouchableOpacity>
                    {a.status === "PENDING" && (
                      <TouchableOpacity
                        style={s.ghostBtn}
                        onPress={() => setStatus(a, "CONFIRMED")}
                      >
                        <Text style={s.ghostText}>Confirm</Text>
                      </TouchableOpacity>
                    )}
                    {(a.status === "PENDING" || a.status === "CONFIRMED") && (
                      <>
                        <TouchableOpacity
                          style={s.ghostBtn}
                          onPress={() => setStatus(a, "COMPLETED")}
                        >
                          <Text style={s.ghostText}>Done</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.ghostBtn}
                          onPress={() => setStatus(a, "CANCELLED")}
                        >
                          <Text style={[s.ghostText, { color: K.danger }]}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </>
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
  when: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  whenText: { fontSize: 14, color: K.ink, fontWeight: "700" },
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
