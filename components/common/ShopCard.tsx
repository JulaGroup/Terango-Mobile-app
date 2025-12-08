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

interface Shop {
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
  shopType?: string;
  minimumOrderAmount?: number;
  acceptsOrders: boolean;
  fullWidth?: boolean;
  openingHours?: OpeningHours | null;
}

interface ShopCardProps {
  shop: Shop;
  fullWidth?: boolean;
}

const ShopCard: React.FC<ShopCardProps> = ({ shop, fullWidth = false }) => {
  const router = useRouter();
  const [imageLoadError, setImageLoadError] = useState(false);

  const reviewCount = shop.totalReviews || Math.floor(Math.random() * 450 + 50);
  const cardWidth = fullWidth ? width - 32 : 280;

  const operatingStatus = React.useMemo(
    () =>
      getOperatingStatus({
        openingHours: shop.openingHours || undefined,
        isActive: shop.isActive,
        acceptsOrders: shop.acceptsOrders,
      }),
    [shop.openingHours, shop.isActive, shop.acceptsOrders]
  );

  const currentlyOpen = operatingStatus.isOpen;

  let statusLabel = "Closed";
  if (currentlyOpen) {
    statusLabel = "Open";
  } else if (operatingStatus.reason === "inactive") {
    statusLabel = "Offline";
  } else if (operatingStatus.reason === "not_accepting_orders") {
    statusLabel = "Paused";
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
        width: cardWidth,
        backgroundColor: "#fff",
        borderRadius: 16,
        marginRight: fullWidth ? 0 : 16,
        marginVertical: fullWidth ? 8 : 0,
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
          pathname: "/shop-details",
          params: { shopId: shop.id },
        })
      }
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {shop.imageUrl && !imageLoadError ? (
          <Image
            source={{ uri: shop.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <LinearGradient
            colors={["#f8fafc", "#e2e8f0"]}
            style={styles.imagePlaceholder}
          >
            <Ionicons name="storefront" size={40} color="#94a3b8" />
          </LinearGradient>
        )}

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: currentlyOpen
                ? "rgba(34,197,94,0.95)"
                : "rgba(239,68,68,0.95)",
            },
          ]}
          accessibilityLabel={`Shop is ${statusLabel.toLowerCase()}`}
          accessibilityHint={
            nextOpeningLabel
              ? `${statusLabel}. ${nextOpeningLabel}.`
              : undefined
          }
        >
          <Text style={styles.statusBadgeText}>{statusLabel}</Text>
          {!currentlyOpen && nextOpeningLabel && (
            <Text style={styles.statusBadgeSubText}>{nextOpeningLabel}</Text>
          )}
        </View>
      </View>

      <View style={styles.shopInfo}>
        <Text style={styles.shopName} numberOfLines={1}>
          {shop.name}
        </Text>

        <Text style={styles.shopDesc} numberOfLines={2}>
          {shop.description || "Quality products served fresh"}
        </Text>

        {shop.shopType && (
          <View style={styles.shopTypeBadge}>
            <Text style={styles.shopTypeBadgeText}>{shop.shopType}</Text>
          </View>
        )}

        <View style={styles.shopFooter}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.locationText} numberOfLines={2}>
              {`${shop.city ?? ""}${shop.city && shop.address ? ", " : ""}${
                shop.address ?? "Location"
              }`}
            </Text>
          </View>
          <Text style={styles.reviewText}>{reviewCount} reviews</Text>
        </View>

        {shop.acceptsOrders && (
          <View style={styles.acceptsOrdersBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#27AE60" />
            <Text style={styles.acceptsOrdersText}>Accepts Orders</Text>
          </View>
        )}
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
  statusBadge: {
    position: "absolute" as const,
    top: 12,
    left: 12,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "88%" as const,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600" as const,
  },
  statusBadgeSubText: {
    marginTop: 2,
    color: "rgba(255,255,255,0.85)",
    fontSize: 9,
    fontWeight: "500" as const,
  },
  shopInfo: {
    padding: 16,
  },
  shopName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#1F2937",
    marginBottom: 4,
  },
  shopDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 16,
  },
  shopTypeBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start" as const,
    marginBottom: 8,
  },
  shopTypeBadgeText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  shopFooter: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    flex: 1,
  },
  reviewText: {
    fontSize: 12,
    color: "#666",
  },
  acceptsOrdersBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start" as const,
  },
  acceptsOrdersText: {
    fontSize: 10,
    color: "#27AE60",
    fontWeight: "500" as const,
    marginLeft: 4,
  },
};

export default ShopCard;
