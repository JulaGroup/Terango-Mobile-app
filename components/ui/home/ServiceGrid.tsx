import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const ORANGE = "#ff6b00";
const DARK = "#1a1a1a";
const GAP = 10;
const H_PAD = 16;
const HERO_W = (width - H_PAD * 2 - GAP) / 2;

// ─── Hero card (Food / Mart) ─────────────────────────────────────────────────
const HeroCard = ({
  label,
  subtitle,
  image,
  bg,
  accentColor,
  route,
  comingSoon,
  badge,
}: {
  label: string;
  subtitle: string;
  image: number;
  bg: string;
  accentColor: string;
  route?: string;
  comingSoon?: boolean;
  badge?: string;
}) => {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
    }).start();

  const handlePress = () => {
    if (comingSoon) {
      Alert.alert("Coming Soon", `${label} will be available soon!`);
      return;
    }
    if (route) router.push(route as any);
  };

  return (
    <Animated.View
      style={[
        heroStyles.shadow,
        {
          transform: [{ scale }],
          width: HERO_W,
          borderRadius: 18,
          backgroundColor: bg,
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={[heroStyles.card, { backgroundColor: bg }]}
      >
        {/* Large illustration — fills right side */}
        <Image
          source={image}
          style={[heroStyles.illustration, { opacity: comingSoon ? 0.18 : 1 }]}
          contentFit="contain"
        />

        {/* Left-to-right gradient so text stays readable over illustration */}
        <LinearGradient
          colors={[bg, bg, `${bg}CC`, `${bg}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Top inner highlight line — glass feel */}
        <View style={heroStyles.topHighlight} />

        {/* ── Content ── */}
        <View style={heroStyles.content}>
          {/* Label + subtitle */}
          <View>
            {(badge || comingSoon) && (
              <View
                style={[
                  heroStyles.badge,
                  { backgroundColor: comingSoon ? "#A0A0A0" : accentColor },
                ]}
              >
                <Text style={heroStyles.badgeText}>
                  {comingSoon ? "SOON" : badge}
                </Text>
              </View>
            )}
            <Text style={heroStyles.label}>{label}</Text>
            <Text style={heroStyles.subtitle}>{subtitle}</Text>
          </View>

          {/* CTA row */}
          <View style={heroStyles.ctaRow}>
            <Text
              style={[
                heroStyles.ctaText,
                { color: comingSoon ? "#ABABAB" : accentColor },
              ]}
            >
              {comingSoon ? "Coming soon" : "Order now"}
            </Text>
            <View
              style={[
                heroStyles.ctaChevron,
                { backgroundColor: comingSoon ? "#D8D8D8" : accentColor },
              ]}
            >
              <Ionicons name="chevron-forward" size={12} color="#fff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const heroStyles = StyleSheet.create({
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    borderRadius: 18,
    height: 152,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.055)",
  },
  illustration: {
    position: "absolute",
    top: -4,
    right: -10,
    width: 148,
    height: 148,
  },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    justifyContent: "space-between",
    // cap width so content doesn't bleed under illustration
    maxWidth: "62%",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  label: {
    fontSize: 21,
    fontWeight: "900",
    color: DARK,
    letterSpacing: -0.6,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 11,
    color: "#777",
    marginTop: 3,
    lineHeight: 14,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  ctaChevron: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});

// ─── Small icon tile ─────────────────────────────────────────────────────────
const TILE_W = (width - H_PAD * 2 - GAP * 3) / 4;

const SmallTile = ({
  label,
  image,
  iconName,
  route,
  comingSoon,
  tint,
  onPress,
}: {
  label: string;
  image?: number;
  iconName?: keyof typeof Ionicons.glyphMap;
  route?: string;
  comingSoon?: boolean;
  tint?: string;
  onPress?: () => void;
}) => {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 40,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
    }).start();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (comingSoon) {
      Alert.alert("Coming Soon", `${label} will be available soon!`);
      return;
    }
    if (route) router.push(route as any);
  };

  const bg = tint ?? (comingSoon ? "#F5F5F5" : "#FFF5EE");
  const border = comingSoon ? "rgba(0,0,0,0.05)" : "rgba(255,107,0,0.12)";
  const iconColor = comingSoon ? "#ccc" : ORANGE;

  return (
    <Animated.View
      style={{ transform: [{ scale }], alignItems: "center", width: TILE_W }}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={{ alignItems: "center" }}
      >
        <View
          style={{
            width: TILE_W - 2,
            height: TILE_W - 2,
            backgroundColor: bg,
            borderRadius: 16,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 1,
            borderColor: border,
            overflow: "hidden",
          }}
        >
          {iconName ? (
            <Ionicons name={iconName} size={28} color={iconColor} />
          ) : image ? (
            <Image
              source={image}
              style={{ width: 70, height: 70, opacity: comingSoon ? 0.3 : 1 }}
              contentFit="contain"
            />
          ) : null}
          {comingSoon && (
            <View
              style={{
                position: "absolute",
                bottom: 4,
                alignSelf: "center",
                backgroundColor: "#bbb",
                borderRadius: 6,
                paddingHorizontal: 5,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 7,
                  fontWeight: "700",
                  letterSpacing: 0.5,
                }}
              >
                SOON
              </Text>
            </View>
          )}
        </View>
        <Text
          style={{
            marginTop: 5,
            fontSize: 11,
            fontWeight: "600",
            color: comingSoon ? "#C0C0C0" : DARK,
            textAlign: "center",
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── More Services Bottom Sheet ──────────────────────────────────────────────
const MORE_SERVICES = [
  {
    id: "wholesale",
    label: "Wholesale",
    description: "Bulk orders at trade prices",
    iconName: "cube-outline" as keyof typeof Ionicons.glyphMap,
    iconBg: "#FFF3E6",
    iconColor: "#FF8C00",
  },
  {
    id: "furniture",
    label: "Furniture",
    description: "Home & office furniture",
    iconName: "bed-outline" as keyof typeof Ionicons.glyphMap,
    iconBg: "#F3E8FF",
    iconColor: "#9B59B6",
  },
  {
    id: "electronics",
    label: "Electronics",
    description: "Gadgets, phones & more",
    iconName: "phone-portrait-outline" as keyof typeof Ionicons.glyphMap,
    iconBg: "#E8F4FF",
    iconColor: "#2980B9",
  },
  {
    id: "experiences",
    label: "Experiences",
    description: "Events, tours & activities",
    iconName: "star-outline" as keyof typeof Ionicons.glyphMap,
    iconBg: "#FFF9E6",
    iconColor: "#F39C12",
  },
  {
    id: "teranpro",
    label: "TeranPro",
    description: "Home & professional services",
    iconName: "construct-outline" as keyof typeof Ionicons.glyphMap,
    iconBg: "#E8FFF3",
    iconColor: "#27AE60",
  },
];

const MoreServicesSheet = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const { bottom: safeBottom } = useSafeAreaInsets();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Mounted controls actual Modal visibility — stays true during close animation
  const [mounted, setMounted] = useState(false);

  // Stable ref so PanResponder (created once) always calls the latest close fn
  const closeSheetRef = useRef<() => void>(() => {});

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMounted(false);
      onClose();
    });
  };

  // Keep ref current on every render
  closeSheetRef.current = closeSheet;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) {
          slideAnim.setValue(dy);
          fadeAnim.setValue(Math.max(0, 1 - dy / 300));
        }
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 120 || vy > 0.5) {
          closeSheetRef.current();
        } else {
          // Snap back up
          Animated.parallel([
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
              speed: 14,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      slideAnim.setValue(400);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
          speed: 14,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={() => closeSheetRef.current()}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          opacity: fadeAnim,
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => closeSheetRef.current()}
        />

        {/* Sheet */}
        <Animated.View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: Math.max(safeBottom, 24),
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Draggable handle + header — pan gesture applied here only */}
          <View {...panResponder.panHandlers}>
            {/* Handle bar */}
            <View
              style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}
            >
              <View
                style={{
                  width: 38,
                  height: 4,
                  backgroundColor: "#E0E0E0",
                  borderRadius: 2,
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: "#F5F5F5",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "800", color: DARK }}>
                More Services
              </Text>
              <TouchableOpacity onPress={closeSheet} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={26} color="#C0C0C0" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Service rows */}
          <View style={{ position: "relative" }}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              style={{ paddingTop: 6, maxHeight: 380 }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {MORE_SERVICES.map((svc) => {
                const isTeranPro = svc.id === "teranpro";
                const isFurniture = svc.id === "furniture";
                return (
                  <TouchableOpacity
                    key={svc.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      Alert.alert(
                        "Coming Soon",
                        `${svc.label} will be available soon. Stay tuned!`,
                      );
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      gap: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: "#F9F9F9",
                    }}
                  >
                    {/* Icon circle */}
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        backgroundColor: svc.iconBg,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name={svc.iconName}
                        size={24}
                        color={svc.iconColor}
                      />
                    </View>

                    {/* Text */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ fontSize: 15, fontWeight: "700", color: DARK }}
                      >
                        {svc.label}
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: "#888", marginTop: 2 }}
                      >
                        {svc.description}
                      </Text>
                    </View>

                    {/* Badge */}
                    {
                      <View
                        style={{
                          backgroundColor: "#F0F0F0",
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: "#999",
                          }}
                        >
                          SOON
                        </Text>
                      </View>
                    }
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {/* Scroll fade hint */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 36,
                backgroundColor: "rgba(255,255,255,0)",
                shadowColor: "#fff",
                shadowOffset: { width: 0, height: -20 },
                shadowOpacity: 1,
                shadowRadius: 16,
              }}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Main Grid ────────────────────────────────────────────────────────────────
const ServiceGrid = () => {
  const [showMore, setShowMore] = useState(false);

  return (
    <View
      style={{
        backgroundColor: "#fff",
        paddingHorizontal: H_PAD,
        paddingTop: 16,
        paddingBottom: 20,
        gap: 12,
      }}
    >
      {/* Row 1 — Hero cards */}
      <View style={{ flexDirection: "row", gap: GAP }}>
        <HeroCard
          label="Food"
          subtitle="Order food & drinks"
          image={require("@/assets/images/food_icon.png")}
          bg="#FFF3E6"
          accentColor="#FF8C00"
          route="/food"
        />
        <HeroCard
          label="Mart"
          subtitle="Delivered to your door"
          image={require("@/assets/images/mart_icon.png")}
          bg="#E8F5E9"
          accentColor="#2E7D32"
          route="/mart"
        />
      </View>

      {/* Row 2 — Small tiles */}
      <View
        style={{
          flexDirection: "row",
          gap: GAP,
          justifyContent: "space-between",
        }}
      >
        <SmallTile
          label="KërSpace"
          image={require("@/assets/images/kerrspace_icon (2).png")}
          route="/kerspace"
          // tint="#FFF5EE"
          comingSoon
        />
        <SmallTile
          label="Express"
          image={require("@/assets/images/express_icon.png")}
          route="/custom-delivery"
          comingSoon
        />
        <SmallTile
          label="YoBu"
          image={require("@/assets/images/yobu_icon.png")}
          comingSoon
        />
        <SmallTile
          label="More"
          iconName="grid-outline"
          tint="#FFF5EE"
          onPress={() => setShowMore(true)}
        />
      </View>

      <MoreServicesSheet
        visible={showMore}
        onClose={() => setShowMore(false)}
      />
    </View>
  );
};

export default ServiceGrid;
