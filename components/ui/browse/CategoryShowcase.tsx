import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PrimaryColor } from "@/constants/Colors";

interface FeaturedCollection {
  id: string;
  name: string;
  imageUrl?: string;
  productCount: number;
  products?: any[];
}

interface CategoryShowcaseProps {
  collections: FeaturedCollection[];
  isLoading?: boolean;
  onCategoryPress?: (collection: FeaturedCollection) => void;
}

const SkeletonCard = () => {
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
        styles.skeletonCard,
        {
          opacity,
        },
      ]}
    />
  );
};

const CollectionCard: React.FC<{
  collection: FeaturedCollection;
  onPress?: (collection: FeaturedCollection) => void;
}> = ({ collection, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(collection)}
      activeOpacity={0.8}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {collection.imageUrl ? (
          <>
            <Image
              source={{ uri: collection.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.4)"]}
              style={styles.gradientOverlay}
            />
          </>
        ) : (
          <View style={[styles.image, { backgroundColor: "#F3F4F6" }]}>
            <Ionicons name="folder-outline" size={40} color="#D1D5DB" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {collection.name}
        </Text>
        <View style={styles.countBadge}>
          <Ionicons name="layers-outline" size={12} color={PrimaryColor} />
          <Text style={styles.countText}>{collection.productCount} items</Text>
        </View>
      </View>

      {/* Arrow Indicator */}
      <View style={styles.arrowContainer}>
        <Ionicons name="arrow-forward" size={16} color={PrimaryColor} />
      </View>
    </TouchableOpacity>
  );
};

export default function CategoryShowcase({
  collections,
  isLoading = false,
  onCategoryPress,
}: CategoryShowcaseProps) {
  if (isLoading && collections.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Featured Collections</Text>
        <View style={styles.gridContainer}>
          <View style={styles.row}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
          <View style={styles.row}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      </View>
    );
  }

  if (collections.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>✨ Featured Collections</Text>
        <Text style={styles.subtitle}>Browse by category</Text>
      </View>

      <View style={styles.gridContainer}>
        {collections.map((collection, index) => (
          <View
            key={collection.id}
            style={[styles.row, index % 2 === 0 && { marginBottom: 12 }]}
          >
            <CollectionCard collection={collection} onPress={onCategoryPress} />
            {index + 1 < collections.length && (
              <CollectionCard
                collection={collections[index + 1]}
                onPress={onCategoryPress}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  headerContainer: {
    marginBottom: 12,
  },
  header: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  gridContainer: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    backgroundColor: "#fff",
  },
  imageContainer: {
    width: "100%",
    height: 140,
    position: "relative",
    backgroundColor: "#F3F4F6",
  },
  image: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  gradientOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F0FDF4",
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 4,
  },
  countText: {
    fontSize: 10,
    fontWeight: "600",
    color: PrimaryColor,
  },
  arrowContainer: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
  },
  skeletonCard: {
    flex: 1,
    height: 200,
    backgroundColor: "#E0E0E0",
    borderRadius: 16,
  },
});
