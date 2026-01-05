/**
 * Modern Bottom Sheet Component
 * A professional pull-up/pull-down bottom sheet like delivery apps (Uber, DoorDash, Deliveroo)
 * Features:
 * - Snap points (collapsed, expanded, full)
 * - Smooth gesture handling
 * - Backdrop with tap to dismiss
 * - Handle bar for visual dragging cue
 */

import React, { useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  StatusBar,
} from "react-native";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 0;

// Snap points as percentages of screen height
export type SnapPoint = "collapsed" | "half" | "expanded" | "full";

interface SnapPointConfig {
  collapsed: number; // e.g., 0.15 = 15% of screen
  half: number; // e.g., 0.5 = 50% of screen
  expanded: number; // e.g., 0.75 = 75% of screen
  full: number; // e.g., 0.95 = 95% of screen
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  initialSnap?: SnapPoint;
  snapPoints?: Partial<SnapPointConfig>;
  showBackdrop?: boolean;
  backdropOpacity?: number;
  enableSwipeDown?: boolean;
  enableFullscreen?: boolean;
  onSnapChange?: (snap: SnapPoint) => void;
  headerComponent?: React.ReactNode;
  handleColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
}

const DEFAULT_SNAP_POINTS: SnapPointConfig = {
  collapsed: 0.2,
  half: 0.5,
  expanded: 0.75,
  full: 0.92,
};

export default function BottomSheet({
  visible,
  onClose,
  children,
  initialSnap = "half",
  snapPoints: customSnapPoints,
  showBackdrop = true,
  backdropOpacity = 0.5,
  enableSwipeDown = true,
  enableFullscreen = true,
  onSnapChange,
  headerComponent,
  handleColor = "#D1D5DB",
  backgroundColor = "#FFFFFF",
  borderRadius = 24,
}: BottomSheetProps) {
  const snapConfig = useMemo(
    () => ({ ...DEFAULT_SNAP_POINTS, ...customSnapPoints }),
    [customSnapPoints]
  );

  // Get actual pixel values for snap points
  const getSnapHeight = useCallback(
    (snap: SnapPoint) => SCREEN_HEIGHT * snapConfig[snap],
    [snapConfig]
  );

  // Animation values
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacityAnim = useRef(new Animated.Value(0)).current;
  const currentSnap = useRef<SnapPoint>(initialSnap);
  const lastGestureY = useRef(0);

  // Find nearest snap point based on current position
  const findNearestSnap = useCallback(
    (positionFromTop: number): SnapPoint => {
      const positions = {
        collapsed: SCREEN_HEIGHT - getSnapHeight("collapsed"),
        half: SCREEN_HEIGHT - getSnapHeight("half"),
        expanded: SCREEN_HEIGHT - getSnapHeight("expanded"),
        full: SCREEN_HEIGHT - getSnapHeight("full"),
      };

      let nearest: SnapPoint = "half";
      let minDistance = Infinity;

      (Object.entries(positions) as [SnapPoint, number][]).forEach(
        ([snap, pos]) => {
          if (!enableFullscreen && snap === "full") return;
          const distance = Math.abs(positionFromTop - pos);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = snap;
          }
        }
      );

      return nearest;
    },
    [getSnapHeight, enableFullscreen]
  );

  // Animate to a specific snap point
  const animateToSnap = useCallback(
    (snap: SnapPoint, velocity = 0) => {
      const toValue = SCREEN_HEIGHT - getSnapHeight(snap);
      currentSnap.current = snap;
      onSnapChange?.(snap);

      const springConfig = {
        toValue,
        velocity,
        tension: 120,
        friction: 14,
        useNativeDriver: true,
      };

      Animated.parallel([
        Animated.spring(translateY, springConfig),
        Animated.timing(backdropOpacityAnim, {
          toValue: snap === "collapsed" ? 0.2 : backdropOpacity,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [
      getSnapHeight,
      translateY,
      backdropOpacityAnim,
      backdropOpacity,
      onSnapChange,
    ]
  );

  // Close animation
  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [translateY, backdropOpacityAnim, onClose]);

  // Pan responder for gesture handling
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical movements
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        // Get current position
        translateY.stopAnimation((value) => {
          lastGestureY.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const newPosition = lastGestureY.current + gestureState.dy;
        // Clamp to prevent going above full or below screen
        const minY = SCREEN_HEIGHT - getSnapHeight("full");
        const maxY = SCREEN_HEIGHT - getSnapHeight("collapsed") + 50; // Allow some overscroll
        const clampedPosition = Math.max(minY, Math.min(maxY, newPosition));
        translateY.setValue(clampedPosition);

        // Update backdrop opacity based on position
        const progress = 1 - clampedPosition / SCREEN_HEIGHT;
        backdropOpacityAnim.setValue(progress * backdropOpacity);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentPosition = lastGestureY.current + gestureState.dy;
        const velocity = gestureState.vy;

        // If swiping down fast and enabled, close the sheet
        if (
          enableSwipeDown &&
          velocity > 1.5 &&
          currentPosition > SCREEN_HEIGHT * 0.6
        ) {
          closeSheet();
          return;
        }

        // Otherwise, snap to nearest point
        const nearestSnap = findNearestSnap(currentPosition);
        animateToSnap(nearestSnap, velocity);
      },
    })
  ).current;

  // Show/hide animation
  useEffect(() => {
    if (visible) {
      const initialY = SCREEN_HEIGHT - getSnapHeight(initialSnap);
      translateY.setValue(SCREEN_HEIGHT);
      backdropOpacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: initialY,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacityAnim, {
          toValue: backdropOpacity,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      currentSnap.current = initialSnap;
      onSnapChange?.(initialSnap);
    }
  }, [
    visible,
    initialSnap,
    getSnapHeight,
    translateY,
    backdropOpacityAnim,
    backdropOpacity,
    onSnapChange,
  ]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      {showBackdrop && (
        <TouchableWithoutFeedback onPress={closeSheet}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacityAnim,
              },
            ]}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor,
            borderTopLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Handle Area */}
        <View {...panResponder.panHandlers} style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: handleColor }]} />
          {headerComponent}
        </View>

        {/* Content */}
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
}

// Utility component for sheet header
export function BottomSheetHeader({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onRightPress,
}: {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        {leftIcon}
        <View style={styles.headerText}>
          <Animated.Text style={styles.headerTitle}>{title}</Animated.Text>
          {subtitle && (
            <Animated.Text style={styles.headerSubtitle}>
              {subtitle}
            </Animated.Text>
          )}
        </View>
      </View>
      {rightIcon && (
        <TouchableWithoutFeedback onPress={onRightPress}>
          <View style={styles.headerRight}>{rightIcon}</View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  handleContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  headerRight: {
    padding: 8,
  },
});
