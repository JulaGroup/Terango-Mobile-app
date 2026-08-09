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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryColor } from "@/constants/Colors";
import { experienceApi, Experience, ExperienceOption } from "@/lib/api";

// Venue clock time is encoded as UTC in the slot ISO — read it back as UTC so
// it shows the venue's intended time regardless of the device timezone.
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
    const top =
      i === 0
        ? "Today"
        : i === 1
          ? "Tomorrow"
          : d.toLocaleDateString("en-US", { weekday: "short" });
    out.push({ key: ymd(d), top, day: String(d.getDate()) });
  }
  return out;
}

export default function ExperienceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);

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
              <Ionicons name="star" size={56} color="rgba(255,255,255,0.85)" />
            </LinearGradient>
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "transparent"]}
            style={styles.heroTopFade}
          />
          <SafeAreaView edges={["top"]} style={styles.heroTopBar}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{experience.name}</Text>
          {!!(experience.address || experience.city) && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={15} color="#94A3B8" />
              <Text style={styles.metaText}>
                {experience.address || experience.city}
              </Text>
            </View>
          )}
          {!!experience.description && (
            <Text style={styles.desc}>{experience.description}</Text>
          )}

          {/* Options */}
          <Text style={styles.sectionTitle}>Choose a package</Text>
          {experience.options?.map((opt) => {
            const active = selectedOption?.id === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.85}
                onPress={() => setSelectedOption(opt)}
                style={[styles.optionCard, active && styles.optionCardActive]}
              >
                <View
                  style={[styles.radio, active && styles.radioActive]}
                >
                  {active && <View style={styles.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionMeta}>
                    <Ionicons name="time-outline" size={12} color="#94A3B8" />{" "}
                    {opt.durationMins} min · per {unitLabel}
                  </Text>
                </View>
                <Text style={styles.optionPrice}>D{opt.price}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Date */}
          <Text style={styles.sectionTitle}>Pick a date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 2 }}
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
                  <Text
                    style={[styles.dayTop, active && styles.dayTextActive]}
                  >
                    {d.top}
                  </Text>
                  <Text
                    style={[styles.dayNum, active && styles.dayTextActive]}
                  >
                    {d.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Slots */}
          <Text style={styles.sectionTitle}>Pick a time</Text>
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
              <Text style={styles.sectionTitle}>
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
                <Text style={styles.qtyHint}>
                  {slotAvailable} available
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerTotal}>D{total}</Text>
        </View>
        <TouchableOpacity
          disabled={!canBook || booking}
          activeOpacity={0.9}
          onPress={handleBook}
          style={{ flex: 1, marginLeft: 16 }}
        >
          <LinearGradient
            colors={
              canBook ? [PrimaryColor, "#FF8A34"] : ["#CBD5E1", "#CBD5E1"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            {booking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="calendar" size={18} color="#fff" />
                <Text style={styles.ctaText}>
                  {canBook ? "Book now" : "Select a time"}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  center: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  hero: { height: 240, backgroundColor: "#eee" },
  heroImg: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTopFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  heroTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  body: {
    backgroundColor: "#F7F8FA",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: { fontSize: 24, fontWeight: "900", color: "#0F172A" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  metaText: { color: "#94A3B8", fontSize: 14 },
  desc: { color: "#475569", fontSize: 14, lineHeight: 21, marginTop: 12 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 24,
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
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
  optionMeta: { fontSize: 12, color: "#94A3B8", marginTop: 3 },
  optionPrice: { fontSize: 18, fontWeight: "900", color: PrimaryColor },
  dayChip: {
    width: 62,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
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
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slot: {
    width: "31%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  slotActive: { backgroundColor: PrimaryColor, borderColor: PrimaryColor },
  slotSold: { backgroundColor: "#F1F5F9", opacity: 0.7 },
  slotText: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  slotSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  slotTextActive: { color: "#fff" },
  slotTextSold: { color: "#94A3B8" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyValue: { fontSize: 22, fontWeight: "900", color: "#0F172A", minWidth: 28, textAlign: "center" },
  qtyHint: { color: "#94A3B8", fontSize: 13, marginLeft: 4 },
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
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  footerLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  footerTotal: { color: "#0F172A", fontSize: 22, fontWeight: "900" },
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
