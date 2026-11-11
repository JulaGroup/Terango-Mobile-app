/**
 * KërSpace — Property detail (customer). Premium layout: hero + thumbnail
 * strip, price card, spec boxes, description, map, agent card and a sticky
 * action bar. Tap a photo for the full-screen pinch-zoom + swipe gallery.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { kerspaceApi, Property } from "@/lib/api";
import {
  KerSpace as K,
  listingTypeLabel,
  listingTypeColor,
  money,
} from "@/constants/kerspace";
import { isSaved, toggleSaved, SavedProperty } from "@/utils/kerspaceSaved";

const { width, height } = Dimensions.get("window");
const HERO_H = 300;

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const data = await kerspaceApi.get(String(id));
        setP(data);
        setSaved(await isSaved(String(id)));
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onSave = useCallback(async () => {
    if (!p) return;
    setSaved(await toggleSaved(p as SavedProperty));
  }, [p]);

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <ActivityIndicator color={K.primary} />
      </SafeAreaView>
    );
  }
  if (!p) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <Text style={{ color: K.inkMid }}>Property not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: K.primary, fontWeight: "700" }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const images = p.images?.length ? p.images : [];
  const hero = images.find((i) => i.isPrimary) || images[0];
  const agentName =
    p.agent?.companyName ||
    p.agent?.user?.fullName ||
    p.contactName ||
    "Listing agent";
  const agentPhone = p.agent?.phone || p.contactPhone || "";
  const teranGO = !p.agentId && p.isVerified;
  const hasMap = p.latitude != null && p.longitude != null;

  const openViewer = (i: number) => {
    setViewerIndex(i);
    setViewerOpen(true);
  };
  const share = () =>
    Share.share({
      message: `${p.title} — ${money(p.price, p.currency)} on KërSpace`,
    });
  const goInquire = () =>
    router.push({ pathname: "/kerspace/inquire", params: { id: p.id } } as any);
  const goAppointment = () =>
    router.push({
      pathname: "/kerspace/appointment",
      params: { id: p.id },
    } as any);

  return (
    <View style={s.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero */}
        <View style={s.hero}>
          <TouchableOpacity activeOpacity={0.95} onPress={() => openViewer(0)}>
            <Image source={{ uri: hero?.url }} style={s.heroImg} contentFit="cover" />
          </TouchableOpacity>
          <View style={s.heroShade} pointerEvents="none" />

          <View style={[s.heroTop, { top: insets.top + 6 }]}>
            <TouchableOpacity style={s.round} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={K.ink} />
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={s.round} onPress={share}>
                <Ionicons name="share-social" size={18} color={K.ink} />
              </TouchableOpacity>
              <TouchableOpacity style={s.round} onPress={onSave}>
                <Ionicons
                  name={saved ? "heart" : "heart-outline"}
                  size={19}
                  color={saved ? "#EF4444" : K.ink}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.heroBadges}>
            <View
              style={[s.pill, { backgroundColor: listingTypeColor(p.listingType) }]}
            >
              <Text style={s.pillText}>{listingTypeLabel(p.listingType)}</Text>
            </View>
            {p.isVerified && (
              <View style={s.verifiedPill}>
                <Ionicons name="checkmark-circle" size={13} color={K.primary} />
                <Text style={s.verifiedPillText}>
                  {teranGO ? "TeranGO" : "Verified"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <View style={s.thumbStrip}>
            {images.slice(0, 4).map((im, i) => (
              <TouchableOpacity
                key={im.id}
                onPress={() => openViewer(i)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: im.url }} style={s.thumb} contentFit="cover" />
              </TouchableOpacity>
            ))}
            {images.length > 4 && (
              <TouchableOpacity
                style={[s.thumb, s.thumbMore]}
                onPress={() => openViewer(4)}
              >
                <Text style={s.thumbMoreText}>+{images.length - 4}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Price + title */}
        <View style={s.body}>
          <View style={s.rowBetween}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={s.typeLabel}>
                {p.type.charAt(0) + p.type.slice(1).toLowerCase()}
              </Text>
              <Text style={s.title}>{p.title}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.price}>{money(p.price, p.currency)}</Text>
              {p.listingType === "FOR_RENT" && (
                <Text style={s.perMonth}>
                  {p.rentPeriod === "NIGHT" ? "per night" : "per month"}
                </Text>
              )}
              {p.negotiable && <Text style={s.negotiable}>Negotiable</Text>}
            </View>
          </View>

          <View style={s.locRow}>
            <Ionicons name="location" size={14} color={K.primary} />
            <Text style={s.address} numberOfLines={2}>
              {p.address}, {p.city}
              {p.region ? `, ${p.region}` : ""}
            </Text>
          </View>

          {/* Spec boxes */}
          <View style={s.specRow}>
            {p.bedrooms != null && (
              <SpecBox icon="bed-outline" value={`${p.bedrooms}`} label="Beds" />
            )}
            {p.bathrooms != null && (
              <SpecBox mci icon="shower" value={`${p.bathrooms}`} label="Baths" />
            )}
            {p.area != null && (
              <SpecBox icon="resize-outline" value={`${p.area}`} label="m²" />
            )}
            {p.toilets != null && (
              <SpecBox mci icon="toilet" value={`${p.toilets}`} label="Toilets" />
            )}
          </View>
        </View>

        {/* Description */}
        {!!p.description && (
          <View style={s.block}>
            <Text style={s.blockTitle}>Description</Text>
            <Text style={s.desc} numberOfLines={descExpanded ? undefined : 4}>
              {p.description}
            </Text>
            {p.description.length > 150 && (
              <TouchableOpacity onPress={() => setDescExpanded((v) => !v)}>
                <Text style={s.readMore}>
                  {descExpanded ? "Read less" : "Read more"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Features */}
        {((p.features && p.features.length > 0) || p.furnished || p.serviced) && (
          <View style={s.block}>
            <Text style={s.blockTitle}>Features & amenities</Text>
            <View style={s.featureWrap}>
              {p.furnished && <Feature label="Furnished" icon="bed" />}
              {p.serviced && <Feature label="Serviced" icon="construct" />}
              {(p.features || []).map((f) => (
                <Feature key={f} label={f} icon="checkmark-circle" />
              ))}
            </View>
          </View>
        )}

        {/* Map */}
        {hasMap && (
          <View style={s.block}>
            <Text style={s.blockTitle}>Location</Text>
            <View style={s.mapWrap}>
              <MapView
                style={{ flex: 1 }}
                provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
                initialRegion={{
                  latitude: p.latitude!,
                  longitude: p.longitude!,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
              >
                <Marker coordinate={{ latitude: p.latitude!, longitude: p.longitude! }} />
              </MapView>
            </View>
          </View>
        )}

        {/* Agent */}
        <View style={s.block}>
          <Text style={s.blockTitle}>Listing agent</Text>
          <View style={s.agentCard}>
            <View style={s.agentAvatar}>
              {p.agent?.logoUrl || p.agent?.user?.avatarUrl ? (
                <Image
                  source={{ uri: p.agent?.logoUrl || p.agent?.user?.avatarUrl! }}
                  style={s.agentAvatarImg}
                />
              ) : (
                <Ionicons name={teranGO ? "shield-checkmark" : "person"} size={22} color={K.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={s.agentName}>{teranGO ? "TeranGO" : agentName}</Text>
                {(p.agent?.isVerified || teranGO) && (
                  <Ionicons name="checkmark-circle" size={15} color={K.primary} />
                )}
              </View>
              <Text style={s.agentRole}>
                {teranGO
                  ? "Official TeranGO listing"
                  : p.agent
                    ? p.agent.type === "COMPANY"
                      ? "Real-estate company"
                      : "Real-estate agent"
                    : "Property contact"}
              </Text>
            </View>
            {/* Contact goes through TeranGO — clients use "Book viewing" or
                "I'm interested" below; TeranGO confirms and notifies the agent.
                No direct agent phone/WhatsApp is exposed. */}
          </View>
          <Text style={s.agentNote}>
            Interested? Use “Book viewing” or “I’m interested” below — TeranGO
            confirms your request and connects you.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky actions */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity style={s.bookBtn} onPress={goAppointment} activeOpacity={0.9}>
          <Ionicons name="calendar-outline" size={18} color={K.primary} />
          <Text style={s.bookText}>Book viewing</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.interestBtn} onPress={goInquire} activeOpacity={0.9}>
          <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          <Text style={s.interestText}>I'm interested</Text>
        </TouchableOpacity>
      </View>

      <ZoomViewer
        visible={viewerOpen}
        images={images.map((i) => i.url)}
        startIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

function SpecBox({
  icon,
  value,
  label,
  mci,
}: {
  icon: string;
  value: string;
  label: string;
  mci?: boolean;
}) {
  return (
    <View style={s.specBox}>
      {mci ? (
        <MaterialCommunityIcons name={icon as any} size={18} color={K.primary} />
      ) : (
        <Ionicons name={icon as any} size={18} color={K.primary} />
      )}
      <Text style={s.specValue}>{value}</Text>
      <Text style={s.specLabel}>{label}</Text>
    </View>
  );
}

function Feature({ label, icon }: { label: string; icon: string }) {
  return (
    <View style={s.feature}>
      <Ionicons name={icon as any} size={14} color={K.primary} />
      <Text style={s.featureText}>{label}</Text>
    </View>
  );
}

// ─── Full-screen zoom + slide gallery ─────────────────────────────────────────
function ZoomViewer({
  visible,
  images,
  startIndex,
  onClose,
}: {
  visible: boolean;
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setIndex(startIndex);
      setZoomed(false);
    }
  }, [visible, startIndex]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
        <FlatList
          data={images}
          keyExtractor={(u, i) => `${i}`}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item }) => <ZoomableImage uri={item} onZoomChange={setZoomed} />}
        />
        <View style={[s.viewerTop, { top: insets.top + 6 }]} pointerEvents="box-none">
          <TouchableOpacity
            style={s.viewerClose}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={s.viewerCount}>
            <Text style={s.viewerCountText}>
              {index + 1} / {images.length}
            </Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ZoomableImage({
  uri,
  onZoomChange,
}: {
  uri: string;
  onZoomChange: (z: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, saved.value * e.scale);
    })
    .onEnd(() => {
      if (scale.value < 1.01) {
        scale.value = withTiming(1);
        saved.value = 1;
        runOnJS(onZoomChange)(false);
      } else {
        saved.value = scale.value;
        runOnJS(onZoomChange)(true);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.01) {
        scale.value = withTiming(1);
        saved.value = 1;
        runOnJS(onZoomChange)(false);
      } else {
        scale.value = withTiming(2.5);
        saved.value = 2.5;
        runOnJS(onZoomChange)(true);
      }
    });

  const gesture = Gesture.Simultaneous(pinch, doubleTap);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={{ width, height, justifyContent: "center", alignItems: "center" }}>
        <Animated.Image
          source={{ uri }}
          style={[{ width, height }, style]}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

const CARD_SHADOW = {
  shadowColor: "#141A1F",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2,
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: K.bg },
  center: { justifyContent: "center", alignItems: "center" },
  // Hero
  hero: { height: HERO_H, backgroundColor: "#EEF0F3" },
  heroImg: { width, height: HERO_H },
  heroShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  heroTop: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroBadges: {
    position: "absolute",
    bottom: 14,
    left: 16,
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pillText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  verifiedPillText: { color: K.ink, fontSize: 11, fontWeight: "800" },
  // Thumbnail strip
  thumbStrip: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  thumb: { width: 62, height: 62, borderRadius: 12, backgroundColor: "#EEF0F3" },
  thumbMore: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: K.ink,
  },
  thumbMoreText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  // Body
  body: { paddingHorizontal: 16, paddingTop: 16 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  typeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: K.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: { fontSize: 20, fontWeight: "800", color: K.ink, marginTop: 4 },
  price: { fontSize: 22, fontWeight: "900", color: K.ink },
  perMonth: { fontSize: 12, color: K.inkLight, fontWeight: "600" },
  negotiable: {
    fontSize: 11,
    fontWeight: "800",
    color: K.primary,
    backgroundColor: K.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    marginTop: 4,
    overflow: "hidden",
  },
  locRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 12 },
  address: { flex: 1, fontSize: 13.5, color: K.inkMid, lineHeight: 19 },
  specRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  specBox: {
    flex: 1,
    backgroundColor: K.bgSoft,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 3,
  },
  specValue: { fontSize: 17, fontWeight: "800", color: K.ink },
  specLabel: { fontSize: 11, color: K.inkLight, fontWeight: "600" },
  // Blocks
  block: {
    paddingHorizontal: 16,
    marginTop: 22,
  },
  blockTitle: { fontSize: 17, fontWeight: "800", color: K.ink, marginBottom: 12 },
  desc: { fontSize: 14, color: K.inkMid, lineHeight: 22 },
  readMore: { fontSize: 14, color: K.primary, fontWeight: "800", marginTop: 8 },
  featureWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: K.bgSoft,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },
  featureText: { fontSize: 13, color: K.ink, fontWeight: "600" },
  mapWrap: {
    height: 170,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: K.border,
  },
  // Agent
  agentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: K.bgSoft,
    borderRadius: 16,
    padding: 14,
  },
  agentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: K.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  agentAvatarImg: { width: 50, height: 50 },
  agentName: { fontSize: 15.5, fontWeight: "800", color: K.ink },
  agentRole: { fontSize: 12, color: K.inkLight, marginTop: 2 },
  agentNote: { fontSize: 12, color: K.inkLight, marginTop: 10, lineHeight: 17 },
  agentIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  // Sticky
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: K.border,
  },
  bookBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: K.primary,
  },
  bookText: { fontSize: 15, fontWeight: "800", color: K.primary },
  interestBtn: {
    flex: 1.35,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: K.primary,
  },
  interestText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  // Viewer
  viewerTop: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 20,
  },
  viewerClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerCount: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  viewerCountText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
