/**
 * KërSpace — Property Detail Screen
 * Full-screen image gallery, specs, features, map location,
 * "Express Interest" and "Book Viewing" CTAs.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { API_URL } from "@/constants/config";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");
const IMAGE_HEIGHT = height * 0.42;
const ORANGE = "#ff6b00";
const DARK = "#1a1a1a";

const TYPE_LABELS: Record<string, string> = {
  HOUSE: "House",
  APARTMENT: "Apartment",
  OFFICE: "Office",
  LAND: "Land",
  COMMERCIAL: "Commercial",
  VILLA: "Villa",
};

const formatPrice = (price: number, currency = "GMD") => {
  return `${currency} ${price.toLocaleString()}`;
};

interface PropertyImage {
  id: string;
  url: string;
  isPrimary: boolean;
}
interface Property {
  id: string;
  title: string;
  description: string;
  type: string;
  listingType: "FOR_SALE" | "FOR_RENT";
  price: number;
  currency: string;
  negotiable: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  toilets: number | null;
  area: number | null;
  address: string;
  city: string;
  region: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  features: string[];
  furnished: boolean;
  serviced: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  status: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  viewCount: number;
  images: PropertyImage[];
  createdAt: string;
}

// ─── Image Gallery Dot ────────────────────────────────────────────────────────
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

// ─── Spec Badge ───────────────────────────────────────────────────────────────
const SpecBadge = ({
  icon,
  label,
  value,
  library = "ionicons",
}: {
  icon: string;
  label: string;
  value: string;
  library?: "ionicons" | "mci";
}) => (
  <View
    style={{
      flex: 1,
      backgroundColor: "#FFF5EE",
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 6,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,107,0,0.1)",
    }}
  >
    {library === "mci" ? (
      <MaterialCommunityIcons name={icon as any} size={20} color={ORANGE} />
    ) : (
      <Ionicons name={icon as any} size={20} color={ORANGE} />
    )}
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      style={{ fontSize: 14, fontWeight: "800", color: DARK, marginTop: 4 }}
    >
      {value}
    </Text>
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      style={{ fontSize: 10, color: "#999", marginTop: 1 }}
    >
      {label}
    </Text>
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
  }, []);
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
                height: 80,
                backgroundColor: "#E0E0E0",
                borderRadius: 16,
              }}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [hasInquired, setHasInquired] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const imageListRef = useRef<FlatList>(null);
  const viewerListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/api/kerspace/properties/${id}`)
      .then((r) => r.json())
      .then((data) => setProperty(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      AsyncStorage.getItem(`kerspace_inquired_${id}`).then((val) => {
        setHasInquired(val === "1");
      });
    }, [id]),
  );

  const handleShare = useCallback(async () => {
    if (!property) return;
    await Share.share({
      title: property.title,
      message: `Check out this property on KërSpace: ${property.title} — ${formatPrice(property.price, property.currency)} in ${property.city}`,
    });
  }, [property]);

  const handleCall = useCallback(() => {
    if (!property) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${property.contactPhone}`);
  }, [property]);

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [IMAGE_HEIGHT - 80, IMAGE_HEIGHT - 20],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  if (loading) return <Skeleton />;
  if (!property)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="home-outline" size={48} color="#DDD" />
        <Text style={{ color: "#999", marginTop: 12 }}>Property not found</Text>
      </View>
    );

  const images =
    property.images.length > 0
      ? property.images
      : [{ id: "placeholder", url: "", isPrimary: true }];
  const hasLocation = property.latitude && property.longitude;

  const openViewer = (idx: number) => {
    setViewerIndex(idx);
    setViewerVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F4F0" }}>
      <StatusBar barStyle="light-content" />

      {/* ── Sticky Header (appears on scroll) ──────────────────────────────── */}
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
          borderBottomWidth: 0,
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
          {property.title}
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
      >
        {/* ── Image Gallery ─────────────────────────────────────────────────── */}
        <View style={{ height: IMAGE_HEIGHT }}>
          <FlatList
            ref={imageListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(idx);
            }}
            renderItem={({ item }) =>
              item.url ? (
                <Image
                  source={{ uri: item.url }}
                  style={{ width, height: IMAGE_HEIGHT }}
                  contentFit="cover"
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
                  <Ionicons name="home-outline" size={64} color="#C0A090" />
                </View>
              )
            }
          />
          {/* Tap overlay to open full-screen viewer */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => openViewer(activeImageIndex)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          {/* Bottom gradient */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.4)"]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 90,
            }}
            pointerEvents="none"
          />
          {/* Image counter dots + badge — raised 40px above bottom to clear the card overlap */}
          {images.length > 1 && (
            <View
              style={{
                position: "absolute",
                bottom: 52,
                alignSelf: "center",
                flexDirection: "row",
                alignItems: "center",
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
          {/* Tap to expand hint */}
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
        </View>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: "#F7F4F0",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            marginTop: -24,
            paddingTop: 24,
          }}
        >
          {/* Title + Price */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  backgroundColor:
                    property.listingType === "FOR_SALE" ? "#1E3A5F" : "#5B2D8E",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}
                >
                  {property.listingType === "FOR_SALE"
                    ? "For Sale"
                    : "For Rent"}
                </Text>
              </View>
              {property.isVerified && (
                <View
                  style={{
                    backgroundColor: ORANGE,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={11} color="#fff" />
                  <Text
                    style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}
                  >
                    Terango Verified
                  </Text>
                </View>
              )}
              {property.isFeatured && (
                <View
                  style={{
                    backgroundColor: "#FF9900",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Ionicons name="star" size={11} color="#fff" />
                  <Text
                    style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}
                  >
                    Featured
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: DARK,
                letterSpacing: -0.5,
                marginBottom: 6,
              }}
            >
              {property.title}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginBottom: 12,
              }}
            >
              <Ionicons name="location" size={14} color={ORANGE} />
              <Text style={{ fontSize: 13, color: "#777" }}>
                {property.address}, {property.city}
                {property.region ? `, ${property.region}` : ""}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "900",
                color: ORANGE,
                letterSpacing: -1,
              }}
            >
              {formatPrice(property.price, property.currency)}
            </Text>
            {property.negotiable && (
              <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                Price is negotiable
              </Text>
            )}
          </View>

          {/* Specs */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <SpecBadge
                icon="business-outline"
                label="Type"
                value={TYPE_LABELS[property.type] || property.type}
              />
              {property.bedrooms != null && (
                <SpecBadge
                  icon="bed-outline"
                  label="Bedrooms"
                  value={property.bedrooms.toString()}
                />
              )}
              {property.bathrooms != null && (
                <SpecBadge
                  icon="bathtub-outline"
                  label="Bathrooms"
                  value={property.bathrooms.toString()}
                  library="mci"
                />
              )}
              {property.area != null && (
                <SpecBadge
                  icon="resize-outline"
                  label="Area"
                  value={`${property.area}m²`}
                />
              )}
            </View>
          </View>

          {/* Tags row */}
          <View
            style={{
              paddingHorizontal: 20,
              flexDirection: "row",
              gap: 8,
              marginBottom: 20,
            }}
          >
            {property.furnished && (
              <View
                style={{
                  backgroundColor: "#E8F5E9",
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                }}
              >
                <Text
                  style={{ color: "#2E7D32", fontSize: 12, fontWeight: "600" }}
                >
                  Furnished
                </Text>
              </View>
            )}
            {property.serviced && (
              <View
                style={{
                  backgroundColor: "#E3F2FD",
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                }}
              >
                <Text
                  style={{ color: "#1565C0", fontSize: 12, fontWeight: "600" }}
                >
                  Serviced
                </Text>
              </View>
            )}
            {property.toilets != null && (
              <View
                style={{
                  backgroundColor: "#F3E5F5",
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                }}
              >
                <Text
                  style={{ color: "#6A1B9A", fontSize: 12, fontWeight: "600" }}
                >
                  {property.toilets} Toilets
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {property.description ? (
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: DARK,
                  marginBottom: 8,
                }}
              >
                About this property
              </Text>
              <Text style={{ fontSize: 14, color: "#555", lineHeight: 22 }}>
                {property.description}
              </Text>
            </View>
          ) : null}

          {/* Features */}
          {property.features.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: DARK,
                  marginBottom: 12,
                }}
              >
                Features & Amenities
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {property.features.map((f) => (
                  <View
                    key={f}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      backgroundColor: "#fff",
                      borderRadius: 24,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderWidth: 1,
                      borderColor: "rgba(255,107,0,0.18)",
                      shadowColor: "#000",
                      shadowOpacity: 0.04,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={ORANGE}
                    />
                    <Text
                      style={{ fontSize: 13, color: DARK, fontWeight: "500" }}
                    >
                      {f}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Map */}
          {hasLocation && (
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: DARK,
                  marginBottom: 12,
                }}
              >
                Location
              </Text>
              <View
                style={{ height: 200, borderRadius: 18, overflow: "hidden" }}
              >
                <MapView
                  style={{ flex: 1 }}
                  provider={
                    Platform.OS === "android" ? PROVIDER_GOOGLE : undefined
                  }
                  initialRegion={{
                    latitude: property.latitude!,
                    longitude: property.longitude!,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: property.latitude!,
                      longitude: property.longitude!,
                    }}
                    title={property.title}
                    description={property.city}
                  >
                    <View
                      style={{
                        backgroundColor: ORANGE,
                        borderRadius: 24,
                        padding: 8,
                        borderWidth: 3,
                        borderColor: "#fff",
                        shadowColor: "#000",
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        elevation: 6,
                      }}
                    >
                      <Ionicons name="home" size={18} color="#fff" />
                    </View>
                  </Marker>
                </MapView>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                {property.address}, {property.city}
              </Text>
            </View>
          )}

          {/* Contact info */}
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 24,
              backgroundColor: "#fff",
              borderRadius: 18,
              padding: 16,
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: DARK,
                marginBottom: 10,
              }}
            >
              Listed by Terango
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: "#FFF5EE",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="person" size={22} color={ORANGE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: DARK }}>
                  {property.contactName}
                </Text>
                <Text style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                  KërSpace Agent
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCall}
                style={{
                  backgroundColor: "#E8F5E9",
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                <Ionicons name="call" size={20} color="#2E7D32" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Spacer for bottom buttons */}
          <View style={{ height: 100 }} />
        </View>
      </Animated.ScrollView>

      {/* ── Bottom CTA Buttons ────────────────────────────────────────────────── */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: insets.bottom + 10,
          borderTopWidth: 1,
          borderTopColor: "rgba(0,0,0,0.08)",
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
          flexDirection: "row",
          gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={() =>
            !hasInquired &&
            router.push({
              pathname: "/kerspace/inquire",
              params: { id: property.id, title: property.title },
            } as any)
          }
          disabled={hasInquired}
          style={{
            flex: 1,
            height: 52,
            backgroundColor: hasInquired ? "#F0F0F0" : "#FFF5EE",
            borderRadius: 14,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 2,
            borderColor: hasInquired ? "#CCC" : ORANGE,
            flexDirection: "row",
            gap: 6,
          }}
          activeOpacity={hasInquired ? 1 : 0.85}
        >
          <Ionicons
            name={hasInquired ? "checkmark-circle" : "heart-outline"}
            size={18}
            color={hasInquired ? "#999" : ORANGE}
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: hasInquired ? "#999" : ORANGE,
            }}
          >
            {hasInquired ? "Inquiry Sent" : "I'm Interested"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/kerspace/appointment",
              params: { id: property.id, title: property.title },
            } as any)
          }
          style={{
            flex: 1.4,
            height: 52,
            backgroundColor: ORANGE,
            borderRadius: 14,
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "row",
            gap: 6,
            shadowColor: ORANGE,
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 5,
          }}
          activeOpacity={0.88}
        >
          <Ionicons name="calendar" size={18} color="#fff" />
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
            Book Viewing
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Full-Screen Image Viewer ────────────────────────────────────────── */}
      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <FlatList
            ref={viewerListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setViewerIndex(idx);
            }}
            renderItem={({ item }) => (
              <View
                style={{
                  width,
                  height,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {item.url ? (
                  <Image
                    source={{ uri: item.url }}
                    style={{ width, height }}
                    contentFit="contain"
                  />
                ) : (
                  <View
                    style={{ justifyContent: "center", alignItems: "center" }}
                  >
                    <Ionicons name="home-outline" size={80} color="#555" />
                  </View>
                )}
              </View>
            )}
          />

          {/* Close button */}
          <TouchableOpacity
            onPress={() => setViewerVisible(false)}
            style={{
              position: "absolute",
              top: insets.top + 12,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Counter */}
          {images.length > 1 && (
            <View
              style={{
                position: "absolute",
                top: insets.top + 16,
                left: 16,
                backgroundColor: "rgba(0,0,0,0.6)",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 5,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                {viewerIndex + 1} / {images.length}
              </Text>
            </View>
          )}

          {/* Dots */}
          {images.length > 1 && (
            <View
              style={{
                position: "absolute",
                bottom: insets.bottom + 24,
                alignSelf: "center",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {images.map((_, i) => (
                <GalleryDot key={i} active={i === viewerIndex} />
              ))}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
