import { PrimaryColor } from "@/constants/Colors";
import { topPicks } from "@/constants/fakeData";
import { useCart } from "@/context/CartContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const TopPicks = () => {
  const { addToCart, removeFromCart, getQuantity } = useCart();

  const increaseQuantity = (id: number, storeId: number) => {
    initAnimation(id);
    if (!getQuantity(id.toString())) animateIn(id);

    // Find the product from topPicks data
    const product = topPicks.find((pick) => pick.id === id);
    if (product) {
      addToCart({
        id: product.id.toString(),
        name: product.name,
        price: product.price,
        imageUrl: product.image,
        restaurantId: product.storeId.toString(),
        restaurantName: product.storeName,
        description: product.description || "",
      });
    }
  };

  const decreaseQuantity = (id: number) => {
    initAnimation(id);
    const currentQty = getQuantity(id.toString());
    if (currentQty <= 1) {
      animateOut(id);
    }
    removeFromCart(id.toString());
  };

  const animatedScales = useRef<{ [key: number]: Animated.Value }>({}).current;
  const animatedOpacities = useRef<{ [key: number]: Animated.Value }>(
    {}
  ).current;

  const initAnimation = (id: number) => {
    if (!animatedScales[id]) {
      animatedScales[id] = new Animated.Value(0.8);
      animatedOpacities[id] = new Animated.Value(0);
    }
  };

  const animateIn = (id: number) => {
    if (!animatedScales[id] || !animatedOpacities[id]) return;
    Animated.parallel([
      Animated.timing(animatedScales[id], {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(animatedOpacities[id], {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();
  };

  const animateOut = (id: number) => {
    if (!animatedScales[id] || !animatedOpacities[id]) return;
    Animated.parallel([
      Animated.timing(animatedScales[id], {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(animatedOpacities[id], {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start();
  };

  return (
    <View>
      <View style={{ paddingHorizontal: 15, marginTop: 15, marginBottom: 25 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 5,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "bold",
              fontFamily: "Poppins",
            }}
          >
            Top Picks
          </Text>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              gap: 5,
              alignItems: "center",
              marginBottom: 5,
            }}
          >
            <Text style={{ color: "#A5A4A4FF" }}>See All</Text>
            <Ionicons name="chevron-forward" size={20} color="#A5A4A4FF" />
          </TouchableOpacity>
        </View>
        <Animated.FlatList
          data={topPicks}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingVertical: 10,
            flexDirection: "row",
            gap: 5,
          }}
          renderItem={({ item: pick }) => (
            <Pressable
              key={pick.id}
              style={{
                marginRight: 10,
                width: 250,
                borderRadius: 10,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "#E5E5E5",
              }}
            >
              <Image
                style={{
                  width: 250,
                  height: 150,
                  objectFit: "cover",
                  position: "relative",
                }}
                source={pick.image}
              />
              <Pressable
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  borderRadius: 50,
                  padding: 5,
                }}
              >
                <Ionicons name="heart-outline" size={22} color={PrimaryColor} />
              </Pressable>

              <View
                style={{
                  padding: 6,
                  flexDirection: "column",
                  gap: 5,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: "600" }}>
                      {pick.name}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      {pick.tags.map((tag, index) => (
                        <Text
                          key={index}
                          style={{
                            fontSize: 12,
                            color: "grey",
                            marginBottom: 2,
                          }}
                        >
                          {tag}
                        </Text>
                      ))}
                    </View>
                  </View>
                  {getQuantity(pick.id.toString()) ? (
                    <Animated.View
                      style={{
                        transform: [
                          {
                            scale:
                              animatedScales[pick.id] || new Animated.Value(1),
                          },
                        ],
                        opacity:
                          animatedOpacities[pick.id] || new Animated.Value(1),
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#F5F5F5",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => decreaseQuantity(pick.id)}
                      >
                        <Ionicons
                          name="remove-circle-outline"
                          size={30}
                          color={PrimaryColor}
                        />
                      </TouchableOpacity>
                      <Text style={{ marginHorizontal: 8, color: "#262626FF" }}>
                        {getQuantity(pick.id.toString())}
                      </Text>
                      <TouchableOpacity
                        onPress={() => increaseQuantity(pick.id, pick.storeId)}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={30}
                          color={PrimaryColor}
                        />
                      </TouchableOpacity>
                    </Animated.View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        increaseQuantity(pick.id, pick.storeId);
                        //   Vibration.vibrate(20);
                      }}
                    >
                      <Ionicons
                        name="add-circle"
                        size={35}
                        color={PrimaryColor}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-evenly",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name="star-outline"
                      style={{ color: PrimaryColor }}
                      size={16}
                    />
                    <Text style={{ fontSize: 14 }}>{pick.rating}</Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="truck-fast-outline"
                      size={16}
                      color="#ff6b00"
                    />
                    <Text style={{ fontSize: 14 }}>Free</Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="clock-time-four-outline"
                      size={16}
                      color="#ff6b00"
                    />
                    <Text style={{ fontSize: 14 }}>20 min</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          )}
        />
      </View>
    </View>
  );
};

export default TopPicks;
