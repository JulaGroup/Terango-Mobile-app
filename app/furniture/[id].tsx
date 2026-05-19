/**
 * Furniture Marketplace — Detail Screen
 * Image gallery, specs, price (commission-hidden), seller contact CTAs.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_URL } from "@/constants/config";

const { width, height } = Dimensions.get("window");
const IMAGE_HEIGHT = height * 0.42;
const ORANGE = "#ff6b00";
const DARK = "#1a1a1a";

interface FurnitureListing {
  id: string;
  name: string;
  description: string | null;
  imageUrls: string[];
  category: { id: string; name: string; icon: string | null };
  listingPrice: number;
  condition: string;
  brand: string | null;
  color: string | null;
  material: string | null;
  dimensions: string | null;
  stock: number;
  city: string | null;
  address: string | null;
  sellerName: string;
  sellerPhone: string | null;
  sellerEmail: string | null;
  isFeatured: boolean;
  isVerified: boolean;
  rating: number;
  totalReviews: number;
  tags: string[];
  createdAt: string;
}

const CONDITION_LABELS: Record<string, string> = {
  NEW: "New",
  USED_LIKE_NEW: "Used – Like New",
  USED_GOOD: "Used – Good",
  USED_FAIR: "Used – Fair",
};

const CONDITION_COLORS: Record<string, [string, string]> = {
  NEW: ["#d1fae5", "#065f46"],
  USED_LIKE_NEW: ["#dbeafe", "#1e40af"],
  USED_GOOD: ["#fef9c3", "#854d0e"],
  USED_FAIR: ["#ffedd5", "#9a3412"],
};

const fmtPrice = (n: number) =>
  `D${n.toLocaleString("en-GM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Image Gallery ────────────────────────────────────────────────────────────
const ImageGallery = ({ images, name }: { images: string[]; name: string }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  if (!images.length) {
    return (
      <View style={{ width, height: IMAGE_HEIGHT, backgroundColor: "#F5F0EB", justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="bed-outline" size={80} color="#D0C0B0" />
      </View>
    );
  }

  return (
    <View style={{ width, height: IMAGE_HEIGHT }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIdx(idx);
        }}
      >
        {images.map((uri, i) => (
          <Image key={i} source={{ uri }} style={{ width, height: IMAGE_HEIGHT }} contentFit="cover" transition={250} />
        ))}
      </ScrollView>
      {images.length > 1 && (
        <>
          {/* Dots */}
          <View style={{ position: "absolute", bottom: 14, alignSelf: "center", flexDirection: "row", gap: 5 }}>
            {images.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => { scrollRef.current?.scrollTo({ x: i * width, animated: true }); setActiveIdx(i); }}>
                <View style={{ width: i === activeIdx ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === activeIdx ? ORANGE : "rgba(255,255,255,0.7)" }} />
              </TouchableOpacity>
            ))}
          </View>
          {/* Counter */}
          <View style={{ position: "absolute", bottom: 10, right: 14, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>{activeIdx + 1}/{images.length}</Text>
          </View>
        </>
      )}
    </View>
  );
};

// ─── Spec Row ─────────────────────────────────────────────────────────────────
const SpecRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0EEEC", gap: 12 }}>
    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#FFF4EE", justifyContent: "center", alignItems: "center" }}>
      <Ionicons name={icon as any} size={16} color={ORANGE} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: "#aaa", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ fontSize: 14, color: DARK, fontWeight: "600", marginTop: 1 }}>{value}</Text>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FurnitureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [listing, setListing] = useState<FurnitureListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchListing = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API_URL}/api/furniture/listings/${id}`);
      const json = await res.json();
      setListing(json.data ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchListing(); }, [fetchListing]);

  const handleCall = () => {
    if (listing?.sellerPhone) Linking.openURL(`tel:${listing.sellerPhone}`);
  };

  const handleWhatsApp = () => {
    if (listing?.sellerPhone) {
      const phone = listing.sellerPhone.replace(/\D/g, "");
      const msg = encodeURIComponent(`Hi, I'm interested in your listing: ${listing.name} (D${listing.listingPrice.toLocaleString()})`);
      Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
    }
  };

  const handleEmail = () => {
    if (listing?.sellerEmail) {
      Linking.openURL(`mailto:${listing.sellerEmail}?subject=Enquiry: ${listing.name}`);
    }
  };

  const handleShare = async () => {
    if (!listing) return;
    await Share.share({ message: `${listing.name} — ${fmtPrice(listing.listingPrice)} on Terango Furniture Marketplace` });
  };

  const headerBg = scrollY.interpolate({ inputRange: [IMAGE_HEIGHT - 80, IMAGE_HEIGHT], outputRange: ["transparent", "#F8F6F3"], extrapolate: "clamp" });
  const headerIconColor = scrollY.interpolate({ inputRange: [IMAGE_HEIGHT - 80, IMAGE_HEIGHT], outputRange: ["#fff", DARK], extrapolate: "clamp" });

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F6F3" }}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F6F3", gap: 12 }}>
        <Ionicons name="alert-circle-outline" size={52} color="#ddd" />
        <Text style={{ fontSize: 16, color: "#888" }}>Listing not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: ORANGE, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 14 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const condBg = CONDITION_COLORS[listing.condition]?.[0] ?? "#f3f4f6";
  const condTxt = CONDITION_COLORS[listing.condition]?.[1] ?? "#374151";

  const specs: { icon: string; label: string; value: string | null }[] = [
    { icon: "pricetag-outline", label: "Condition", value: CONDITION_LABELS[listing.condition] ?? listing.condition },
    { icon: "business-outline", label: "Brand", value: listing.brand },
    { icon: "color-palette-outline", label: "Color", value: listing.color },
    { icon: "layers-outline", label: "Material", value: listing.material },
    { icon: "resize-outline", label: "Dimensions", value: listing.dimensions },
    { icon: "cube-outline", label: "Stock", value: listing.stock > 1 ? `${listing.stock} available` : "1 available" },
  ].filter((s) => s.value);

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F6F3" }}>
      <StatusBar barStyle="light-content" />

      {/* Floating header */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: headerBg,
          paddingTop: insets.top + 4,
          paddingBottom: 8,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleShare}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="share-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Gallery */}
        <ImageGallery images={listing.imageUrls} name={listing.name} />
        <LinearGradient
          colors={["rgba(0,0,0,0.18)", "transparent"]}
          style={{ position: "absolute", top: IMAGE_HEIGHT - 40, left: 0, right: 0, height: 40 }}
        />

        {/* Main content */}
        <View style={{ backgroundColor: "#F8F6F3", borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, paddingTop: 20 }}>
          {/* Title + badges */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#EEE" }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <Text style={{ flex: 1, fontSize: 22, fontWeight: "900", color: DARK, letterSpacing: -0.5, lineHeight: 28 }}>
                {listing.name}
              </Text>
              <View style={{ backgroundColor: condBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, alignSelf: "flex-start" }}>
                <Text style={{ color: condTxt, fontSize: 12, fontWeight: "700" }}>{CONDITION_LABELS[listing.condition] ?? listing.condition}</Text>
              </View>
            </View>

            {/* Category + location row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {listing.category?.icon && <Ionicons name={listing.category.icon as any} size={14} color={ORANGE} />}
                <Text style={{ fontSize: 13, color: ORANGE, fontWeight: "600" }}>{listing.category?.name}</Text>
              </View>
              {listing.city && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="location-outline" size={13} color="#aaa" />
                  <Text style={{ fontSize: 13, color: "#888" }}>{listing.city}</Text>
                </View>
              )}
              {listing.isVerified && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#d1fae5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                  <Ionicons name="checkmark-circle" size={12} color="#065f46" />
                  <Text style={{ fontSize: 11, color: "#065f46", fontWeight: "700" }}>Verified</Text>
                </View>
              )}
            </View>
          </View>

          {/* Price box */}
          <View style={{ marginHorizontal: 20, marginVertical: 16, backgroundColor: "#fff", borderRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
            <Text style={{ fontSize: 12, color: "#aaa", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Price</Text>
            <Text style={{ fontSize: 30, fontWeight: "900", color: ORANGE, letterSpacing: -1 }}>
              {fmtPrice(listing.listingPrice)}
            </Text>
            <Text style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>Final price · includes marketplace fees</Text>
          </View>

          {/* Description */}
          {listing.description && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: DARK, marginBottom: 8 }}>About this item</Text>
              <Text style={{ fontSize: 14, color: "#555", lineHeight: 22 }}>{listing.description}</Text>
            </View>
          )}

          {/* Specifications */}
          {specs.length > 0 && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: DARK, marginBottom: 4 }}>Specifications</Text>
              {specs.map((s) => (
                <SpecRow key={s.label} icon={s.icon} label={s.label} value={s.value!} />
              ))}
            </View>
          )}

          {/* Tags */}
          {listing.tags.length > 0 && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: DARK, marginBottom: 10 }}>Tags</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {listing.tags.map((tag) => (
                  <View key={tag} style={{ backgroundColor: "#FFF4EE", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "#FFD4B8" }}>
                    <Text style={{ fontSize: 12, color: ORANGE, fontWeight: "600" }}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Seller info */}
          <View style={{ marginHorizontal: 20, marginBottom: 24, backgroundColor: "#fff", borderRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: DARK, marginBottom: 12 }}>Seller</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF4EE", justifyContent: "center", alignItems: "center" }}>
                <Ionicons name="person-outline" size={22} color={ORANGE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: DARK }}>{listing.sellerName}</Text>
                {listing.city && <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{listing.city}</Text>}
              </View>
            </View>
          </View>

          {/* Bottom spacer for CTA bar */}
          <View style={{ height: 110 + insets.bottom }} />
        </View>
      </Animated.ScrollView>

      {/* ── CTA Action Bar ─────────────────────────────────────────────────── */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#EEEAE6",
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          gap: 10,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        {/* WhatsApp — primary CTA */}
        {listing.sellerPhone && (
          <TouchableOpacity
            onPress={handleWhatsApp}
            activeOpacity={0.88}
            style={{ flex: 2, backgroundColor: "#25D366", borderRadius: 16, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>Enquire</Text>
          </TouchableOpacity>
        )}
        {/* Call */}
        {listing.sellerPhone && (
          <TouchableOpacity
            onPress={handleCall}
            activeOpacity={0.88}
            style={{ flex: 1, backgroundColor: ORANGE, borderRadius: 16, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Ionicons name="call-outline" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>Call</Text>
          </TouchableOpacity>
        )}
        {/* Email fallback */}
        {!listing.sellerPhone && listing.sellerEmail && (
          <TouchableOpacity
            onPress={handleEmail}
            activeOpacity={0.88}
            style={{ flex: 1, backgroundColor: ORANGE, borderRadius: 16, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Ionicons name="mail-outline" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>Email</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
