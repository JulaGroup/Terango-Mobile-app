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
  const out: { key: string; label: string; day: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      key: ymd(d),
      label:
        i === 0
          ? "Today"
          : i === 1
            ? "Tmrw"
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
  // TeranGO adds a 5% service fee on top of the provider's price — keep this in
  // sync with SERVICE_FEE_RATE in server/src/services/experience.service.ts.
  const subtotal = (selectedOption?.price || 0) * quantity;
  const serviceFee = Math.round(subtotal * 0.05);
  const total = subtotal + serviceFee;

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

  const selectedMonthLabel = new Date(
    selectedDate + "T12:00:00",
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

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
              <Ionicons name="sparkles" size={64} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.55)", "transparent", "rgba(0,0,0,0.3)"]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top"]} style={styles.heroBar}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={21} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={styles.circleBtn} onPress={onShare}>
                <Ionicons name="share-social" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => setFav((f) => !f)}
              >
                <Ionicons
                  name={fav ? "heart" : "heart-outline"}
                  size={19}
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

          {/* Quick info strip */}
          <View style={styles.infoStrip}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={15} color={PrimaryColor} />
              <Text style={styles.infoText} numberOfLines={1}>
                {experience.address || experience.city || "The Gambia"}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={15} color={PrimaryColor} />
              <Text style={styles.infoText}>
                Up to {experience.totalUnits} {unitLabel}s
              </Text>
            </View>
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

          {/* Packages — side-by-side horizontal cards */}
          <Text style={styles.blockTitle}>Choose a package</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 6, paddingHorizontal: 1 }}
          >
            {experience.options?.map((opt, index) => {
              const active = selectedOption?.id === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.9}
                  onPress={() => setSelectedOption(opt)}
                  style={[styles.pkgCard, active && styles.pkgCardActive]}
                >
                  <View style={[styles.pkgDurBadge, active && styles.pkgDurBadgeActive]}>
                    <Ionicons name="time-outline" size={11} color={active ? "#fff" : PrimaryColor} />
                    <Text style={[styles.pkgDurText, active && { color: "#fff" }]}>
                      {opt.durationMins} min
                    </Text>
                  </View>
                  <Text style={[styles.pkgLabel, active && styles.pkgLabelActive]} numberOfLines={2}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.pkgUnit, active && { color: "rgba(255,255,255,0.7)" }]}>
                    per {unitLabel}
                  </Text>
                  <Text style={[styles.pkgPrice, active && { color: "#fff" }]}>
                    D{opt.price}
                  </Text>
                  {active ? (
                    <View style={styles.pkgCornerIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="rgba(255,255,255,0.9)" />
                    </View>
                  ) : index === 0 && experience.options && experience.options.length > 1 ? (
                    <View style={styles.pkgPopBadge}>
                      <Text style={styles.pkgPopText}>Popular</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.divider} />

          {/* Date — with month context badge */}
          <View style={styles.sectionRow}>
            <Text style={styles.blockTitle}>Pick a date</Text>
            <View style={styles.monthBadge}>
              <Ionicons name="calendar-outline" size={12} color={PrimaryColor} />
              <Text style={styles.monthBadgeText}>{selectedMonthLabel}</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 6, paddingHorizontal: 1 }}
          >
            {days.map((d) => {
              const active = selectedDate === d.key;
              const isToday = d.label === "Today";
              return (
                <TouchableOpacity
                  key={d.key}
                  activeOpacity={0.85}
                  onPress={() => setSelectedDate(d.key)}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                >
                  <Text style={[styles.dayLabel, active && styles.dayTextActive, isToday && !active && { color: PrimaryColor }]}>
                    {d.label}
                  </Text>
                  <Text style={[styles.dayNum, active && styles.dayTextActive]}>
                    {d.day}
                  </Text>
                  {isToday && !active && <View style={styles.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time — horizontal pill row */}
          <Text style={[styles.blockTitle, { marginTop: 22 }]}>Pick a time</Text>
          {slotsLoading ? (
            <View style={styles.slotsLoading}>
              <ActivityIndicator color={PrimaryColor} size="small" />
              <Text style={styles.slotsLoadingText}>Checking availability…</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.noSlotsWrap}>
              <Ionicons name="time-outline" size={28} color="#CBD5E1" />
              <Text style={styles.noSlots}>No times available. Try another date.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 6, paddingHorizontal: 1 }}
            >
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
                      styles.timePill,
                      active && styles.timePillActive,
                      sold && styles.timePillSold,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timePillText,
                        active && styles.timePillTextActive,
                        sold && styles.timePillTextSold,
                      ]}
                    >
                      {formatSlotTime(s.startTime)}
                    </Text>
                    <Text
                      style={[
                        styles.timePillSub,
                        active && styles.timePillTextActive,
                        sold && { color: "#CBD5E1" },
                      ]}
                    >
                      {sold ? "Sold out" : `${s.available} left`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Quantity — card with price math */}
          {selectedSlot && (
            <View style={styles.qtyCard}>
              <View style={styles.qtyCardRow}>
                <View>
                  <Text style={styles.qtyLabel}>Quantity</Text>
                  <Text style={styles.qtyHint}>{slotAvailable} {unitLabel}s available</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepBtn, quantity <= 1 && styles.stepBtnDisabled]}
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Ionicons
                      name="remove"
                      size={18}
                      color={quantity <= 1 ? "#CBD5E1" : PrimaryColor}
                    />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{quantity}</Text>
                  <TouchableOpacity
                    style={[styles.stepBtn, quantity >= slotAvailable && styles.stepBtnDisabled]}
                    onPress={() => setQuantity((q) => Math.min(slotAvailable, q + 1))}
                    disabled={quantity >= slotAvailable}
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={quantity >= slotAvailable ? "#CBD5E1" : PrimaryColor}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {selectedOption && (
                <View style={styles.priceMathBlock}>
                  <View style={styles.priceMathRow}>
                    <Text style={styles.priceMathLabel}>
                      D{selectedOption.price} × {quantity}
                    </Text>
                    <Text style={styles.priceMathValue}>D{subtotal}</Text>
                  </View>
                  <View style={styles.priceMathLine}>
                    <Text style={styles.priceMathLabel}>Service fee (5%)</Text>
                    <Text style={styles.priceMathValue}>D{serviceFee}</Text>
                  </View>
                  <View style={styles.priceMathLine}>
                    <Text style={styles.priceMathTotalLabel}>Total</Text>
                    <Text style={styles.priceMathTotal}>D{total}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {/* Venue */}
          <Text style={styles.blockTitle}>Venue</Text>
          <View style={styles.venueCard}>
            <View style={styles.venueIcon}>
              <Ionicons name="business" size={20} color={PrimaryColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.venueName}>{experience.name}</Text>
              <Text style={styles.venueSub} numberOfLines={1}>
                {experience.address || experience.city || "The Gambia"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {!!experience.phone && (
                <TouchableOpacity style={styles.venueAction} onPress={callVenue}>
                  <Ionicons name="call-outline" size={17} color={PrimaryColor} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.venueAction} onPress={openMap}>
                <Ionicons name="map-outline" size={17} color={PrimaryColor} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total price</Text>
          <Text style={styles.footerTotal}>
            D{total}
            {quantity > 1 && (
              <Text style={styles.footerUnit}> · {quantity} {unitLabel}s</Text>
            )}
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
              <>
                <Ionicons
                  name="flash"
                  size={17}
                  color={canBook ? "#fff" : "#94A3B8"}
                />
                <Text style={[styles.ctaText, !canBook && { color: "#94A3B8" }]}>
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
  container: { flex: 1, backgroundColor: "#fff" },
  center: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  hero: { height: 320, width: SCREEN_W, backgroundColor: "#eee" },
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
    backgroundColor: "rgba(0,0,0,0.32)",
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
    paddingTop: 22,
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
    letterSpacing: -0.5,
  },
  infoStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  infoText: { fontSize: 13.5, color: "#475569", fontWeight: "500", flex: 1 },
  infoDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#E2E8F0",
  },
  block: { marginTop: 20 },
  blockTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  about: {
    fontSize: 14.5,
    color: "#64748B",
    lineHeight: 23,
    marginTop: 8,
  },
  readMore: { color: PrimaryColor, fontWeight: "700", marginTop: 6, fontSize: 13 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 22 },

  /* Package cards — side by side */
  pkgCard: {
    width: 155,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    position: "relative",
    gap: 5,
  },
  pkgCardActive: {
    backgroundColor: PrimaryColor,
    borderColor: PrimaryColor,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  pkgDurBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#FFF5EE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  pkgDurBadgeActive: { backgroundColor: "rgba(255,255,255,0.22)" },
  pkgDurText: { fontSize: 11, fontWeight: "700", color: PrimaryColor },
  pkgLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 6,
    lineHeight: 20,
  },
  pkgLabelActive: { color: "#fff" },
  pkgUnit: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },
  pkgPrice: { fontSize: 24, fontWeight: "900", color: PrimaryColor, marginTop: 6 },
  pkgCornerIcon: { position: "absolute", top: 12, right: 12 },
  pkgPopBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FFF5EE",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pkgPopText: { fontSize: 10, fontWeight: "800", color: PrimaryColor },

  /* Date strip */
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF5EE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  monthBadgeText: { fontSize: 12, fontWeight: "700", color: PrimaryColor },
  dayChip: {
    width: 68,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    gap: 2,
  },
  dayChipActive: {
    backgroundColor: PrimaryColor,
    borderColor: PrimaryColor,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  dayLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dayNum: { fontSize: 22, color: "#0F172A", fontWeight: "900" },
  dayTextActive: { color: "#fff" },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: PrimaryColor,
    marginTop: 2,
  },

  /* Time slots — horizontal pill row */
  slotsLoading: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    gap: 10,
  },
  slotsLoadingText: { color: "#94A3B8", fontSize: 13 },
  noSlotsWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  noSlots: { color: "#94A3B8", fontSize: 14 },
  timePill: {
    width: 108,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    alignItems: "center",
  },
  timePillActive: {
    backgroundColor: PrimaryColor,
    borderColor: PrimaryColor,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  timePillSold: { opacity: 0.4 },
  timePillText: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  timePillSub: { fontSize: 11, color: "#94A3B8", marginTop: 3, fontWeight: "500" },
  timePillTextActive: { color: "#fff" },
  timePillTextSold: { textDecorationLine: "line-through", color: "#94A3B8" },

  /* Quantity card */
  qtyCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  qtyCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyLabel: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  qtyHint: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  stepBtn: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    minWidth: 34,
    textAlign: "center",
  },
  priceMathBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  priceMathRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceMathLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  priceMathLabel: { fontSize: 14, color: "#64748B", fontWeight: "500" },
  priceMathValue: { fontSize: 14, color: "#0F172A", fontWeight: "700" },
  priceMathTotalLabel: { fontSize: 15, color: "#0F172A", fontWeight: "800" },
  priceMathTotal: { fontSize: 18, fontWeight: "900", color: PrimaryColor },

  /* Venue */
  venueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF5EE",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Footer */
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 14,
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
    gap: 7,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
