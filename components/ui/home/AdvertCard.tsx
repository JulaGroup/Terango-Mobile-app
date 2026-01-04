import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { API_URL } from "@/constants/config";
import { PrimaryColor } from "@/constants/Colors";

// Fallback local ads (used when API fails or no ads in DB)
const FALLBACK_ADS = [
  { id: "local-1", image: require("../../../assets/images/adverts/advert1.jpg"), isLocal: true },
  { id: "local-2", image: require("../../../assets/images/adverts/advert2.jpg"), isLocal: true },
  { id: "local-3", image: require("../../../assets/images/adverts/advert3.jpg"), isLocal: true },
];

interface Advertisement {
  id: string;
  title: string;
  imageUrl: string;
  link?: string;
  isLocal?: boolean;
  image?: any; // For local images
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 40; // 20px padding on each side

interface AdvertCardProps {
  position?: "HOME_TOP" | "HOME_AFTER_RESTAURANTS" | "HOME_AFTER_SHOPS" | "HOME_BOTTOM";
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
      
      const response = await fetch(`${API_URL}/api/advertisements?position=${position}`);
      
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

  // Auto-scroll effect
  useEffect(() => {
    if (advertisements.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % advertisements.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }, 7000); // 7 seconds

    return () => clearInterval(interval);
  }, [currentIndex, advertisements.length]);

  const onScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < advertisements.length) {
      setCurrentIndex(newIndex);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.cardWrapper}>
          <View style={[styles.card, styles.skeletonCard]}>
            <ActivityIndicator size="small" color={PrimaryColor} />
          </View>
        </View>
      </View>
    );
  }

  if (advertisements.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={advertisements}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.cardWrapper}
            activeOpacity={item.link ? 0.9 : 1}
            onPress={() => item.link && handleAdPress(item)}
          >
            <View style={styles.card}>
              <Image
                source={item.isLocal ? item.image : { uri: item.imageUrl }}
                style={styles.image}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
              {/* Dots inside card, bottom right */}
              {advertisements.length > 1 && (
                <View style={styles.dotsContainer}>
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
            </View>
          </TouchableOpacity>
        )}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        initialScrollIndex={0}
        onScrollToIndexFailed={(info) => {
          // Handle scroll to index failure gracefully
          setTimeout(() => {
            if (flatListRef.current && info.index < advertisements.length) {
              flatListRef.current.scrollToIndex({
                index: info.index,
                animated: true,
              });
            }
          }, 100);
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
    width: CARD_WIDTH,
    height: 130,
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
  dotsContainer: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 15,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: PrimaryColor,
  },
});

export default AdvertCard;
