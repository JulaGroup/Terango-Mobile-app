import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";

export function HapticTab(props: BottomTabBarButtonProps) {
  // Only pass compatible props to TouchableOpacity
  const { style, children, onPress, onPressIn } = props;
  return (
    <TouchableOpacity
      style={style}
      activeOpacity={0.7}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(ev);
      }}
      onPress={onPress}
    >
      {children}
    </TouchableOpacity>
  );
}
