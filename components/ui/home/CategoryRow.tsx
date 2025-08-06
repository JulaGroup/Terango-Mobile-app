import React, { useEffect, useState, useRef } from "react";
import {
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { categoryApi } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  subCategories?: any[];
}

const CategoryRow = ({
  onCategoryPress,
}: {
  onCategoryPress: (categoryId: string, categoryName: string) => void;
}) => {
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
    <View style={{ paddingHorizontal: 15, marginTop: 20 }}>
      <Text
        style={{
          fontSize: 17,
          fontWeight: "bold",
          fontFamily: "Poppins",
          marginBottom: 15,
          color: "#262626",
        }}
      >
        Categories
      </Text>
      <FlatList
        data={[1, 2, 3, 4, 5]}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10 }}
        keyExtractor={(item) => item.toString()}
        renderItem={({ item }) => (
          <View style={{ marginRight: 10 }}>
            <View
              style={{
                alignItems: "center",
                backgroundColor: "#F8F8F8",
                padding: 5,
                borderRadius: 10,
                flexDirection: "column",
                justifyContent: "center",
                gap: 8,
                height: 100,
                width: 100,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              <SkeletonBox width={50} height={50} style={{ borderRadius: 8 }} />
              <SkeletonBox width={70} height={12} style={{ borderRadius: 4 }} />
            </View>
          </View>
        )}
      />
    </View>
  );
  if (loading) {
    return renderSkeletonLoader();
  }
  if (error) {
    return (
      <View style={{ paddingHorizontal: 15, marginTop: 20 }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "bold",
            fontFamily: "Poppins",
            marginBottom: 15,
            color: "#262626",
          }}
        >
          Categories
        </Text>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#FFF5EE",
            padding: 20,
            borderRadius: 16,
            marginHorizontal: 10,
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
      <View style={{ paddingHorizontal: 15, marginTop: 20 }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "bold",
            fontFamily: "Poppins",
            marginBottom: 15,
            color: "#262626",
          }}
        >
          Categories
        </Text>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#F8F9FA",
            padding: 20,
            borderRadius: 16,
            marginHorizontal: 10,
            borderWidth: 1,
            borderColor: "#E9ECEF",
          }}
        >
          <Ionicons name="grid-outline" size={48} color="#6C757D" />
          <Text
            style={{
              fontSize: 16,
              color: "#495057",
              marginTop: 12,
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
            }}
          >
            Categories are being updated. Please check back later or refresh to
            see if new categories are available.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#ff6b00",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              marginTop: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
            onPress={handleRetry}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  return (
    <View style={{ paddingHorizontal: 15, marginTop: 20 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: "bold",
            fontFamily: "Poppins",
            color: "#262626",
          }}
        >
          Categories
        </Text>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            gap: 5,
            alignItems: "center",
            marginBottom: 5,
          }}
          onPress={() => onCategoryPress("all", "See All")}
        >
          <Text style={{ color: "#929292", fontWeight: "500" }}>See All</Text>
          <Ionicons name="chevron-forward" size={20} color="#929292" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 10 }}
        renderItem={({ item }) => (
          <View style={{ marginRight: 10 }}>
            <TouchableOpacity
              onPress={() => onCategoryPress(item.id, item.name)}
              style={{
                alignItems: "center",
                backgroundColor: "#FFF5EE",
                padding: 5,
                borderRadius: 16,
                flexDirection: "column",
                justifyContent: "center",
                gap: 3,
                height: 100,
                width: 100,
                shadowColor: "#ff6b00",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                borderWidth: 1,
                borderColor: "#FFF0E6",
              }}
            >
              {item.imageUrl ? (
                <Image
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 8,
                  }}
                  source={{ uri: item.imageUrl }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 8,
                    backgroundColor: "#ff6b00",
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
              <Text
                style={{
                  color: "#ff6b00",
                  fontSize: 12,
                  fontWeight: "600",
                  fontFamily: "Poppins",
                  textAlign: "center",
                  width: 80,
                }}
                numberOfLines={2}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

export default CategoryRow;
