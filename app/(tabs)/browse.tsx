import React, { useRef, useState } from "react";
import { View, Text, Animated, Dimensions } from "react-native";
import { router } from "expo-router";

// Components
import Cart from "@/components/common/Cart";
import SearchBar from "@/components/common/SearchBar";
import SearchModal from "@/components/common/SearchModal";
import CategoryGrid from "@/components/ui/browse/CategoryGrid";
import RestaurantNearYou from "@/components/ui/home/RestaurantNearYouNew";
import AdBanner from "@/components/ui/home/AdBanner";
import LocalShops from "@/components/ui/home/LocalShops";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function BrowseScreen() {
  const [searchText, setSearchText] = useState("");
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const showStickySearchBar = scrollY.interpolate({
    inputRange: [100, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Handle category navigation
  const handleCategoryPress = (categoryId: string, categoryName: string) => {
    if (categoryId === "all") {
      router.push("/AllCategoriesPage");
    } else {
      router.push({
        pathname: "/CategoryDetailsPage",
        params: { categoryId, categoryName },
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Sticky SearchBar */}
      <Animated.View
        style={{
          position: "absolute",
          top: 40,
          zIndex: 1000,
          opacity: showStickySearchBar,
          backgroundColor: "#fff",
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingVertical: 10,
          width: width,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "space-between",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <View style={{ flex: 1, marginBottom: 10 }}>
          <SearchBar
            onChangeText={(text) => setSearchText(text)}
            value={searchText}
            onPress={() => setSearchModalVisible(true)}
            editable={false} // Make it non-editable to force modal usage
            fullWidth={true} // Remove horizontal margins for full width
          />
        </View>
        <Cart />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{
          paddingBottom: 20,
        }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Browse Page Search Bar */}
        <SearchBar
          onChangeText={(text) => setSearchText(text)}
          value={searchText}
          onPress={() => setSearchModalVisible(true)}
          editable={false} // Make it non-editable to force modal usage
        />

        {/* Welcome Section */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 24,
            backgroundColor: "#F3F4F6", // light grey background
            marginHorizontal: 16,
            borderRadius: 20,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: "#1F2937", // dark text for contrast
              marginBottom: 8,
            }}
          >
            Explore Teran
            <Text style={{ fontWeight: "bold", color: "#FF6A00" }}>GO</Text> 🇬🇲
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "#4B5563", // medium grey text for readability
              lineHeight: 24,
            }}
          >
            Find the best meals, groceries, and fresh produce near you —
            delivered quickly, safely, and with love across The Gambia.
          </Text>
        </View>

        {/* Categories Grid - Main Focus */}
        <CategoryGrid onCategoryPress={handleCategoryPress} />

        {/* Advertisement Banner */}
        <AdBanner
          title="🌟 Discover Local Treasures"
          buttonText="Explore Now"
          backgroundColor="#27AE60"
          onPress={() => console.log("Explore local treasures")}
        />

        {/* Fresh from Farm - Local Produce */}
        {/* <FreshFromFarm /> */}

        {/* Restaurants Near You */}
        <RestaurantNearYou />
        {/* Local Shops - Quality products near you */}
        <LocalShops />

        {/* Advertisement Banner */}
        <AdBanner
          title="🔥 Weekly Special Offers"
          buttonText="View Deals"
          backgroundColor="#E74C3C"
          onPress={() => console.log("View weekly deals")}
        />
      </Animated.ScrollView>

      {/* Search Modal */}
      <SearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        initialQuery={searchText}
      />
    </SafeAreaView>
  );
}
