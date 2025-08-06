import React, { useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Image, StyleSheet, View } from "react-native";

const ads = [
  { id: 1, image: require("../../../assets/images/adverts/advert1.jpg") },
  { id: 2, image: require("../../../assets/images/adverts/advert2.jpg") },
  { id: 3, image: require("../../../assets/images/adverts/advert3.jpg") },
];

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 40; // 20px padding on each side

const AdvertCard = () => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % ads.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }, 7000); // Changed to 7 seconds

    return () => clearInterval(interval);
  }, [currentIndex]);

  const onScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);
    setCurrentIndex(newIndex);
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={ads}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <View style={styles.cardWrapper}>
            <View style={styles.card}>
              <Image
                source={item.image}
                style={styles.image}
                resizeMode="cover"
              />
              {/* Dots inside card, bottom right */}
              <View style={styles.dotsContainer}>
                {ads.map((_, dotIndex) => (
                  <View
                    key={dotIndex}
                    style={[
                      styles.dot,
                      currentIndex === dotIndex && styles.activeDot,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
        )}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        initialScrollIndex={0}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    width: "100%",
  },
  cardWrapper: {
    width, // Full screen width for paging
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: CARD_WIDTH,
    height: 130,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative", // Important for absolute dots inside
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 15,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#ff6b00",
  },
});

export default AdvertCard;
