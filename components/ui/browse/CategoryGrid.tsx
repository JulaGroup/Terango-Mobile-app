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
import { subCategoryApi } from "@/lib/api";
import { router } from "expo-router";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 64) / 3; // width per card
const CARD_HEIGHT = 140;

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
    // Skeleton animation
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

    if (loading) skeletonAnimation.start();
    else skeletonAnimation.stop();

    return () => skeletonAnimation.stop();
  }, [loading, skeletonOpacity]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setError(null);
      const response = await subCategoryApi.getAllSubCategories();
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
          backgroundColor: "#F1F5F9",
          borderRadius: 8,
          opacity: skeletonOpacity,
        },
        style,
      ]}
    />
  );

  const renderSkeletonLoader = () => (
    <View style={{ marginTop: 24 }}>
      {/* Section Header */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: "#1E293B",
            marginBottom: 6,
            letterSpacing: -0.5,
          }}
        >
          Categories
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#64748B",
            lineHeight: 22,
            fontWeight: "400",
          }}
        >
          Explore our curated collection
        </Text>
      </View>

      {/* Skeleton Slider: 3 columns, each with 2 rows */}
      <View
        style={{
          paddingHorizontal: 20,
          marginBottom: 24,
          flexDirection: "row",
        }}
      >
        {[1, 2, 3, 4].map((col) => (
          <View key={col} style={{ marginRight: col < 4 ? 12 : 0 }}>
            {[1, 2].map((row) => (
              <View
                key={row}
                style={{
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  marginBottom: row === 1 ? 8 : 0,
                  padding: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#1E293B",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: "#F1F5F9",
                }}
              >
                <SkeletonBox
                  width={60}
                  height={60}
                  style={{ borderRadius: 14, marginBottom: 12 }}
                />
                <SkeletonBox
                  width={60}
                  height={12}
                  style={{ borderRadius: 4, marginBottom: 6 }}
                />
                <SkeletonBox
                  width={40}
                  height={10}
                  style={{ borderRadius: 4 }}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) return renderSkeletonLoader();

  if (error)
    return (
      <View style={{ marginTop: 24 }}>
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#1E293B",
              marginBottom: 6,
              letterSpacing: -0.5,
            }}
          >
            Categories
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#64748B",
              lineHeight: 22,
              fontWeight: "400",
            }}
          >
            Explore our curated collection
          </Text>
        </View>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#FEF2F2",
            padding: 24,
            borderRadius: 20,
            marginHorizontal: 20,
            borderWidth: 1,
            borderColor: "#FECACA",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "#FCA5A5",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name="alert-circle" size={24} color="#DC2626" />
          </View>
          <Text
            style={{
              fontSize: 16,
              color: "#DC2626",
              textAlign: "center",
              fontWeight: "600",
              marginBottom: 8,
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#7F1D1D",
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#DC2626",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              shadowColor: "#DC2626",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={handleRetry}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );

  if (!loading && categories.length === 0)
    return (
      <View style={{ marginTop: 24 }}>
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#1E293B",
              marginBottom: 6,
              letterSpacing: -0.5,
            }}
          >
            Categories
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#64748B",
              lineHeight: 22,
              fontWeight: "400",
            }}
          >
            Explore our curated collection
          </Text>
        </View>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#F8FAFC",
            padding: 32,
            borderRadius: 20,
            marginHorizontal: 20,
            borderWidth: 1,
            borderColor: "#E2E8F0",
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#E2E8F0",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons name="grid-outline" size={32} color="#64748B" />
          </View>
          <Text
            style={{
              fontSize: 18,
              color: "#334155",
              fontWeight: "600",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            No Categories Yet
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#64748B",
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 20,
              paddingHorizontal: 16,
            }}
          >
            We&apos;re adding exciting categories soon. Check back in a moment!
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#3B82F6",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              shadowColor: "#3B82F6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={handleRetry}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );

  // --- Render one horizontal slider with two rows ---F
  const renderTwoRowSlider = () => {
    // Group items into columns of 2
    const columns = [];
    for (let i = 0; i < categories.length; i += 2) {
      columns.push(categories.slice(i, i + 2));
    }

    return (
      <FlatList
        data={columns}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => `column-${index}`}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        renderItem={({ item }) => (
          <View style={{ marginRight: 12 }}>
            {item.map((cat, idx) => (
              <TouchableOpacity
                key={cat.id}
                style={{
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  marginBottom: idx === 0 && item.length === 2 ? 8 : 0,
                  padding: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#1E293B",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: "#F1F5F9",
                }}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/SubCategoryView",
                    params: {
                      subCategoryId: cat.id,
                      subCategoryName: cat.name,
                    },
                  })
                }
              >
                {cat.imageUrl ? (
                  <Image
                    source={{ uri: cat.imageUrl }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 14,
                      marginBottom: 12,
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 14,
                      backgroundColor: "#EEF2FF",
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "700",
                        color: "#4F46E5",
                      }}
                    >
                      {cat.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#334155",
                    textAlign: "center",
                    lineHeight: 16,
                  }}
                  numberOfLines={2}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
    );
  };

  return (
    <View style={{ marginTop: 24 }}>
      {/* Section Header */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: "#1E293B",
            marginBottom: 6,
            letterSpacing: -0.5,
          }}
        >
          Categories
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#64748B",
            lineHeight: 22,
            fontWeight: "400",
          }}
        >
          Explore our curated collection
        </Text>
      </View>

      {/* Categories Slider */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        {renderTwoRowSlider()}
      </View>
    </View>
  );
}
