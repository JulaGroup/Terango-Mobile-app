import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type WeightClass = "LIGHT" | "MEDIUM" | "HEAVY";

// Weight class configuration matching admin panel style
export const WEIGHT_CONFIG: Record<
  WeightClass,
  {
    emoji: string;
    label: string;
    description: string;
    weightRange: string;
    backgroundColor: string;
    borderColor: string;
  }
> = {
  LIGHT: {
    emoji: "📦",
    label: "Light Package",
    description: "Food, documents, small items",
    weightRange: "0-25kg",
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  MEDIUM: {
    emoji: "📦📦",
    label: "Medium Package",
    description: "Clothing, electronics, groceries",
    weightRange: "25-100kg",
    backgroundColor: "#FFF7ED",
    borderColor: "#F97316",
  },
  HEAVY: {
    emoji: "📦📦📦",
    label: "Heavy Package",
    description: "Rice bags, furniture, appliances",
    weightRange: "100kg+",
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
  },
};

export interface WeightClassOption {
  key: WeightClass;
  label: string;
  description: string;
  emoji: string;
  weightRange?: string;
  backgroundColor?: string;
  borderColor?: string;
}

interface ExpressWeightClassCardProps {
  weightClass?: WeightClassOption;
  // Legacy compatibility: some callers still pass `weight` + `onSelect`.
  weight?: WeightClass;
  selected: boolean;
  onPress?: () => void;
  onSelect?: () => void;
}

export const ExpressWeightClassCard: React.FC<ExpressWeightClassCardProps> = ({
  weightClass,
  weight,
  selected,
  onPress,
  onSelect,
}) => {
  const key = weightClass?.key ?? weight;
  const config = key ? WEIGHT_CONFIG[key] : undefined;

  if (!config) {
    return null;
  }

  const handlePress = onPress ?? onSelect ?? (() => {});

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: selected ? config.backgroundColor : "#FFFFFF",
          borderColor: selected ? config.borderColor : "#E5E7EB",
        },
      ]}
      activeOpacity={0.75}
      onPress={handlePress}
    >
      <View style={styles.header}>
        {/* Weight Emoji Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: selected ? "rgba(255,255,255,0.9)" : "#F9FAFB",
            },
          ]}
        >
          <Text style={styles.weightEmoji}>{config.emoji}</Text>
        </View>

        {/* Selection Checkmark */}
        {selected && (
          <View style={styles.checkmarkContainer}>
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={config.borderColor}
            />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, selected && { color: config.borderColor }]}>
          {config.label}
        </Text>
        <Text style={styles.description}>{config.description}</Text>
        <Text style={styles.weightRange}>{config.weightRange}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  weightEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  checkmarkContainer: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    alignItems: "flex-start",
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
    marginBottom: 6,
  },
  weightRange: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
  },
});
