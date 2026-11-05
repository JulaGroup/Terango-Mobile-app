/**
 * KërSpace — Property detail (customer). Gallery, specs, description, map,
 * agent card (call + WhatsApp), and sticky Contact / Book-Viewing actions.
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
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

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [p, setP] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);
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
    const now = await toggleSaved(p as SavedProperty);
    setSaved(now);
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
  const agentName =
    p.agent?.companyName || p.agent?.user?.fullName || p.contactName || "Listing agent";
  const agentPhone = p.agent?.phone || p.contactPhone || "";
  const hasMap = p.latitude != null && p.longitude != null;

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Gallery */}
        <View style={s.gallery}>
          {images.length > 0 ? (
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(i) => i.id}
              onMomentumScrollEnd={(e) =>
                setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width))
              }
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  activeOpacity={0.95}
                  onPress={() => {
                    setViewerIndex(index);
                    setViewerOpen(true);
                  }}
                >
                  <Image source={{ uri: item.url }} style={s.galleryImg} contentFit="cover" />
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={[s.galleryImg, s.center, { backgroundColor: "#E5E7EB" }]}>
              <Ionicons name="image" size={40} color={K.inkLight} />
            </View>
          )}

          <SafeAreaView edges={["top"]} style={s.galleryTop}>
            <TouchableOpacity style={s.roundBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={K.ink} />
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={s.roundBtn} onPress={share}>
                <Ionicons name="share-social" size={18} color={K.ink} />
              </TouchableOpacity>
              <TouchableOpacity style={s.roundBtn} onPress={onSave}>
                <Ionicons
                  name={saved ? "heart" : "heart-outline"}
                  size={19}
                  color={saved ? "#EF4444" : K.ink}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {images.length > 1 && (
            <View style={s.dots}>
              {images.map((_, i) => (
                <View key={i} style={[s.dot, i === imgIndex && s.dotOn]} />
              ))}
            </View>
          )}
          <View style={s.galleryBadges}>
            <View
              style={[s.pill, { backgroundColor: listingTypeColor(p.listingType) }]}
            >
              <Text style={s.pillText}>{listingTypeLabel(p.listingType)}</Text>
            </View>
            {!p.agentId && p.isVerified ? (
              <View style={[s.pill, { backgroundColor: "#111827" }]}>
                <Text style={s.pillText}>🛡 TeranGO</Text>
              </View>
            ) : p.isVerified ? (
              <View style={[s.pill, { backgroundColor: K.primary }]}>
                <Text style={s.pillText}>✓ Verified</Text>
              </View>
            ) : null}
          </View>

          {images.length > 0 && (
            <View style={s.countPill}>
              <Ionicons name="images" size={12} color="#fff" />
              <Text style={s.countText}>
                {imgIndex + 1}/{images.length}
              </Text>
            </View>
          )}
        </View>

        {/* Title + price */}
        <View style={s.section}>
          <View style={s.rowBetween}>
            <Text style={s.price}>
              {money(p.price, p.currency)}
              {p.listingType === "FOR_RENT" ? (
                <Text style={s.perMonth}> /month</Text>
              ) : null}
            </Text>
            {p.negotiable && <Text style={s.negotiable}>Negotiable</Text>}
          </View>
          <Text style={s.title}>{p.title}</Text>
          <Text style={s.address}>
            <Ionicons name="location" size={13} color={K.primary} /> {p.address},{" "}
            {p.city}
            {p.region ? `, ${p.region}` : ""}
          </Text>

          {/* Spec cards */}
          <View style={s.specCards}>
            {p.bedrooms != null && (
              <SpecCard icon="bed-outline" value={`${p.bedrooms}`} label="Beds" />
            )}
            {p.bathrooms != null && (
              <SpecCard icon="water-outline" value={`${p.bathrooms}`} label="Baths" />
            )}
            {p.toilets != null && (
              <SpecCard icon="man-outline" value={`${p.toilets}`} label="Toilets" />
            )}
            {p.area != null && (
              <SpecCard icon="resize-outline" value={`${p.area}`} label="m²" />
            )}
          </View>
        </View>

        {/* Description */}
        {!!p.description && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Description</Text>
            <Text style={s.desc} numberOfLines={descExpanded ? undefined : 4}>
              {p.description}
            </Text>
            {p.description.length > 160 && (
              <TouchableOpacity onPress={() => setDescExpanded((v) => !v)}>
                <Text style={s.readMore}>
                  {descExpanded ? "Read less" : "Read more"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Features */}
        {p.features && p.features.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Features</Text>
            <View style={s.featureWrap}>
              {p.features.map((f) => (
                <View key={f} style={s.feature}>
                  <Ionicons name="checkmark-circle" size={14} color={K.primary} />
                  <Text style={s.featureText}>{f}</Text>
                </View>
              ))}
              {p.furnished && (
                <View style={s.feature}>
                  <Ionicons name="bed" size={14} color={K.primary} />
                  <Text style={s.featureText}>Furnished</Text>
                </View>
              )}
              {p.serviced && (
                <View style={s.feature}>
                  <Ionicons name="construct" size={14} color={K.primary} />
                  <Text style={s.featureText}>Serviced</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Map */}
        {hasMap && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Location</Text>
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
                <Marker
                  coordinate={{ latitude: p.latitude!, longitude: p.longitude! }}
                />
              </MapView>
            </View>
          </View>
        )}

        {/* Agent card */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Listing agent</Text>
          <View style={s.agentCard}>
            <View style={s.agentAvatar}>
              {p.agent?.logoUrl || p.agent?.user?.avatarUrl ? (
                <Image
                  source={{ uri: p.agent?.logoUrl || p.agent?.user?.avatarUrl! }}
                  style={s.agentAvatarImg}
                />
              ) : (
                <Ionicons name="person" size={22} color={K.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={s.agentName}>{agentName}</Text>
                {p.agent?.isVerified && (
                  <Ionicons name="checkmark-circle" size={15} color={K.primary} />
                )}
              </View>
              <Text style={s.agentRole}>
                {p.agent
                  ? p.agent.type === "COMPANY"
                    ? "Real-estate company"
                    : "Real-estate agent"
                  : "Property contact"}
              </Text>
            </View>
            {!!agentPhone && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={s.agentIcon}
                  onPress={() =>
                    Linking.openURL(
                      `https://wa.me/${agentPhone.replace(/[^\d]/g, "")}`,
                    )
                  }
                >
                  <Ionicons name="logo-whatsapp" size={20} color={K.success} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.agentIcon, { backgroundColor: K.primary }]}
                  onPress={() => Linking.openURL(`tel:${agentPhone}`)}
                >
                  <Ionicons name="call" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky actions */}
      <View style={s.bottomBar}>
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
          renderItem={({ item }) => (
            <ZoomableImage uri={item} onZoomChange={setZoomed} />
          )}
        />
        <SafeAreaView edges={["top"]} style={s.viewerTop}>
          <TouchableOpacity style={s.viewerClose} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={s.viewerCount}>
            <Text style={s.viewerCountText}>
              {index + 1} / {images.length}
            </Text>
          </View>
        </SafeAreaView>
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
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={{ width, height, justifyContent: "center", alignItems: "center" }}
      >
        <Animated.Image
          source={{ uri }}
          style={[{ width, height }, style]}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

function SpecCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <View style={s.specCard}>
      <Ionicons name={icon as any} size={18} color={K.primary} />
      <Text style={s.specValue}>{value}</Text>
      <Text style={s.specLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: K.bg },
  center: { justifyContent: "center", alignItems: "center" },
  gallery: { height: 320, backgroundColor: "#E5E7EB" },
  galleryImg: { width, height: 320 },
  galleryTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  dots: {
    position: "absolute",
    bottom: 54,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotOn: { backgroundColor: "#fff", width: 18 },
  galleryBadges: {
    position: "absolute",
    bottom: 16,
    left: 16,
    flexDirection: "row",
    gap: 8,
  },
  countPill: {
    position: "absolute",
    bottom: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  countText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  viewerTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
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
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  pillText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  section: {
    backgroundColor: "#fff",
    marginTop: 10,
    marginHorizontal: 12,
    borderRadius: 16,
    padding: 16,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: { fontSize: 24, fontWeight: "900", color: K.primary },
  perMonth: { fontSize: 14, fontWeight: "600", color: K.inkLight },
  negotiable: {
    fontSize: 12,
    fontWeight: "700",
    color: K.primary,
    backgroundColor: K.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  title: { fontSize: 19, fontWeight: "800", color: K.ink, marginTop: 6 },
  address: { fontSize: 13, color: K.inkMid, marginTop: 6 },
  specCards: { flexDirection: "row", gap: 10, marginTop: 16 },
  specCard: {
    flex: 1,
    backgroundColor: K.bg,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 2,
  },
  specValue: { fontSize: 16, fontWeight: "800", color: K.ink },
  specLabel: { fontSize: 11, color: K.inkLight, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: K.ink, marginBottom: 10 },
  desc: { fontSize: 14, color: K.inkMid, lineHeight: 21 },
  readMore: { fontSize: 14, color: K.primary, fontWeight: "700", marginTop: 6 },
  featureWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: K.bg,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  featureText: { fontSize: 13, color: K.ink, fontWeight: "600" },
  mapWrap: { height: 160, borderRadius: 12, overflow: "hidden" },
  agentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  agentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: K.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  agentAvatarImg: { width: 48, height: 48 },
  agentName: { fontSize: 15, fontWeight: "800", color: K.ink },
  agentRole: { fontSize: 12, color: K.inkLight, marginTop: 2 },
  agentIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
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
    paddingBottom: 28,
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
    flex: 1.4,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: K.primary,
  },
  interestText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
