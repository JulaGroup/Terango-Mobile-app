import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

interface SkeletonProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width: w = 100,
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: w,
          height: height,
          backgroundColor: "#E1E9EE",
          borderRadius: borderRadius,
          opacity: opacity,
        },
        style,
      ]}
    />
  );
};

// Restaurant Card Skeleton
export const RestaurantCardSkeleton = () => (
  <View style={styles.restaurantCard}>
    <Skeleton
      width={width - 40}
      height={150}
      borderRadius={12}
      style={styles.image}
    />
    <View style={styles.content}>
      <Skeleton width={200} height={18} style={styles.title} />
      <Skeleton width={150} height={14} style={styles.subtitle} />
      <View style={styles.footer}>
        <Skeleton width={80} height={14} />
        <Skeleton width={60} height={14} />
      </View>
    </View>
  </View>
);

// Shop Card Skeleton
export const ShopCardSkeleton = () => (
  <View style={styles.shopCard}>
    <Skeleton
      width={width - 40}
      height={120}
      borderRadius={12}
      style={styles.image}
    />
    <View style={styles.content}>
      <Skeleton width={180} height={16} style={styles.title} />
      <Skeleton width={120} height={12} style={styles.subtitle} />
      <View style={styles.footer}>
        <Skeleton width={100} height={12} />
        <Skeleton width={40} height={12} />
      </View>
    </View>
  </View>
);

// Product Card Skeleton (Grid)
export const ProductCardSkeleton = () => (
  <View style={styles.productCard}>
    <Skeleton
      width={(width - 60) / 2}
      height={120}
      borderRadius={8}
      style={styles.productImage}
    />
    <View style={styles.productContent}>
      <Skeleton
        width={(width - 80) / 2}
        height={14}
        style={styles.productTitle}
      />
      <Skeleton width={60} height={12} style={styles.productSubtitle} />
      <View style={styles.productFooter}>
        <Skeleton width={50} height={16} />
        <Skeleton width={30} height={12} />
      </View>
    </View>
  </View>
);

// Menu Item Card Skeleton
export const MenuItemCardSkeleton = () => (
  <View style={styles.menuItemCard}>
    <Skeleton
      width={80}
      height={80}
      borderRadius={8}
      style={styles.menuImage}
    />
    <View style={styles.menuContent}>
      <Skeleton width={150} height={16} style={styles.menuTitle} />
      <Skeleton width={200} height={12} style={styles.menuDesc} />
      <View style={styles.menuFooter}>
        <Skeleton width={60} height={18} />
        <Skeleton width={40} height={12} />
      </View>
    </View>
  </View>
);

// List Skeleton with multiple items
export const ListSkeleton = ({
  type = "restaurant",
  count = 3,
}: {
  type?: "restaurant" | "shop" | "product" | "menuItem";
  count?: number;
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case "restaurant":
        return <RestaurantCardSkeleton />;
      case "shop":
        return <ShopCardSkeleton />;
      case "product":
        return <ProductCardSkeleton />;
      case "menuItem":
        return <MenuItemCardSkeleton />;
      default:
        return <RestaurantCardSkeleton />;
    }
  };

  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.skeletonItem}>
          {renderSkeleton()}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 20,
  },
  skeletonItem: {
    marginBottom: 16,
  },

  // Restaurant Card Styles
  restaurantCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Shop Card Styles
  shopCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Product Card Styles
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: (width - 60) / 2,
  },

  // Menu Item Card Styles
  menuItemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Common Styles
  image: {
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Product Specific
  productImage: {
    marginBottom: 8,
  },
  productContent: {
    flex: 1,
  },
  productTitle: {
    marginBottom: 4,
  },
  productSubtitle: {
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Menu Item Specific
  menuImage: {
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    marginBottom: 4,
  },
  menuDesc: {
    marginBottom: 8,
  },
  menuFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default Skeleton;
