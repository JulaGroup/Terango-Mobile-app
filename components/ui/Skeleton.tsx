import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, ViewStyle, StyleProp } from "react-native";

/**
 * A softly pulsing placeholder block, used while real content loads so the
 * screen shows its shape immediately instead of a bare spinner.
 */
export function Skeleton({
  style,
  radius,
}: {
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.base,
        radius != null && { borderRadius: radius },
        style,
        { opacity: pulse },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: "#E6EBF2", borderRadius: 8 },
});
