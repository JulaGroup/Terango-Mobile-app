import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryColor } from "@/constants/Colors";
import { experienceApi, Experience } from "@/lib/api";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W - 32;

export default function ExperiencesScreen() {
  const router = useRouter();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExperiences = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const data = await experienceApi.list();
      setExperiences(Array.isArray(data) ? data : []);
    } catch {
      setError("Couldn't load experiences. Pull to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExperiences();
  }, [fetchExperiences]);

  const fromPrice = (exp: Experience) => {
    const prices = (exp.options || []).map((o) => o.price).filter(Boolean);
    return prices.length ? Math.min(...prices) : null;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerKicker}>DISCOVER</Text>
          <Text style={styles.headerTitle}>Experiences</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={18} color={PrimaryColor} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchExperiences(true);
            }}
            colors={[PrimaryColor]}
            tintColor={PrimaryColor}
          />
        }
      >
        <Text style={styles.lead}>
          Book unforgettable activities around you 🎟️
        </Text>

        {loading ? (
          <View style={{ paddingHorizontal: 16 }}>
            {[1, 2].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonImg} />
                <View style={styles.skeletonLineWide} />
                <View style={styles.skeletonLine} />
              </View>
            ))}
          </View>
        ) : error ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="cloud-offline-outline" size={46} color="#CBD5E1" />
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : experiences.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyBadge}>
              <Ionicons name="sparkles-outline" size={34} color={PrimaryColor} />
            </View>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              New experiences are coming soon. Check back shortly!
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {experiences.map((exp) => {
              const price = fromPrice(exp);
              return (
                <TouchableOpacity
                  key={exp.id}
                  style={styles.card}
                  activeOpacity={0.92}
                  onPress={() =>
                    router.push({
                      pathname: "/experiences/[id]" as any,
                      params: { id: exp.id },
                    })
                  }
                >
                  {/* Image with overlay */}
                  <View style={styles.imageWrap}>
                    {exp.imageUrl ? (
                      <Image
                        source={{ uri: exp.imageUrl }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={["#FFB877", PrimaryColor]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.image}
                      >
                        <Ionicons
                          name="sparkles"
                          size={48}
                          color="rgba(255,255,255,0.9)"
                        />
                      </LinearGradient>
                    )}

                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.75)"]}
                      style={styles.imageOverlay}
                    />

                    {price != null && (
                      <View style={styles.priceTag}>
                        <Text style={styles.priceFrom}>from</Text>
                        <Text style={styles.priceValue}>D{price}</Text>
                      </View>
                    )}

                    {/* Title block on image */}
                    <View style={styles.titleBlock}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {exp.name}
                      </Text>
                      {!!(exp.address || exp.city) && (
                        <View style={styles.metaRow}>
                          <Ionicons
                            name="location"
                            size={13}
                            color="rgba(255,255,255,0.9)"
                          />
                          <Text style={styles.metaText} numberOfLines={1}>
                            {exp.address || exp.city}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.chip}>
                      <Ionicons
                        name="pricetags-outline"
                        size={13}
                        color={PrimaryColor}
                      />
                      <Text style={styles.chipText}>
                        {exp.options?.length || 0} option
                        {exp.options?.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                    {!!exp.unitLabel && (
                      <View style={styles.chip}>
                        <Ionicons
                          name="people-outline"
                          size={13}
                          color={PrimaryColor}
                        />
                        <Text style={styles.chipText}>per {exp.unitLabel}</Text>
                      </View>
                    )}
                    <View style={styles.bookBtn}>
                      <Text style={styles.bookBtnText}>Book</Text>
                      <Ionicons name="arrow-forward" size={14} color="#fff" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: { flex: 1 },
  headerKicker: {
    fontSize: 11,
    fontWeight: "800",
    color: PrimaryColor,
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  lead: {
    fontSize: 14,
    color: "#64748B",
    paddingHorizontal: 16,
    marginTop: 2,
    marginBottom: 18,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  imageWrap: {
    width: CARD_W,
    height: 210,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  priceTag: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
  },
  priceFrom: { fontSize: 9, fontWeight: "700", color: "#94A3B8", lineHeight: 11 },
  priceValue: {
    fontSize: 16,
    fontWeight: "900",
    color: PrimaryColor,
    lineHeight: 18,
  },
  titleBlock: { position: "absolute", left: 16, right: 16, bottom: 14 },
  cardName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  metaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.92)",
    flex: 1,
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF5EE",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  chipText: { color: PrimaryColor, fontWeight: "700", fontSize: 12 },
  bookBtn: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PrimaryColor,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  bookBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  emptyWrap: { alignItems: "center", paddingTop: 70, paddingHorizontal: 40 },
  emptyBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FFF5EE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  skeletonCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    marginBottom: 20,
    padding: 0,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    overflow: "hidden",
  },
  skeletonImg: { width: "100%", height: 210, backgroundColor: "#EEF2F6" },
  skeletonLineWide: {
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EEF2F6",
    margin: 14,
    marginBottom: 8,
    width: "60%",
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 14,
    marginBottom: 16,
    width: "40%",
  },
});
