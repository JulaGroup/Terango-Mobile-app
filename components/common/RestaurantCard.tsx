import React, { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { OpeningHours } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";
import {
  getOperatingStatus,
  formatDayLabel,
  formatTimeLabel,
} from "@/utils/openingHours";

const { width } = Dimensions.get("window");

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  rating?: number;
  totalReviews?: number;
  openingHours?: OpeningHours | null;
  acceptsOrders?: boolean;
  fullWidth?: boolean;
  isFeatured?: boolean;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  fullWidth?: boolean;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  fullWidth = false,
}) => {
  const router = useRouter();
  const [imageLoadError, setImageLoadError] = useState(false);

  const CARD_WIDTH = fullWidth ? width - 32 : width * 0.7;

  const operatingStatus = React.useMemo(
    () =>
      getOperatingStatus({
        openingHours: restaurant.openingHours || undefined,
        isActive: restaurant.isActive,
        acceptsOrders: restaurant.acceptsOrders,
      }),
    [restaurant.openingHours, restaurant.isActive, restaurant.acceptsOrders],
  );

  const currentlyOpen = operatingStatus.isOpen;

  let statusLabel = "CLOSED";
  if (currentlyOpen) {
    statusLabel = "OPEN";
  } else if (operatingStatus.reason === "inactive") {
    statusLabel = "OFFLINE";
  } else if (operatingStatus.reason === "not_accepting_orders") {
    statusLabel = "PAUSED";
  }

  const nextOpeningLabel =
    !currentlyOpen && operatingStatus.nextOpening
      ? `Opens ${formatDayLabel(
          operatingStatus.nextOpening.day,
        )} ${formatTimeLabel(operatingStatus.nextOpening.time)}`
      : undefined;

  return (
    <TouchableOpacity
      style={{
        width: CARD_WIDTH,
        backgroundColor: "#fff",
        borderRadius: 12,
        marginRight: fullWidth ? 0 : 12,
        marginVertical: 6,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        overflow: "hidden",
      }}
      onPress={() =>
        router.push({
          pathname: "/restaurant-details",
          params: { restaurantId: restaurant.id },
        })
      }
      activeOpacity={0.85}
    >
      <View style={styles.imageContainer}>
        {restaurant.imageUrl && !imageLoadError ? (
          <Image
            source={{ uri: restaurant.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={styles.imagePlaceholder}
          >
            <Ionicons name="restaurant-outline" size={40} color="#fff" />
          </LinearGradient>
        )}

        {/* Status Badge - Show OPEN or CLOSED based on current time */}
        <View
          style={[
            styles.activeBadge,
            { backgroundColor: currentlyOpen ? "#27AE60" : "#E74C3C" },
          ]}
          accessibilityLabel={`Restaurant is ${statusLabel.toLowerCase()}`}
          accessibilityHint={
            nextOpeningLabel
              ? `${statusLabel}. ${nextOpeningLabel}.`
              : undefined
          }
        >
          <Text style={styles.activeBadgeText}>{statusLabel}</Text>
          {!currentlyOpen && nextOpeningLabel && (
            <Text style={styles.activeBadgeSubText}>{nextOpeningLabel}</Text>
          )}
        </View>

        {/* Featured Badge */}
        {restaurant.isFeatured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.featuredBadgeText}>FEATURED</Text>
          </View>
        )}
      </View>

      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurant.name}
        </Text>

        <Text style={styles.restaurantDesc} numberOfLines={1}>
          {restaurant.description || "Fresh and delicious food"}
        </Text>

        <View style={styles.restaurantFooter}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: PrimaryColor,
                marginRight: 6,
              }}
            />
            <Text
              style={{
                fontSize: 12,
                color: "#6B7280",
                fontWeight: "500",
                flex: 1,
              }}
              numberOfLines={1}
            >
              {restaurant.city || restaurant.address || "Nearby"}
            </Text>
          </View>
          {restaurant.rating && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>
                {restaurant.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = {
  imageContainer: {
    position: "relative" as const,
    height: 118,
  },
  image: {
    width: "100%" as const,
    height: "100%" as const,
    resizeMode: "cover" as const,
  },
  imagePlaceholder: {
    width: "100%" as const,
    height: "100%" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  activeBadge: {
    position: "absolute" as const,
    top: 12,
    left: 12,
    backgroundColor: "#27AE60",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "88%" as const,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600" as const,
  },
  activeBadgeSubText: {
    marginTop: 2,
    color: "rgba(255,255,255,0.85)",
    fontSize: 9,
    fontWeight: "500" as const,
  },
  featuredBadge: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  featuredBadgeText: {
    color: "#FFD700",
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  restaurantInfo: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#333",
    marginBottom: 3,
  },
  restaurantDesc: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
    lineHeight: 16,
  },
  restaurantFooter: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  locationRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  locationText: {
    fontSize: 12,
    color: "#10b981",
    marginLeft: 4,
    fontWeight: "500" as const,
    flex: 1,
  },
  ratingRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#666",
    marginLeft: 4,
  },
};

export default RestaurantCard;
