import React, { useRef, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Animated,
  Dimensions,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

// Components
import Cart from "@/components/common/Cart";
import CategoryGrid from "@/components/ui/browse/CategoryGrid";
import RestaurantNearYou from "@/components/ui/home/RestaurantNearYouNew";
import StoresNearYou from "@/components/ui/home/StoresNearYouNew";
import GreatForBreakfast from "@/components/ui/home/GreatForBreakfast";
import TraditionalMeals from "@/components/ui/home/TraditionalMeals";
import LocalBeverages from "@/components/ui/home/LocalBeverages";
import FreshFromFarm from "@/components/ui/home/FreshFromFarm";
import PopularStores from "@/components/ui/home/PopularStores";
import AdBanner from "@/components/ui/home/AdBanner";
import { PrimaryColor } from "@/constants/Colors";

const { width } = Dimensions.get("window");

export default function BrowseScreen() {
  const [searchText, setSearchText] = useState("");
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
          padding: 10,
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "white",
              borderColor: "#E8E8E8",
              borderWidth: 1.5,
              borderRadius: 35,
              height: 50,
              paddingHorizontal: 18,
              width: "80%",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="search"
              size={24}
              color="#667eea"
              style={{ marginRight: 12 }}
            />
            <TextInput
              style={{ flex: 1, fontSize: 16, fontWeight: "500" }}
              placeholder="Search categories, products..."
              value={searchText}
              onChangeText={(text) => setSearchText(text)}
            />
            <View
              style={{
                backgroundColor: "#667eea",
                borderRadius: 15,
                paddingHorizontal: 8,
                paddingVertical: 6,
                marginLeft: 8,
              }}
            >
              <Ionicons name="options" color="#FFFFFF" size={18} />
            </View>
          </View>
        </TouchableWithoutFeedback>
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
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "white",
                borderColor: "#E0E0E0",
                borderWidth: 1,
                borderRadius: 30,
                height: 50,
                paddingHorizontal: 15,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              <Ionicons
                name="search"
                size={24}
                color="#4B4B4BFF"
                style={{ marginRight: 10, alignSelf: "center" }}
              />
              <TextInput
                style={{ flex: 1, fontSize: 16 }}
                placeholder="Search here..."
                value={searchText}
                onChangeText={(text) => setSearchText(text)}
              />
              <Ionicons
                style={{ marginLeft: 10, alignSelf: "center" }}
                name="options"
                color="#4B4B4BFF"
                size={24}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>

        {/* Welcome Section */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 24,
            backgroundColor: "#667eea",
            marginHorizontal: 16,
            borderRadius: 20,
            marginBottom: 20,
            shadowColor: "#667eea",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: "#FFFFFF",
              marginBottom: 8,
            }}
          >
            Explore The Gambia 🇬🇲
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "#E8E8FF",
              lineHeight: 22,
            }}
          >
            Discover local flavors, traditional meals, fresh produce, and
            everything you need - delivered across The Gambia with love.
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

        {/* Great for Breakfast - Gambian Morning Favorites */}
        <GreatForBreakfast />

        {/* Traditional Meals - Authentic Gambian Cuisine */}
        <TraditionalMeals />

        {/* Local Beverages - Traditional & Modern Drinks */}
        <LocalBeverages />

        {/* Advertisement Banner */}
        <AdBanner
          title="🥗 Fresh & Healthy Living"
          buttonText="Shop Fresh"
          backgroundColor="#16A085"
          onPress={() => console.log("Shop fresh products")}
        />

        {/* Fresh from Farm - Local Produce */}
        <FreshFromFarm />

        {/* Restaurants Near You */}
        <RestaurantNearYou />

        {/* Advertisement Banner */}
        <AdBanner
          title="🔥 Weekly Special Offers"
          buttonText="View Deals"
          backgroundColor="#E74C3C"
          onPress={() => console.log("View weekly deals")}
        />

        {/* Popular Stores */}
        <PopularStores />

        {/* Stores Near You */}
        <StoresNearYou />

        {/* Final Advertisement Banner */}
        <AdBanner
          title="📱 Download TeranGo App"
          buttonText="Get App"
          backgroundColor="#9C27B0"
          onPress={() => console.log("Download app")}
        />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
