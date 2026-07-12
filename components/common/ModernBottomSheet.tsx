import React, { useEffect, useRef, ReactNode } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { Colors, Radius, Animation, Spacing } from "@/constants/DesignTokens";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "small" | "medium" | "large" | "full";
  enableDrag?: boolean;
  showHandle?: boolean;
  snapPoints?: number[];
}

const SIZE_HEIGHTS = {
  small: SCREEN_HEIGHT * 0.4,
  medium: SCREEN_HEIGHT * 0.6,
  large: SCREEN_HEIGHT * 0.85,
  full: SCREEN_HEIGHT * 0.95,
};

export const ModernBottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  size = "medium",
  enableDrag = true,
  showHandle = true,
  snapPoints,
}) => {
  const sheetHeight = SIZE_HEIGHTS[size];
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const lastGestureDy = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      // Do NOT claim the responder on touch-start — doing so swallows taps on
      // child controls (list items, buttons) on Android. Only take over when
      // the user makes a deliberate, mostly-vertical downward drag.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        enableDrag &&
        gestureState.dy > 8 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderGrant: () => {
        lastGestureDy.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          // Only allow dragging down
          translateY.setValue(gestureState.dy);
          lastGestureDy.current = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = sheetHeight * 0.3;
        
        if (gestureState.dy > threshold || gestureState.vy > 0.5) {
          // Close if dragged more than 30% or fast swipe
          closeSheet();
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      openSheet();
    } else {
      closeSheet();
    }
  }, [visible]);

  const openSheet = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 25,
      stiffness: 250,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(translateY, {
      toValue: sheetHeight,
      duration: Animation.normal,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={closeSheet}>
          <BlurView intensity={Platform.OS === "ios" ? 20 : 0} style={styles.backdrop}>
            <View style={[styles.backdrop, { backgroundColor: Colors.backdrop }]} />
          </BlurView>
        </TouchableWithoutFeedback>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              transform: [{ translateY }],
            },
          ]}
          {...(enableDrag ? panResponder.panHandlers : {})}
        >
          {/* Drag Handle */}
          {showHandle && (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: Colors.grayLight,
    borderRadius: Radius.round,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
});
