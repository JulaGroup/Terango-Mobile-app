/**
 * TeranPro — Professional Service Detail Screen
 * Full-screen image gallery, service info, price, contact CTAs,
 * tags, description, and location. Matches KërSpace UI style.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_URL } from "@/constants/config";

const { width, height } = Dimensions.get("window");
const IMAGE_HEIGHT = height * 0.42;
const ORANGE = "#ff6b00";
const DARK = "#1a1a1a";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Service {
  id: string;
  name: string;
  description: string | null;
  imageUrls: string[];
  categoryId: string;
  category: { id: string; name: string; icon: string | null };
  city: string | null;
  state: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number;
  longitude: number;
  priceFrom: number | null;
  priceTo: number | null;
  priceUnit: string | null;
  rating: number;
  totalReviews: number;
  isFeatured: boolean;
  isVerified: boolean;
  isActive: boolean;
  tags: string[];
  openingHours: Record<
    string,
    { open: string; close: string; closed?: boolean }
  > | null;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatPrice = (
  from: number | null,
  to: number | null,
  unit: string | null,
) => {
  if (!from && !to) return "Price on request";
  const fmtNum = (n: number) =>
    n >= 1000
      ? `D${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
      : `D${n.toLocaleString()}`;
  if (from && to && from !== to) return `${fmtNum(from)} – ${fmtNum(to)}`;
  const val = from || to;
  if (!val) return "Price on request";
  return unit ? `${fmtNum(val)} / ${unit}` : fmtNum(val);
};

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

// ─── Gallery Dot ─────────────────────────────────────────────────────────────
const GalleryDot = ({ active }: { active: boolean }) => (
  <View
    style={{
      width: active ? 20 : 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: active ? "#fff" : "rgba(255,255,255,0.4)",
      marginHorizontal: 2.5,
    }}
  />
);

// ─── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow = ({
  icon,
  label,
  value,
  orange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  orange?: boolean;
}) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#F0EBE5",
    }}
  >
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: "#FFF5EE",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Ionicons name={icon} size={18} color={ORANGE} />
    </View>
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: 11,
          color: "#AAA",
          fontWeight: "600",
          marginBottom: 1,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: orange ? ORANGE : DARK,
          fontWeight: orange ? "700" : "500",
        }}
      >
        {value}
      </Text>
    </View>
  </View>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = () => {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim]);
  return (
    <Animated.View style={{ opacity: anim, flex: 1 }}>
      <View style={{ height: IMAGE_HEIGHT, backgroundColor: "#E0E0E0" }} />
      <View style={{ padding: 20, gap: 12 }}>
        <View
          style={{
            height: 20,
            backgroundColor: "#E0E0E0",
            borderRadius: 8,
            width: "80%",
          }}
        />
        <View
          style={{
            height: 14,
            backgroundColor: "#E0E0E0",
            borderRadius: 8,
            width: "50%",
          }}
        />
        <View
          style={{
            height: 30,
            backgroundColor: "#E0E0E0",
            borderRadius: 8,
            width: "40%",
          }}
        />
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 56,
                backgroundColor: "#E0E0E0",
                borderRadius: 14,
              }}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Full-screen Image Viewer ─────────────────────────────────────────────────
const ImageViewer = ({
  images,
  startIndex,
  visible,
  onClose,
}: {
  images: string[];
  startIndex: number;
  visible: boolean;
  onClose: () => void;
}) => {
  const [active, setActive] = useState(startIndex);
  const listRef = useRef<FlatList>(null);
  useEffect(() => {
    if (visible) setActive(startIndex);
  }, [visible, startIndex]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={(e) =>
            setActive(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={{ width, height: "100%" }}
              contentFit="contain"
            />
          )}
        />
        <View style={{ position: "absolute", top: 54, right: 18 }}>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "rgba(255,255,255,0.18)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text
          style={{
            position: "absolute",
            bottom: 36,
            alignSelf: "center",
            color: "rgba(255,255,255,0.7)",
            fontSize: 13,
            fontWeight: "600",
          }}
        >
          {active + 1} / {images.length}
        </Text>
      </View>
    </Modal>
  );
};

// ─── Main Detail Screen ───────────────────────────────────────────────────────
export default function TeranProDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const imageListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/api/teranpro/services/${id}`)
      .then((r) => r.json())
      .then((data) => setService(data.data || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = useCallback(async () => {
    if (!service) return;
    await Share.share({
      title: service.name,
      message: `Check out ${service.name} on TeranPro: Professional service in ${service.city || "Gambia"} — ${formatPrice(service.priceFrom, service.priceTo, service.priceUnit)}`,
    });
  }, [service]);

  const handleCall = useCallback(() => {
    if (!service?.phone) return;
    Linking.openURL(`tel:${service.phone}`);
  }, [service]);

  const handleEmail = useCallback(() => {
    if (!service?.email) return;
    Linking.openURL(`mailto:${service.email}`);
  }, [service]);

  const handleWhatsApp = useCallback(() => {
    if (!service?.phone) return;
    const number = service.phone.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${number}`);
  }, [service]);

  if (loading) return <Skeleton />;
  if (!service)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F7F4F0",
        }}
      >
        <Ionicons name="construct-outline" size={52} color="#DDD" />
        <Text style={{ color: "#999", marginTop: 12, fontSize: 15 }}>
          Service not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: 20,
            paddingHorizontal: 24,
            paddingVertical: 10,
            backgroundColor: ORANGE,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );

  const images = service.imageUrls.length > 0 ? service.imageUrls : [];
  const hasImages = images.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F4F0" }}>
      <StatusBar barStyle="light-content" />

      {/* ── Sticky floating header ────────────────────────────────────── */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: scrollY.interpolate({
            inputRange: [IMAGE_HEIGHT - 80, IMAGE_HEIGHT],
            outputRange: ["transparent", "#fff"],
            extrapolate: "clamp",
          }) as any,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Animated.Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: "700",
            color: DARK,
            opacity: scrollY.interpolate({
              inputRange: [IMAGE_HEIGHT - 80, IMAGE_HEIGHT],
              outputRange: [0, 1],
              extrapolate: "clamp",
            }),
          }}
        >
          {service.name}
        </Animated.Text>
        <TouchableOpacity
          onPress={handleShare}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="share-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* ── Image Gallery ─────────────────────────────────────────── */}
        <View style={{ height: IMAGE_HEIGHT }}>
          {hasImages ? (
            <FlatList
              ref={imageListRef}
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                setActiveImageIndex(idx);
              }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => setViewerVisible(true)}
                >
                  <Image
                    source={{ uri: item }}
                    style={{ width, height: IMAGE_HEIGHT }}
                    contentFit="cover"
                    transition={250}
                  />
                </TouchableOpacity>
              )}
            />
          ) : (
            <View
              style={{
                width,
                height: IMAGE_HEIGHT,
                backgroundColor: "#F0EBE5",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="construct-outline" size={72} color="#C0B0A0" />
            </View>
          )}
          {/* Bottom gradient */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)"]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 100,
            }}
            pointerEvents="none"
          />
          {/* Image dots */}
          {images.length > 1 && (
            <View
              style={{
                position: "absolute",
                bottom: 52,
                alignSelf: "center",
                flexDirection: "row",
              }}
            >
              {images.map((_, i) => (
                <GalleryDot key={i} active={i === activeImageIndex} />
              ))}
            </View>
          )}
          {images.length > 1 && (
            <View
              style={{
                position: "absolute",
                bottom: 46,
                right: 16,
                backgroundColor: "rgba(0,0,0,0.55)",
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Ionicons name="images-outline" size={13} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                {activeImageIndex + 1}/{images.length}
              </Text>
            </View>
          )}
          {hasImages && (
            <View
              style={{
                position: "absolute",
                bottom: 46,
                left: 16,
                backgroundColor: "rgba(0,0,0,0.45)",
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 3,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Ionicons name="expand-outline" size={12} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                Tap to expand
              </Text>
            </View>
          )}
        </View>

        {/* ── Content card (slides up over image) ───────────────────── */}
        <View
          style={{
            backgroundColor: "#F7F4F0",
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            marginTop: -26,
            paddingTop: 24,
          }}
        >
          {/* ── Title + badges ─────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
            {/* Badges row */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 10,
              }}
            >
              {service.isFeatured && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "#FFF3E0",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 20,
                  }}
                >
                  <Ionicons name="star" size={12} color="#FF9900" />
                  <Text
                    style={{
                      color: "#FF9900",
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    Featured
                  </Text>
                </View>
              )}
              {service.isVerified && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "#E8F5E9",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 20,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={12} color="#27AE60" />
                  <Text
                    style={{
                      color: "#27AE60",
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    Verified
                  </Text>
                </View>
              )}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#FFF5EE",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 20,
                }}
              >
                <Text style={{ fontSize: 13 }}>
                  {service.category?.icon || "🔧"}
                </Text>
                <Text
                  style={{ color: ORANGE, fontSize: 12, fontWeight: "700" }}
                >
                  {service.category?.name}
                </Text>
              </View>
            </View>

            {/* Service name */}
            <Text
              style={{
                fontSize: 24,
                fontWeight: "900",
                color: DARK,
                letterSpacing: -0.5,
                marginBottom: 8,
              }}
            >
              {service.name}
            </Text>

            {/* Location row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <Ionicons name="location" size={15} color={ORANGE} />
              <Text style={{ fontSize: 14, color: "#666" }}>
                {[service.address, service.city, service.state]
                  .filter(Boolean)
                  .join(", ") || "Gambia"}
              </Text>
            </View>

            {/* Rating row */}
            {service.rating > 0 && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={
                      star <= Math.round(service.rating)
                        ? "star"
                        : "star-outline"
                    }
                    size={15}
                    color="#FFB800"
                  />
                ))}
                <Text
                  style={{
                    fontSize: 13,
                    color: DARK,
                    fontWeight: "700",
                    marginLeft: 2,
                  }}
                >
                  {service.rating.toFixed(1)}
                </Text>
                {service.totalReviews > 0 && (
                  <Text style={{ fontSize: 12, color: "#AAA" }}>
                    ({service.totalReviews} reviews)
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* ── Price block ────────────────────────────────────────── */}
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 20,
              backgroundColor: "#fff",
              borderRadius: 18,
              padding: 18,
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 11,
                  color: "#AAA",
                  fontWeight: "600",
                  marginBottom: 2,
                }}
              >
                PRICE
              </Text>
              <Text
                style={{
                  fontSize: 26,
                  fontWeight: "900",
                  color: ORANGE,
                  letterSpacing: -0.5,
                }}
              >
                {formatPrice(
                  service.priceFrom,
                  service.priceTo,
                  service.priceUnit,
                )}
              </Text>
              {service.priceUnit && (
                <Text style={{ fontSize: 12, color: "#AAA", marginTop: 2 }}>
                  per {service.priceUnit}
                </Text>
              )}
            </View>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: "#FFF5EE",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="pricetag" size={24} color={ORANGE} />
            </View>
          </View>

          {/* ── Tags ──────────────────────────────────────────────── */}
          {service.tags.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: DARK,
                  marginBottom: 10,
                }}
              >
                Specialties
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {service.tags.map((tag) => (
                  <View
                    key={tag}
                    style={{
                      backgroundColor: "#FFF5EE",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderWidth: 1,
                      borderColor: "rgba(255,107,0,0.15)",
                    }}
                  >
                    <Text
                      style={{ fontSize: 13, color: ORANGE, fontWeight: "600" }}
                    >
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Description ───────────────────────────────────────── */}
          {service.description && (
            <View
              style={{
                marginHorizontal: 20,
                marginBottom: 20,
                backgroundColor: "#fff",
                borderRadius: 18,
                padding: 18,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: DARK,
                  marginBottom: 10,
                }}
              >
                About this Service
              </Text>
              <Text style={{ fontSize: 14, color: "#555", lineHeight: 22 }}>
                {service.description}
              </Text>
            </View>
          )}

          {/* ── Contact info ───────────────────────────────────────── */}
          {(service.phone || service.email) && (
            <View
              style={{
                marginHorizontal: 20,
                marginBottom: 20,
                backgroundColor: "#fff",
                borderRadius: 18,
                padding: 18,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: DARK,
                  marginBottom: 4,
                }}
              >
                Contact
              </Text>
              {service.phone && (
                <InfoRow
                  icon="call-outline"
                  label="PHONE"
                  value={service.phone}
                />
              )}
              {service.email && (
                <InfoRow
                  icon="mail-outline"
                  label="EMAIL"
                  value={service.email}
                />
              )}
              {service.city && (
                <InfoRow
                  icon="location-outline"
                  label="CITY"
                  value={service.city}
                />
              )}
            </View>
          )}

          {/* ── Opening hours ─────────────────────────────────────── */}
          {service.openingHours &&
            Object.keys(service.openingHours).length > 0 && (
              <View
                style={{
                  marginHorizontal: 20,
                  marginBottom: 20,
                  backgroundColor: "#fff",
                  borderRadius: 18,
                  padding: 18,
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="time-outline" size={18} color={ORANGE} />
                  <Text
                    style={{ fontSize: 16, fontWeight: "800", color: DARK }}
                  >
                    Opening Hours
                  </Text>
                </View>
                {DAYS.map((day) => {
                  const hours = service.openingHours?.[day];
                  if (!hours) return null;
                  const isClosed = hours.closed;
                  const today = new Date()
                    .toLocaleDateString("en-US", { weekday: "long" })
                    .toLowerCase();
                  const isToday = today === day;
                  return (
                    <View
                      key={day}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 7,
                        borderBottomWidth: 1,
                        borderBottomColor: "#F5F5F5",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: isToday ? ORANGE : DARK,
                          fontWeight: isToday ? "800" : "500",
                          width: 44,
                        }}
                      >
                        {DAY_LABELS[day]}
                      </Text>
                      {isToday && (
                        <View
                          style={{
                            backgroundColor: "#FFF5EE",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 8,
                            marginRight: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              color: ORANGE,
                              fontWeight: "800",
                            }}
                          >
                            TODAY
                          </Text>
                        </View>
                      )}
                      <Text
                        style={{
                          fontSize: 13,
                          color: isClosed ? "#CCC" : "#555",
                          fontWeight: "500",
                          flex: 1,
                          textAlign: "right",
                        }}
                      >
                        {isClosed ? "Closed" : `${hours.open} – ${hours.close}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

          {/* ── Location note ─────────────────────────────────────── */}
          {service.latitude || service.longitude ? (
            <View
              style={{
                marginHorizontal: 20,
                marginBottom: 20,
                backgroundColor: "#fff",
                borderRadius: 18,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              {/* Static map placeholder with coordinates */}
              <View
                style={{
                  height: 130,
                  backgroundColor: "#E8F4F8",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="map-outline" size={38} color="#B0C8D4" />
                <Text
                  style={{ fontSize: 13, color: "#90B0BC", fontWeight: "600" }}
                >
                  {service.latitude?.toFixed(4)},{" "}
                  {service.longitude?.toFixed(4)}
                </Text>
              </View>
              <View style={{ padding: 14 }}>
                <Text style={{ fontSize: 14, color: DARK, fontWeight: "600" }}>
                  {[service.address, service.city, service.state]
                    .filter(Boolean)
                    .join(", ") || "Gambia"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const lat = service.latitude;
                    const lng = service.longitude;
                    const url =
                      Platform.OS === "ios"
                        ? `maps://?ll=${lat},${lng}&q=${encodeURIComponent(service.name)}`
                        : `geo:${lat},${lng}?q=${encodeURIComponent(service.name)}`;
                    Linking.openURL(url);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 6,
                  }}
                >
                  <Ionicons name="navigate-outline" size={14} color={ORANGE} />
                  <Text
                    style={{ fontSize: 13, color: ORANGE, fontWeight: "700" }}
                  >
                    Get Directions
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>

      {/* ── Fixed bottom CTA bar ──────────────────────────────────────── */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom + 4, 20),
          backgroundColor: "#fff",
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 14,
          flexDirection: "row",
          gap: 10,
        }}
      >
        {/* WhatsApp */}
        {service.phone && (
          <TouchableOpacity
            onPress={handleWhatsApp}
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: "#E8F5E9",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialCommunityIcons name="whatsapp" size={24} color="#27AE60" />
          </TouchableOpacity>
        )}

        {/* Email */}
        {service.email && (
          <TouchableOpacity
            onPress={handleEmail}
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: "#FFF5EE",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="mail-outline" size={22} color={ORANGE} />
          </TouchableOpacity>
        )}

        {/* Call — primary button */}
        {service.phone && (
          <TouchableOpacity
            onPress={handleCall}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 16,
              backgroundColor: ORANGE,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              shadowColor: ORANGE,
              shadowOpacity: 0.4,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
              Call Now
            </Text>
          </TouchableOpacity>
        )}

        {/* If no phone — email as primary */}
        {!service.phone && service.email && (
          <TouchableOpacity
            onPress={handleEmail}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 16,
              backgroundColor: ORANGE,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="mail" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
              Send Email
            </Text>
          </TouchableOpacity>
        )}

        {/* Neither phone nor email */}
        {!service.phone && !service.email && (
          <View
            style={{
              flex: 1,
              height: 52,
              borderRadius: 16,
              backgroundColor: "#EEE",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#AAA", fontSize: 14, fontWeight: "600" }}>
              No contact info available
            </Text>
          </View>
        )}
      </View>

      {/* ── Full-screen image viewer ──────────────────────────────────── */}
      {hasImages && (
        <ImageViewer
          images={images}
          startIndex={activeImageIndex}
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
        />
      )}
    </View>
  );
}
