/**
 * HubDealBanners — horizontal scrolling deal cards shown on the Hub home page.
 * These are static placeholder cards styled to match the orange/black/white palette.
 * Replace with API-driven data when the backend is ready.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CARD_W = width * 0.72;

interface DealCard {
  id: string;
  headline: string;
  sub: string;
  bgColor: string;
  textColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
}

const DEALS: DealCard[] = [
  {
    id: "1",
    headline: "FREE Delivery 🎉",
    sub: "Use code LAUNCH2026 on your first order",
    bgColor: "#ff6b00",
    textColor: "#fff",
    icon: "bicycle-outline",
    badge: "NEW",
  },
  {
    id: "2",
    headline: "Save on Food",
    sub: "Order above GMD 500 & get discount",
    bgColor: "#1a1a1a",
    textColor: "#fff",
    icon: "restaurant-outline",
    badge: "FOOD",
  },
  {
    id: "3",
    headline: "Mart Essentials",
    sub: "Groceries, pharmacy & more – delivered fast",
    bgColor: "#FFF5EE",
    textColor: "#1a1a1a",
    icon: "storefront-outline",
    badge: "MART",
  },
  {
    id: "4",
    headline: "More Coming Soon",
    sub: "Transport, Shopping & Express on the way",
    bgColor: "#f5f5f5",
    textColor: "#1a1a1a",
    icon: "rocket-outline",
    badge: "🚀",
  },
];

// Pulsing dot indicator
const Indicator = ({ count, current }: { count: number; current: number }) => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 10,
      gap: 5,
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          width: i === current ? 16 : 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: i === current ? "#ff6b00" : "#ddd",
        }}
      />
    ))}
  </View>
);

const HubDealBanners = () => {
  const flatRef = useRef<FlatList>(null);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % DEALS.length;
        flatRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <View style={{ backgroundColor: "#fff", paddingVertical: 12 }}>
      <FlatList
        ref={flatRef}
        data={DEALS}
        keyExtractor={(d) => d.id}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_W + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: (width - CARD_W) / 2,
          gap: 12,
        }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + 12));
          setCurrent(Math.min(idx, DEALS.length - 1));
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.88}
            style={{
              width: CARD_W,
              backgroundColor: item.bgColor,
              borderRadius: 16,
              padding: 18,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: "rgba(255,255,255,0.2)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name={item.icon} size={26} color={item.textColor} />
            </View>
            <View style={{ flex: 1 }}>
              {item.badge && (
                <View
                  style={{
                    alignSelf: "flex-start",
                    backgroundColor: "rgba(255,255,255,0.3)",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "800",
                      color: item.textColor,
                      letterSpacing: 0.5,
                    }}
                  >
                    {item.badge}
                  </Text>
                </View>
              )}
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: item.textColor,
                  marginBottom: 4,
                }}
              >
                {item.headline}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: item.textColor,
                  opacity: 0.82,
                  lineHeight: 17,
                }}
              >
                {item.sub}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <Indicator count={DEALS.length} current={current} />
    </View>
  );
};

export default HubDealBanners;
