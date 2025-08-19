import "react-native-get-random-values";
import { CartProvider } from "@/context/CartContext";
import { PermissionProvider } from "@/context/PermissionContext";
import { AddressProvider } from "@/context/AddressContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <PermissionProvider>
        <AddressProvider>
          <CartProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Stack>
                <Stack.Screen
                  name="onboarding"
                  options={{
                    headerShown: false,
                    animation: "fade_from_bottom",
                  }}
                />
                <Stack.Screen
                  name="index"
                  options={{
                    headerShown: false,
                    animation: "fade_from_bottom",
                  }}
                />
                <Stack.Screen
                  name="auth/index"
                  options={{
                    headerShown: false,
                    animation: "fade_from_bottom",
                  }}
                />
                <Stack.Screen
                  name="auth/otp"
                  options={{
                    headerShown: false,
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="auth/complete-profile"
                  options={{
                    headerShown: false,
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="CategoryDetailsPage"
                  options={{
                    headerShown: false,
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="AllCategoriesPage"
                  options={{
                    headerShown: false,
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="SubCategoryProductsPage"
                  options={{
                    animation: "slide_from_right",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="cart"
                  options={{
                    animation: "slide_from_right",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="restaurant-details"
                  options={{
                    animation: "slide_from_right",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="shop-details"
                  options={{
                    animation: "slide_from_right",
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="checkout"
                  options={{
                    animation: "slide_from_right",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="+not-found"
                  options={{ headerShown: false }}
                />
              </Stack>
              <StatusBar style="auto" />
            </GestureHandlerRootView>
          </CartProvider>
        </AddressProvider>
      </PermissionProvider>
    </ThemeProvider>
  );
}
