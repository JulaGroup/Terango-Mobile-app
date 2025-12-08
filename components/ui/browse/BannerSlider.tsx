import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";

const { width } = Dimensions.get("window");
const BANNER_WIDTH = width - 32;
const BANNER_HEIGHT = 180;

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  actionLabel?: string;
  onPress?: () => void;
}

interface BannerSliderProps {
  banners: Banner[];
  isLoading?: boolean;
  autoScroll?: boolean;
  autoScrollInterval?: number;
}

const SkeletonBanner = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };

    pulse();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeletonBanner,
        {
          opacity,
        },
      ]}
    />
  );
};

export default function BannerSlider({
  banners,
  isLoading = false,
  autoScroll = true,
  autoScrollInterval = 4000,
}: BannerSliderProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    if (!autoScroll || banners.length <= 1 || isLoading) return;

    const timer = setInterval(() => {
      currentIndexRef.current = (currentIndexRef.current + 1) % banners.length;
      scrollViewRef.current?.scrollTo({
        x: currentIndexRef.current * (BANNER_WIDTH + 16),
        animated: true,
      });
    }, autoScrollInterval);

    return () => clearInterval(timer);
  }, [banners.length, autoScroll, autoScrollInterval, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonBanner />
      </View>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        scrollEventThrottle={16}
        contentContainerStyle={styles.contentContainer}
        decelerationRate="fast"
      >
        {banners.map((banner, index) => (
          <TouchableOpacity
            key={banner.id}
            style={styles.bannerWrapper}
            onPress={banner.onPress}
            activeOpacity={0.8}
          >
            {banner.imageUrl ? (
              <>
                <Image
                  source={{ uri: banner.imageUrl }}
                  style={styles.bannerImage}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
                <LinearGradient
                  colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.3)"]}
                  style={styles.gradientOverlay}
                />
              </>
            ) : (
              <LinearGradient
                colors={[banner.backgroundColor, banner.backgroundColor]}
                style={styles.banner}
              />
            )}

            {/* Content */}
            <View style={styles.bannerContent}>
              <Text style={[styles.bannerTitle, { color: banner.textColor }]}>
                {banner.title}
              </Text>
              <Text
                style={[
                  styles.bannerSubtitle,
                  { color: banner.textColor, opacity: 0.9 },
                ]}
              >
                {banner.subtitle}
              </Text>

              {banner.actionLabel && (
                <View style={styles.actionContainer}>
                  <Text style={styles.actionLabel}>{banner.actionLabel}</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={banner.textColor}
                    style={{ marginLeft: 6 }}
                  />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <View style={styles.dotsContainer}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndexRef.current && styles.activeDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  contentContainer: {
    gap: 16,
  },
  bannerWrapper: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  banner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  gradientOverlay: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  bannerContent: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "50%",
    transform: [{ translateY: -30 }],
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
    lineHeight: 28,
  },
  bannerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  activeDot: {
    backgroundColor: PrimaryColor,
    width: 24,
  },
  skeletonBanner: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    backgroundColor: "#E0E0E0",
    borderRadius: 16,
  },
});
