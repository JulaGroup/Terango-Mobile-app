import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/DesignTokens";
import { cldUrl, cldWidthForDp } from "@/utils/cloudinaryImage";

export interface CategoryCircleItem {
  id: string;
  name: string;
  imageUrl?: string;
}

interface Props {
  data: CategoryCircleItem[];
  onPress: (item: CategoryCircleItem) => void;
  /** Highlight one tile with a ring + check (optional filter selection). */
  selectedId?: string | null;
  size?: number;
}

/**
 * Grab/Uber-style circular category tiles: the category image sits inside the
 * circle, label underneath, horizontal scroll. The selected tile gets an
 * orange ring + check and an orange label — the shared TeranGO accent.
 */
const CategoryCircleRow: React.FC<Props> = ({
  data,
  onPress,
  selectedId,
  size = 66,
}) => {
  if (!data || data.length === 0) return null;

  return (
    <FlatList
      data={data}
      keyExtractor={(i) => i.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      renderItem={({ item }) => {
        const selected = selectedId === item.id;
        return (
          <TouchableOpacity
            style={styles.tile}
            activeOpacity={0.8}
            onPress={() => onPress(item)}
          >
            <View
              style={[
                styles.circle,
                { width: size, height: size, borderRadius: size / 2 },
                selected && styles.circleSelected,
              ]}
            >
              {item.imageUrl ? (
                <Image
                  source={cldUrl(item.imageUrl, cldWidthForDp(size))}
                  style={styles.image}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <Ionicons name="grid-outline" size={24} color="#B8B8BE" />
              )}
              {selected && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </View>
            <Text
              style={[styles.label, selected && styles.labelSelected]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    gap: 16,
    paddingVertical: 4,
  },
  tile: {
    alignItems: "center",
    width: 74,
  },
  circle: {
    backgroundColor: "#F1F1F4",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  circleSelected: {
    borderColor: Colors.primary,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  checkBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3A3A3C",
    marginTop: 6,
    textAlign: "center",
  },
  labelSelected: {
    color: Colors.primary,
    fontWeight: "700",
  },
});

export default CategoryCircleRow;
