import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
  TouchableOpacity,
  Linking,
  Text,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Carousel, { Pagination } from "react-native-reanimated-carousel";
import { useSharedValue } from "react-native-reanimated";
import { API_URL } from "@/constants/config";
import { PrimaryColor } from "@/constants/Colors";

// Fallback local ads (used when API fails or no ads in DB)
const FALLBACK_ADS: Advertisement[] = [
  {
    id: "local-1",
    title: "",
    imageUrl: "",
    image: require("../../../assets/images/adverts/advert1.jpg"),
    isLocal: true,
  },
  {
    id: "local-2",
    title: "",
    imageUrl: "",
    image: require("../../../assets/images/adverts/advert2.jpg"),
    isLocal: true,
  },
  {
    id: "local-3",
    title: "",
    imageUrl: "",
    image: require("../../../assets/images/adverts/advert3.jpg"),
    isLocal: true,
  },
];

interface Advertisement {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  link?: string;
  orientation?: "PORTRAIT" | "LANDSCAPE"; // Ad orientation type
  vendorId?: string | null;
  vendorType?: string | null; // "SHOP" | "RESTAURANT" | "PHARMACY"
  isLocal?: boolean;
  image?: any; // For local images
}

const { width } = Dimensions.get("window");

// Card dimensions based on orientation. Cards are intentionally narrower
// than the screen — react-native-reanimated-carousel's "parallax" mode
// scales/translates neighboring cards so they peek in symmetrically on
// both sides instead of colliding with the screen edges.
const getCardDimensions = (
  orientation: "PORTRAIT" | "LANDSCAPE" = "LANDSCAPE",
) => {
  if (orientation === "PORTRAIT") {
    return {
      width: width * 0.6,
      height: 320, // Taller for portrait
    };
  }
  // LANDSCAPE (default)
  return {
    width: width - 16,
    height: 180, // Standard height for landscape
  };
};

interface AdvertCardProps {
  position?:
    | "HOME_TOP"
    | "HOME_AFTER_RESTAURANTS"
    | "HOME_AFTER_SHOPS"
    | "HOME_BOTTOM";
  refreshKey?: number;
}

const AdvertCard: React.FC<AdvertCardProps> = ({
  position = "HOME_TOP",
  refreshKey = 0,
}) => {
  const router = useRouter();
  const progress = useSharedValue(0);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const skeletonPulse = useRef(new Animated.Value(0.4)).current;

  // Fetch advertisements from API
  const fetchAdvertisements = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      const response = await fetch(
        `${API_URL}/api/advertisements?position=${position}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch advertisements");
      }

      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        setAdvertisements(data.data);
        // Track impressions for all loaded ads
        data.data.forEach((ad: Advertisement) => {
          trackImpression(ad.id);
        });
      } else {
        // No ads from API, use fallback
        setAdvertisements(FALLBACK_ADS);
      }
    } catch (err) {
      console.error("Error fetching advertisements:", err);
      setError(true);
      // Use fallback ads on error
      setAdvertisements(FALLBACK_ADS);
    } finally {
      setLoading(false);
    }
  }, [position]);

  // Track impression
  const trackImpression = async (adId: string) => {
    if (adId.startsWith("local-")) return; // Don't track local ads

    try {
      await fetch(`${API_URL}/api/advertisements/${adId}/impression`, {
        method: "POST",
      });
    } catch (err) {
      // Silently fail - don't affect user experience
    }
  };

  // Track click
  const trackClick = async (adId: string) => {
    if (adId.startsWith("local-")) return; // Don't track local ads

    try {
      await fetch(`${API_URL}/api/advertisements/${adId}/click`, {
        method: "POST",
      });
    } catch (err) {
      // Silently fail
    }
  };

  // Does this ad deep-link to an in-app vendor storefront?
  const hasVendorLink = (ad: Advertisement) =>
    Boolean(ad.vendorId && ad.vendorType);

  // Navigate to the linked vendor's storefront inside the app
  const goToVendor = (ad: Advertisement) => {
    if (!ad.vendorId || !ad.vendorType) return;
    const type = ad.vendorType.toUpperCase();
    switch (type) {
      case "RESTAURANT":
        router.push(`/restaurant-details?restaurantId=${ad.vendorId}` as any);
        break;
      case "SHOP":
      case "PHARMACY":
      default:
        router.push(`/shop-details?shopId=${ad.vendorId}` as any);
        break;
    }
  };

  // Handle ad press
  const handleAdPress = async (ad: Advertisement) => {
    // Track the click
    await trackClick(ad.id);

    // Prefer in-app vendor deep-link over external URL
    if (hasVendorLink(ad)) {
      goToVendor(ad);
      return;
    }

    // Open external link if available
    if (ad.link) {
      try {
        const canOpen = await Linking.canOpenURL(ad.link);
        if (canOpen) {
          await Linking.openURL(ad.link);
        }
      } catch (err) {
        console.error("Error opening link:", err);
      }
    }
  };

  useEffect(() => {
    fetchAdvertisements();
  }, [fetchAdvertisements, refreshKey]);

  // Gentle shimmer pulse for the loading skeleton
  useEffect(() => {
    if (!loading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [loading, skeletonPulse]);

  // Card height for the carousel "slot". Derived from the carousel's
  // dominant orientation (a position is virtually always all LANDSCAPE or
  // all PORTRAIT) since react-native-reanimated-carousel needs one fixed
  // height for the whole track.
  const activeOrientation: "PORTRAIT" | "LANDSCAPE" =
    advertisements[0]?.orientation === "PORTRAIT" ? "PORTRAIT" : "LANDSCAPE";
  const activeDimensions = getCardDimensions(activeOrientation);

  // Loading skeleton — subtle shimmer pulse instead of a plain spinner
  if (loading) {
    // Use default landscape dimensions for skeleton
    const skeletonDimensions = getCardDimensions("LANDSCAPE");
    return (
      <View style={styles.container}>
        <View style={styles.cardWrapper}>
          <Animated.View
            style={[
              styles.card,
              styles.skeletonCard,
              {
                width: skeletonDimensions.width,
                height: skeletonDimensions.height,
                opacity: skeletonPulse,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  if (advertisements.length === 0) {
    return null;
  }

  // Carousel layout - works for all orientations with side-by-side scrolling.
  // Sliding/centering/peeking/autoplay/looping is all handled by
  // react-native-reanimated-carousel (parallax mode) instead of a hand-rolled
  // FlatList + manual scroll-offset math, which is far more reliable.
  return (
    <View style={styles.container}>
      <Carousel
        width={width}
        height={activeDimensions.height}
        data={advertisements}
        loop={advertisements.length > 1}
        autoPlay={advertisements.length > 1}
        autoPlayInterval={4000}
        scrollAnimationDuration={700}
        onProgressChange={progress}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 0.9,
          parallaxScrollingOffset: 55,
        }}
        renderItem={({ item }) => {
          const dimensions = getCardDimensions(item.orientation || "LANDSCAPE");
          const isPressable = Boolean(item.link) || hasVendorLink(item);

          return (
            <View style={styles.slideWrapper}>
              <TouchableOpacity
                activeOpacity={isPressable ? 0.92 : 1}
                onPress={() => isPressable && handleAdPress(item)}
                style={[
                  styles.card,
                  { width: dimensions.width, height: dimensions.height },
                ]}
              >
                <Image
                  source={item.isLocal ? item.image : { uri: item.imageUrl }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />

                {/* Bottom gradient for legible CTA text over any image */}
                {isPressable && (
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.55)"]}
                    style={styles.gradientOverlay}
                    pointerEvents="none"
                  />
                )}

                {/* CTA: "Visit Shop" for vendor-linked ads, else "See more" for external links */}
                {isPressable && (
                  <View style={styles.ctaContainer}>
                    <TouchableOpacity
                      style={styles.ctaButton}
                      onPress={() => handleAdPress(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.ctaText}>
                        {hasVendorLink(item) ? "Visit Shop" : "See more"}
                      </Text>
                      <Ionicons
                        name={
                          hasVendorLink(item)
                            ? "storefront-outline"
                            : "arrow-forward"
                        }
                        size={16}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Dots indicator below carousel — driven by the carousel's own
          progress value, so it always matches exactly what's on screen */}
      {advertisements.length > 1 && (
        <Pagination.Basic
          progress={progress}
          data={advertisements}
          size={8}
          dotStyle={styles.dot}
          activeDotStyle={styles.activeDot}
          containerStyle={styles.dotsContainerBottom}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: "100%",
  },
  cardWrapper: {
    width, // Full screen width for paging
    justifyContent: "center",
    alignItems: "center",
  },
  slideWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  skeletonCard: {
    backgroundColor: "#e9e9e9",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  ctaContainer: {
    position: "absolute",
    bottom: 15,
    left: 15,
    zIndex: 10,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PrimaryColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  ctaText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 6,
  },
  dotsContainer: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dotsContainerBottom: {
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  activeDot: {
    backgroundColor: PrimaryColor,
  },
});

export default AdvertCard;
