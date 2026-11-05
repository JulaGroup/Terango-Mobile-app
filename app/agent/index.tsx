import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { agentApi } from "@/lib/api";
import { KerSpace } from "@/constants/kerspace";

const K = KerSpace;

export default function AgentHub() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const m = await agentApi.me();
      setMe(m);
      if (m?.isAgent) {
        try {
          setStats(await agentApi.stats());
        } catch {
          /* ignore */
        }
      }
    } catch {
      setMe(null);
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

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <ActivityIndicator color={K.primary} />
      </SafeAreaView>
    );
  }

  const isAgent = !!me?.isAgent;
  const application = me?.application;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>KërSpace Agent</Text>
        <View style={{ width: 40 }} />
      </View>

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
        {!isAgent ? (
          <NotAgent application={application} onApply={() => router.push("/agent/apply" as any)} />
        ) : (
          <>
            {/* Stats */}
            <View style={s.statRow}>
              <Stat label="Active" value={stats?.activeListings ?? 0} icon="home" />
              <Stat
                label="Pending"
                value={stats?.pendingReview ?? 0}
                icon="time"
                tint={K.warn}
              />
              <Stat
                label="New leads"
                value={stats?.newLeads ?? 0}
                icon="chatbubble-ellipses"
                tint={K.primary}
              />
            </View>
            <View style={s.statRow}>
              <Stat
                label="Viewings"
                value={stats?.upcomingViewings ?? 0}
                icon="calendar"
              />
              <Stat
                label="Closed"
                value={stats?.closedDeals ?? 0}
                icon="checkmark-done"
                tint={K.success}
              />
              <Stat
                label="Leads"
                value={stats?.totalLeads ?? 0}
                icon="people"
              />
            </View>

            {/* Add listing CTA */}
            <TouchableOpacity
              style={s.addBtn}
              onPress={() => router.push("/agent/property-form" as any)}
              activeOpacity={0.9}
            >
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={s.addBtnText}>Add a property</Text>
            </TouchableOpacity>

            {/* Nav tiles */}
            <NavTile
              icon="business"
              title="My listings"
              sub="Edit, publish status, mark sold/rented"
              onPress={() => router.push("/agent/listings" as any)}
            />
            <NavTile
              icon="chatbubbles"
              title="Leads"
              sub="Buyer & renter inquiries on your listings"
              badge={stats?.newLeads}
              onPress={() => router.push("/agent/leads" as any)}
            />
            <NavTile
              icon="calendar"
              title="Viewings & open houses"
              sub="Scheduled property visits"
              badge={stats?.upcomingViewings}
              onPress={() => router.push("/agent/viewings" as any)}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotAgent({
  application,
  onApply,
}: {
  application: any;
  onApply: () => void;
}) {
  const pending = application?.status === "PENDING";
  const waitlisted = application?.status === "WAITING_LIST";
  const rejected = application?.status === "REJECTED";
  return (
    <View>
      <View style={s.hero}>
        <View style={s.heroIcon}>
          <Ionicons name="business" size={30} color={K.primary} />
        </View>
        <Text style={s.heroTitle}>List properties on KërSpace</Text>
        <Text style={s.heroSub}>
          Join as a verified real-estate agent or company. Post your listings,
          receive leads, and manage viewings — all from here.
        </Text>
      </View>

      {pending || waitlisted ? (
        <View style={[s.statusCard, { backgroundColor: K.warnBg }]}>
          <Ionicons name="time" size={20} color={K.warn} />
          <Text style={s.statusText}>
            {pending
              ? "Your application is under review. We'll notify you once it's approved."
              : "You're on the waiting list. We'll reach out when a slot opens."}
          </Text>
        </View>
      ) : rejected ? (
        <View style={[s.statusCard, { backgroundColor: "#FEF2F2" }]}>
          <Ionicons name="close-circle" size={20} color={K.danger} />
          <Text style={s.statusText}>
            Your previous application wasn't approved
            {application?.reviewNotes ? `: ${application.reviewNotes}` : "."} You
            can apply again below.
          </Text>
        </View>
      ) : null}

      {!pending && !waitlisted && (
        <TouchableOpacity style={s.addBtn} onPress={onApply} activeOpacity={0.9}>
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={s.addBtnText}>
            {rejected ? "Apply again" : "Become an agent"}
          </Text>
        </TouchableOpacity>
      )}

      <View style={s.benefits}>
        {[
          ["pricetags", "Post unlimited listings for sale or rent"],
          ["notifications", "Get leads straight to your portal"],
          ["shield-checkmark", "Verified badge builds buyer trust"],
        ].map(([icon, label]) => (
          <View key={label} style={s.benefitRow}>
            <Ionicons name={icon as any} size={18} color={K.primary} />
            <Text style={s.benefitText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  icon,
  tint = K.ink,
}: {
  label: string;
  value: number;
  icon: string;
  tint?: string;
}) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon as any} size={18} color={tint} />
      <Text style={[s.statValue, { color: tint }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function NavTile({
  icon,
  title,
  sub,
  badge,
  onPress,
}: {
  icon: string;
  title: string;
  sub: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.tile} onPress={onPress} activeOpacity={0.8}>
      <View style={s.tileIcon}>
        <Ionicons name={icon as any} size={20} color={K.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.tileTitle}>{title}</Text>
        <Text style={s.tileSub}>{sub}</Text>
      </View>
      {!!badge && badge > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={K.inkLight} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: K.bg },
  center: { justifyContent: "center", alignItems: "center" },
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
  statRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  stat: {
    flex: 1,
    backgroundColor: K.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: K.border,
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, color: K.inkLight, fontWeight: "600" },
  addBtn: {
    backgroundColor: K.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 14,
  },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: K.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: K.border,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: K.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  tileTitle: { fontSize: 15, fontWeight: "700", color: K.ink },
  tileSub: { fontSize: 12, color: K.inkMid, marginTop: 2 },
  badge: {
    backgroundColor: K.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  hero: { alignItems: "center", paddingVertical: 18 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: K.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  heroTitle: { fontSize: 22, fontWeight: "800", color: K.ink, textAlign: "center" },
  heroSub: {
    fontSize: 14,
    color: K.inkMid,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  statusCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  statusText: { flex: 1, fontSize: 13, color: K.inkMid, lineHeight: 19 },
  benefits: {
    backgroundColor: K.card,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: K.border,
    marginTop: 4,
  },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitText: { flex: 1, fontSize: 14, color: K.ink },
});
