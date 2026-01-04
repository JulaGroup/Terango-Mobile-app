import Cart from "@/components/common/Cart";
import Header from "@/components/common/Header";
import PermissionHandler from "@/components/common/PermissionHandler";
import SearchBar from "@/components/common/SearchBar";
import SearchModal from "@/components/common/SearchModal";
import CategoryRow from "@/components/ui/home/CategoryRow";
import AdvertCard from "@/components/ui/home/AdvertCard";
import PromoBanner from "@/components/ui/home/PromoBanner";
import TeranGOPicks from "@/components/ui/home/TerangoPicks";

// Active home sections
import RestaurantNearYou from "@/components/ui/home/RestaurantNearYouNew";
import LocalShops from "@/components/ui/home/LocalShops";

import { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  View,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
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
          paddingHorizontal: 16,
          paddingVertical: 10,
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
        <View style={{ flex: 1 }}>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              // bump key to signal children to refresh
              setRefreshKey((k) => k + 1);
              // small timeout to show spinner briefly
              setTimeout(() => setRefreshing(false), 700);
            }}
          />
        }
      >
        {/* Header */}
        <Header />

        {/* Regular Search Bar (inside scroll) */}
        <SearchBar
          onChangeText={(text) => setSearchText(text)}
          value={searchText}
          onPress={() => setSearchModalVisible(true)}
          editable={false} // Make it non-editable to force modal usage
        />

        {/* Promo Banner - FREE DELIVERY LAUNCH 2025 */}
        <PromoBanner />

        {/* Top Advertisement Banner (Auto-scroll every 7 seconds) */}
        <AdvertCard />

        {/* Categories - Now navigates on press (supports pull-to-refresh) */}
        <CategoryRow
          onCategoryPress={handleCategoryPress}
          refreshKey={refreshKey}
        />

        {/* TeranGO Picks - Official products with priority */}
        <TeranGOPicks refreshKey={refreshKey} />

        {/* Restaurants Near You - Moved Higher */}
        <RestaurantNearYou refreshKey={refreshKey} />

        {/* Stores Near You - Moved Higher */}
        {/* <StoresNearYou /> */}

        {/* Local Shops - Quality products near you */}
        <LocalShops refreshKey={refreshKey} />

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

      {/* Search Modal */}
      <SearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        initialQuery={searchText}
      />
    </SafeAreaView>
  );
}
