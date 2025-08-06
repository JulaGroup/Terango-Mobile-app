import React from "react";
import { View } from "react-native";

interface SectionSpacerProps {
  height?: number;
  backgroundColor?: string;
}

export default function SectionSpacer({
  height = 20,
  backgroundColor = "transparent",
}: SectionSpacerProps) {
  return (
    <View
      style={{
        height,
        backgroundColor,
        marginVertical: 4,
      }}
    />
  );
}
