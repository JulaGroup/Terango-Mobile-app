import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryColor } from "@/constants/Colors";
import { experienceApi, Experience, ExperienceOption } from "@/lib/api";

const { width: SCREEN_W } = Dimensions.get("window");

function formatSlotTime(iso: string) {
  const d = new Date(iso);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function buildDays(count = 14) {
  const out: { key: string; top: string; day: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      key: ymd(d),
      top:
        i === 0
          ? "Today"
          : i === 1
            ? "Tomorrow"
            : d.toLocaleDateString("en-US", { weekday: "short" }),
      day: String(d.getDate()),
    });
  }
  return out;
}

export default function ExperienceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [fav, setFav] = useState(false);

  const [selectedOption, setSelectedOption] = useState<ExperienceOption | null>(
    null,
  );
  const [days] = useState(buildDays());
  const [selectedDate, setSelectedDate] = useState<string>(days[0].key);
  const [slots, setSlots] = useState<{ startTime: string; available: number }[]>(
    [],
  );
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slotAvailable, setSlotAvailable] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const exp = await experienceApi.getById(id);
        setExperience(exp);
        if (exp.options?.length) setSelectedOption(exp.options[0]);
      } catch {
        Alert.alert("Error", "Couldn't load this experience.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const loadSlots = useCallback(async () => {
    if (!experience || !selectedOption) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const res = await experienceApi.getAvailability(
        experience.id,
        selectedDate,
        selectedOption.id,
      );
      setSlots(res.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [experience, selectedOption, selectedDate]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const unitLabel = experience?.unitLabel || "spot";
  const total = (selectedOption?.price || 0) * quantity;

  const onPickSlot = (slot: { startTime: string; available: number }) => {
    if (slot.available <= 0) return;
    setSelectedSlot(slot.startTime);
    setSlotAvailable(slot.available);
    setQuantity((q) => Math.min(Math.max(1, q), slot.available));
  };

  const handleBook = async () => {
    if (!experience || !selectedOption || !selectedSlot) return;
    try {
      setBooking(true);
      const created = await experienceApi.createBooking({
        experienceId: experience.id,
        optionId: selectedOption.id,
        startTime: selectedSlot,
        quantity,
      });
      router.push({
        pathname: "/booking/[bookingId]" as any,
        params: { bookingId: created.id },
      });
    } catch (e: any) {
      Alert.alert(
        "Couldn't book",
        e?.message?.replace(/^API Error: \d+ - /, "") ||
          "Please try another time.",
      );
    } finally {
      setBooking(false);
    }
  };

  const openMap = () => {
    if (!experience) return;
    const lat = (experience as any).latitude;
    const lng = (experience as any).longitude;
    const q =
      lat && lng
        ? `${lat},${lng}`
        : encodeURIComponent(
            experience.address || experience.city || experience.name,
          );
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  const callVenue = () => {
    if (experience?.phone) Linking.openURL(`tel:${experience.phone}`);
  };

  const onShare = () => {
    if (!experience) return;
    Share.share({
      message: `Check out ${experience.name} on TeranGO — book your slot in the app!`,
    }).catch(() => {});
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={PrimaryColor} size="large" />
      </SafeAreaView>
    );
  }
  if (!experience) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: "#94A3B8" }}>Experience not found.</Text>
      </SafeAreaView>
    );
  }

  const canBook = !!selectedOption && !!selectedSlot && quantity > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          {experience.imageUrl ? (
            <Image source={{ uri: experience.imageUrl }} style={styles.heroImg} />
          ) : (
            <LinearGradient
              colors={[PrimaryColor, "#FF8A34"]}
              style={styles.heroImg}
            >
              <Ionicons name="sparkles" size={60} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.5)", "transparent", "rgba(0,0,0,0.35)"]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top"]} style={styles.heroBar}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={styles.circleBtn} onPress={onShare}>
                <Ionicons name="share-social" size={19} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => setFav((f) => !f)}
              >
                <Ionicons
                  name={fav ? "heart" : "heart-outline"}
                  size={20}
                  color={fav ? "#EF4444" : "#fff"}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Sheet */}
        <View style={styles.sheet}>
          {!!experience.category && (
            <View style={styles.catPill}>
              <Text style={styles.catPillText}>{experience.category}</Text>
            </View>
          )}
          <Text style={styles.title}>{experience.name}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="location" size={16} color={PrimaryColor} />
            <Text style={styles.metaText}>
              {experience.address || experience.city || "TeranGO"}
            </Text>
            <View style={styles.metaDot} />
            <Ionicons name="people" size={16} color={PrimaryColor} />
            <Text style={styles.metaText}>
              up to {experience.totalUnits} {unitLabel}s
            </Text>
          </View>

          {/* About */}
          {!!experience.description && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>About</Text>
              <Text
                style={styles.about}
                numberOfLines={expanded ? undefined : 3}
              >
                {experience.description}
              </Text>
              {experience.description.length > 90 && (
                <TouchableOpacity onPress={() => setExpanded((e) => !e)}>
                  <Text style={styles.readMore}>
                    {expanded ? "Show less" : "Read more"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {/* Packages */}
          <Text style={styles.blockTitle}>Choose a package</Text>
          <View style={{ marginTop: 10 }}>
            {experience.options?.map((opt) => {
              const active = selectedOption?.id === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.9}
                  onPress={() => setSelectedOption(opt)}
                  style={[styles.optionCard, active && styles.optionCardActive]}
                >
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                    <Text style={styles.optionMeta}>
                      {opt.durationMins} min · per {unitLabel}
                    </Text>
                  </View>
                  <Text style={styles.optionPrice}>D{opt.price}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date */}
          <Text style={[styles.blockTitle, { marginTop: 22 }]}>Select date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
          >
            {days.map((d) => {
              const active = selectedDate === d.key;
              return (
                <TouchableOpacity
                  key={d.key}
                  activeOpacity={0.85}
                  onPress={() => setSelectedDate(d.key)}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                >
                  <Text style={[styles.dayTop, active && styles.dayTextActive]}>
                    {d.top}
                  </Text>
                  <Text style={[styles.dayNum, active && styles.dayTextActive]}>
                    {d.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time */}
          <Text style={[styles.blockTitle, { marginTop: 22 }]}>Select time</Text>
          {slotsLoading ? (
            <ActivityIndicator
              color={PrimaryColor}
              style={{ marginVertical: 20 }}
            />
          ) : slots.length === 0 ? (
            <Text style={styles.noSlots}>
              No times available for this day. Try another date.
            </Text>
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((s) => {
                const active = selectedSlot === s.startTime;
                const sold = s.available <= 0;
                return (
                  <TouchableOpacity
                    key={s.startTime}
                    disabled={sold}
                    activeOpacity={0.85}
                    onPress={() => onPickSlot(s)}
                    style={[
                      styles.slot,
                      active && styles.slotActive,
                      sold && styles.slotSold,
                    ]}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        active && styles.slotTextActive,
                        sold && styles.slotTextSold,
                      ]}
                    >
                      {formatSlotTime(s.startTime)}
                    </Text>
                    <Text
                      style={[
                        styles.slotSub,
                        active && styles.slotTextActive,
                        sold && styles.slotTextSold,
                      ]}
                    >
                      {sold ? "Full" : `${s.available} left`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Quantity */}
          {selectedSlot && (
            <>
              <Text style={[styles.blockTitle, { marginTop: 22 }]}>
                How many {unitLabel}s?
              </Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Ionicons name="remove" size={20} color={PrimaryColor} />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() =>
                    setQuantity((q) => Math.min(slotAvailable, q + 1))
                  }
                >
                  <Ionicons name="add" size={20} color={PrimaryColor} />
                </TouchableOpacity>
                <Text style={styles.qtyHint}>{slotAvailable} available</Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          {/* Venue / contact */}
          <Text style={styles.blockTitle}>Venue</Text>
          <View style={styles.venueRow}>
            <View style={styles.venueIcon}>
              <Ionicons
                name="business"
                size={20}
                color={PrimaryColor}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.venueName}>{experience.name}</Text>
              <Text style={styles.venueSub} numberOfLines={1}>
                {experience.address || experience.city || "TeranGO"}
              </Text>
            </View>
            {!!experience.phone && (
              <TouchableOpacity style={styles.venueAction} onPress={callVenue}>
                <Ionicons name="call" size={18} color={PrimaryColor} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.venueAction} onPress={openMap}>
              <Ionicons name="map" size={18} color={PrimaryColor} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total price</Text>
          <Text style={styles.footerTotal}>
            D{total}
            <Text style={styles.footerUnit}> / {unitLabel}</Text>
          </Text>
        </View>
        <TouchableOpacity
          disabled={!canBook || booking}
          activeOpacity={0.9}
          onPress={handleBook}
          style={{ flex: 1, marginLeft: 16 }}
        >
          <LinearGradient
            colors={canBook ? [PrimaryColor, "#FF8A34"] : ["#CBD5E1", "#CBD5E1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            {booking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>
                {canBook ? "Book now" : "Select a time"}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  hero: { height: 300, width: SCREEN_W, backgroundColor: "#eee" },
  heroImg: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  heroBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  catPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF5EE",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  catPillText: {
    color: PrimaryColor,
    fontWeight: "800",
    fontSize: 12,
    textTransform: "capitalize",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    flexWrap: "wrap",
  },
  metaText: { fontSize: 14, color: "#475569", fontWeight: "500" },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 6,
  },
  block: { marginTop: 20 },
  blockTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  about: {
    fontSize: 14.5,
    color: "#64748B",
    lineHeight: 22,
    marginTop: 8,
  },
  readMore: { color: PrimaryColor, fontWeight: "700", marginTop: 6, fontSize: 13 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 22 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 12,
  },
  optionCardActive: { borderColor: PrimaryColor, backgroundColor: "#FFF9F5" },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: { borderColor: PrimaryColor },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: PrimaryColor,
  },
  optionLabel: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  optionMeta: { fontSize: 12.5, color: "#94A3B8", marginTop: 3 },
  optionPrice: { fontSize: 18, fontWeight: "900", color: PrimaryColor },
  dayChip: {
    width: 62,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
  },
  dayChipActive: { backgroundColor: PrimaryColor, borderColor: PrimaryColor },
  dayTop: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  dayNum: { fontSize: 18, color: "#0F172A", fontWeight: "800", marginTop: 2 },
  dayTextActive: { color: "#fff" },
  noSlots: {
    color: "#94A3B8",
    fontSize: 14,
    paddingVertical: 12,
    textAlign: "center",
  },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  slot: {
    width: "31%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
  },
  slotActive: { backgroundColor: PrimaryColor, borderColor: PrimaryColor },
  slotSold: { backgroundColor: "#F1F5F9", opacity: 0.6 },
  slotText: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  slotSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  slotTextActive: { color: "#fff" },
  slotTextSold: { color: "#94A3B8" },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    minWidth: 28,
    textAlign: "center",
  },
  qtyHint: { color: "#94A3B8", fontSize: 13, marginLeft: 4 },
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  venueIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFF5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  venueName: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  venueSub: { fontSize: 13, color: "#94A3B8", marginTop: 2 },
  venueAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 10,
  },
  footerLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  footerTotal: { color: "#0F172A", fontSize: 22, fontWeight: "900" },
  footerUnit: { color: "#94A3B8", fontSize: 13, fontWeight: "600" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
