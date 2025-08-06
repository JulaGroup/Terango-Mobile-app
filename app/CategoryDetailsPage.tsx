import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  Animated,
} from "react-native";
import { categoryApi } from "@/lib/api";

const { width } = Dimensions.get("window");

interface SubCategory {
  id: string;
  name: string;
  imageUrl?: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  subCategories: SubCategory[];
}

const CategoryDetailsPage = () => {
  const { categoryId, categoryName } = useLocalSearchParams();
  const [category, setCategory] = useState<Category | null>(null);
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
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.3,
          duration: 1200,
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
  const SkeletonBox = ({
    width,
    height,
    style,
  }: {
    width: number | string;
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
  const fetchCategoryDetails = useCallback(async () => {
    try {
      setError(null);
      const response = await categoryApi.getCategoryById(categoryId as string);
      setCategory(response);
    } catch (error: any) {
      console.error("Failed to fetch category details:", error);
      const errorMessage =
        error.response?.status === 404
          ? "Category not found"
          : error.response?.data?.error ||
            error.message ||
            "Failed to load category details";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  const fetchAllCategories = useCallback(async () => {
    try {
      setError(null);
      const response = await categoryApi.getAllCategories();
      // Create a virtual category for "All Categories"
      const allSubCategories = (response || []).flatMap(
        (cat: Category) => cat.subCategories || []
      );
      setCategory({
        id: "all",
        name: "All Categories",
        imageUrl: "",
        subCategories: allSubCategories,
      });
    } catch (error: any) {
      console.error("Failed to fetch all categories:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to load categories";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);

    if (categoryId && categoryId !== "all") {
      fetchCategoryDetails();
    } else {
      fetchAllCategories();
    }
  };
  useEffect(() => {
    if (categoryId && categoryId !== "all") {
      fetchCategoryDetails();
    } else {
      // Handle "See All" case - fetch all categories
      fetchAllCategories();
    }
  }, [categoryId, fetchCategoryDetails, fetchAllCategories]);

  const handleSubCategoryPress = (subCategory: SubCategory) => {
    // Navigate to subcategory products/services page with the subcategory info
    router.push({
      pathname: "/SubCategoryProductsPage",
      params: {
        subCategoryId: subCategory.id,
        subCategoryName: subCategory.name,
      },
    });
  };

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="warning-outline" size={64} color="#EF4444" />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={handleRetry}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh" size={20} color="#fff" />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
  const renderSkeletonGrid = () => (
    <View style={styles.gridContainer}>
      {Array.from({ length: 8 }).map((_, index) => (
        <View key={index} style={styles.subCategoryCard}>
          <SkeletonBox
            width={80}
            height={80}
            style={{ borderRadius: 12, marginBottom: 8 }}
          />
          <SkeletonBox width={100} height={14} style={{ borderRadius: 4 }} />
        </View>
      ))}
    </View>
  );
  const renderSubCategoryGrid = () => {
    if (!category?.subCategories || category.subCategories.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="grid-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Subcategories Available</Text>
          <Text style={styles.emptySubtitle}>
            This category doesn&apos;t have any subcategories yet. Check back
            later as we&apos;re always adding new options.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.gridContainer}>
        {category.subCategories.map((subCategory) => (
          <TouchableOpacity
            key={subCategory.id}
            style={styles.subCategoryCard}
            onPress={() => handleSubCategoryPress(subCategory)}
            activeOpacity={0.8}
          >
            {subCategory.imageUrl ? (
              <Image
                style={styles.subCategoryImage}
                source={{ uri: subCategory.imageUrl }}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>
                  {subCategory.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.subCategoryName} numberOfLines={2}>
              {subCategory.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  return (
    <View style={styles.container}>
      {/* Minimal Header - Just Back Button and Title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{categoryName || "Category"}</Text>
        </View>

        <View style={styles.spacer} />
      </View>
      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading
          ? renderSkeletonGrid()
          : error
          ? renderErrorState()
          : renderSubCategoryGrid()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50, // Safe area replacement
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
  },
  backButton: {
    backgroundColor: "#F1F5F9",
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    fontFamily: "Poppins",
    textAlign: "center",
  },
  spacer: {
    width: 40,
    height: 40,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 20,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 15,
  },
  subCategoryCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    flexDirection: "column",
    justifyContent: "center",
    width: (width - 60) / 2, // 2 columns with padding and gap
    minHeight: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  subCategoryImage: {
    width: 110,
    height: 110,
    borderRadius: 12,
    marginBottom: 8,
  },
  placeholderImage: {
    width: 110,
    height: 110,
    borderRadius: 12,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  placeholderText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  subCategoryName: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 4,
  }, // Error and Empty States
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    fontWeight: "400",
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B35",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default CategoryDetailsPage;
