import Cart from "@/components/common/Cart";
import Header from "@/components/common/Header";
import PermissionHandler from "@/components/common/PermissionHandler";
import SearchBar from "@/components/common/SearchBar";
import CategoryRow from "@/components/ui/home/CategoryRow";
import AdvertCard from "@/components/ui/home/AdvertCard";

// New Carrefour-style sections
import HeroBanner from "@/components/ui/home/HeroBanner";
import RestaurantNearYou from "@/components/ui/home/RestaurantNearYouNew";
import StoresNearYou from "@/components/ui/home/StoresNearYouNew";

// New Gambian-specific sections
import GreatForBreakfast from "@/components/ui/home/GreatForBreakfast";
import TraditionalMeals from "@/components/ui/home/TraditionalMeals";
import LocalBeverages from "@/components/ui/home/LocalBeverages";
import LocalShops from "@/components/ui/home/LocalShops";

// New sections based on actual subcategories
import LocalDishes from "@/components/ui/home/LocalDishes";
import RiceGrains from "@/components/ui/home/RiceGrains";
import PharmacyEssentials from "@/components/ui/home/PharmacyEssentials";
import HomeEssentials from "@/components/ui/home/HomeEssentials";

import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Keyboard,
  SafeAreaView,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { router } from "expo-router";
import AdBanner from "@/components/ui/home/AdBanner";
import DealsSection from "@/components/ui/home/DealsSection";
import FreshFromFarm from "@/components/ui/home/FreshFromFarm";
import GadgetTechZone from "@/components/ui/home/GadgetTechZone";
import PopularStores from "@/components/ui/home/PopularStores";
import SnackingCorner from "@/components/ui/home/SnackingCorner";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const [searchText, setSearchText] = useState("");
  const scrollY = useRef(new Animated.Value(0)).current;

  const showStickySearchBar = scrollY.interpolate({
    inputRange: [100, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // This function handles navigation to category details or all categories page
  const handleCategoryPress = (categoryId: string, categoryName: string) => {
    if (categoryId === "all") {
      // Navigate to All Categories page
      router.push("/AllCategoriesPage");
    } else {
      // Navigate to specific category details
      router.push({
        pathname: "/CategoryDetailsPage",
        params: { categoryId, categoryName }, // Pass both ID and name
      });
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#fff",
        paddingTop: Platform.OS === "android" ? 20 : 0,
      }}
    >
      {/* Sticky SearchBar */}
      <Animated.View
        style={{
          position: "absolute",
          top: Platform.OS === "android" ? 25 : 40,
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
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "white",
              borderColor: "#E0E0E0",
              borderWidth: 1,
              borderRadius: 30,
              height: 50,
              paddingHorizontal: 15,
              width: "80%",
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
        {/* Header */}
        <Header />

        {/* Regular Search Bar (inside scroll) */}
        <SearchBar
          onChangeText={(text) => setSearchText(text)}
          value={searchText}
        />

        {/* Top Advertisement Banner (Auto-scroll every 7 seconds) */}
        <AdvertCard />

        {/* Categories - Now navigates on press */}
        <CategoryRow onCategoryPress={handleCategoryPress} />

        {/* Restaurants Near You - Moved Higher */}
        <RestaurantNearYou />

        {/* Stores Near You - Moved Higher */}
        {/* <StoresNearYou /> */}

        {/* Local Shops - Quality products near you */}
        <LocalShops />

        {/* Hero Banner with Navigation Buttons */}
        {/* <HeroBanner /> */}

        {/* Traditional Meals and Beverages */}
        {/* <TraditionalMeals /> */}
        {/* <LocalBeverages /> */}
        {/* <FreshFromFarm /> */}

        {/* Local Dishes - Authentic Gambian cuisine */}
        {/* <LocalDishes /> */}

        {/* Snacking Corner */}
        {/* <SnackingCorner /> */}

        {/* Rice & Grains - Premium quality staples */}
        {/* <RiceGrains /> */}

        {/* Great for Breakfast - Gambian Morning Favorites */}
        {/* <GreatForBreakfast /> */}

        {/* Traditional Gambian Meals */}
        {/* <TraditionalMeals /> */}

        {/* <AdBanner
          title="Weekend Specials"
          buttonText="Explore"
          backgroundColor="#27AE60"
          onPress={() => {}}
        /> */}

        {/* Local Beverages */}
        {/* <LocalBeverages /> */}

        {/* Pharmacy Essentials - Health & wellness */}
        {/* <PharmacyEssentials /> */}

        {/* Fresh from the Farm */}
        {/* <FreshFromFarm /> */}

        {/* Home Essentials - Everything for your home */}
        {/* <HomeEssentials /> */}

        {/* Deals Section */}
        {/* <DealsSection /> */}

        {/* Gadget & Tech Zone */}
        {/* <GadgetTechZone /> */}

        {/* <AdBanner
          title="Premium Collection"
          buttonText="Discover"
          backgroundColor="#8E44AD"
          onPress={() => {}}
        /> */}

        {/* Popular Stores */}
        {/* <PopularStores /> */}

        {/* Advertisement Banners Section - Moved Lower */}
        {/* <AdBanner
          title="Special Offers"
          buttonText="Shop Now"
          onPress={() => {}}
        />

        <AdBanner
          title="Flash Sale"
          buttonText="View Deals"
          backgroundColor="#E74C3C"
          onPress={() => {}}
        /> */}
      </Animated.ScrollView>

      {/* Permission Modals */}
      <PermissionHandler />
    </SafeAreaView>
  );
}
