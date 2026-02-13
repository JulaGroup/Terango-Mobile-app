import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

interface TrendingSkeletonProps {
  count?: number;
}

const TrendingSkeleton: React.FC<TrendingSkeletonProps> = ({ count = 3 }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.imageContainer}>
            <View style={styles.imageSkeleton}>
              <LinearGradient
                colors={[
                  "rgba(255,255,255,0.1)",
                  "rgba(255,255,255,0.2)",
                  "rgba(255,255,255,0.1)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </View>
          </View>

          <View style={styles.infoContainer}>
            <View style={[styles.textSkeleton, styles.titleSkeleton]}>
              <LinearGradient
                colors={[
                  "rgba(255,255,255,0.1)",
                  "rgba(255,255,255,0.2)",
                  "rgba(255,255,255,0.1)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </View>

            <View style={[styles.textSkeleton, styles.subtitleSkeleton]}>
              <LinearGradient
                colors={[
                  "rgba(255,255,255,0.1)",
                  "rgba(255,255,255,0.2)",
                  "rgba(255,255,255,0.1)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </View>

            <View style={[styles.textSkeleton, styles.priceSkeleton]}>
              <LinearGradient
                colors={[
                  "rgba(255,255,255,0.1)",
                  "rgba(255,255,255,0.2)",
                  "rgba(255,255,255,0.1)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingRight: 16,
  },
  skeletonCard: {
    width: 180,
    marginRight: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 120,
  },
  imageSkeleton: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  infoContainer: {
    padding: 10,
  },
  textSkeleton: {
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  titleSkeleton: {
    height: 16,
    width: "90%",
  },
  subtitleSkeleton: {
    height: 14,
    width: "70%",
  },
  priceSkeleton: {
    height: 18,
    width: "50%",
  },
  shimmerGradient: {
    flex: 1,
  },
});

export default TrendingSkeleton;
