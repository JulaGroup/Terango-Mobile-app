import React, { useEffect, useRef } from "react";
import { View, Animated, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

interface SkeletonLoaderProps {
  type?: "card" | "banner" | "category" | "list" | "horizontal";
  count?: number;
}

export default function SkeletonLoader({
  type = "card",
  count = 4,
}: SkeletonLoaderProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  if (type === "banner") {
    return (
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <Animated.View
          style={{
            width: width - 32,
            height: 180,
            backgroundColor: "#E5E7EB",
            borderRadius: 16,
            opacity,
          }}
        />
      </View>
    );
  }

  if (type === "category") {
    return (
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          paddingHorizontal: 16,
          gap: 12,
        }}
      >
        {Array.from({ length: count }).map((_, index) => (
          <Animated.View
            key={index}
            style={{
              width: "30.5%",
              height: 120,
              backgroundColor: "#E5E7EB",
              borderRadius: 12,
              opacity,
            }}
          />
        ))}
      </View>
    );
  }

  if (type === "list") {
    return (
      <View style={{ paddingHorizontal: 16 }}>
        {Array.from({ length: count }).map((_, index) => (
          <Animated.View
            key={index}
            style={{
              height: 80,
              backgroundColor: "#E5E7EB",
              borderRadius: 12,
              marginBottom: 12,
              opacity,
            }}
          />
        ))}
      </View>
    );
  }

  if (type === "horizontal") {
    return (
      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 12 }}>
        {Array.from({ length: count }).map((_, index) => (
          <Animated.View
            key={index}
            style={{
              width: 160,
              backgroundColor: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
              opacity,
            }}
          >
            <View style={{ height: 120, backgroundColor: "#E5E7EB" }} />
            <View style={{ padding: 10 }}>
              <View
                style={{
                  height: 11,
                  backgroundColor: "#E5E7EB",
                  borderRadius: 5,
                  marginBottom: 6,
                  width: "80%",
                }}
              />
              <View
                style={{
                  height: 10,
                  backgroundColor: "#E5E7EB",
                  borderRadius: 5,
                  marginBottom: 6,
                  width: "55%",
                }}
              />
              <View
                style={{
                  height: 13,
                  backgroundColor: "#E5E7EB",
                  borderRadius: 6,
                  width: "45%",
                }}
              />
            </View>
          </Animated.View>
        ))}
      </View>
    );
  }

  // Default: card type (product cards)
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View
          key={index}
          style={{
            width: "48%",
            backgroundColor: "#fff",
            borderRadius: 12,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 3,
            opacity,
          }}
        >
          <View style={{ height: 140, backgroundColor: "#E5E7EB" }} />
          <View style={{ padding: 12 }}>
            <View
              style={{
                height: 12,
                backgroundColor: "#E5E7EB",
                borderRadius: 6,
                marginBottom: 8,
                width: "80%",
              }}
            />
            <View
              style={{
                height: 10,
                backgroundColor: "#E5E7EB",
                borderRadius: 5,
                marginBottom: 8,
                width: "60%",
              }}
            />
            <View
              style={{
                height: 14,
                backgroundColor: "#E5E7EB",
                borderRadius: 7,
                width: "40%",
              }}
            />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}
