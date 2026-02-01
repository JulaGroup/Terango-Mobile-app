import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Text,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "@/constants/config";
import { PrimaryColor } from "@/constants/Colors";

// Fallback local ads (used when API fails or no ads in DB)
const FALLBACK_ADS = [
  {
    id: "local-1",
    image: require("../../../assets/images/adverts/advert1.jpg"),
    isLocal: true,
  },
  {
    id: "local-2",
    image: require("../../../assets/images/adverts/advert2.jpg"),
    isLocal: true,
  },
  {
    id: "local-3",
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
  isLocal?: boolean;
  image?: any; // For local images
}

const { width } = Dimensions.get("window");

// Card dimensions based on orientation
const getCardDimensions = (
  orientation: "PORTRAIT" | "LANDSCAPE" = "LANDSCAPE"
) => {
  if (orientation === "PORTRAIT") {
    return {
      width: width * 0.6, // 50% of screen width
      height: 300, // Taller for portrait
    };
  }
  // LANDSCAPE (default)
  return {
    width: width - 40, // Full width minus padding
    height: 150, // Standard height for landscape
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
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch advertisements from API
  const fetchAdvertisements = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      const response = await fetch(
        `${API_URL}/api/advertisements?position=${position}`
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

  // Handle ad press
  const handleAdPress = async (ad: Advertisement) => {
    // Track the click
    await trackClick(ad.id);

    // Open link if available
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

  // Auto-scroll effect - 4 seconds interval
  useEffect(() => {
    if (advertisements.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % advertisements.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }, 4000); // 4 seconds

    return () => clearInterval(interval);
  }, [currentIndex, advertisements.length]);

  const onScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const cardWidth = width - 40; // Standard card width with padding
    const newIndex = Math.round(offsetX / cardWidth);
    if (
      newIndex !== currentIndex &&
      newIndex >= 0 &&
      newIndex < advertisements.length
    ) {
      setCurrentIndex(newIndex);
    }
  };

  // Loading skeleton
  if (loading) {
    // Use default landscape dimensions for skeleton
    const skeletonDimensions = getCardDimensions("LANDSCAPE");
    return (
      <View style={styles.container}>
        <View style={styles.cardWrapper}>
          <View
            style={[
              styles.card,
              styles.skeletonCard,
              {
                width: skeletonDimensions.width,
                height: skeletonDimensions.height,
              },
            ]}
          >
            <ActivityIndicator size="small" color={PrimaryColor} />
          </View>
        </View>
      </View>
    );
  }

  if (advertisements.length === 0) {
    return null;
  }

  // Carousel layout - works for all orientations with side-by-side scrolling
  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={advertisements}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled={false}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        snapToInterval={width - 40 + 20} // Card width + gap
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 20 }}
        renderItem={({ item }) => {
          const dimensions = getCardDimensions(item.orientation || "LANDSCAPE");
          return (
            <TouchableOpacity
              activeOpacity={item.link ? 0.9 : 1}
              onPress={() => item.link && handleAdPress(item)}
              style={{ marginRight: 0 }}
            >
              <View style={[styles.card, { width: dimensions.width, height: dimensions.height }]}>
                <Image
                  source={item.isLocal ? item.image : { uri: item.imageUrl }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />

                {/* Gradient overlay for better text visibility */}
                {item.link && <View style={styles.gradientOverlay} />}

                {/* "See More" button for ads with links */}
                {item.link && (
                  <View style={styles.ctaContainer}>
                    <TouchableOpacity
                      style={styles.ctaButton}
                      onPress={() => handleAdPress(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.ctaText}>See More</Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Dots indicator below card */}
              {advertisements.length > 1 && (
                <View style={styles.dotsContainerBottom}>
                  {advertisements.map((_, dotIndex) => (
                    <View
                      key={dotIndex}
                      style={[
                        styles.dot,
                        currentIndex === dotIndex && styles.activeDot,
                      ]}
                    />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    width: "100%",
  },
  cardWrapper: {
    width, // Full screen width for paging
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  skeletonCard: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: PrimaryColor,
    width: 20,
  },
});

export default AdvertCard;
