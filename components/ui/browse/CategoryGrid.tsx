import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { categoryApi } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2; // Two cards per row

interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  subCategories?: any[];
}

interface CategoryGridProps {
  onCategoryPress: (categoryId: string, categoryName: string) => void;
}

export default function CategoryGrid({ onCategoryPress }: CategoryGridProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animated skeleton loader
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Start skeleton animation
    const skeletonAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    if (loading) {
      skeletonAnimation.start();
    } else {
      skeletonAnimation.stop();
    }

    return () => skeletonAnimation.stop();
  }, [loading, skeletonOpacity]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setError(null);
      const response = await categoryApi.getAllCategories();
      setCategories(response || []);
    } catch (error: any) {
      console.error("Failed to fetch categories:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to load categories";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchCategories();
  };

  const SkeletonBox = ({
    width,
    height,
    style,
  }: {
    width: number;
    height: number;
    style?: any;
  }) => (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: "#E5E7EB",
          borderRadius: 8,
          opacity: skeletonOpacity,
        },
        style,
      ]}
    />
  );

  const renderSkeletonLoader = () => (
    <View style={{ paddingVertical: 20 }}>
      {/* Section Header */}
      <View
        style={{
          paddingHorizontal: 16,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
            color: "#333",
            marginBottom: 4,
          }}
        >
          Shop by Category
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#666",
            lineHeight: 18,
          }}
        >
          Discover everything you need across our wide range of categories
        </Text>
      </View>

      {/* Skeleton Grid */}
      <View style={{ paddingHorizontal: 16 }}>
        <FlatList
          data={[1, 2, 3, 4, 5, 6, 7, 8]}
          numColumns={2}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.toString()}
          renderItem={({ item, index }) => (
            <View
              style={{
                width: CARD_WIDTH,
                backgroundColor: "#fff",
                borderRadius: 16,
                marginBottom: 16,
                marginRight: index % 2 === 0 ? 16 : 0,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.18,
                shadowRadius: 10,
                elevation: 8,
                borderWidth: 0.5,
                borderColor: "rgba(0, 0, 0, 0.05)",
                overflow: "hidden",
              }}
            >
              {/* Skeleton Icon/Image */}
              <View
                style={{
                  height: 100,
                  backgroundColor: "#F3F4F6",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <SkeletonBox
                  width={40}
                  height={40}
                  style={{ borderRadius: 20 }}
                />
              </View>

              {/* Skeleton Info */}
              <View style={{ padding: 12 }}>
                <SkeletonBox
                  width={100}
                  height={16}
                  style={{ marginBottom: 8 }}
                />
                <SkeletonBox width={60} height={12} />
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );

  if (loading) {
    return renderSkeletonLoader();
  }

  if (error) {
    return (
      <View style={{ paddingVertical: 20 }}>
        {/* Section Header */}
        <View
          style={{
            paddingHorizontal: 16,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: "#333",
              marginBottom: 4,
            }}
          >
            Shop by Category
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#666",
              lineHeight: 18,
            }}
          >
            Discover everything you need across our wide range of categories
          </Text>
        </View>

        {/* Error State */}
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#FFF5EE",
            padding: 20,
            borderRadius: 16,
            marginHorizontal: 16,
            borderWidth: 1,
            borderColor: "#ff6b00",
          }}
        >
          <Ionicons name="warning-outline" size={32} color="#ff6b00" />
          <Text
            style={{
              fontSize: 14,
              color: "#ff6b00",
              marginTop: 8,
              textAlign: "center",
              fontWeight: "500",
            }}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#ff6b00",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              marginTop: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              shadowColor: "#ff6b00",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={handleRetry}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Handle empty categories state
  if (!loading && categories.length === 0) {
    return (
      <View style={{ paddingVertical: 20 }}>
        {/* Section Header */}
        <View
          style={{
            paddingHorizontal: 16,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: "#333",
              marginBottom: 4,
            }}
          >
            Shop by Category
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#666",
              lineHeight: 18,
            }}
          >
            Discover everything you need across our wide range of categories
          </Text>
        </View>

        {/* Empty State */}
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#F8F9FA",
            padding: 30,
            borderRadius: 16,
            marginHorizontal: 16,
            borderWidth: 1,
            borderColor: "#E9ECEF",
          }}
        >
          <Ionicons name="grid-outline" size={64} color="#6C757D" />
          <Text
            style={{
              fontSize: 18,
              color: "#495057",
              marginTop: 16,
              textAlign: "center",
              fontWeight: "600",
            }}
          >
            No Categories Available
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#6C757D",
              marginTop: 8,
              textAlign: "center",
              lineHeight: 20,
              paddingHorizontal: 20,
            }}
          >
            We&apos;re working on adding exciting categories for you. Please
            check back later or refresh to see if new categories are available.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#ff6b00",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              shadowColor: "#ff6b00",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={handleRetry}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
              Refresh Categories
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderCategoryCard = ({
    item,
    index,
  }: {
    item: Category;
    index: number;
  }) => (
    <TouchableOpacity
      style={{
        width: CARD_WIDTH,
        backgroundColor: "#fff",
        borderRadius: 16,
        marginBottom: 16,
        marginRight: index % 2 === 0 ? 16 : 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: 0.5,
        borderColor: "rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
      }}
      activeOpacity={0.9}
      onPress={() => onCategoryPress(item.id.toString(), item.name)}
    >
      {/* Category Icon/Image */}
      <View
        style={{
          height: 100,
          backgroundColor: PrimaryColor,
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
        }}
      >
        {item.imageUrl ? (
          <Image
            style={{
              width: 60,
              height: 60,
              borderRadius: 8,
            }}
            source={{ uri: item.imageUrl }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 8,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Decorative Elements */}
        <View
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -10,
            left: -10,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          }}
        />
      </View>

      {/* Category Info */}
      <View style={{ padding: 12 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#333",
            textAlign: "center",
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        {/* Browse indicator */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: "#666",
              marginRight: 4,
            }}
          >
            Browse
          </Text>
          <Ionicons name="chevron-forward" size={12} color="#666" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ paddingVertical: 20 }}>
      {/* Section Header */}
      <View
        style={{
          paddingHorizontal: 16,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
            color: "#333",
            marginBottom: 4,
          }}
        >
          Shop by Category
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#666",
            lineHeight: 18,
          }}
        >
          Discover everything you need across our wide range of categories
        </Text>
      </View>

      {/* Categories Grid */}
      <View style={{ paddingHorizontal: 16 }}>
        <FlatList
          data={categories}
          renderItem={renderCategoryCard}
          numColumns={2}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        />
      </View>
    </View>
  );
}
