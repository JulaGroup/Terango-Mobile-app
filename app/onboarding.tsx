import { PrimaryColor } from "@/constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

const slides = [
  {
    key: "1",
    title: "Welcome to TeranGo!",
    description:
      "Your go-to delivery app in The Gambia. Start with food, groceries, and pharmacy — fast, fresh, and reliable to your door.",
    image: require("../assets/images/onboarding/motor0.jpg"),
  },
  {
    key: "2",
    title: "Delicious Food, Straight to You",
    description:
      "Order meals from your favorite local restaurants and enjoy clean, quick delivery wherever you are.",
    image: require("../assets/images/onboarding/food.png"),
  },
  {
    key: "3",
    title: "Fresh Groceries & Daily Essentials",
    description:
      "Shop fruits, veggies, drinks, and household items from nearby stores — always fresh and delivered with care.",
    image: require("../assets/images/onboarding/groceries.png"),
  },
  {
    key: "4",
    title: "Pharmacy Items Delivered Safely",
    description:
      "Get health products and over-the-counter meds to your door. Discreet, reliable, and fast pharmacy delivery.",
    image: require("../assets/images/onboarding/pharmacy.jpg"),
  },
  {
    key: "5",
    title: "Track, Pay & Stay in Control",
    description:
      "Follow your delivery in real time and pay securely online — your peace of mind, our priority.",
    image: require("../assets/images/onboarding/track.png"),
  },
];

export default function Onboarding() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const renderItem = ({ item }: { item: (typeof slides)[0] }) => (
    <View style={styles.slide}>
      <Image
        accessible
        accessibilityLabel={`Slide ${item.key}`}
        source={item.image}
        style={styles.heroImage}
        resizeMode="cover"
      />
      <TouchableOpacity
        style={{
          position: "absolute",
          top: 60,
          right: 20,
          backgroundColor: "#ff6b00",
          paddingVertical: 8,
          paddingHorizontal: 15,
          borderRadius: 5,
        }}
        onPress={async () => {
          if (loading) return;
          setLoading(true);
          await AsyncStorage.setItem("hasSeenOnboarding", "true");
          router.replace("/(tabs)");
        }}
      >
        <Text style={{ color: "black", fontSize: 16, fontWeight: "bold" }}>
          Skip
        </Text>
      </TouchableOpacity>
      <View style={styles.textContainer}>
        {/* Special rendering for the first slide */}
        {item.key === "1" ? (
          <Text style={[styles.title, { color: "#1A3C34" }]}>
            Welcome to Teran
            <Text style={{ color: PrimaryColor, fontWeight: "800" }}>Go</Text>
            <Text style={{ color: "#1A3C34", fontWeight: "800" }}>!</Text>
          </Text>
        ) : (
          <Text style={styles.title}>{item.title}</Text>
        )}
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
      />

      <View style={styles.bottomContainer}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <View style={styles.dotsContainer}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, currentIndex === i && styles.activeDot]}
              />
            ))}
          </View>
          {currentIndex < slides.length - 1 ? (
            <TouchableOpacity
              style={styles.nextButton} // Black button
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.getStartedButton} // PrimaryColor button
              onPress={async () => {
                if (loading) return;
                setLoading(true);
                await AsyncStorage.setItem("hasSeenOnboarding", "true");
                router.replace("/(tabs)");
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.getStartedButtonText}>Get Started</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.footerText}>Powered by JulaGroup. &copy; 2025</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  slide: {
    width,
    flex: 1,
    alignItems: "center",
  },
  heroImage: {
    width,
    height: height * 0.55,
  },
  textContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A3C34", // Default color for the title parts not explicitly styled
    marginBottom: 12,
    letterSpacing: 0.5,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    width: 350,
    paddingHorizontal: 5,
    fontFamily: "Poppins_400Regular",
  },
  bottomContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
    // position: "absolute",
    // bottom: 80,
    // left: 0,
    paddingHorizontal: 24,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: PrimaryColor, // Active dot now uses PrimaryColor
    width: 20,
  },
  nextButton: {
    backgroundColor: "black", // Black button background
    width: "50%",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#000", // Black shadow for black button
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  nextButtonText: {
    color: PrimaryColor, // PrimaryColor text on black button
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  getStartedButton: {
    backgroundColor: PrimaryColor, // PrimaryColor button background
    width: "50%",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: PrimaryColor, // PrimaryColor shadow for primary button
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  getStartedButtonText: {
    color: "black", // Black text on primary button
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  footerText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
});
