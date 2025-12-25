import React, { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { OpeningHours } from "@/lib/api";
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

  const CARD_WIDTH = fullWidth ? width - 32 : width * 0.75;

  const operatingStatus = React.useMemo(
    () =>
      getOperatingStatus({
        openingHours: restaurant.openingHours || undefined,
        isActive: restaurant.isActive,
        acceptsOrders: restaurant.acceptsOrders,
      }),
    [restaurant.openingHours, restaurant.isActive, restaurant.acceptsOrders]
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
          operatingStatus.nextOpening.day
        )} ${formatTimeLabel(operatingStatus.nextOpening.time)}`
      : undefined;

  return (
    <TouchableOpacity
      style={{
        width: CARD_WIDTH,
        backgroundColor: "#fff",
        borderRadius: 16,
        marginRight: fullWidth ? 0 : 16,
        marginVertical: 8,
        elevation: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        overflow: "hidden",
        borderWidth: 0.5,
        borderColor: "rgba(0, 0, 0, 0.08)",
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

        <Text style={styles.restaurantDesc} numberOfLines={2}>
          {restaurant.description || "Fresh and delicious food"}
        </Text>

        <View style={styles.restaurantFooter}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.locationText} numberOfLines={1}>
              {restaurant.address || "Nearby"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = {
  imageContainer: {
    position: "relative" as const,
    height: 140,
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
    padding: 16,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: "bold" as const,
    color: "#333",
    marginBottom: 4,
  },
  restaurantDesc: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
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
    color: "#666",
    marginLeft: 4,
  },
};

export default RestaurantCard;
