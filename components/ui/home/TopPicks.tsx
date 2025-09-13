import React, { useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { PrimaryColor } from "@/constants/Colors";
import { topPicks } from "@/constants/fakeData";
import { useCart } from "@/context/CartContext";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const TopPicks: React.FC = () => {
  const { addToCart, removeFromCart, getQuantity } = useCart();

  const animatedScales = useRef<Record<number, Animated.Value>>({}).current;
  const animatedOpacities = useRef<Record<number, Animated.Value>>({}).current;

  const initAnimation = (id: number) => {
    if (!animatedScales[id]) {
      animatedScales[id] = new Animated.Value(0.9);
      animatedOpacities[id] = new Animated.Value(0);
    }
  };

  const animateIn = (id: number) => {
    if (!animatedScales[id] || !animatedOpacities[id]) return;
    Animated.parallel([
      Animated.timing(animatedScales[id], {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(animatedOpacities[id], {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();
  };

  const animateOut = (id: number) => {
    if (!animatedScales[id] || !animatedOpacities[id]) return;
    Animated.parallel([
      Animated.timing(animatedScales[id], {
        toValue: 0.9,
        duration: 140,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(animatedOpacities[id], {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start();
  };

  const increaseQuantity = (pick: any) => {
    initAnimation(pick.id);
    if (!getQuantity(pick.id.toString())) animateIn(pick.id);
    addToCart({
      id: pick.id.toString(),
      name: pick.name,
      price: pick.price,
      imageUrl: pick.image,
      vendorId: pick.storeId.toString(),
      vendorName: pick.storeName || "",
      entityType: "product",
      description: pick.description || "",
    });
  };

  const decreaseQuantity = (pick: any) => {
    initAnimation(pick.id);
    const current = getQuantity(pick.id.toString());
    if (current <= 1) animateOut(pick.id);
    removeFromCart(pick.id.toString());
  };

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Top Picks</Text>
        <TouchableOpacity style={styles.seeAllRow} activeOpacity={0.8}>
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color="#A5A4A4"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={topPicks}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          paddingVertical: 10,
          paddingLeft: 15,
          paddingRight: 15,
        }}
        renderItem={({ item: pick }) => (
          <View style={styles.card}>
            <Image source={pick.image} style={styles.image} />

            <TouchableOpacity style={styles.heartButton} activeOpacity={0.8}>
              <Ionicons name="heart-outline" size={20} color={PrimaryColor} />
            </TouchableOpacity>

            <View style={styles.cardBody}>
              <View style={styles.cardTopRow}>
                <View>
                  <Text style={styles.itemName}>{pick.name}</Text>
                  <View style={{ flexDirection: "row" }}>
                    {pick.tags?.map((tag: any, idx: number) => (
                      <Text key={idx} style={styles.tagText}>
                        {tag}
                      </Text>
                    ))}
                  </View>
                </View>

                {getQuantity(pick.id.toString()) ? (
                  <Animated.View
                    style={[
                      styles.qtyBox,
                      {
                        transform: [
                          {
                            scale:
                              animatedScales[pick.id] || new Animated.Value(1),
                          },
                        ],
                        opacity:
                          animatedOpacities[pick.id] || new Animated.Value(1),
                      },
                    ]}
                  >
                    <TouchableOpacity onPress={() => decreaseQuantity(pick)}>
                      <Ionicons
                        name="remove-circle-outline"
                        size={28}
                        color={PrimaryColor}
                      />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>
                      {getQuantity(pick.id.toString())}
                    </Text>
                    <TouchableOpacity onPress={() => increaseQuantity(pick)}>
                      <Ionicons
                        name="add-circle-outline"
                        size={28}
                        color={PrimaryColor}
                      />
                    </TouchableOpacity>
                  </Animated.View>
                ) : (
                  <TouchableOpacity onPress={() => increaseQuantity(pick)}>
                    <Ionicons
                      name="add-circle"
                      size={34}
                      color={PrimaryColor}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cardBottomRow}>
                <View style={styles.metaItem}>
                  <Ionicons
                    name="star-outline"
                    size={14}
                    color={PrimaryColor}
                  />
                  <Text style={styles.metaText}>{pick.rating}</Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons
                    name="truck-fast-outline"
                    size={14}
                    color="#ff6b00"
                  />
                  <Text style={styles.metaText}>Free</Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons
                    name="clock-time-four-outline"
                    size={14}
                    color="#ff6b00"
                  />
                  <Text style={styles.metaText}>20 min</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    paddingHorizontal: 15,
    marginTop: 15,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 17, fontWeight: "700" },
  seeAllRow: { flexDirection: "row", alignItems: "center" },
  seeAllText: { color: "#A5A4A4" },
  card: {
    marginRight: 12,
    width: 250,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#fff",
  },
  image: { width: 250, height: 140, resizeMode: "cover" },
  heartButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 6,
  },
  cardBody: { padding: 8 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: { fontSize: 15, fontWeight: "600" },
  tagText: { fontSize: 12, color: "grey", marginRight: 8 },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  qtyText: { marginHorizontal: 8, color: "#262626" },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  metaText: { fontSize: 13, marginLeft: 6 },
});

export default TopPicks;
