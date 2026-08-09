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
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryColor } from "@/constants/Colors";
import { experienceApi, Experience } from "@/lib/api";

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
    } catch (e: any) {
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
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColor} />

      {/* Header */}
      <LinearGradient
        colors={[PrimaryColor, "#FF8A34"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Experiences</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          Book slots for the best activities around town 🎟️
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator color={PrimaryColor} size="large" />
          </View>
        ) : error ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="cloud-offline-outline" size={44} color="#CBD5E1" />
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : experiences.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="star-outline" size={44} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              No experiences available yet. Check back soon!
            </Text>
          </View>
        ) : (
          experiences.map((exp) => {
            const price = fromPrice(exp);
            return (
              <TouchableOpacity
                key={exp.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: "/experiences/[id]" as any,
                    params: { id: exp.id },
                  })
                }
              >
                <View style={styles.cardImageWrap}>
                  {exp.imageUrl ? (
                    <Image
                      source={{ uri: exp.imageUrl }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={["#FFE3CC", "#FFD0AC"]}
                      style={styles.cardImage}
                    >
                      <Ionicons name="star" size={40} color={PrimaryColor} />
                    </LinearGradient>
                  )}
                  <View style={styles.priceTag}>
                    <Text style={styles.priceTagText}>
                      {price != null ? `from D${price}` : "Book"}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {exp.name}
                  </Text>
                  {!!(exp.address || exp.city) && (
                    <View style={styles.metaRow}>
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color="#94A3B8"
                      />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {exp.address || exp.city}
                      </Text>
                    </View>
                  )}
                  <View style={styles.cardFooter}>
                    <View style={styles.optionsPill}>
                      <Ionicons
                        name="pricetags-outline"
                        size={13}
                        color={PrimaryColor}
                      />
                      <Text style={styles.optionsPillText}>
                        {exp.options?.length || 0} option
                        {exp.options?.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                    <View style={styles.bookNow}>
                      <Text style={styles.bookNowText}>Book</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={PrimaryColor}
                      />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    marginTop: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardImageWrap: { position: "relative" },
  cardImage: {
    width: "100%",
    height: 150,
    justifyContent: "center",
    alignItems: "center",
  },
  priceTag: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  priceTagText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  cardBody: { padding: 14 },
  cardName: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
  metaText: { fontSize: 13, color: "#94A3B8", flex: 1 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  optionsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF5EE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  optionsPillText: { color: PrimaryColor, fontWeight: "700", fontSize: 12 },
  bookNow: { flexDirection: "row", alignItems: "center", gap: 4 },
  bookNowText: { color: PrimaryColor, fontWeight: "800", fontSize: 14 },
  emptyWrap: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
  emptyText: {
    color: "#94A3B8",
    fontSize: 15,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
});
